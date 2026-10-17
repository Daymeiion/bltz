import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MerchandiseReviewDatabase } from "@/types/merchandise-review.generated";
import { merchandiseReviewSchema } from "./merchandise-review";
import { PreviewError } from "./server";
export async function readMerchandiseReview(client: SupabaseClient, id: string) {
  const { data, error } = await (client as SupabaseClient<MerchandiseReviewDatabase>).from("preview_merchandise_searches").select("result,version,searched_at,identity_key,dismissed_urls").eq("preview_id", id).maybeSingle();
  if (error) throw new PreviewError("merchandise_review_unavailable", 503);
  if (!data) return null;
  const parsed = merchandiseReviewSchema.safeParse(data);
  if (!parsed.success) throw new PreviewError("merchandise_review_unavailable", 503);
  return parsed.data;
}
