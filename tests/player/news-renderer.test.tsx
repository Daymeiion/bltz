import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LockerView from "@/app/player/[slug]/LockerView";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import { previewContent } from "@/lib/preview-lockers/validation";
import type { PlayerArticle } from "@/lib/enrichment/news";

vi.mock("@/lib/analytics/client", () => ({ trackProductEvent: vi.fn() }));
let host: HTMLDivElement; let root: Root;
const record = { ...previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player" }), id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" };
const base = previewLockerData(record);
const article = { headline: "Fixture Player remembers his Cal football career", publisher: "Career Press", article_url: "https://publisher.example.com/real-story", thumbnail_url: null, published_at: null, summary: "A career interview." } as PlayerArticle;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("fetch", vi.fn());
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function openMedia() {
  const media = [...host.querySelectorAll("button")].find(button => button.textContent?.trim() === "MEDIA")!;
  await act(async () => media.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true })));
}
it.each(["public", "preview"])("renders discovered metadata and the actual article destination in a %s Locker", async mode => {
  await act(async () => root.render(<LockerView data={{ ...base, lockerHref: mode === "public" ? undefined : base.lockerHref, articles: [article] }} />));
  await openMedia();
  expect(host.textContent).toContain(article.headline);
  expect(host.textContent).not.toMatch(/DRAFT STOCK RISING|CONFERENCE'S BEST COVER MAN|LOCKER ROOM STANDARD SETTER|FROM FRIDAY NIGHTS TO FEATURE FILM/);
  expect(host.textContent).not.toContain("View all articles");
  const read = [...host.querySelectorAll("button")].find(button => button.textContent?.startsWith("Read article"))!;
  await act(async () => read.click());
  expect(host.querySelector('[role="alertdialog"]')?.textContent).toContain("Career Press");
  expect(host.querySelector('[role="alertdialog"]')?.textContent).toContain(article.headline);
});
it.each([
  [{}, "No matching news articles found for this player yet."],
  [{ articlesLoading: true }, "Searching for matching news articles…"],
  [{ articlesUnavailable: true }, "News articles are temporarily unavailable."],
])("renders honest empty, loading and error states (%j)", async (state, text) => {
  await act(async () => root.render(<LockerView data={{ ...base, lockerHref: undefined, articles: [], ...state }} />));
  await openMedia();
  expect(host.textContent).toContain(text);
  expect(host.textContent).not.toContain("Read article");
  expect(host.textContent).not.toContain("View all articles");
});

it("keeps the current tab selected as a server news promise resolves", async () => {
  let resolveNews!: (result: { articles: PlayerArticle[]; status: "complete" }) => void;
  const newsPromise = new Promise<{ articles: PlayerArticle[]; status: "complete" }>(resolve => { resolveNews = resolve; });
  await act(async () => root.render(<LockerView data={{ ...base, lockerHref: undefined }} newsPromise={newsPromise} />));
  await openMedia();
  expect(host.textContent).toContain("Searching for matching news articles");
  await act(async () => resolveNews({ articles: [article], status: "complete" }));
  expect(host.textContent).toContain(article.headline);
  expect(host.textContent).not.toContain("Searching for matching news articles");
  expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe("MEDIA");
});
