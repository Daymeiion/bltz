// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), player: vi.fn(), videos: vi.fn(), save: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, from: (table: string) => {
  const chain = { select: () => chain, eq: () => chain, in: mocks.videos, maybeSingle: mocks.player, upsert: mocks.save };
  return chain;
} }) }));
import { PUT } from "@/app/api/locker/hero-videos/route";
const id = "00000000-0000-4000-8000-000000000001";
const request = (body: unknown = { mobile: id, desktop: null }, origin = "http://localhost") => new Request("http://localhost/api/locker/hero-videos", {
  method: "PUT", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id } } });
  mocks.player.mockResolvedValue({ data: { id }, error: null });
  mocks.videos.mockResolvedValue({ data: [{ id, playback_url: "https://example.com/video.mp4" }], error: null });
  mocks.save.mockResolvedValue({ error: null });
});
it("rejects anonymous users and users without an owned athlete", async () => {
  mocks.auth.mockResolvedValueOnce({ data: { user: null } });
  expect((await PUT(request())).status).toBe(401);
  mocks.player.mockResolvedValueOnce({ data: null, error: null });
  expect((await PUT(request())).status).toBe(403);
  expect(mocks.save).not.toHaveBeenCalled();
});
it("rejects cross-origin and invalid requests", async () => {
  expect((await PUT(request(undefined, "https://attacker.example"))).status).toBe(403);
  expect((await PUT(request({ mobile: "invalid", desktop: null }))).status).toBe(400);
  expect(mocks.save).not.toHaveBeenCalled();
});
it("rejects unavailable or unplayable video choices", async () => {
  mocks.videos.mockResolvedValueOnce({ data: [], error: null });
  expect((await PUT(request())).status).toBe(400);
  mocks.videos.mockResolvedValueOnce({ data: [{ id, playback_url: "https://youtube.com/watch?v=dQw4w9WgXcQ" }], error: null });
  expect((await PUT(request())).status).toBe(400);
  expect(mocks.save).not.toHaveBeenCalled();
});
it("saves selections and permits clearing both to restore the slideshow", async () => {
  expect((await PUT(request())).status).toBe(200);
  expect(mocks.save).toHaveBeenCalledWith({ player_id: id, hero_videos_configured: true, hero_video_mobile_id: id, hero_video_desktop_id: null }, { onConflict: "player_id" });
  expect((await PUT(request({ mobile: null, desktop: null }))).status).toBe(200);
});
it("reports persistence failure rather than claiming success", async () => {
  mocks.save.mockResolvedValueOnce({ error: { code: "42703" } });
  expect((await PUT(request())).status).toBe(503);
});
