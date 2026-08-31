import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { expireAdminSessionCookies } from "@/lib/auth/admin-session-cookies";

export function isTrustedAdminLogoutOrigin(
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
  if (!isTrustedAdminLogoutOrigin(origin, fetchSite, requestHost)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

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

  let unavailable = false;
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    unavailable = Boolean(error);
  } catch {
    unavailable = true;
  }
  const destination = unavailable ? "/auth/admin?error=logout_unavailable" : "/auth/admin";
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  expireAdminSessionCookies(request, response, cookieResponse);
  return response;
}
