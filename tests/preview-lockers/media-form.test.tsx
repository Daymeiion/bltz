import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import type { PlayerArticle } from "@/lib/enrichment/news";

const article = { headline: "Fixture Player's Cal football career", publisher: "Sports Press", article_url: "https://publisher.example.com/story", canonical_url: "https://publisher.example.com/story", source_domain: "publisher.example.com", summary: "A career interview.", thumbnail_url: null, published_at: null, author: null, metadata: { extraction: "NewsArticle" }, discovery_source: "fixture", discovered_at: "", confidence: 0.95, relevance_score: 0.95, featured: false, status: "accepted" } as PlayerArticle;
const record = { ...previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", school: "Cal" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
let host: HTMLDivElement; let root: Root; let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function click(text: string) {
  const button = [...host.querySelectorAll<HTMLButtonElement>("button")].find(node => node.textContent === text)!;
  expect(button, text).toBeTruthy(); await act(async () => button.click());
}
async function fill(label: string, value: string) {
  const input = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[aria-label="${label}"]`)!;
  expect(input, label).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("replaces Social with Media and keeps news, merchandise and social controls together", async () => {
  await act(async () => root.render(<PreviewLockerForm record={record} initialArticles={[article]} />));
  expect([...host.querySelectorAll('[role="tab"]')].map(tab => tab.textContent)).toEqual(["Info", "Career", "Stats", "Images", "Videos", "Media"]);
  await click("Media");
  expect(host.querySelector('#locker-panel-media')?.hasAttribute("hidden")).toBe(false);
  const media = host.querySelector('#locker-panel-media')!;
  expect(media.textContent).toContain(article.headline);
  expect(media.textContent).toMatch(/News articles[\s\S]*Merchandise[\s\S]*Social/);
  expect(media.querySelector('a[href="https://publisher.example.com/story"]')).not.toBeNull();
});
it("saves and reloads hidden scraped news, a manual article and products without losing social or identity data", async () => {
  await act(async () => root.render(<PreviewLockerForm record={record} initialArticles={[article]} />));
  await click("Hide article from Locker");
  await click("Add article");
  await fill("Added article 1 headline", "Reviewed career interview");
  await fill("Added article 1 publisher", "Career Press");
  await fill("Added article 1 link", "https://career.example.com/interview");
  await fill("Added article 1 summary", "A manually reviewed player interview.");
  await click("Add merchandise");
  await fill("Merchandise 1 title", "Fixture Player trading card");
  await fill("Merchandise 1 link", "https://shop.example.com/card");
  await fill("Merchandise 1 price", "$25");
  const refresh = [...host.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === "Refresh scraped news")!;
  expect(refresh.disabled).toBe(true);
  fetcher.mockResolvedValue(Response.json({ id: record.id, slug: record.slug, revision: 4 }));
  await click("Save draft");
  const saved = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(saved.revision).toBe(3);
  expect(saved.content.article_edits).toHaveLength(2);
  expect(saved.content.article_edits[0]).toMatchObject({ sourceUrl: article.article_url, visible: false });
  expect(saved.content.merchandise[0]).toMatchObject({ category: "trading_card", productUrl: "https://shop.example.com/card", priceLabel: "$25" });
  expect(saved.content.social).toEqual(record.social);
  await act(async () => root.render(<PreviewLockerForm key="reload-media" record={{ ...record, ...saved.content, revision: 4 }} initialArticles={[article]} />));
  expect(host.querySelector<HTMLInputElement>('[aria-label="Added article 1 headline"]')?.value).toBe("Reviewed career interview");
  expect(host.querySelector<HTMLInputElement>('[aria-label="Scraped article 1 visible"]')?.checked).toBe(false);
  const locker = previewLockerData({ ...record, ...saved.content, revision: 4, enrichment: { articles: [article], awards: [] } });
  expect(locker.articles?.map(item => item.headline)).toEqual(["Reviewed career interview"]);
  expect(locker.merch?.[0].productUrl).toBe("https://shop.example.com/card");
});
it("edits and resets a scraped article, and removes manual products from the draft", async () => {
  await act(async () => root.render(<PreviewLockerForm record={record} initialArticles={[article]} />));
  await click("Edit article details"); await fill("Scraped article 1 headline", "Reviewed headline");
  expect(host.querySelector<HTMLInputElement>('[aria-label="Scraped article 1 headline"]')?.value).toBe("Reviewed headline");
  await click("Reset to scraped details");
  expect(host.querySelector('[aria-label="Scraped article 1 headline"]')).toBeNull();
  await click("Add merchandise"); await fill("Merchandise 1 title", "A jersey");
  await click("Remove merchandise");
  expect(host.querySelector('[aria-label="Merchandise 1 title"]')).toBeNull();
});
it("refreshes saved source results without replacing manual additions or hidden decisions", async () => {
  const curated = { ...record, article_edits: previewContent.shape.article_edits.parse([{ id: "hide", sourceUrl: article.article_url, visible: false, headline: article.headline, publisher: article.publisher, articleUrl: article.article_url }]) };
  await act(async () => root.render(<PreviewLockerForm record={curated} initialArticles={[article]} />));
  fetcher.mockResolvedValueOnce(Response.json({ report: { status: "complete" } })).mockResolvedValueOnce(Response.json({ articles: [{ ...article, headline: "New source headline" }], revision: 3, review: { articles: [], version: 1, searched_at: null, identity_key: "a".repeat(64) } }));
  await click("Refresh scraped news");
  expect(fetcher.mock.calls[0][1].method).toBe("POST");
  expect(fetcher.mock.calls[1][1]).toEqual({ cache: "no-store" });
  expect(host.querySelector<HTMLInputElement>('[aria-label="Scraped article 1 visible"]')?.checked).toBe(false);
  expect(host.textContent).toContain("Your manual additions, edits and hidden choices are unchanged.");
});
it("keeps unsaved edits on conflict and never silently accepts another revision's articles", async () => {
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  fetcher.mockResolvedValueOnce(Response.json({ articles: [article], revision: 4 }));
  await click("Reload saved articles");
  expect(host.textContent).toContain("This preview changed.");
  expect(host.textContent).not.toContain(article.headline);
  await click("Add article"); await fill("Added article 1 headline", "Unsaved headline");
  expect([...host.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === "Reload saved articles")?.disabled).toBe(true);
});
