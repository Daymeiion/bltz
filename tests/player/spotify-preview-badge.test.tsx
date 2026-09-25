// @vitest-environment-options {"settings":{"disableIframePageLoading":true}}
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SpotifyPreviewBadge } from "@/components/player/SpotifyPreviewBadge";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("expands the muted Spotify sample and collapses it after a few seconds", async () => {
  await act(async () => root.render(<SpotifyPreviewBadge />));
  const badge = host.querySelector<HTMLButtonElement>('button[aria-controls="spotify-preview-track"]')!;
  const mute = host.querySelector<HTMLButtonElement>('button[disabled]')!;
  expect(badge.getAttribute("aria-expanded")).toBe("false");
  expect(mute.getAttribute("aria-label")).toContain("muted");
  expect(mute.disabled).toBe(true);

  await act(async () => badge.click());
  expect(badge.getAttribute("aria-expanded")).toBe("true");
  expect(host.textContent).toContain("Game Day (sample)");
  expect(host.textContent).toContain("BLTZ Preview Artist");

  await act(async () => vi.advanceTimersByTime(4500));
  expect(badge.getAttribute("aria-expanded")).toBe("false");
});
