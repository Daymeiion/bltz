import { describe, expect, it } from "vitest";
import { isPublicPath, shouldRedirectToOnboarding } from "@/lib/supabase/middleware";

describe("isPublicPath", () => {
  it("treats root, auth, api, and locker pages as public", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/favicon.ico")).toBe(true);
    expect(isPublicPath("/auth/login")).toBe(true);
    expect(isPublicPath("/api/onboarding/start")).toBe(true);
    expect(isPublicPath("/_next/static/foo.js")).toBe(true);
    expect(isPublicPath("/player/daymeion-hughes")).toBe(true);
  });

  it("treats /dashboard and /onboarding as private", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/onboarding")).toBe(false);
    expect(isPublicPath("/onboarding/loader")).toBe(false);
  });
});

describe("shouldRedirectToOnboarding", () => {
  it("redirects athletes who have not yet been linked to a player row", () => {
    expect(
      shouldRedirectToOnboarding({
        pathname: "/dashboard",
        profile: { role: "player", player_id: null },
      }),
    ).toBe(true);
  });

  it("does NOT redirect fans even if they have no player_id", () => {
    expect(
      shouldRedirectToOnboarding({
        pathname: "/dashboard",
        profile: { role: "fan", player_id: null },
      }),
    ).toBe(false);
  });

  it("redirects users with an active claim cookie regardless of role", () => {
    expect(
      shouldRedirectToOnboarding({
        pathname: "/dashboard",
        profile: { role: "fan", player_id: null },
        claimIntentCookie: "tok_abc123",
      }),
    ).toBe(true);
  });

  it("never redirects when already inside /onboarding", () => {
    expect(
      shouldRedirectToOnboarding({
        pathname: "/onboarding/loader",
        profile: { role: "player", player_id: null },
      }),
    ).toBe(false);
  });

  it("never redirects on public paths", () => {
    expect(
      shouldRedirectToOnboarding({
        pathname: "/",
        profile: { role: "player", player_id: null },
      }),
    ).toBe(false);
    expect(
      shouldRedirectToOnboarding({
        pathname: "/player/daymeion",
        profile: { role: "player", player_id: null },
      }),
    ).toBe(false);
  });

  it("does NOT redirect athletes who already have a player_id", () => {
    expect(
      shouldRedirectToOnboarding({
        pathname: "/dashboard",
        profile: { role: "player", player_id: "p_123" },
      }),
    ).toBe(false);
  });

  it("does NOT redirect when profile is null (fan-by-default)", () => {
    expect(
      shouldRedirectToOnboarding({
        pathname: "/dashboard",
        profile: null,
      }),
    ).toBe(false);
  });
});
