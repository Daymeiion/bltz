import { expect, it } from "vitest";
import { newsArticleKeys, newsReviewSchema } from "@/lib/preview-lockers/news-review";
const article = { headline: "Player's football career", article_url: "https://press.example.com/story", canonical_url: "https://press.example.com/story", publisher: "Press", source_domain: "press.example.com", author: null, published_at: null, thumbnail_url: null, summary: "Player football at Cal", metadata: { extraction: "NewsArticle" }, discovery_source: "fixture", discovered_at: "2020-01-01", confidence: 0.95, relevance_score: 0.95, featured: false };
const review = { articles: [article], version: 1, searched_at: null, identity_key: "a".repeat(64) };
it("matches URL tracking/www/query order and same-publisher headlines", () => {
  const keys = newsArticleKeys({ ...article, article_url: "https://www.press.example.com/story/?b=2&a=1&utm_source=x#fragment", canonical_url: "https://press.example.com/canonical" });
  expect(keys).toContain("url:https://press.example.com/story?a=1&b=2"); expect(keys).toContain("url:https://press.example.com/canonical");
  expect(keys).toContain("headline:press.example.com|player s football career");
  expect(newsArticleKeys({ ...article, review_keys: ["url:https://press.example.com/earlier"] })).toContain("url:https://press.example.com/earlier");
});
it("keeps different publishers and meaningful query values separate unless a canonical alias links them", () => {
  const base = newsArticleKeys(article), other = newsArticleKeys({ ...article, article_url: "https://other.example.com/story", canonical_url: "https://other.example.com/story", source_domain: "other.example.com" });
  expect(base.some(key => other.includes(key))).toBe(false);
  expect(newsArticleKeys({ ...article, article_url: "https://other.example.com/story", source_domain: "other.example.com" })).toContain("url:https://press.example.com/story");
  expect(newsArticleKeys({ ...article, article_url: "https://press.example.com/story?edition=1" })).toContain("url:https://press.example.com/story?edition=1");
});
it("accepts larger accumulated queues while rejecting overflow and unsafe links", () => {
  expect(newsReviewSchema.safeParse({ ...review, articles: Array(25).fill(article) }).success).toBe(true);
  expect(newsReviewSchema.safeParse({ ...review, articles: Array(201).fill(article) }).success).toBe(false);
  expect(newsReviewSchema.safeParse({ ...review, articles: [{ ...article, article_url: "javascript:alert(1)" }] }).success).toBe(false);
});
