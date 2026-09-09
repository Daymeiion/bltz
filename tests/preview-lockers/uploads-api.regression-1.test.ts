// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), storageFrom: vi.fn(), signed: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc, from: mocks.from, storage: { from: mocks.storageFrom } }) }));
import { POST } from "@/app/api/preview-lockers/[id]/uploads/route";

const id = "00000000-0000-4000-8000-000000000001";
const request = (body: unknown, origin = "http://://bad") => new Request(`http://localhost/api/preview-lockers/${id}/uploads`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: "admin" } }, error: null }); mocks.rpc.mockResolvedValue({ data: true, error: null });
  for (const key of ["from", "select", "eq"] as const) mocks[key].mockReturnValue(mocks);
  mocks.maybeSingle.mockResolvedValue({ data: { photos: [], videos: [] }, error: null });
  mocks.storageFrom.mockReturnValue({ createSignedUploadUrl: mocks.signed }); mocks.signed.mockResolvedValue({ data: { token: "signed-token" }, error: null });
});

// Regression: multiple large media files need private direct-upload tickets, not Vercel request bodies.
it("rejects cross-origin, mismatched and oversized upload requests", async () => {
  expect((await POST(request({ kind: "photo", mimeType: "image/jpeg", size: 100 }), { params: Promise.resolve({ id }) })).status).toBe(403);
  expect((await POST(request({ kind: "video", mimeType: "image/jpeg", size: 100 }, "http://localhost"), { params: Promise.resolve({ id }) })).status).toBe(400);
  expect((await POST(request({ kind: "photo", mimeType: "image/jpeg", size: 11 * 1024 * 1024 }, "http://localhost"), { params: Promise.resolve({ id }) })).status).toBe(400);
  expect(mocks.signed).not.toHaveBeenCalled();
});

it("denies anonymous and non-admin callers before issuing storage tickets", async () => {
  mocks.auth.mockResolvedValueOnce({ data: { user: null }, error: null });
  expect((await POST(request({ kind: "photo", mimeType: "image/jpeg", size: 100 }, "http://localhost"), { params: Promise.resolve({ id }) })).status).toBe(401);
  mocks.auth.mockResolvedValue({ data: { user: { id: "viewer" } }, error: null }); mocks.rpc.mockResolvedValue({ data: false, error: null });
  expect((await POST(request({ kind: "photo", mimeType: "image/jpeg", size: 100 }, "http://localhost"), { params: Promise.resolve({ id }) })).status).toBe(403);
  expect(mocks.signed).not.toHaveBeenCalled();
});

it("reports missing previews, item limits, and storage failures honestly", async () => {
  mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
  expect((await POST(request({ kind: "photo", mimeType: "image/jpeg", size: 100 }, "http://localhost"), { params: Promise.resolve({ id }) })).status).toBe(404);
  mocks.maybeSingle.mockResolvedValueOnce({ data: { photos: Array(40).fill({}), videos: [] }, error: null });
  expect((await POST(request({ kind: "photo", mimeType: "image/jpeg", size: 100 }, "http://localhost"), { params: Promise.resolve({ id }) })).status).toBe(409);
  mocks.maybeSingle.mockResolvedValueOnce({ data: { photos: [], videos: [] }, error: null }); mocks.signed.mockResolvedValueOnce({ data: null, error: { message: "private detail" } });
  const unavailable = await POST(request({ kind: "photo", mimeType: "image/jpeg", size: 100 }, "http://localhost"), { params: Promise.resolve({ id }) });
  expect(unavailable.status).toBe(503); expect(await unavailable.text()).not.toContain("private detail");
});

it("issues one immutable private-path token after admin and record checks", async () => {
  const response = await POST(request({ kind: "video", mimeType: "video/mp4", size: 1024 }, "http://localhost"), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toMatchObject({ bucket: "preview-locker-videos", token: "signed-token" });
  expect(body.path).toMatch(new RegExp(`^${id}/videos/[0-9a-f-]{36}\\.mp4$`));
  expect(mocks.signed).toHaveBeenCalledWith(body.path);
});
