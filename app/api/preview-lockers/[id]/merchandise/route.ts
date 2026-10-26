import { searchSavedMerchandise } from "@/lib/preview-lockers/search-server";
import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError, PREVIEW_COLUMNS } from "@/lib/preview-lockers/server";
import { previewRecord } from "@/lib/preview-lockers/validation";
import { previewIdentityKey } from "@/lib/preview-lockers/enrichment";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MerchandiseReviewDatabase } from "@/types/merchandise-review.generated";
import { merchandiseReviewSchema, visibleMerchandiseReview } from "@/lib/preview-lockers/merchandise-review";
import { reviewDismissalSchema } from "@/lib/preview-lockers/review-dismissal";

export const runtime = "nodejs";
export const maxDuration = 60;
function reviewError(code: string) {
  return code === "PT422" ? new PreviewError("merchandise_review_full", 422)
    : code === "PT409" ? new PreviewError("preview_conflict", 409)
    : new PreviewError("merchandise_review_unavailable", 503);
}
/** Admin discovery only. Review results are never written to Locker merchandise. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await params;
    const input = z.object({ revision: z.number().int().positive() }).strict().safeParse(await readBody(req, 256));
    if (!z.uuid().safeParse(id).success || !input.success) throw new PreviewError("invalid_input", 400);
    const saved = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle();
    if (saved.error) throw new PreviewError("preview_unavailable", 503);
    if (!saved.data) throw new PreviewError("preview_not_found", 404);
    const row = previewRecord.parse(saved.data);
    if (row.revision !== input.data.revision) throw new PreviewError("preview_conflict", 409);
    const outcome = await searchSavedMerchandise(client, row, req.signal);
    return json(outcome.body, outcome.status);
  } catch (error) { return failure(error); }
}

/** Review changes affect only the saved Admin review queue. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin(); const { id } = await params;
    const input = reviewDismissalSchema.safeParse(await readBody(req, 450_000));
    if (!z.uuid().safeParse(id).success || !input.success) throw new PreviewError("invalid_input", 400);
    const db = client as SupabaseClient<MerchandiseReviewDatabase>;
    const args = { p_preview_id: id, p_revision: input.data.revision, p_version: input.data.version };
    let restoreIdentity: string | undefined;
    if ("action" in input.data) {
      const target = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle();
      if (target.error) throw new PreviewError("preview_unavailable", 503);
      if (!target.data) throw new PreviewError("preview_not_found", 404);
      restoreIdentity = previewIdentityKey(previewRecord.parse(target.data));
    }
    const stored = "action" in input.data ? ("urls" in input.data
      ? await db.rpc("restore_preview_merchandise_results", { ...args, p_urls: input.data.urls, p_identity_key: restoreIdentity! })
      : await db.rpc("restore_preview_merchandise_result", { ...args, p_url: input.data.url, p_identity_key: restoreIdentity! }))
      : "urls" in input.data ? await db.rpc("dismiss_preview_merchandise_results", { ...args, p_urls: input.data.urls })
      : await db.rpc("dismiss_preview_merchandise_result", { ...args, p_url: input.data.url });
    if (stored.error) throw reviewError(stored.error.code);
    const review = merchandiseReviewSchema.safeParse(stored.data);
    if (!review.success) throw new PreviewError("merchandise_review_unavailable", 503);
    return json({ revision: input.data.revision, result: visibleMerchandiseReview(review.data), review: review.data });
  } catch (error) { return failure(error); }
}
