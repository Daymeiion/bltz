import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
const mocks = vi.hoisted(() => ({ refresh: vi.fn(), fetch: vi.fn() }));
const router = vi.hoisted(() => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
import Gate from "@/components/preview-lockers/PreviewAccessStartGate";
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal("fetch", mocks.fetch);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ state: "active" }) });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
it("waits until visible and admits only once across visibility events", async () => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  await act(async () => root.render(<Gate previewId="fixture" />));
  expect(mocks.fetch).not.toHaveBeenCalled();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  expect(mocks.fetch).toHaveBeenCalledTimes(1); expect(mocks.refresh).toHaveBeenCalledTimes(1);
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({ previewId: "fixture", visibility: "visible" });
});
it("shows a recoverable error and never refreshes into content on failed admission", async () => {
  mocks.fetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: "unavailable" }) });
  await act(async () => root.render(<Gate previewId="fixture" />));
  expect(container.textContent).toContain("could not open"); expect(mocks.refresh).not.toHaveBeenCalled();
  mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ state: "active" }) });
  await act(async () => { container.querySelector("button")!.click(); });
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
});
