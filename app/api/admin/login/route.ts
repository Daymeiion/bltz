import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { TEST_AUTH_COOKIE } from "@/lib/onboarding/test-auth";
import { expireAdminSessionCookies } from "@/lib/auth/admin-session-cookies";

function classifySignInError(error: unknown) {
  if (!error || typeof error !== "object") return "authentication_unavailable";
  const { status, code, name } = error as { status?: number; code?: string; name?: string };
  if (status === 429 || code === "over_request_rate_limit") return "rate_limited";
  if (
    status === 0 || status === 408 || (typeof status === "number" && status >= 500) ||
    name === "AuthRetryableFetchError" || code === "request_timeout"
  ) return "authentication_unavailable";
  // Account-specific failures must not enumerate accounts or confirmation state.
  if (code === "invalid_credentials") return "invalid_credentials";
  return status === undefined ? "authentication_unavailable" : "invalid_credentials";
}

function adminLoginRedirect(request: NextRequest, error: string) {
  const url = new URL("/auth/admin", request.url);
  url.searchParams.set("error", error);
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function isTrustedAdminLoginOrigin(
  origin: string | null,
  fetchSite: string | null,
  requestHost: string,
) {
  return !(
    fetchSite === "cross-site" ||
    (origin && (!URL.canParse(origin) || new URL(origin).host !== requestHost))
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const requestHost = request.headers.get("host") ?? new URL(request.url).host;
  if (!isTrustedAdminLoginOrigin(origin, fetchSite, requestHost)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const cookieResponse = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const rejectLogin = async (error: string) => {
    // A rejected re-authentication attempt must not leave a previously issued
    // administrator session active in the browser.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Browser clearance below is mandatory even when Auth is unreachable.
    }
    const response = adminLoginRedirect(request, error);
    expireAdminSessionCookies(request, response, cookieResponse);
    return response;
  };

  if (!email || !password) return rejectLogin("missing_fields");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    .catch((error: unknown) => ({ data: { user: null }, error }));
  if (error || !data.user) {
    const reason = classifySignInError(error);
    console.warn("admin_login_failed", { reason });
    return rejectLogin(reason);
  }

  const { data: isAdmin, error: authorizationError } = await Promise.resolve(supabase.rpc(
    "is_internal_admin",
  )).catch(() => ({ data: null, error: true }));

  if (authorizationError) return rejectLogin("authorization_unavailable");
  if (isAdmin !== true) return rejectLogin("not_admin");

  const response = NextResponse.redirect(new URL("/admin/beta", request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  cookieResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  response.cookies.delete(TEST_AUTH_COOKIE);
  return response;
}
