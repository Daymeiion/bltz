import { describe, expect, it } from "vitest";
import { createMockPublicVideos, publicVideoLevel, toPublicVideo } from "@/lib/player/public-video";

describe("public video mapping", () => {
  it("classifies career levels from tags and metadata", () => {
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

    expect(video.level).toBe("pro");
    expect(video.season).toBe("2025");
    expect(video.attribution).toBe("Team Media");
    expect(video.publishedAt).toBe("2026-07-15T12:00:00.000Z");
  });

  it("provides every public Film Room category in the development preview", () => {
    const levels = new Set(createMockPublicVideos("Demo Player").map((video) => video.level));
    expect(levels).toEqual(new Set(["hs", "cfb", "pro", "off-field"]));
  });
});
