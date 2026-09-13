// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mock.auth }, rpc: mock.rpc }),
}));

import { POST } from "@/app/api/preview-lockers/[id]/completion/route";

const id = "00000000-0000-4000-8000-000000000001";
const request = (body: unknown) => new Request(`http://localhost/api/preview-lockers/${id}/completion`, {
  method: "POST",
  headers: { origin: "http://localhost", "content-type": "application/json" },
  body: JSON.stringify(body),
});

beforeEach(() => {
  vi.resetAllMocks();
  mock.auth.mockResolvedValue({ data: { user: { id: "admin" } } });
  mock.rpc.mockResolvedValueOnce({ data: true });
});

it("completes only the exact persisted revision", async () => {
  mock.rpc.mockResolvedValueOnce({ data: "completed", error: null });
  const response = await POST(request({ revision: 4 }), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ complete: true, revision: 4, unchanged: false });
  expect(mock.rpc).toHaveBeenLastCalledWith("complete_gtm_player_preview", {
    p_preview_locker_id: id,
    p_revision: 4,
  });
});

it("returns a conflict for a stale revision and rejects an unlinked preview", async () => {
  mock.rpc.mockResolvedValueOnce({ data: "revision_conflict", error: null });
  expect((await POST(request({ revision: 2 }), { params: Promise.resolve({ id }) })).status).toBe(409);

  mock.rpc.mockResolvedValueOnce({ data: true });
  mock.rpc.mockResolvedValueOnce({ data: "not_linked", error: null });
  expect((await POST(request({ revision: 2 }), { params: Promise.resolve({ id }) })).status).toBe(400);
});

it("denies unauthorized requests before completion RPC", async () => {
  mock.auth.mockResolvedValue({ data: { user: null } });
  const response = await POST(request({ revision: 1 }), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(401);
  expect(mock.rpc).not.toHaveBeenCalled();
});
