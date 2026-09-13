import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PREVIEW_PHOTO_BUCKET, resolvePreviewPhotos } from "@/lib/preview-lockers/photos";
import type { PreviewPhoto } from "@/lib/preview-lockers/types";

const createSignedUrls = vi.fn();
const from = vi.fn(() => ({ createSignedUrls }));
const supabase = { storage: { from } } as never;

function photo(id: string, fields: Partial<PreviewPhoto> = {}): PreviewPhoto {
  return {
    id,
    title: id,
    credits: null,
    sourceUrl: null,
    level: "pro",
    season: null,
    ...fields,
  };
}

describe("private preview photo resolution", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves safe external URLs and signs private storage paths in one batch", async () => {
    createSignedUrls.mockResolvedValue({
      data: [{ path: "locker/photos/a.jpg", signedUrl: "https://storage.example/a.jpg", error: null }],
      error: null,
    });

    const result = await resolvePreviewPhotos(supabase, [
      photo("external", { url: "https://images.example/photo.jpg" }),
      photo("stored", { storagePath: "locker/photos/a.jpg", mimeType: "image/jpeg" }),
    ]);

    expect(from).toHaveBeenCalledWith(PREVIEW_PHOTO_BUCKET);
    expect(createSignedUrls).toHaveBeenCalledWith(["locker/photos/a.jpg"], 3600);
    expect(result.photos.map((item) => item.url)).toEqual([
      "https://images.example/photo.jpg",
      "https://storage.example/a.jpg",
    ]);
  });

  it("limits each response and omits unsafe or unresolved photo records", async () => {
    createSignedUrls.mockResolvedValue({ data: [], error: null });
    const photos = [
      photo("unsafe", { url: "javascript:alert(1)" }),
      ...Array.from({ length: 70 }, (_, index) => photo(String(index), { url: `https://images.example/${index}.jpg` })),
    ];

    const result = await resolvePreviewPhotos(supabase, photos, { limit: 100 });

    expect(result.photos).toHaveLength(59);
    expect(result.total).toBe(71);
    expect(result.nextOffset).toBe(60);
  });

  it("fails the request when private signing fails", async () => {
    createSignedUrls.mockResolvedValue({ data: null, error: { message: "storage unavailable" } });
    await expect(resolvePreviewPhotos(supabase, [photo("stored", { storagePath: "locker/photos/a.jpg" })]))
      .rejects.toThrow("Unable to prepare private preview photos");
  });
});
