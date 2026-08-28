import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const createServerClient = vi.fn();
vi.mock("@supabase/ssr", () => ({ createServerClient }));

function request(origin = "http://localhost") {
  const crossSite = origin !== "http://localhost";
  return new Request("http://localhost/api/admin/logout", {
    method: "POST",
    headers: {
      host: "localhost",
      origin,
      "sec-fetch-site": crossSite ? "cross-site" : "same-origin",
    },
  }) as unknown as NextRequest;
}

describe("dedicated admin logout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects cross-origin submissions", async () => {
    const { isTrustedAdminLogoutOrigin } = await import("@/app/api/admin/logout/route");
    expect(
      isTrustedAdminLogoutOrigin("https://attacker.example", "cross-site", "localhost"),
    ).toBe(false);
  });

  it("ends the local Supabase session and returns to admin sign-in", async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    createServerClient.mockReturnValue({ auth: { signOut } });
    const { POST } = await import("@/app/api/admin/logout/route");
    const response = await POST(request());

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/auth/admin");
  });
});
