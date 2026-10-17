import { z } from "zod";
import { merchandiseCandidateSchema, merchandiseResultSchema } from "@/lib/enrichment/merchandise";
import { normalizeArticleUrl } from "@/lib/enrichment/news";
export const merchandiseQueueResultSchema = merchandiseResultSchema.extend({ items: z.array(merchandiseCandidateSchema.extend({ listingKeys: z.array(z.string().max(2100)).max(64).optional() })).max(200) });
/** Admin review state only. Never included in PreviewContent or Locker rendering. */
export const merchandiseReviewSchema = z.object({
  result: merchandiseQueueResultSchema, version: z.number().int().positive(), searched_at: z.string().datetime({ offset: true }),
  dismissed_items: z.array(merchandiseQueueResultSchema.shape.items.element).max(2000).default([]),
  identity_key: z.string().regex(/^[a-f0-9]{64}$/), dismissed_urls: z.array(z.string()).max(2000),
});
export type MerchandiseReview = z.infer<typeof merchandiseReviewSchema>;
export function visibleMerchandiseReview(review: MerchandiseReview) {
  return { ...review.result, items: review.result.items.filter(item => !review.dismissed_urls.includes(item.productUrl)) };
}
export function dismissedMerchandiseItems(review: MerchandiseReview) {
  const seen = new Set<string>();
  return [...review.dismissed_items, ...review.result.items.filter(item => review.dismissed_urls.includes(item.productUrl))].filter(item => { if (seen.has(item.productUrl)) return false; seen.add(item.productUrl); return true; });
}
/** Mirrors the database key function. Product IDs do not cross seller domains. */
export function merchandiseListingKeys(item: { productUrl: string; canonicalUrl?: string; listingKeys?: string[] }): string[] {
  const keys = new Set(item.listingKeys ?? []);
  const original = normalizeArticleUrl(item.productUrl);
  if (!original) return [...keys];
  const host = new URL(original).hostname.toLowerCase().replace(/^www\./, "");
  for (const input of [item.productUrl, item.canonicalUrl]) {
    const normalized = input && normalizeArticleUrl(input);
    if (!normalized) continue;
    const url = new URL(normalized), source = url.hostname.toLowerCase().replace(/^www\./, "");
    if (source !== host) continue;
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const query = url.search.slice(1).split("&").filter(Boolean).sort().join("&");
    keys.add(`url:https://${source}${path}${query ? `?${query}` : ""}`);
    const amazon = /^amazon\.[a-z.]+$/.test(source) && /\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:\/|$)/i.exec(path);
    const ebay = /^ebay\.[a-z.]+$/.test(source) && /\/itm\/(?:[^/]+\/)?([0-9]+)(?:\/|$)/i.exec(path);
    const auction = source === "nflauction.nfl.com" && /\/isynmv1\/aucd\/([0-9]+)(?:\/|$)/i.exec(path);
    const product = /(?:^|[\/+_-])p-([0-9]+)/i.exec(path);
    if (amazon) keys.add(`id:${source}:amazon:${amazon[1].toUpperCase()}`);
    else if (ebay) keys.add(`id:${source}:ebay:${ebay[1]}`);
    else if (auction) keys.add(`id:${source}:auction:${auction[1]}`);
    else if (product) keys.add(`id:${source}:product:${product[1]}`);
  }
  return [...keys];
}
