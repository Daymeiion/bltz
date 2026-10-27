import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProductConceptRow } from "@/components/player/ProductConceptRow";
import { DANTE_PRODUCT_CONCEPTS } from "@/lib/preview-lockers/getty-product-concepts";

vi.mock("next/image", () => ({ default: ({ unoptimized: _unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => <img {...props} /> }));
let host: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn());
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<ProductConceptRow />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("shows exactly the five requested product concepts without purchase actions in the row", () => {
  const row = host.querySelector('[aria-label="Five product examples"]')!;
  expect(row.querySelectorAll('button[aria-label^="Preview "]')).toHaveLength(5);
  expect(row.querySelectorAll("img")).toHaveLength(5);
  expect(row.textContent).toContain("Sticker set · 3 stickers");
  expect(row.querySelector("button button")).toBeNull();
  expect(host.textContent).not.toContain("Buy Now");
});

it.each(DANTE_PRODUCT_CONCEPTS)("opens $title with its own estimate, source and a truly disabled Buy Now button", async product => {
  const trigger = host.querySelector<HTMLButtonElement>(`button[aria-label="Preview ${product.title}"]`)!;
  await act(async () => { trigger.focus(); trigger.click(); });
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  expect(dialog.textContent).toContain(product.title);
  expect(dialog.textContent).toContain(`$${product.estimatedPriceUsd}`);
  expect(dialog.textContent).toContain("Estimated price · USD");
  expect(dialog.textContent).toContain("Not available for purchase");
  expect(dialog.querySelector<HTMLImageElement>(`img[src="${product.image}"]`)).not.toBeNull();
  const buy = [...dialog.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Buy Now")!;
  expect(buy.disabled).toBe(true);
  await act(async () => buy.click());
  expect(fetch).not.toHaveBeenCalled();
  const sources = [...dialog.querySelectorAll<HTMLAnchorElement>("a")];
  expect(sources.map(source => source.href)).toEqual(product.sources.map(source => source.url));
  expect(sources.every(source => source.target === "_blank" && source.rel === "noopener noreferrer")).toBe(true);
  if (product.id === "signed-poster") expect(dialog.textContent).toContain("not an authenticated autograph");
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
});

it("retains the independent slideshow resume action", async () => {
  const resume = vi.fn();
  await act(async () => root.render(<ProductConceptRow onResume={resume} />));
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Resume slideshow"]')!.click());
  expect(resume).toHaveBeenCalledOnce();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
