import { describe, expect, it } from "vitest";
import {
  getDefaultAuthenticatedPath,
  getPasswordRecoveryRedirectUrl,
  getSafeInternalNext,
  getSafeInternalPath,
} from "@/lib/auth/redirects";

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

  it("routes password recovery through the server callback before the update form", () => {
    expect(getPasswordRecoveryRedirectUrl("http://localhost:3100")).toBe(
      "http://localhost:3100/auth/callback?next=%2Fauth%2Fupdate-password",
    );
  });

  it.each(["/\\evil.example", "/%2fevil.example", "/%252fevil.example", "/foo\nbar", "/%00evil", "/x/..//evil.example", "/auth/sign-up?next=foo"])("rejects unsafe destination %s", next => {
    expect(getSafeInternalPath(next)).toBeNull();
  });

  it("retains ordinary local query and fragment destinations", () => {
    expect(getSafeInternalPath("/admin/gtm/contacts?queue=identity_review#table")).toBe("/admin/gtm/contacts?queue=identity_review#table");
  });
});
