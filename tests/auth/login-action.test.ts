import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn();
const deleteCookie = vi.fn();
const redirect = vi.fn((destination: string) => {
  throw new Error(`REDIRECT:${destination}`);
});

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ delete: deleteCookie })) }));

function credentials(next = "/admin/beta") {
  const formData = new FormData();
  formData.set("email", "admin@bltz.test");
  formData.set("password", "valid-password");
  formData.set("next", next);
  return formData;
}

describe("server-owned login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the Supabase error instead of silently resetting", async () => {
    createClient.mockResolvedValue({
      auth: { signInWithPassword: vi.fn(async () => ({ data: null, error: { message: "Invalid login credentials" } })) },
    });
    const { login } = await import("@/app/auth/login/actions");

    await expect(login({ error: null }, credentials())).resolves.toEqual({ error: "Invalid login credentials" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects a successful login to the requested internal route", async () => {
    createClient.mockResolvedValue({
      auth: { signInWithPassword: vi.fn(async () => ({ data: { user: { id: "admin-1" } }, error: null })) },
    });
    const { login } = await import("@/app/auth/login/actions");

    await expect(login({ error: null }, credentials())).rejects.toThrow("REDIRECT:/admin/beta");
    expect(deleteCookie).toHaveBeenCalledWith("bltz_test_auth");
    expect(redirect).toHaveBeenCalledWith("/admin/beta");
  });
});
