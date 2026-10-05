import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createServerClient = vi.fn();
vi.mock("@supabase/ssr", () => ({ createServerClient }));

function request(body: string, origin = "http://localhost") {
  const crossSite = origin !== "http://localhost";
  const incoming = new NextRequest("http://localhost/api/admin/login", {
    method: "POST",
    headers: {
      host: "localhost",
      origin,
      "sec-fetch-site": crossSite ? "cross-site" : "same-origin",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  incoming.headers.set("origin", origin);
  incoming.headers.set("sec-fetch-site", crossSite ? "cross-site" : "same-origin");
  return incoming;
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://unit.supabase.co");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it.each([
    [{ name: "AuthRetryableFetchError", status: 0, message: "fetch failed private detail" }, "authentication_unavailable"],
    [{ status: 503, message: "private upstream failure" }, "authentication_unavailable"],
    [{ status: 408, code: "request_timeout" }, "authentication_unavailable"],
    [{ status: 429, code: "over_request_rate_limit" }, "rate_limited"],
    [{ status: 400, code: "invalid_credentials" }, "invalid_credentials"],
    [{ status: 400, code: "email_not_confirmed" }, "invalid_credentials"],
    [{ status: 403, code: "user_banned" }, "invalid_credentials"],
    [null, "authentication_unavailable"],
  ])("fails closed with safe classification for %j", async (error, reason) => {
    const client = supabaseFor(true);
    client.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: null }, error } as never);
    // Simulate the SDK staging a cookie even on an unsuccessful result.
    createServerClient.mockImplementationOnce((_url, _key, options) => {
      options.cookies.setAll([{ name: "test-staged-auth", value: "must-not-escape", options: { path: "/" } }]);
      return client;
    });
    const { POST } = await import("@/app/api/admin/login/route");
    const response = await POST(request("email=synthetic%40bltz.invalid&password=unit-test-only"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/auth/admin?error=" + reason);
    expect(response.headers.get("set-cookie")).not.toContain("must-not-escape");
    expect(response.cookies.has("test-staged-auth")).toBe(false);
    expect(client.auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
    expect(client.rpc).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledExactlyOnceWith("admin_login_failed", { reason });
  });

  it("handles a thrown network error without exposing details or issuing session values", async () => {
    const client = supabaseFor(true);
    client.auth.signInWithPassword.mockRejectedValueOnce(new TypeError("fetch failed with private detail"));
    createServerClient.mockReturnValue(client);
    const { POST } = await import("@/app/api/admin/login/route");
    const response = await POST(request("email=synthetic%40bltz.invalid&password=unit-test-only"));
    expect(response.headers.get("location")).toContain("error=authentication_unavailable");
    expect(response.headers.get("set-cookie")).not.toMatch(/private|fetch failed/);
    expect(client.auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
    expect(client.rpc).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledExactlyOnceWith("admin_login_failed", { reason: "authentication_unavailable" });
  });

  it.each(["returned", "thrown"])("fails closed when authorization is unavailable (%s)", async kind => {
    const client = supabaseFor(true);
    if (kind === "returned") client.rpc.mockResolvedValueOnce({ data: null, error: { message: "private detail" } } as never);
    else client.rpc.mockRejectedValueOnce(new Error("private detail"));
    createServerClient.mockReturnValue(client);
    const { POST } = await import("@/app/api/admin/login/route");
    const response = await POST(request("email=synthetic%40bltz.invalid&password=unit-test-only"));
    expect(response.headers.get("location")).toContain("error=authorization_unavailable");
    expect(response.headers.get("set-cookie")).not.toContain("private detail");
    expect(client.auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
    expect(client.rpc).toHaveBeenCalledExactlyOnceWith("is_internal_admin");
  });

  it("rejects cross-origin submissions", async () => {
    const { isTrustedAdminLoginOrigin } = await import("@/app/api/admin/login/route");
    expect(
      isTrustedAdminLoginOrigin("https://attacker.example", "cross-site", "localhost"),
    ).toBe(false);
  });

  it("rejects a cross-site POST before creating an Auth client or changing cookies", async () => {
    const { POST } = await import("@/app/api/admin/login/route");
    const incoming = request("email=synthetic%40bltz.invalid&password=unit-test-only", "https://attacker.example");
    incoming.cookies.set("sb-unit-auth-token", "existing-staff-session");
    const response = await POST(incoming);
    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("rejects authenticated users without an active platform assignment", async () => {
    const client = supabaseFor(false);
    createServerClient.mockImplementationOnce((_url, _key, options) => {
      options.cookies.setAll([{ name: "test-staged-auth", value: "must-not-escape", options: { path: "/" } }]);
      return client;
    });
    const { POST } = await import("@/app/api/admin/login/route");
    const response = await POST(request("email=player%40bltz.test&password=secret"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/auth/admin?error=not_admin");
    expect(response.cookies.has("test-staged-auth")).toBe(false);
    expect(response.headers.get("set-cookie")).not.toContain("must-not-escape");
    expect(client.auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
    expect(client.rpc).toHaveBeenCalledExactlyOnceWith("is_internal_admin");
  });

  it("redirects an assigned platform admin to Beta Intelligence", async () => {
    const client = supabaseFor(true);
    createServerClient.mockImplementationOnce((_url, _key, options) => {
      options.cookies.setAll([{ name: "sb-unit-auth-token.0", value: "allowed-test-session", options: { path: "/", httpOnly: true, sameSite: "lax" } }]);
      return client;
    });
    const { POST } = await import("@/app/api/admin/login/route");
    const response = await POST(request("email=admin%40bltz.test&password=secret"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/admin/beta");
    expect(response.headers.get("set-cookie")).toContain("bltz_test_auth=");
    expect(response.cookies.get("sb-unit-auth-token.0")).toMatchObject({ value: "allowed-test-session", httpOnly: true, sameSite: "lax" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });
});
