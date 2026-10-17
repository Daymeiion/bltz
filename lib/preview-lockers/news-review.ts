import { z } from "zod";
import { headlineKey, normalizeArticleUrl } from "@/lib/enrichment/news";
import { previewUrl } from "./validation";

/** Discovery acceptance describes identity relevance, never Locker publication. */
export const newsReviewArticleSchema = z.object({
  headline: z.string().min(1).max(300), article_url: previewUrl, canonical_url: previewUrl,
  publisher: z.string().min(1).max(300), source_domain: z.string().min(1).max(300),
  author: z.string().max(300).nullable(), published_at: z.string().nullable(), thumbnail_url: previewUrl.nullable(),
  summary: z.string().max(500), metadata: z.object({ extraction: z.string().max(300) }),
  discovery_source: z.string().max(300), discovered_at: z.string().max(100), relevance_score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1), featured: z.boolean(), status: z.literal("accepted").default("accepted"),
  review_keys: z.array(z.string().max(2100)).max(64).optional(),
});
export const newsReviewSchema = z.object({
  articles: z.array(newsReviewArticleSchema).max(200), version: z.number().int().positive(),
  searched_at: z.string().datetime({ offset: true }).nullable(), identity_key: z.string().regex(/^[a-f0-9]{64}$/),
});
export type NewsReview = z.infer<typeof newsReviewSchema>;
export function newsArticleKeys(article: { article_url: string; canonical_url?: string; headline: string; source_domain?: string; review_keys?: string[] }): string[] {
  const keys = new Set(article.review_keys ?? []);
  for (const raw of [article.article_url, article.canonical_url]) {
    const normalized = raw && normalizeArticleUrl(raw);
    if (!normalized) continue;
    const url = new URL(normalized), host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "") || "/", query = url.search.slice(1).split("&").filter(Boolean).sort().join("&");
    keys.add(`url:https://${host}${path}${query ? `?${query}` : ""}`);
  }
  const normalized = normalizeArticleUrl(article.article_url);
  if (normalized && article.headline.trim()) keys.add(`headline:${headlineKey({ headline: article.headline, source_domain: article.source_domain?.toLowerCase() || new URL(normalized).hostname })}`);
  return [...keys];
}
