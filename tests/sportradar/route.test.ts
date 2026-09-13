import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: { id: "admin-id" } as {id:string} | null, admin: true, preview: vi.fn(), ingest: vi.fn(), usage: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) } }) }));
vi.mock("@/lib/rbac", () => ({ isInternalAdmin: async () => mocks.admin }));
vi.mock("@/lib/sportradar/service", () => ({ previewProfile: mocks.preview, importProfile: mocks.ingest, getTrialUsage: mocks.usage }));
import { GET, POST } from "@/app/api/admin/sportradar/route";
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: "admin-id" }; mocks.admin = true; });
const post = (body: unknown) => POST(new Request("http://localhost/api/admin/sportradar", { method: "POST", body: JSON.stringify(body) }));
describe("admin stats authorization", () => {
  it("rejects anonymous reads and writes before provider work", async () => {
    mocks.user = null;
    expect((await GET(new Request("http://localhost/api/admin/sportradar"))).status).toBe(401);
    expect((await post({})).status).toBe(401); expect(mocks.preview).not.toHaveBeenCalled();
  });
  it("rejects a signed-in non-admin", async () => { mocks.admin = false; expect((await post({})).status).toBe(403); });
  it("requires explicit approval and valid IDs", async () => {
    expect((await post({ action: "import", ingestionId: "bad" })).status).toBe(400);
    expect(mocks.ingest).not.toHaveBeenCalled();
  });
  it("binds imports to the authenticated admin", async () => {
    const id = "3069db07-aa43-4503-ab11-2ae5c0002721";
    mocks.ingest.mockResolvedValue(id);
    const result = await post({ action: "import", ingestionId: id, previewId: id, approved: true, actorId: "spoofed" });
    expect(result.status).toBe(200); expect(mocks.ingest).toHaveBeenCalledWith(expect.any(Object),id,id,"admin-id");
    expect(result.headers.get("cache-control")).toContain("no-store");
  });
});
