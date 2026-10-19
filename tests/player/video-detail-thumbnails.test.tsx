// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { VideoListItem } from "@/app/player/[slug]/videos/[videoId]/VideoDetailView";
import type { PublicVideo } from "@/lib/player/public-video";

const base: PublicVideo = { id: "fixture", title: "Career highlights", description: null, thumbnailUrl: null, playbackUrl: null, durationSeconds: 95, level: "cfb", season: "2007", attribution: "Athlete", sourceLabel: "Archive", tags: [], publishedAt: null };
const render = (video: PublicVideo) => renderToStaticMarkup(<VideoListItem video={video} lockerHref="/preview-lockers/fixture-athlete" current />);

it("shows the same YouTube thumbnail as the Film Room when no poster was saved", () => {
  const html = render({ ...base, embedUrl: "https://www.youtube-nocookie.com/embed/abcdefghijk" });
  expect(html).toContain('src="https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg"');
  expect(html).toContain('href="/preview-lockers/fixture-athlete/videos/fixture"');
  expect(html).toContain('aria-current="page"');
  expect(html).not.toContain("<iframe");
});

it("uses a paused uploaded-video frame when there is no poster", () => {
  const html = render({ ...base, playbackUrl: "/uploaded-film.mp4" });
  expect(html).toContain('<video');
  expect(html).toContain('src="/uploaded-film.mp4"');
  expect(html).toContain('preload="metadata"');
  expect(html).not.toContain("autoPlay");
});

it("retains the supplied poster and visible title and metadata", () => {
  const html = render({ ...base, thumbnailUrl: "/poster.jpg" });
  expect(html).toContain("poster.jpg");
  expect(html).toContain("Career highlights");
  expect(html).toContain("1:35 · 2007");
});

it("keeps the fallback and working link when no image or playable source exists", () => {
  const html = render(base);
  expect(html).not.toContain("<img");
  expect(html).not.toContain("<video");
  expect(html).toContain("<svg");
  expect(html).toContain("Career highlights");
});
