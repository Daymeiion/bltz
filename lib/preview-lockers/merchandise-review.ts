import { z } from "zod";
import { merchandiseResultSchema } from "@/lib/enrichment/merchandise";
/** Admin review state only. Never included in PreviewContent or Locker rendering. */
export const merchandiseReviewSchema = z.object({
  result: merchandiseResultSchema, version: z.number().int().positive(), searched_at: z.string().datetime({ offset: true }),
  identity_key: z.string().regex(/^[a-f0-9]{64}$/), dismissed_urls: z.array(z.string()).max(12),
});
export type MerchandiseReview = z.infer<typeof merchandiseReviewSchema>;
export function visibleMerchandiseReview(review: MerchandiseReview) {
  return { ...review.result, items: review.result.items.filter(item => !review.dismissed_urls.includes(item.productUrl)) };
}
