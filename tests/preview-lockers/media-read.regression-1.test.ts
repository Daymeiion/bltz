// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { previewContent } from "@/lib/preview-lockers/validation";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), storageFrom: vi.fn(), signed: vi.fn() }));
const service = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), storageFrom: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc, from: mocks.from, storage: { from: mocks.storageFrom } }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({ ...service, storage: { from: service.storageFrom } }) }));
import { readPrivatePreview } from "@/lib/preview-lockers/server";

const id = "00000000-0000-4000-8000-000000000001";
const path = `${id}/videos/00000000-0000-4000-8000-000000000002.mp4`;
const content = previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", videos: [{ id: "video-1", title: "Private film", storagePath: path, mimeType: "video/mp4", thumb: null }] });
const row = { ...content, id, revision: 1, created_at: "", updated_at: "" };
beforeEach(() => {
  vi.resetAllMocks(); mocks.rpc.mockImplementation(async (name: string) => ({data:name === "is_internal_admin" ? false : 900,error:null})); mocks.auth.mockResolvedValue({ data: { user: { id: "viewer" } }, error: null });
  for (const key of ["from", "select", "eq"] as const) service[key].mockReturnValue(service);
  service.maybeSingle.mockResolvedValue({ data: row, error: null });
  service.rpc.mockResolvedValue({ data: { state: "unavailable", remaining_seconds: 0 }, error: null });
  service.storageFrom.mockReturnValue({ createSignedUrls: mocks.signed });
  for (const key of ["from", "select", "eq"] as const) mocks[key].mockReturnValue(mocks);
  mocks.maybeSingle.mockResolvedValue({ data: row, error: null }); mocks.storageFrom.mockReturnValue({ createSignedUrls: mocks.signed });
});

// Regression: persisted private paths must become short-lived URLs only after the preview read is authorized.
it("resolves uploaded media through the matching private bucket", async () => {
  mocks.signed.mockResolvedValue({ data: [{ signedUrl: "https://storage.example/signed" }], error: null });
  const result = await readPrivatePreview("fixture-player");
  expect(service.storageFrom).toHaveBeenCalledWith("preview-locker-videos");
  expect(mocks.storageFrom).not.toHaveBeenCalled();
  expect(mocks.signed).toHaveBeenCalledWith([path], 900);
  expect(result?.videos[0].url).toBe("https://storage.example/signed");
});

it("fails closed when a private read URL cannot be signed", async () => {
  mocks.signed.mockResolvedValue({ data: null, error: { message: "private detail" } });
  await expect(readPrivatePreview("fixture-player")).rejects.toMatchObject({ code: "preview_media_unavailable", status: 503 });
});

it("caps signing at the remaining grant lifetime and rejects expired grants", async () => {
 mocks.rpc.mockImplementation(async (name: string) => ({data:name === "is_internal_admin" ? false : 12,error:null})); mocks.signed.mockResolvedValue({data:[{signedUrl:"https://storage.example/signed"}],error:null});
 await readPrivatePreview("fixture-player"); expect(mocks.signed).toHaveBeenCalledWith([path],12);
 mocks.signed.mockClear(); mocks.rpc.mockImplementation(async (name: string) => ({data:name === "is_internal_admin" ? false : 0,error:null}));
 await expect(readPrivatePreview("fixture-player")).rejects.toMatchObject({code:"preview_expired"}); expect(mocks.signed).not.toHaveBeenCalled();
});

it("bounds public media signing to remaining database lifetime and fails closed at expiry", async () => {
  mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
  service.rpc.mockResolvedValue({ data: { state: "active", remaining_seconds: 9 }, error: null });
  mocks.signed.mockResolvedValue({ data: [{ signedUrl: "https://storage.example/signed" }], error: null });
  await readPrivatePreview("fixture-player");
  expect(mocks.signed).toHaveBeenCalledWith([path], 9);
  mocks.signed.mockClear();
  service.rpc.mockResolvedValueOnce({ data: { state: "active", remaining_seconds: 1 }, error: null })
    .mockResolvedValueOnce({ data: { state: "expired", remaining_seconds: 0 }, error: null });
  await expect(readPrivatePreview("fixture-player")).rejects.toMatchObject({ code: "preview_expired" });
  expect(mocks.signed).not.toHaveBeenCalled();
});
