// @vitest-environment node
import { expect, it } from "vitest";
import { previewContent } from "@/lib/preview-lockers/validation";
import { curatedArticles, editScrapedArticle, lockerMerchandise } from "@/lib/preview-lockers/media";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import type { PlayerArticle } from "@/lib/enrichment/news";

const article: PlayerArticle = { headline: "Fixture Player's Cal football career", publisher: "Sports Press", article_url: "https://publisher.example.com/story", canonical_url: "https://publisher.example.com/story", source_domain: "publisher.example.com", summary: "A career interview.", thumbnail_url: null, published_at: null, author: null, metadata: { extraction: "NewsArticle" }, discovery_source: "fixture", discovered_at: "2026-10-16T00:00:00Z", confidence: 0.95, relevance_score: 0.95, featured: false, status: "accepted" };
const edit = editScrapedArticle(article, "edited");
const manual = { ...edit, id: "manual", sourceUrl: null, headline: "An added interview", articleUrl: "https://publisher.example.com/manual", publishedAt: "2026-10-16" };
const product = { id: "card", title: "Fixture Player trading card", category: "trading_card" as const, productUrl: "https://shop.example.com/card", imageUrl: "https://shop.example.com/card.jpg", retailer: "Shop", priceLabel: "$25", visible: true };
const content = { slug: "fixture-player", full_name: "Fixture Player" };
it("preserves backward-compatible empty presentation settings", () => {
  expect(previewContent.parse(content)).toMatchObject({ article_edits: [], merchandise: [] });
});
it("hides scraped news through refresh and supports resetting the override", () => {
  expect(curatedArticles([article], [{ ...edit, visible: false }])).toEqual([]);
  expect(curatedArticles([{ ...article, headline: "Refreshed source headline" }], [{ ...edit, visible: false }])).toEqual([]);
  expect(curatedArticles([article], [])).toEqual([article]);
});
it("retains manual additions and edited metadata when discovery returns new or empty results", () => {
  const edited = { ...edit, headline: "Reviewed headline", summary: "Reviewed short summary" };
  const result = curatedArticles([{ ...article, headline: "Fresh scraper headline" }], [edited, manual], "2026-10-16");
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({ headline: "Reviewed headline", summary: "Reviewed short summary", confidence: 0, discovery_source: "admin" });
  expect(result[1].published_at).toBe("2026-10-16T00:00:00.000Z");
  expect(curatedArticles([], [edited, manual])).toHaveLength(2);
});
it("normalizes source references and hides a matching duplicate", () => {
  expect(curatedArticles([article], [{ ...edit, sourceUrl: `${article.article_url}?utm_source=search`, visible: false }])).toEqual([]);
  expect(curatedArticles([article], [{ ...manual, articleUrl: article.article_url, visible: false }])).toEqual([]);
});
it.each(["javascript:alert(1)", "http://shop.example.com/card", "https://user:secret@shop.example.com/card", "https://127.0.0.1/card"])("rejects unsafe product or image destinations: %s", url => {
  expect(previewContent.safeParse({ ...content, merchandise: [{ ...product, productUrl: url }] }).success).toBe(false);
  expect(previewContent.safeParse({ ...content, merchandise: [{ ...product, imageUrl: url }] }).success).toBe(false);
});
it.each(["https://publisher.example.com/", "https://x.com/athlete/status/123", "https://www.nfl.com/players/fixture-player/"])("rejects non-article destinations: %s", articleUrl => {
  expect(previewContent.safeParse({ ...content, article_edits: [{ ...manual, articleUrl }] }).success).toBe(false);
});
it("rejects invalid dates, duplicate edits and oversized lists", () => {
  expect(previewContent.safeParse({ ...content, article_edits: [{ ...manual, publishedAt: "2026-02-30" }] }).success).toBe(false);
  expect(previewContent.safeParse({ ...content, article_edits: [edit, { ...edit, id: "other" }] }).success).toBe(false);
  expect(previewContent.safeParse({ ...content, merchandise: Array(41).fill(product) }).success).toBe(false);
});
it("maps only visible products and curated articles into the existing Locker tabs", () => {
  const row = { ...previewContent.parse({ ...content, article_edits: [manual, { ...edit, visible: false }], merchandise: [product, { ...product, id: "jersey", title: "Hidden jersey", visible: false }] }), id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "", enrichment: { articles: [article], awards: [] } };
  const locker = previewLockerData(row);
  expect(locker.articles?.map(item => item.headline)).toEqual([manual.headline]);
  expect(locker.merch).toHaveLength(1);
  expect(locker.merch?.[0]).toMatchObject({ title: product.title, productUrl: product.productUrl, category: "trading_card", retailer: "Shop" });
  expect(JSON.stringify(locker)).not.toContain("Hidden jersey");
  expect(lockerMerchandise([])).toEqual([]);
});
