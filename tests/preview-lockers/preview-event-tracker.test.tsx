// @vitest-environment-options {"settings":{"disableIframePageLoading":true,"disableCSSFileLoading":true}}
import React, { act, StrictMode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PreviewEventTracker from "@/components/preview-lockers/PreviewEventTracker";
import PublicPreviewClaim from "@/components/preview-lockers/PublicPreviewClaim";
import PreviewClaimButton from "@/components/preview-lockers/PreviewClaimButton";
import PhotoRoomView from "@/app/player/[slug]/photos/PhotoRoomView";
import LockerView from "@/app/player/[slug]/LockerView";
import VideoDetailView, { type VideoDetailData } from "@/app/player/[slug]/videos/[videoId]/VideoDetailView";
import { previewContent } from "@/lib/preview-lockers/validation";
import { previewLockerData, previewPhotoData, toFilmRoomData } from "@/lib/preview-lockers/mapper";

const publicAnalytics = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/client", () => ({ trackProductEvent: publicAnalytics }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/components/player/YouTubePlayer", () => ({ YouTubePlayer: () => <div data-provider-embed /> }));
vi.mock("@/components/player/VideoPreview", () => ({ VideoPreview: () => null }));
vi.mock("@/components/player/FittedHeroName", () => ({ FittedHeroName: () => null }));
vi.mock("@/components/player/SpotifyPreviewBadge", () => ({ SpotifyPreviewBadge: () => null }));

const previewId = "c0ffb93f-7851-44d4-96e6-e3044b4b3d55";
const row = {
  ...previewContent.parse({ slug: "preview-player", full_name: "Preview Player", photos: [
    { id: "photo-one", title: "First photo", url: "https://assets.example.com/one.jpg", level: "cfb" },
    { id: "photo-two", title: "Second photo", url: "https://assets.example.com/two.jpg", level: "pro" },
  ], videos: [{ id: "film-one", title: "Career film", url: "https://assets.example.com/film.mp4" }] }),
  id: previewId, revision: 1, created_at: "", updated_at: "",
};
const film = toFilmRoomData({ slug: row.slug, full_name: row.full_name, headshot_url: row.headshot_url,
  videos: row.videos.flatMap(video => "url" in video ? [video] : []) });
const detail: VideoDetailData = { ...film, video: film.videos[0], views: 0, likes: 0, taggedTeammates: [], playerId: null, isFollowing: false };
let host: HTMLDivElement;
let root: Root;
let fetcher: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.sessionStorage.clear();
  publicAnalytics.mockReset();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  fetcher = vi.fn(async () => new Response(null, { status: 202 }));
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
function events() { return fetcher.mock.calls.map(([, init]) => JSON.parse(String(init?.body))); }
async function dispatch(element: HTMLElement, name: string) { await act(async () => element.dispatchEvent(new Event(name, { bubbles: true }))); }

it("does not count server rendering or a hidden mount and counts one visible view across StrictMode and visibility changes", async () => {
  expect(renderToStaticMarkup(<PreviewEventTracker previewId={previewId} eventName="locker_view" />)).toBe("");
  expect(fetcher).not.toHaveBeenCalled();
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await act(async () => root.render(<StrictMode><PreviewEventTracker previewId={previewId} eventName="locker_view" /></StrictMode>));
  expect(fetcher).not.toHaveBeenCalled();
  visibility.mockReturnValue("visible");
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  expect(events().map(event => event.eventName)).toEqual(["locker_view"]);
});

it("records photo selection only on an actual image control and preserves preview navigation", async () => {
  await act(async () => root.render(<PhotoRoomView data={previewPhotoData(row)} previewId={previewId} />));
  expect(fetcher).not.toHaveBeenCalled();
  const button = host.querySelector<HTMLButtonElement>('button[aria-label="Show related photo: Second photo"]')!;
  await act(async () => button.click());
  expect(events()).toMatchObject([{ previewId, eventName: "photo_open", assetId: "photo-two" }]);
  expect(button.getAttribute("aria-pressed")).toBe("true");
  expect(host.querySelector('a[href="/preview-lockers/preview-player"]')).not.toBeNull();
  expect(publicAnalytics).not.toHaveBeenCalled();
});

it("counts the Career stats tab only after selection", async () => {
  await act(async () => root.render(<LockerView data={previewLockerData(row)} previewId={previewId} />));
  expect(fetcher).not.toHaveBeenCalled();
  const career = [...host.querySelectorAll<HTMLButtonElement>('button[role="tab"]')].find(button => button.textContent?.trim() === "CAREER")!;
  await act(async () => career.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 })));
  expect(events().map(event => event.eventName)).toEqual(["stats_view"]);
  expect(publicAnalytics).not.toHaveBeenCalled();
});

it("records one claim click when the navigation opens the same public footer form", async () => {
  await act(async () => root.render(<><PreviewClaimButton /><PublicPreviewClaim previewId={previewId} /></>));
  expect(fetcher).not.toHaveBeenCalled();
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click());
  expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  expect(events().map(event => event.eventName)).toEqual(["claim_click"]);
  expect(events()[0]).not.toHaveProperty("email");
  expect(events()[0]).not.toHaveProperty("consent");
  const clickedSession = events()[0].sessionId;
  const email = document.body.querySelector<HTMLInputElement>('input[type="email"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(email, "athlete@example.test");
    email.dispatchEvent(new Event("input", { bubbles: true }));
    document.body.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
  });
  await act(async () => document.body.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  const [url, init] = fetcher.mock.calls[1];
  expect(url).toBe("/api/preview-link-inquiries");
  expect(JSON.parse(String(init?.body))).toMatchObject({ previewId, email: "athlete@example.test", consent: true, sessionId: clickedSession });
  expect(document.body.textContent).toContain("Your request is saved");
});

it("records native playback and watched milestones while excluding seek jumps", async () => {
  await act(async () => root.render(<VideoDetailView data={detail} previewId={previewId} />));
  expect(events().map(event => event.eventName)).toEqual(["film_view", "video_open"]);
  const video = host.querySelector<HTMLVideoElement>('video')!;
  Object.defineProperty(video, "duration", { configurable: true, value: 8 });
  Object.defineProperty(video, "paused", { configurable: true, value: false });
  await dispatch(video, "play");
  video.currentTime = 7;
  await dispatch(video, "seeking"); await dispatch(video, "seeked"); await dispatch(video, "timeupdate");
  expect(events().filter(event => event.eventName === "video_progress")).toHaveLength(0);
  video.currentTime = 0;
  await dispatch(video, "seeking"); await dispatch(video, "seeked");
  for (let second = 1; second <= 8; second += 1) {
    video.currentTime = second; await dispatch(video, "timeupdate");
  }
  await dispatch(video, "ended");
  expect(events().map(event => event.eventName)).toEqual(["film_view", "video_open", "video_play", "video_progress", "video_progress", "video_progress", "video_complete"]);
  expect(events().filter(event => event.eventName === "video_progress").map(event => event.progress)).toEqual([25, 50, 75]);
  expect(events().filter(event => event.assetId).every(event => event.assetId === "film-one")).toBe(true);
  expect(JSON.stringify(events())).not.toContain("https://");
  expect(publicAnalytics).not.toHaveBeenCalled();
});

it("records an embed open without inventing provider playback or completion", async () => {
  await act(async () => root.render(<VideoDetailView data={{ ...detail, video: { ...detail.video, provider: "youtube", embedUrl: "https://www.youtube.com/embed/abcdefghijk", playbackUrl: null } }} previewId={previewId} />));
  expect(host.querySelector('[data-provider-embed]')).not.toBeNull();
  expect(host.querySelector('video')).toBeNull();
  expect(events().map(event => event.eventName)).toEqual(["film_view", "video_open"]);
  expect(publicAnalytics).not.toHaveBeenCalled();
});

it("does not credit native playback time while the tab is hidden", async () => {
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  await act(async () => root.render(<VideoDetailView data={detail} previewId={previewId} />));
  const video = host.querySelector<HTMLVideoElement>('video')!;
  Object.defineProperty(video, "duration", { configurable: true, value: 4 });
  Object.defineProperty(video, "paused", { configurable: true, value: false });
  await dispatch(video, "play");
  visibility.mockReturnValue("hidden");
  for (let second = 1; second <= 3; second += 1) {
    video.currentTime = second; await dispatch(video, "timeupdate");
  }
  expect(events().filter(event => event.eventName === "video_progress")).toHaveLength(0);
  visibility.mockReturnValue("visible");
  video.currentTime = 4; await dispatch(video, "timeupdate");
  expect(events().filter(event => event.eventName === "video_progress").map(event => event.progress)).toEqual([25]);
});
