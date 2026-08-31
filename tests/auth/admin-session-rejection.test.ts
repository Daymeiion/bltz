import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createServerClient, serverClient } = vi.hoisted(() => ({ createServerClient: vi.fn(), serverClient: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("@/lib/supabase/server", () => ({ createClient: serverClient }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://unit.supabase.co");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it.each(["nonadmin", "invalid", "network", "missing", "signout-returned-error", "signout-thrown-error"])(
  "removes a prior admin browser session before protected access after rejected reauth (%s)", async failure => {
    // Stateful cookie jar, not a hard-coded denial: protected access initially
    // succeeds, and only the route's actual expired Set-Cookie result removes it.
    const browser = new Map([
      ["sb-unit-auth-token.0", "previous-staff-session"],
      ["sb-unit-auth-token.1", "previous-staff-session-tail"],
      ["sb-unit-auth-token-code-verifier", "old-verifier"],
      ["sb-other-auth-token", "different-project"],
    ]);
    serverClient.mockImplementation(async () => ({ rpc: vi.fn(async () => ({ data: browser.get("sb-unit-auth-token.0") === "previous-staff-session", error: null })) }));
    const { requireInternalAdmin } = await import("@/lib/rbac");
    await expect(requireInternalAdmin()).resolves.toBeUndefined();
    const signOut = vi.fn(async () => ({ error: null as unknown }));
    if (failure === "signout-returned-error") signOut.mockResolvedValue({ error: new Error("private") });
    if (failure === "signout-thrown-error") signOut.mockRejectedValue(new Error("private"));
    const signInWithPassword = vi.fn(async () => ({ data: { user: { id: "nonadmin" } as { id: string } | null }, error: null as unknown }));
    if (failure === "invalid") signInWithPassword.mockResolvedValue({ data: { user: null }, error: { status: 400, code: "invalid_credentials" } });
    if (failure === "network") signInWithPassword.mockRejectedValue(new Error("private"));
    createServerClient.mockImplementationOnce((_url, _key, options) => {
      // An SDK result staged during attempted authentication must not escape.
      options.cookies.setAll([{ name: "sb-unit-auth-token", value: "new-rejected-session", options: { path: "/" } }]);
      return { auth: { signInWithPassword, signOut }, rpc: vi.fn(async () => ({ data: false, error: null })) };
    });
    const request = new NextRequest("http://localhost/api/admin/login", {
      method: "POST", headers: { origin: "http://localhost", "content-type": "application/x-www-form-urlencoded" },
      body: failure === "missing" ? "email=" : "email=synthetic%40bltz.invalid&password=unit-only",
    });
    for (const [name, value] of browser) request.cookies.set(name, value);
    const { POST } = await import("@/app/api/admin/login/route");
    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/auth/admin?error=");
    expect(signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
    for (const name of ["sb-unit-auth-token", "sb-unit-auth-token.0", "sb-unit-auth-token.1", "sb-unit-auth-token-code-verifier"]) {
      expect(response.cookies.get(name)).toMatchObject({ value: "", maxAge: 0 });
    }
    for (const cookie of response.cookies.getAll()) {
      if (cookie.maxAge === 0 || (cookie.expires && +cookie.expires <= Date.now())) browser.delete(cookie.name);
      else browser.set(cookie.name, cookie.value);
    }
    expect(browser.get("sb-other-auth-token")).toBe("different-project");
    await expect(requireInternalAdmin()).rejects.toThrow("Forbidden");
    expect(response.headers.get("set-cookie")).not.toMatch(/previous-staff|new-rejected|private/);
  },
);
