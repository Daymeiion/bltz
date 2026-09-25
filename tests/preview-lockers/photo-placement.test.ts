// @vitest-environment node
import { expect, it } from "vitest";
import { previewRecord, previewPhoto } from "@/lib/preview-lockers/validation";
import { previewLockerData, previewPhotoData, toFilmRoomData } from "@/lib/preview-lockers/mapper";
const photo = { id: "portrait", title: "Custom portrait", url: "https://example.com/portrait.png", level: "off-field" };
const base = { id: "00000000-0000-4000-8000-000000000001", slug: "test-player", full_name: "Test Player", revision: 1, created_at: "2026-09-22", updated_at: "2026-09-22" };
it("keeps legacy photos valid and strictly validates placement flags", () => {
  expect(previewPhoto.safeParse(photo).success).toBe(true);
  for (const flag of ["isHeadshot", "inHeroSlideshow"]) {
    for (const value of [true, false]) expect(previewPhoto.safeParse({ ...photo, [flag]: value }).success).toBe(true);
    for (const value of [null, "true", 1]) expect(previewPhoto.safeParse({ ...photo, [flag]: value }).success).toBe(false);
  }
});
it("allows only one headshot", () => {
  expect(previewRecord.safeParse({ ...base, photos: [{ ...photo, isHeadshot: true }, { ...photo, id: "second", isHeadshot: true }] }).success).toBe(false);
});
it("uses the selected PNG in every room and retains slideshow exclusions", () => {
  const row = previewRecord.parse({ ...base, headshot_url: "https://example.com/old.jpg", photos: [{ ...photo, isHeadshot: true, inHeroSlideshow: false }] });
  expect(previewLockerData(row).headshotUrl).toBe(photo.url);
  expect(previewPhotoData(row).athleteHeadshotUrl).toBe(photo.url);
  expect(toFilmRoomData({ ...row, videos: [] }).athleteHeadshotUrl).toBe(photo.url);
  expect(previewLockerData(row).photos[0].inHeroSlideshow).toBe(false);
  expect(previewLockerData({ ...row, photos: [] }).headshotUrl).toBe(row.headshot_url);
});
it("uses resolved private headshots without writing signed URLs into saved content", () => {
  const { url: _url, ...metadata } = photo;
  const row = previewRecord.parse({ ...base, photos: [{ ...metadata, isHeadshot: true, storagePath: `${base.id}/photos/00000000-0000-4000-8000-000000000002.png`, mimeType: "image/png" }] });
  expect(row.headshot_url).toBeNull();
  expect(previewLockerData({ ...row, photos: row.photos.map(item => ({ ...item, url: "https://example.com/signed.png?token=temporary" })) }).headshotUrl).toContain("signed.png");
});
