import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { expireAdminSessionCookies } from "@/lib/auth/admin-session-cookies";
import { TEST_AUTH_COOKIE } from "@/lib/onboarding/test-auth";

function classifySignInError(error: unknown) {
  if (!error || typeof error !== "object") return "authentication_unavailable";
  const { status, code, name } = error as { status?: number; code?: string; name?: string };
  if (status === 429 || code === "over_request_rate_limit") return "rate_limited";
  if (
    status === 0 || status === 408 || (typeof status === "number" && status >= 500) ||
    name === "AuthRetryableFetchError" || code === "request_timeout"
  ) return "authentication_unavailable";
  // Use the same rejection for bad credentials and account-specific rejections:
  // confirmation state, bans and similar codes must not enumerate accounts.
  if (code === "invalid_credentials") return "invalid_credentials";
  return status === undefined ? "authentication_unavailable" : "invalid_credentials";
}

function adminLoginRedirect(request: NextRequest, error: string) {
  const url = new URL("/auth/admin", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
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

  async function rejectSignIn(reason: string) {
    // Rejected reauthentication must not leave an older browser session active.
    // A local sign-out never ends another browser/device's Supabase session.
    try { await supabase.auth.signOut({ scope: "local" }); } catch { /* Expire local cookies even when the Auth service is unavailable. */ }
    const response = adminLoginRedirect(request, reason);
    response.headers.set("Cache-Control", "private, no-store");
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    const isProjectAuthCookie = (name: string) => {
      const key = name.replace(/\.\d+$/, "");
      if ([storageKey, `${storageKey}-user`, `${storageKey}-code-verifier`, `${storageKey}-flows-code-verifier`].includes(key)) return true;
      const flowPrefix = `${storageKey}-flow-`;
      return key.startsWith(flowPrefix) && /^[A-Za-z0-9_-]{8,64}-code-verifier$/.test(key.slice(flowPrefix.length));
    };
    // The shared logout helper expires all staged names. Supply only this
    // project's auth names, including newer SDK flow verifiers and their chunks;
    // never forward staged session values or clear unrelated project cookies.
    const expirationCookies = NextResponse.next();
    for (const { name } of [...request.cookies.getAll(), ...cookieResponse.cookies.getAll()]) {
      if (isProjectAuthCookie(name)) expirationCookies.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
    expireAdminSessionCookies(request, response, expirationCookies);
    return response;
  }
  if (!email || !password) return rejectSignIn("missing_fields");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    .catch((error: unknown) => ({ data: { user: null }, error }));
  if (error || !data.user) {
    const reason = classifySignInError(error);
    console.warn("admin_login_failed", { reason });
    return rejectSignIn(reason);
  }

  const { data: isAdmin, error: authorizationError } = await Promise.resolve(supabase.rpc(
    "is_internal_admin",
  )).catch(() => ({ data: null, error: true }));

  if (authorizationError) return rejectSignIn("authorization_unavailable");
  if (isAdmin !== true) return rejectSignIn("not_admin");

  const response = NextResponse.redirect(new URL("/admin/beta", request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  cookieResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  response.cookies.delete(TEST_AUTH_COOKIE);
  return response;
}
