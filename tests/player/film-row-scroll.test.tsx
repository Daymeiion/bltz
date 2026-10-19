import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useFilmRowScroll } from "@/components/player/use-film-row-scroll";

let host: HTMLDivElement;
let root: Root;
let row: HTMLDivElement;
let nextFrame: FrameRequestCallback;
let time: number;
let reduced: boolean;
function Harness() {
  const { rowRef, rowEvents, paused, togglePaused, setModalOpen } = useFilmRowScroll();
  return <><div ref={rowRef} {...rowEvents} tabIndex={0}><button>Photo</button></div>
    <button onClick={togglePaused}>{paused ? "Play" : "Pause"}</button>
    <button onClick={() => setModalOpen(true)}>Open modal</button>
    <button onClick={() => setModalOpen(false)}>Close modal</button></>;
}
const frame = (at: number) => { time = at; nextFrame(at); };
beforeEach(async () => {
  time = 0;
  reduced = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { nextFrame = callback; return 1; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(performance, "now").mockImplementation(() => time);
  vi.spyOn(window, "matchMedia").mockImplementation(() => ({ get matches() { return reduced; } }) as MediaQueryList);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<Harness />));
  row = host.querySelector("div")!;
  Object.defineProperties(row, { scrollWidth: { value: 1000, configurable: true }, clientWidth: { value: 400, configurable: true } });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("starts slowly, loops at the end, and cleans up its frame", () => {
  frame(100); frame(150);
  expect(row.scrollLeft).toBeCloseTo(0.9);
  for (let at = 200; at <= 36000; at += 50) frame(at);
  expect(row.scrollLeft).toBeGreaterThan(0);
  expect(row.scrollLeft).toBeLessThan(50);
});
it("pauses on hover and resumes after leaving", async () => {
  frame(100); frame(150);
  const before = row.scrollLeft;
  await act(async () => row.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
  frame(200); frame(250);
  expect(row.scrollLeft).toBe(before);
  await act(async () => row.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })));
  frame(300);
  expect(row.scrollLeft).toBeGreaterThan(before);
});
it("gives wheel and manual scrollbar input three seconds before resuming", async () => {
  frame(100);
  await act(async () => row.dispatchEvent(new WheelEvent("wheel", { bubbles: true })));
  row.scrollLeft = 180;
  await act(async () => row.dispatchEvent(new Event("scroll")));
  frame(1000); frame(3000);
  expect(row.scrollLeft).toBe(180);
  frame(3200);
  expect(row.scrollLeft).toBeGreaterThan(180);
});
it("pauses for focus and licensing modal, then resumes", async () => {
  frame(100);
  await act(async () => row.querySelector("button")!.focus());
  frame(150);
  expect(row.scrollLeft).toBe(0);
  await act(async () => row.querySelector("button")!.blur());
  await act(async () => host.querySelectorAll("button")[2].click());
  frame(200);
  expect(row.scrollLeft).toBe(0);
  await act(async () => host.querySelectorAll("button")[3].click());
  frame(250);
  expect(row.scrollLeft).toBeGreaterThan(0);
});
it("respects reduced motion, no overflow, and explicit pause", async () => {
  reduced = true;
  frame(100); frame(150);
  expect(row.scrollLeft).toBe(0);
  reduced = false;
  Object.defineProperty(row, "clientWidth", { value: 1000, configurable: true });
  frame(200);
  expect(row.scrollLeft).toBe(0);
  Object.defineProperty(row, "clientWidth", { value: 400, configurable: true });
  await act(async () => host.querySelectorAll("button")[1].click());
  expect(cancelAnimationFrame).toHaveBeenCalled();
  expect(host.textContent).toContain("Play");
});
it("releases touch dragging even when the pointer ends outside the row", async () => {
  frame(100);
  await act(async () => row.dispatchEvent(new Event("pointerdown", { bubbles: true })));
  frame(200);
  expect(row.scrollLeft).toBe(0);
  await act(async () => window.dispatchEvent(new Event("pointerup")));
  frame(3300);
  expect(row.scrollLeft).toBeGreaterThan(0);
});
