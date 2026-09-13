import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoPreview } from "@/components/player/VideoPreview";

describe("video card previews", () => {
  let root: Root;
  let container: HTMLDivElement;
  let desktop: boolean;
  let play: ReturnType<typeof vi.spyOn>;
  let pause: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    desktop = true;
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("min-width") ? desktop : false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  const pointer = (type: string, pointerType = "mouse") => new PointerEvent(type, { pointerType });

  it("keeps a paused video available as the first-frame preview when no image exists", () => {
    act(() => root.render(<div><VideoPreview title="Film" playbackUrl="/film.mp4" /></div>));
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("video")?.getAttribute("preload")).toBe("auto");
    expect(container.querySelector("video")?.autoplay).toBe(false);
    expect(play).not.toHaveBeenCalled();
  });

  it("plays silently on desktop hover and stops on leave", () => {
    act(() => root.render(<div><VideoPreview title="Film" playbackUrl="/film.mp4" thumbnailUrl="/poster.jpg" /></div>));
    act(() => container.firstElementChild!.dispatchEvent(pointer("pointerenter")));
    expect(play).toHaveBeenCalledOnce();
    expect(container.querySelector("img")).toBeNull();
    act(() => container.firstElementChild!.dispatchEvent(pointer("pointerleave")));
    expect(pause).toHaveBeenCalled();
    expect(container.querySelector("img")?.src).toContain("poster.jpg");
  });

  it("does not start playback on touch or mobile hover", () => {
    desktop = false;
    act(() => root.render(<div><VideoPreview title="Film" playbackUrl="/film.mp4" /></div>));
    act(() => container.firstElementChild!.dispatchEvent(pointer("pointerenter")));
    act(() => container.firstElementChild!.dispatchEvent(pointer("pointerenter", "touch")));
    expect(play).not.toHaveBeenCalled();
  });

  it("mounts a muted YouTube preview only during desktop hover", () => {
    act(() => root.render(<div><VideoPreview title="Film" embedUrl="https://www.youtube-nocookie.com/embed/abcdefghijk" /></div>));
    expect(container.querySelector("iframe")).toBeNull();
    act(() => container.firstElementChild!.dispatchEvent(pointer("pointerenter")));
    expect(container.querySelector("iframe")?.src).toContain("autoplay=1&mute=1");
    act(() => container.firstElementChild!.dispatchEvent(pointer("pointerleave")));
    expect(container.querySelector("iframe")).toBeNull();
  });
});
