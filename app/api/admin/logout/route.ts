import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { TEST_AUTH_COOKIE } from "@/lib/onboarding/test-auth";

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

  await supabase.auth.signOut({ scope: "local" });

  const response = NextResponse.redirect(new URL("/auth/admin", request.url), 303);
  cookieResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  response.cookies.delete(TEST_AUTH_COOKIE);
  return response;
}
