// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc, from: mocks.from }) }));
import { DELETE, POST } from "@/app/api/preview-lockers/[id]/viewer/route";

const id = "00000000-0000-4000-8000-000000000001";
const request = (method: "POST" | "DELETE", body: unknown) => new Request(`http://localhost/api/preview-lockers/${id}/viewer`, { method, headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: "admin" } }, error: null });
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "is_internal_admin" ? true : name === "assign_preview_locker_viewer" ? "assigned" : true, error: null }));
});

it("denies anonymous and assigned-player callers before viewer mutation", async () => {
  mocks.auth.mockResolvedValueOnce({ data: { user: null }, error: null });
  expect((await POST(request("POST", { email: "viewer@example.com" }), { params: Promise.resolve({ id }) })).status).toBe(401);
  mocks.auth.mockResolvedValue({ data: { user: { id: "assigned-viewer" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  expect((await DELETE(request("DELETE", {}), { params: Promise.resolve({ id }) })).status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalledWith("revoke_preview_locker_viewer", expect.anything());
});

it("normalizes exact email and returns bounded assignment status", async () => {
  const response = await POST(request("POST", { email: "  Viewer@Example.COM " }), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ assigned: true, status: "assigned" });
  expect(mocks.rpc).toHaveBeenCalledWith("assign_preview_locker_viewer", { p_preview_locker_id: id, p_email: "viewer@example.com" });
});

it("reports account-not-found and no-viewer honestly", async () => {
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "is_internal_admin" ? true : name === "assign_preview_locker_viewer" ? "account_not_found" : false, error: null }));
  const missing = await POST(request("POST", { email: "missing@example.com" }), { params: Promise.resolve({ id }) });
  expect(missing.status).toBe(404); expect(await missing.json()).toEqual({ error: "account_not_found" });
  const revoked = await DELETE(request("DELETE", {}), { params: Promise.resolve({ id }) });
  expect(await revoked.json()).toEqual({ assigned: false, status: "no_viewer" });
});

it("rejects malformed email and cross-origin revoke before mutation", async () => {
  expect((await POST(request("POST", { email: "not-an-email" }), { params: Promise.resolve({ id }) })).status).toBe(400);
  const crossOrigin = new Request(`http://localhost/api/preview-lockers/${id}/viewer`, { method: "DELETE", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" });
  expect((await DELETE(crossOrigin, { params: Promise.resolve({ id }) })).status).toBe(403);
});
