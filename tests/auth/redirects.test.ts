import { describe, expect, it } from "vitest";
import { getDefaultAuthenticatedPath, getSafeInternalNext, getSafeInternalPath } from "@/lib/auth/redirects";

describe("authenticated redirect selection", () => {
  it("preserves a requested private dashboard route", () => {
    expect(getSafeInternalNext("?next=%2Fadmin%2Fbeta")).toBe("/admin/beta");
    expect(getSafeInternalPath("/admin/beta")).toBe("/admin/beta");
  });

  it("rejects external and protocol-relative redirect targets", () => {
    expect(getSafeInternalNext("?next=https%3A%2F%2Fevil.example")).toBeNull();
    expect(getSafeInternalNext("?next=%2F%2Fevil.example")).toBeNull();
  });

  it("avoids redirecting back into login", () => {
    expect(getSafeInternalNext("?next=%2Fauth%2Flogin")).toBeNull();
  });

  it("selects a useful default by role", () => {
    expect(getDefaultAuthenticatedPath("admin")).toBe("/admin/beta");
    expect(getDefaultAuthenticatedPath("player")).toBe("/dashboard");
    expect(getDefaultAuthenticatedPath("fan")).toBe("/");
  });
});
