import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import { TEST_AUTH_COOKIE, isTestAuthEnabled } from "@/lib/onboarding/test-auth";

/**
 * Auth + role-aware redirect middleware.
 *
 * RULES (documented per office-hours plan amendment):
 *
 *   1. Unauthenticated visits to anything except `/`, `/auth/*`, and a few
 *      explicit public surfaces are bounced to `/auth/login`.
 *   2. Athletes — defined as authenticated users with `profiles.role = 'player'`
 *      AND no `profiles.player_id` — get pushed to `/onboarding` so they
 *      finish their locker before they see the dashboard.
 *   3. Fans (`role = 'fan'`) and authenticated browsers without a player intent
 *      are NEVER auto-redirected into the player onboarding flow. They land
 *      wherever they meant to go.
 *   4. Authenticated users *with* an active claim cookie (set when they hit
 *      `/onboarding/claim/[token]`) are also routed into onboarding even if
 *      their role is still `fan`, since the claim itself signals athlete
 *      intent.
 *   5. We never redirect inside `/onboarding/*`, `/auth/*`, `/api/*`,
 *      `/_next/*`, or any static asset path — that would loop or break HMR.
 */
const PUBLIC_PATH_PREFIXES = ["/auth", "/api", "/_next", "/static"];
const ONBOARDING_PATH = "/onboarding";
const CLAIM_INTENT_COOKIE = "bltz_claim_intent";

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/player/")) return true; // public locker pages
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Pure decision for "should this athlete-path user be redirected to /onboarding?"
 * Exported separately so we can unit-test the role/claim matrix without
 * standing up a full Supabase + Next request.
 */
export function shouldRedirectToOnboarding(args: {
  pathname: string;
  profile: { role?: string | null; player_id?: string | null } | null;
  claimIntentCookie?: string | null;
}): boolean {
  const inOnboarding =
    args.pathname === ONBOARDING_PATH || args.pathname.startsWith(`${ONBOARDING_PATH}/`);
  if (inOnboarding) return false;
  if (isPublicPath(args.pathname)) return false;
  const isAthlete = args.profile?.role === "player";
  const hasClaim = Boolean(args.claimIntentCookie);
  const needsOnboarding = (isAthlete || hasClaim) && !args.profile?.player_id;
  return needsOnboarding;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const testAuth = isTestAuthEnabled() && request.cookies.get(TEST_AUTH_COOKIE)?.value === "1";

  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const pathname = request.nextUrl.pathname;
  const inOnboarding = pathname === ONBOARDING_PATH || pathname.startsWith(`${ONBOARDING_PATH}/`);

  // Rule 1: redirect anonymous users to login (with original path preserved).
  if (!user && !testAuth && !isPublicPath(pathname) && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    if (pathname !== "/auth/login") {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  // Rules 2 + 4: athlete-path redirect to onboarding.
  if (testAuth && !inOnboarding && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = ONBOARDING_PATH;
    return NextResponse.redirect(url);
  }

  if (user && !inOnboarding && !isPublicPath(pathname)) {
    const userId = (user as { sub?: string }).sub;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, player_id")
        .eq("id", userId)
        .maybeSingle();

      const claimIntent = request.cookies.get(CLAIM_INTENT_COOKIE)?.value;
      if (
        shouldRedirectToOnboarding({
          pathname,
          profile,
          claimIntentCookie: claimIntent,
        })
      ) {
        const url = request.nextUrl.clone();
        url.pathname = ONBOARDING_PATH;
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
