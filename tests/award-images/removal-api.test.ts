// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mock.auth }, rpc: mock.rpc, from: mock.from }) }));
import { DELETE, PATCH } from "@/app/api/admin/award-images/[id]/route";

const id = "00000000-0000-4000-8000-000000000001";
const context = (imageId = id) => ({ params: Promise.resolve({ id: imageId }) });
const request = (body: unknown = { revision: 3 }, origin = "https://bltz.vercel.app", method = "DELETE") => new Request(`https://bltz.vercel.app/api/admin/award-images/${id}`, {
  method, headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.resetAllMocks();
  mock.auth.mockResolvedValue({ data: { user: { id: "admin" } } });
  mock.rpc.mockResolvedValue({ data: true });
  for (const name of ["from", "update", "eq", "select"] as const) mock[name].mockReturnValue(mock);
  mock.maybeSingle.mockResolvedValue({ data: { id, active: false, revision: 4 } });
});

it.each([DELETE, PATCH])("authorizes removal and restoration before touching images", async handler => {
  mock.auth.mockResolvedValue({ data: { user: null } });
  expect((await handler(request(), context())).status).toBe(401);
  mock.auth.mockResolvedValue({ data: { user: { id: "viewer" } } });
  mock.rpc.mockResolvedValue({ data: false });
  expect((await handler(request(), context())).status).toBe(403);
  expect(mock.from).not.toHaveBeenCalled();
});

it("rejects cross-origin, invalid IDs and invalid or unbounded removal bodies", async () => {
  expect((await DELETE(request(undefined, "https://evil.example.com"), context())).status).toBe(403);
  expect((await DELETE(request(), context("not-a-uuid"))).status).toBe(400);
  for (const body of [{}, { revision: 0 }, { revision: 1.5 }, { revision: 3, storage_path: "images/other.png" }]) {
    expect((await DELETE(request(body), context())).status).toBe(400);
  }
  expect((await DELETE(request({ extra: "x".repeat(1025) }), context())).status).toBe(413);
  expect(mock.update).not.toHaveBeenCalled();
});

it("removes only the requested revision using the existing audited soft removal", async () => {
  const response = await DELETE(request(), context());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id, active: false, revision: 4 });
  expect(mock.from).toHaveBeenCalledWith("award_image_assets");
  expect(mock.update).toHaveBeenCalledExactlyOnceWith({ active: false });
  expect(mock.eq.mock.calls).toEqual([["id", id], ["revision", 3]]);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("reports stale edits and database errors without claiming removal succeeded", async () => {
  mock.maybeSingle.mockResolvedValueOnce({ data: null });
  const stale = await DELETE(request(), context());
  expect(stale.status).toBe(409);
  expect(await stale.json()).toEqual({ error: "award_image_changed" });
  mock.maybeSingle.mockResolvedValueOnce({ error: { message: "database unavailable" } });
  expect((await DELETE(request(), context())).status).toBe(503);
});

it("restores a removed image without rewriting its metadata and rejects stale restoration", async () => {
  mock.maybeSingle.mockResolvedValueOnce({ data: { id, active: true, revision: 5 } });
  const response = await PATCH(request({ revision: 4, active: true }, undefined, "PATCH"), context());
  expect(await response.json()).toEqual({ id, active: true, revision: 5 });
  expect(mock.update).toHaveBeenCalledExactlyOnceWith({ active: true });
  expect(mock.eq).toHaveBeenCalledWith("revision", 4);
  mock.maybeSingle.mockResolvedValueOnce({ data: null });
  expect((await PATCH(request({ revision: 4, active: true }), context())).status).toBe(409);
});

it("keeps the existing revision-protected metadata update available", async () => {
  const details = { title: "Trophy", image_source_url: null, image_license: null, attribution: null, asset_status: "placeholder", active: true };
  expect((await PATCH(request({ revision: 3, details }, undefined, "PATCH"), context())).status).toBe(200);
  expect(mock.update).toHaveBeenCalledExactlyOnceWith(details);
});
