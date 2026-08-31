import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createServerClient = vi.fn();
vi.mock("@supabase/ssr", () => ({ createServerClient }));

function request(origin = "http://localhost") {
  const crossSite = origin !== "http://localhost";
  const result = new NextRequest("http://localhost/api/admin/logout", {
    method: "POST",
    headers: {
      host: "localhost",
      origin,
      "sec-fetch-site": crossSite ? "cross-site" : "same-origin",
    },
  });
  // happy-dom Request strips browser-forbidden headers in its constructor.
  result.headers.set("origin", origin);
  result.headers.set("sec-fetch-site", crossSite ? "cross-site" : "same-origin");
  return result;
}

describe("dedicated admin logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://unit.supabase.co");
  });
  afterEach(() => vi.unstubAllEnvs());

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
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each(["returned", "thrown"])("expires old and staged auth cookies even when signout fails (%s)", async kind => {
    const signOut = vi.fn();
    if (kind === "returned") signOut.mockResolvedValue({ error: { message: "private auth failure" } });
    else signOut.mockRejectedValue(new Error("private auth failure"));
    createServerClient.mockImplementationOnce((_url, _key, options) => {
      options.cookies.setAll([{ name: "sb-unit-auth-token.1", value: "staged-session", options: { path: "/" } }]);
      return { auth: { signOut } };
    });
    const incoming = request();
    incoming.cookies.set("sb-unit-auth-token.0", "old-session");
    incoming.cookies.set("sb-unit-auth-token-code-verifier", "old-verifier");
    incoming.cookies.set("sb-other-auth-token", "unrelated-session");
    const { POST } = await import("@/app/api/admin/logout/route");
    const response = await POST(incoming);
    for (const key of ["sb-unit-auth-token.0", "sb-unit-auth-token.1", "sb-unit-auth-token-code-verifier"]) {
      expect(response.cookies.get(key)).toMatchObject({ value: "", maxAge: 0 });
    }
    expect(response.cookies.has("sb-other-auth-token")).toBe(false);
    expect(response.headers.get("location")).toBe("http://localhost/auth/admin?error=logout_unavailable");
    expect(response.headers.get("set-cookie")).not.toMatch(/old-session|staged-session|private auth failure/);
  });

  it("rejects a cross-site POST before creating an Auth client", async () => {
    const { POST } = await import("@/app/api/admin/logout/route");
    expect((await POST(request("https://attacker.example"))).status).toBe(403);
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
