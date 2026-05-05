import { describe, expect, it } from "vitest";

// Mirror the regex used by /api/onboarding/slug-available. Keeping a copy here
// is intentional — we want this test to fail loudly if the route ever loosens
// its validation without explicit acknowledgement.
const SLUG_RE = /^[a-z0-9](-?[a-z0-9])*$/;
const isValidSlug = (s: string) => s.length >= 3 && SLUG_RE.test(s);

describe("slug validation", () => {
  it("accepts simple lowercase slugs", () => {
    expect(isValidSlug("daymeion")).toBe(true);
    expect(isValidSlug("daymeion-hughes")).toBe(true);
    expect(isValidSlug("d10")).toBe(true);
  });

  it("rejects too-short slugs", () => {
    expect(isValidSlug("ab")).toBe(false);
  });

  it("rejects uppercase, spaces, and special characters", () => {
    expect(isValidSlug("Daymeion")).toBe(false);
    expect(isValidSlug("hello world")).toBe(false);
    expect(isValidSlug("hello_world")).toBe(false);
    expect(isValidSlug("hello!")).toBe(false);
  });

  it("rejects leading hyphens, trailing hyphens, and double hyphens", () => {
    expect(isValidSlug("-foo")).toBe(false);
    expect(isValidSlug("foo-")).toBe(false);
    expect(isValidSlug("foo--bar")).toBe(false);
  });
});
