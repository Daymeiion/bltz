import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const createServerClient = vi.fn();
vi.mock("@supabase/ssr", () => ({ createServerClient }));

function request(body: string, origin = "http://localhost") {
  const crossSite = origin !== "http://localhost";
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: {
      host: "localhost",
      origin,
      "sec-fetch-site": crossSite ? "cross-site" : "same-origin",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  }) as unknown as NextRequest;
}

function supabaseFor(isInternalAdmin: boolean) {
  return {
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    rpc: vi.fn(async () => ({ data: isInternalAdmin, error: null })),
  };
}

describe("dedicated admin login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects cross-origin submissions", async () => {
    const { isTrustedAdminLoginOrigin } = await import("@/app/api/admin/login/route");
    expect(
      isTrustedAdminLoginOrigin("https://attacker.example", "cross-site", "localhost"),
    ).toBe(false);
  });

  it("rejects authenticated users without an active platform assignment", async () => {
    const supabase = supabaseFor(false);
    createServerClient.mockReturnValue(supabase);
    const { POST } = await import("@/app/api/admin/login/route");
    const response = await POST(request("email=player%40bltz.test&password=secret"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/auth/admin?error=not_admin");
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("redirects an assigned platform admin to Beta Intelligence", async () => {
    createServerClient.mockReturnValue(supabaseFor(true));
    const { POST } = await import("@/app/api/admin/login/route");
    const response = await POST(request("email=admin%40bltz.test&password=secret"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/admin/beta");
    expect(response.headers.get("set-cookie")).toContain("bltz_test_auth=");
  });
});
