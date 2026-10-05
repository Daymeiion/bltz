import { describe, expect, it } from "vitest";
import { createMockPublicVideos, publicVideoLevel, toPublicVideo } from "@/lib/player/public-video";

describe("public video mapping", () => {
  it("classifies all four supported career levels from tags and metadata", () => {
    expect(publicVideoLevel(["high school"], null)).toBe("hs");
    expect(publicVideoLevel(["nfl"], null)).toBe("pro");
    expect(publicVideoLevel(["community"], null)).toBe("off-field");
    expect(publicVideoLevel([], { level: "college" })).toBe("cfb");
  });

  it("maps Supabase video fields into the public contract", () => {
    const video = toPublicVideo({
      id: "video-1",
      title: "Season Film",
      description: "A verified reel.",
      thumbnail_url: "/thumb.jpg",
      playback_url: "/film.mp4",
      duration_seconds: 95,
      tags: ["highlights"],
      created_at: "2026-07-15T12:00:00.000Z",
      meta: { level: "pro", season: 2025, publisher: "Team Media" },
    }, "Athlete Name");

    expect(video).toMatchObject({
      id: "video-1", title: "Season Film", description: "A verified reel.",
      thumbnailUrl: "/thumb.jpg", playbackUrl: "/film.mp4", durationSeconds: 95,
      level: "pro", season: "2025", attribution: "Team Media", sourceLabel: "BLTZ FILM",
      tags: ["highlights"], publishedAt: "2026-07-15T12:00:00.000Z",
    });
  });

  it("preserves the published college and pro demo films without inventing absent categories", () => {
    const videos = createMockPublicVideos("Demo Player");
    expect(new Set(videos.map(video => video.level))).toEqual(new Set(["cfb", "pro"]));
    expect(videos.map(({ id, level, season }) => ({ id, level, season }))).toEqual([
      { id: "dante-film-01", level: "cfb", season: "2006" },
      { id: "dante-film-02", level: "cfb", season: "2006" },
      { id: "dante-film-03", level: "pro", season: "2011" },
    ]);
    expect(videos.every(video => video.attribution === "Demo Player" && video.sourceLabel === "PRIVATE FILM" && video.publishedAt === null)).toBe(true);
    expect(videos.every(video => video.playbackUrl?.endsWith(".mp4") && video.thumbnailUrl && (video.durationSeconds ?? 0) > 0)).toBe(true);
  });
});
