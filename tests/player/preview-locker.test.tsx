import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import LockerView from "@/app/player/[slug]/LockerView";
import PhotoRoomView from "@/app/player/[slug]/photos/PhotoRoomView";
import FilmRoomView from "@/app/player/[slug]/videos/FilmRoomView";
import VideoDetailView from "@/app/player/[slug]/videos/[videoId]/VideoDetailView";
import { toLockerData, toPhotoRoomData, toFilmRoomData } from "@/lib/preview-lockers/mapper";
import type { PreviewLockerRow } from "@/lib/preview-lockers/types";
import { previewVideoSource } from "@/lib/preview-lockers/video";

vi.mock("next/image", () => ({ default: ({ fill: _fill, priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => <img {...props} /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

const row = {
  slug: "preview-athlete", full_name: "Preview Athlete", school_info: null,
  awards: [], photos: [], videos: [{ id: "film", title: "Career film", thumb: null, url: "https://youtu.be/abcdefghijk" }],
} as unknown as PreviewLockerRow;

describe("preview Locker parity", () => {
  it("keeps Locker gallery links inside the preview", () => {
    const html = renderToStaticMarkup(<LockerView data={toLockerData(row)} />);
    expect(html).toContain('href="/preview-lockers/preview-athlete/videos"');
    expect(html).toContain('href="/preview-lockers/preview-athlete/photos"');
    expect(html).not.toContain('href="/player/preview-athlete');
  });

  it("renders six Locker photo tiles and excludes the headshot", () => {
    const photos = [
      { id: "headshot", url: "https://images.example/headshot.jpg", title: "Official headshot", credits: null, sourceUrl: null, level: "pro" as const, season: null },
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `photo-${index}`,
        url: `https://images.example/photo-${index === 7 ? 0 : index}.jpg${index === 7 ? "?duplicate=true" : ""}`,
        title: `Career photo ${index}`,
        credits: null,
        sourceUrl: null,
        level: "pro" as const,
        season: null,
      })),
    ];
    const html = renderToStaticMarkup(<LockerView data={toLockerData({ ...row, headshot_url: photos[0].url, photos })} />);
    expect((html.match(/class="locker-photo-tile"/g) ?? [])).toHaveLength(6);
    expect(html).not.toContain('alt="OFFICIAL HEADSHOT"');
    expect(html).toContain("+1 MORE");
    expect(html).not.toContain('alt="CAREER PHOTO 7"');
  });

  it("keeps gallery return links and film details inside the preview", () => {
    const photoHtml = renderToStaticMarkup(<PhotoRoomView data={toPhotoRoomData(row)} />);
    const filmHtml = renderToStaticMarkup(<FilmRoomView data={toFilmRoomData(row)} />);
    for (const html of [photoHtml, filmHtml]) {
      expect(html).toContain('aria-haspopup="dialog"');
      expect(html).toContain('>CLAIM</button>');
      expect(html).toContain('href="/preview-lockers/preview-athlete"');
      expect(html).not.toContain('href="/player/preview-athlete');
    }
    expect(filmHtml).toContain('href="/preview-lockers/preview-athlete/videos/film"');
    expect(filmHtml).not.toContain('Watch on YouTube');
  });

  it("preserves the public route default", () => {
    const data = toLockerData(row);
    delete data.lockerHref;
    const html = renderToStaticMarkup(<LockerView data={data} />);
    expect(html).toContain('href="/player/preview-athlete/videos"');
    expect(html).not.toContain('spotify-preview-track');
  });

  it("keeps video detail navigation in the preview and avoids public-clearance claims", () => {
    const film = toFilmRoomData(row);
    const html = renderToStaticMarkup(<VideoDetailView data={{ ...film, video: film.videos[0], views: 0, likes: 0, taggedTeammates: [], playerId: null, isFollowing: false }} />);
    expect(html).toContain('href="/preview-lockers/preview-athlete/videos"');
    expect(html).not.toContain('href="/player/preview-athlete');
    expect(html).toContain("not cleared for publication");
    expect(html).not.toContain("verified public BLTZ archive");
    expect(html).toContain('>CLAIM</button>');
  });

  it("maps missing media without adding demo content or canonical identity", () => {
    const data = toFilmRoomData({ ...row, player_id: "canonical-player", videos: [] });
    expect(data.videos).toEqual([]);
    expect(data.athleteId).toBeNull();
    expect(toPhotoRoomData(row).images).toEqual([]);
  });

  it("accepts supported video sources and rejects executable or unrelated URLs", () => {
    expect(previewVideoSource("https://example.com/film.mp4").playbackUrl).toBe("https://example.com/film.mp4");
    for (const url of [null, "javascript:alert(1)", "https://youtube.com.evil.test/watch?v=abcdefghijk", "https://example.com/page"]) {
      expect(previewVideoSource(url)).toEqual({ playbackUrl: null, embedUrl: null });
    }
  });
});


it("orders shelves by career level and navigates cards to individual videos", () => {
  const data = toFilmRoomData(row);
  data.videos = ["hs", "cfb", "pro", "off-field"].map(level => ({ ...data.videos[0], id: level, level: level as typeof data.videos[number]["level"], title: level, embedUrl: null, provider: undefined, playbackUrl: `https://example.com/${level}.mp4` }));
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<FilmRoomView data={data} />);
  expect([...host.querySelectorAll("h1")].map(node => node.textContent)).toEqual(["PRO", "CFB", "HS", "OFF THE FIELD"]);
  for (const video of data.videos) expect(host.querySelector(`[data-gallery-id="${video.id}"]`)?.getAttribute("href")).toBe(`/preview-lockers/preview-athlete/videos/${video.id}`);
  expect(host.querySelector('video[autoplay][muted]')).not.toBeNull();
  data.videos = data.videos.filter(video => video.level !== "hs");
  host.innerHTML = renderToStaticMarkup(<FilmRoomView data={data} />);
  expect(host.querySelector("#hs-heading")).toBeNull();
});
it("keeps the chosen film ahead of the legacy Locker hero", () => {
  const data = toFilmRoomData({ ...row, hero_video_url: "https://example.com/legacy.mp4" });
  expect(data.videos.map(video => video.id)).toEqual(["film", "hero-video"]);
});


it.each(["pro", "cfb", "hs", "off-field"] as const)("honors the explicit %s category over title guesses", level => {
  const film = toFilmRoomData({ ...row, videos: [{ ...row.videos[0], title: "NFL high school interview", level }] });
  expect(film.videos[0].level).toBe(level);
});
