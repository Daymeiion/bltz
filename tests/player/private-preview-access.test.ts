import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPrivatePreview } from "@/lib/preview-lockers/read";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), service: vi.fn(), read: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.service }));

describe("private preview server authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.service.mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }) }) });
  });

  it("redirects signed-out users before opening a service client", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(readPrivatePreview("private")).rejects.toThrow("REDIRECT:/auth/login?next=");
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it.each([{ data: false, error: null }, { data: true, error: { message: "failed" } }])("fails closed for non-admins and failed authorization", async result => {
    mocks.rpc.mockResolvedValue(result);
    await expect(readPrivatePreview("private")).rejects.toThrow("NOT_FOUND");
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it("loads a preview only after the database confirms admin authorization", async () => {
    mocks.read.mockResolvedValue({ data: { slug: "private" }, error: null });
    expect((await readPrivatePreview("private")).data.slug).toBe("private");
    expect(mocks.rpc).toHaveBeenCalledWith("is_internal_admin");
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(mocks.service.mock.invocationCallOrder[0]);
  });

  it("distinguishes database failures from missing records", async () => {
    mocks.read.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    await expect(readPrivatePreview("private")).rejects.toThrow("Unable to load");
    mocks.read.mockResolvedValue({ data: null, error: null });
    await expect(readPrivatePreview("private")).rejects.toThrow("NOT_FOUND");
  });
});
