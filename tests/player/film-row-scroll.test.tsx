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
let measure: () => void;
let sequenceWidth: number;
function Harness() {
  const { rowRef, groupRef, rowEvents, paused, togglePaused, setModalOpen } = useFilmRowScroll();
  return <><div ref={rowRef} {...rowEvents} tabIndex={0} style={{ columnGap: 12 }}><div ref={groupRef} data-sequence><button>Photo</button></div></div>
    <button onClick={togglePaused}>{paused ? "Play" : "Pause"}</button>
    <button onClick={() => setModalOpen(true)}>Open modal</button>
    <button onClick={() => setModalOpen(false)}>Close modal</button></>;
}
const frame = (at: number) => { time = at; nextFrame(at); };
beforeEach(async () => {
  time = 0;
  reduced = false;
  sequenceWidth = 600;
  vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { measure = callback; } observe() {} disconnect() {} });
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
  Object.defineProperty(row, "clientWidth", { value: 400, configurable: true });
  vi.spyOn(host.querySelector('[data-sequence]')!, "getBoundingClientRect").mockImplementation(() => ({ width: sequenceWidth }) as DOMRect);
  await act(async () => measure());
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("moves at 45 pixels per second and crosses the seam without losing progress", () => {
  frame(100); frame(150);
  expect(row.scrollLeft).toBeCloseTo(2.25);
  row.scrollLeft = 611.4;
  frame(200);
  expect(row.scrollLeft).toBeCloseTo(1.65);
  frame(250);
  expect(row.scrollLeft).toBeCloseTo(3.9);
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
  await act(async () => measure());
  frame(200);
  expect(row.scrollLeft).toBe(0);
  Object.defineProperty(row, "clientWidth", { value: 400, configurable: true });
  await act(async () => measure());
  await act(async () => host.querySelectorAll("button")[1].click());
  expect(cancelAnimationFrame).toHaveBeenCalled();
  expect(host.textContent).toContain("Play");
});

it("remeasures fractional sequence widths after images load or the viewport changes", async () => {
  sequenceWidth = 600.375;
  await act(async () => measure());
  row.scrollLeft = 612;
  frame(100); frame(150);
  expect(row.scrollLeft).toBeCloseTo(1.875);
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
