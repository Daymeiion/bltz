// @vitest-environment node
import { expect, it } from "vitest";
import { previewRecord, previewContent } from "@/lib/preview-lockers/validation";
import { previewLockerData } from "@/lib/preview-lockers/mapper";

const base = { id: "00000000-0000-4000-8000-000000000001", slug: "test-player", full_name: "Test Player", revision: 1, created_at: "2026-09-14", updated_at: "2026-09-14" };
it("keeps portrait and landscape hero assignments separate", () => {
  const record = previewRecord.parse({ ...base, videos: [
    { id: "portrait", title: "Portrait", url: "https://example.com/portrait.mp4", thumb: null, heroDevice: "mobile" },
    { id: "landscape", title: "Landscape", url: "https://example.com/landscape.webm", thumb: null, heroDevice: "desktop" },
  ] });
  expect(previewLockerData(record).heroVideos).toEqual({ mobile: "https://example.com/portrait.mp4", desktop: "https://example.com/landscape.webm" });
});
it("uses photos for missing mobile video and excludes provider pages from raw playback", () => {
  const record = previewRecord.parse({ ...base, hero_video_url: "https://example.com/landscape.mp4", videos: [
    { id: "youtube", title: "Provider page", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumb: null },
  ] });
  expect(previewLockerData(record).heroVideos).toEqual({ mobile: null, desktop: "https://example.com/landscape.mp4" });
});
it("retains assignments for private uploads until signed URLs are resolved", () => {
  const record = previewRecord.parse({ ...base, videos: [{ id: "upload", title: "Uploaded portrait", thumb: null, heroDevice: "mobile",
    storagePath: `${base.id}/videos/${base.id}.mp4`, mimeType: "video/mp4" }] });
  expect(previewLockerData(record).heroVideos?.mobile).toBeNull();
  const resolved = { ...record, photos: [], videos: record.videos.map(video => ({ ...video, url: "https://example.com/private.mp4?token=signed" })) };
  expect(previewLockerData(resolved).heroVideos?.mobile).toBe("https://example.com/private.mp4?token=signed");
});
it("rejects duplicate device assignments and unknown device values", () => {
  const video = { title: "Video", url: "https://example.com/video.mp4", thumb: null, heroDevice: "mobile" };
  expect(previewContent.safeParse({ slug: base.slug, full_name: base.full_name, videos: [{ ...video, id: "a" }, { ...video, id: "b" }] }).success).toBe(false);
  expect(previewContent.safeParse({ slug: base.slug, full_name: base.full_name, videos: [{ ...video, id: "a", heroDevice: "tv" }] }).success).toBe(false);
});
