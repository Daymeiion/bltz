import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi, type Mock } from "vitest";
import { RelatedMediaStrip, type RelatedMediaImage } from "@/components/player/RelatedMediaStrip";

const images = [
  { id: "one", url: "https://example.com/one.jpg", title: "College game", credits: "Uploaded photographer" },
  { id: "two", url: "https://example.com/two.jpg", title: "Professional game" },
];
let host: HTMLDivElement;
let root: Root;
let select: Mock<(image: RelatedMediaImage) => void>;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  select = vi.fn<(image: RelatedMediaImage) => void>();
  await act(async () => root.render(<RelatedMediaStrip images={images} athleteName="Keith Rivers" athleteSlug="keith-rivers" activeImageId="one" onSelect={select} />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("puts the Getty credit above the row and preserves selection and photographer credit", async () => {
  const credit = [...host.querySelectorAll("p")].find(node => node.textContent === "Powered by Getty Images")!;
  const row = host.querySelector('[aria-label="Related photos of Keith Rivers"]')!;
  expect(credit.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const tile = host.querySelector<HTMLButtonElement>('[aria-label="Show related photo: College game"]')!;
  expect(tile.title).toContain("Uploaded photographer");
  expect(tile.getAttribute("aria-pressed")).toBe("true");
  await act(async () => tile.click());
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="View in slideshow: Professional game"]')!.click());
  expect(select.mock.calls.map(([image]) => image.id)).toEqual(["one", "two"]);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("sizes each loaded container to its source image proportions", async () => {
  const photo = host.querySelector<HTMLImageElement>('button[aria-label^="Show related photo:"] img')!;
  Object.defineProperties(photo, { naturalWidth: { value: 600 }, naturalHeight: { value: 900 } });
  await act(async () => photo.dispatchEvent(new Event("load", { bubbles: true })));
  expect(parseFloat(photo.closest<HTMLDivElement>('div[style]')!.style.aspectRatio)).toBeCloseTo(600 / 900);
  expect(host.querySelector('[aria-label="Pause photo row"]')).not.toBeNull();
});

it("opens the corresponding licensing preview without selecting a slideshow photo", async () => {
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Explore Getty Images licensing: Professional game"]')!;
  await act(async () => trigger.click());
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  expect(dialog).not.toBeNull();
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  expect(dialog.querySelector('img[src="https://example.com/two.jpg"]')).not.toBeNull();
  expect(dialog.textContent).toContain("Showcase preview");
  const link = dialog.querySelector<HTMLAnchorElement>("a")!;
  expect(link.href).toBe("https://www.gettyimages.com/photos/keith-rivers");
  expect(link.target).toBe("_blank");
  expect(link.rel).toContain("noopener");
  expect(link.rel).toContain("noreferrer");
  expect(select).not.toHaveBeenCalled();
  expect(host.querySelector("button button")).toBeNull();
});

it("closes with Escape or its close control and restores focus to the triggering image", async () => {
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Explore Getty Images licensing: College game"]')!;
  await act(async () => { trigger.focus(); trigger.click(); });
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  await act(async () => trigger.click());
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Close Getty Images licensing"]')!.click());
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(select).not.toHaveBeenCalled();
});

it("shows the existing empty state when images fail instead of leaving licensing controls behind", async () => {
  await act(async () => {
    host.querySelectorAll<HTMLImageElement>('button[aria-label^="Show related photo:"] img').forEach(image => image.dispatchEvent(new Event("error", { bubbles: true })));
  });
  expect(host.textContent).toContain("Related photos will appear here when available.");
  expect(host.querySelector('[aria-label^="Explore Getty Images licensing:"]')).toBeNull();
});

it("encodes athlete names without allowing the search URL to change its host", async () => {
  await act(async () => root.render(<RelatedMediaStrip images={images} athleteName="A/B? C&D" athleteSlug="fixture" onSelect={select} />));
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Explore Getty Images licensing: College game"]')!.click());
  const link = document.querySelector<HTMLAnchorElement>('[role="dialog"] a')!;
  const destination = new URL(link.href);
  expect(destination.origin).toBe("https://www.gettyimages.com");
  expect(destination.pathname).toBe("/photos/a%2Fb%3F-c%26d");
  expect(destination.search).toBe("");
});
