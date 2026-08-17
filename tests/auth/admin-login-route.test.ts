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

function supabaseFor(role: string | null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: role ? { role } : null, error: null })),
  };
  return {
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
    },
    from: vi.fn(() => query),
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

  it("rejects authenticated users without the admin profile role", async () => {
    createServerClient.mockReturnValue(supabaseFor("player"));
    const { POST } = await import("@/app/api/admin/login/route");
    const response = await POST(request("email=player%40bltz.test&password=secret"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/auth/admin?error=not_admin");
  });

  it("redirects verified admins to Beta Intelligence", async () => {
    createServerClient.mockReturnValue(supabaseFor("admin"));
    const { POST } = await import("@/app/api/admin/login/route");
    const response = await POST(request("email=admin%40bltz.test&password=secret"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/admin/beta");
    expect(response.headers.get("set-cookie")).toContain("bltz_test_auth=");
  });
});
