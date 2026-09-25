// @vitest-environment-options {"settings":{"disableIframePageLoading":true}}
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeYouTubeUrl } from "@/lib/player/youtube";
import { toPublicVideo } from "@/lib/player/public-video";
import { previewVideoSource } from "@/lib/preview-lockers/video";
import { YouTubePlayer } from "@/components/player/YouTubePlayer";

const urls = [
  "https://www.youtube.com/watch?feature=share&v=M7lc1UVf-VE",
  "https://youtu.be/M7lc1UVf-VE?si=example",
  "https://www.youtube.com/shorts/M7lc1UVf-VE",
  "https://www.youtube.com/embed/M7lc1UVf-VE",
  "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
];

describe("YouTube source normalization", () => {
  it.each(urls)("normalizes %s in public and private legacy records", url => {
    const expected = { provider: "youtube", providerVideoId: "M7lc1UVf-VE", originalUrl: url, embedUrl: "https://www.youtube.com/embed/M7lc1UVf-VE", playbackUrl: null };
    expect(normalizeYouTubeUrl(url)).toEqual(expected);
    expect(previewVideoSource(url)).toEqual(expected);
    expect(toPublicVideo({ id: "film", title: "Film", playback_url: url, description: null, thumbnail_url: null, duration_seconds: null, tags: [], created_at: null, meta: {} }, "Athlete")).toMatchObject(expected);
  });
  it.each(["https://youtube.com.evil.test/watch?v=M7lc1UVf-VE", "javascript:alert(1)", "https://youtube.com@evil.test/watch?v=M7lc1UVf-VE", "https://example.com/film.mp4"])("rejects non-provider URL %s", url => {
    expect(normalizeYouTubeUrl(url)).toBeNull();
  });
  it("keeps invalid YouTube URLs out of native playback", () => {
    expect(previewVideoSource("https://youtube.com/watch?v=bad")).toMatchObject({ provider: "youtube", providerVideoId: null, playbackUrl: null });
  });
});

describe("YouTube playback and failure handling", () => {
  const container = document.createElement("div");
  let root: ReturnType<typeof createRoot>;
  afterEach(() => { act(() => root?.unmount()); vi.unstubAllGlobals(); });
  async function mount(url: string, autoPlay = false) {
    const destroy = vi.fn();
    let onError: (event: { data: number }) => void = () => {};
    vi.stubGlobal("YT", { Player: class {
      constructor(_iframe: HTMLIFrameElement, options: { events: { onError: typeof onError } }) { onError = options.events.onError; }
      destroy = destroy;
    } });
    root = createRoot(container);
    await act(async () => root.render(<YouTubePlayer url={url} title="Film" autoPlay={autoPlay} muted={autoPlay} />));
    return { fail: (data: number) => act(() => onError({ data })), destroy };
  }
  it("uses the official embed with origin-only referrer, native controls and required permissions", async () => {
    await mount(urls[0]);
    const iframe = container.querySelector("iframe")!;
    expect(iframe.src).toContain("https://www.youtube.com/embed/M7lc1UVf-VE?enablejsapi=1");
    expect(iframe.src).toContain(`origin=${encodeURIComponent(window.location.origin)}`);
    expect(iframe.src).not.toContain("controls=0");
    expect(iframe.referrerPolicy).toBe("strict-origin-when-cross-origin");
    expect(iframe.allow).toBe("accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
    expect(iframe.allowFullscreen).toBe(true);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });
  it("requests muted autoplay for the Film Room hero", async () => {
    await mount(urls[0], true);
    const params = new URL(container.querySelector("iframe")!.src).searchParams;
    expect(params.get("autoplay")).toBe("1");
    expect(params.get("mute")).toBe("1");
  });
  it.each([2, 5, 100, 101, 150, 153])("handles YouTube error %s without a duplicate external button", async code => {
    const { fail } = await mount(urls[1]);
    fail(code);
    expect(container.textContent).toContain("This video can't be played inside BLTZ.");
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });
  it("handles malformed IDs without loading an iframe", async () => {
    await mount("https://www.youtube.com/watch?v=bad");
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.textContent).toContain("This video can't be played inside BLTZ.");
  });
  it("destroys the API player on unmount", async () => {
    const { destroy } = await mount(urls[0]);
    act(() => root.unmount());
    expect(destroy).toHaveBeenCalledOnce();
  });
});
