import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: createSupabaseClient,
}));

describe("privileged Supabase client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("keeps an sb_secret key in the non-persistent server client", async () => {
    const expectedClient = { kind: "server-service-client" };
    createSupabaseClient.mockReturnValue(expectedClient);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://staging.example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test-only-not-a-real-key";

    const { createServiceClient } = await import("@/lib/supabase/service");

    expect(createServiceClient()).toBe(expectedClient);
    expect(createSupabaseClient).toHaveBeenCalledWith(
      "https://staging.example.supabase.co",
      "sb_secret_test-only-not-a-real-key",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  });

  it("fails before constructing a client when server credentials are absent", async () => {
    const { createServiceClient } = await import("@/lib/supabase/service");

    expect(() => createServiceClient()).toThrow(
      "missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    expect(createSupabaseClient).not.toHaveBeenCalled();
  });
});
