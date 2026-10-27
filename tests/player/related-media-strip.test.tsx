import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi, type Mock } from "vitest";
import { RelatedMediaStrip, type RelatedMediaImage } from "@/components/player/RelatedMediaStrip";

const images = [
  { id: "one", url: "https://example.com/one.jpg", title: "College game", credits: "Uploaded photographer", sourceUrl: "https://www.gettyimages.com/detail/51458178" },
  { id: "two", url: "https://example.com/two.jpg", title: "Professional game", sourceUrl: "https://www.gettyimages.com/detail/76443769" },
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

it("sizes cached server-rendered images whose load event preceded hydration", async () => {
  const photo = host.querySelector<HTMLImageElement>('button[aria-label^="Show related photo:"] img')!;
  Object.defineProperties(photo, { complete: { value: true }, naturalWidth: { value: 400 }, naturalHeight: { value: 800 } });
  await act(async () => root.render(<RelatedMediaStrip images={[...images]} athleteName="Keith Rivers" athleteSlug="keith-rivers" onSelect={select} />));
  expect(parseFloat(photo.closest<HTMLDivElement>('div[style]')!.style.aspectRatio)).toBeCloseTo(0.5);
});

it("opens the corresponding licensing preview without selecting a slideshow photo", async () => {
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Explore Getty Images licensing: Professional game"]')!;
  await act(async () => trigger.click());
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  expect(dialog).not.toBeNull();
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  expect(dialog.querySelector('img[src="https://example.com/two.jpg"]')).not.toBeNull();
  expect(dialog.textContent).toContain("View this photo on Getty Images");
  const link = dialog.querySelector<HTMLAnchorElement>("a")!;
  expect(link.href).toBe(images[1].sourceUrl);
  expect(link.target).toBe("_blank");
  expect(link.rel).toContain("noopener");
  expect(link.rel).toContain("noreferrer");
  expect(select).not.toHaveBeenCalled();
  expect(host.querySelector("button button")).toBeNull();
});

it("keeps repeated photos interactive without adding duplicate keyboard stops", async () => {
  const repeat = host.querySelector<HTMLElement>('[aria-label="Repeated photos for continuous scrolling"]')!;
  expect([...repeat.querySelectorAll("button")].every(button => button.tabIndex === -1)).toBe(true);
  await act(async () => repeat.querySelector<HTMLButtonElement>('[aria-label="Show related photo: Professional game (loop)"]')!.click());
  expect(select.mock.calls[0][0].id).toBe("two");
  await act(async () => repeat.querySelector<HTMLButtonElement>('[aria-label="Explore Getty Images licensing: College game (loop)"]')!.click());
  expect(document.querySelector('[role="dialog"] img[src="https://example.com/one.jpg"]')).not.toBeNull();
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

it("does not show Getty branding or licensing controls on personal or unmatched photos", async () => {
  const personal = images.map(image => ({ ...image, title: "gettyimages-12345678 personal upload", sourceUrl: null }));
  await act(async () => root.render(<RelatedMediaStrip images={personal} athleteName="Dante Hughes" athleteSlug="dante-hughes" onSelect={select} />));
  expect(host.querySelector('[aria-label^="Explore Getty Images licensing:"]')).toBeNull();
  expect(host.textContent).not.toContain("Powered by Getty Images");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label^="Show related photo:"]')!.click());
  expect(select).toHaveBeenCalled();
});

it("opens the selected photo’s Getty detail page and hides licensing for unmapped photos", async () => {
  const sourceUrl = "https://www.gettyimages.com/detail/news-photo/dante-hughes-news-photo/76443769";
  await act(async () => root.render(<RelatedMediaStrip images={[{ ...images[0], sourceUrl }, { ...images[1], sourceUrl: null }]} athleteName="Dante Hughes" athleteSlug="dante-hughes" onSelect={select} />));
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Explore Getty Images licensing: College game"]')!.click());
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  expect(dialog.querySelector<HTMLAnchorElement>("a")!.href).toBe(sourceUrl);
  expect(dialog.textContent).toContain("View this photo on Getty Images");
  expect(dialog.textContent).not.toContain("Opens athlete search results");
  expect(select).not.toHaveBeenCalled();
  await act(async () => dialog.querySelector<HTMLButtonElement>('[aria-label="Close Getty Images licensing"]')!.click());
  expect(host.querySelector('[aria-label="Explore Getty Images licensing: Professional game"]')).toBeNull();
});

it.each([
  "https://www.gettyimages.com.evil.example/detail/76443769",
  "https://www.gettyimages.com@evil.example/detail/76443769",
  "http://www.gettyimages.com/detail/76443769",
  "https://www.gettyimages.com/photos/dante-hughes",
  "https://www.gettyimages.com/detail/not-an-image",
  "javascript:alert(1)",
])("does not treat an untrusted or non-detail source as a Getty photo: %s", async sourceUrl => {
  await act(async () => root.render(<RelatedMediaStrip images={[{ ...images[0], sourceUrl }]} athleteName="Dante Hughes" athleteSlug="dante-hughes" onSelect={select} />));
  expect(host.querySelector('[aria-label^="Explore Getty Images licensing:"]')).toBeNull();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
