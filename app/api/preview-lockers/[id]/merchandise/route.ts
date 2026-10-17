import { createHash } from "node:crypto";
import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError, PREVIEW_COLUMNS } from "@/lib/preview-lockers/server";
import { previewRecord } from "@/lib/preview-lockers/validation";
import { previewIdentityKey, previewNewsIdentity, withSchoolAliases } from "@/lib/preview-lockers/enrichment";
import { configuredSearchProvider } from "@/lib/enrichment/search-provider";
import { discoverMerchandise, merchandiseQueries } from "@/lib/enrichment/merchandise";
import { fetchProductMetadata } from "@/lib/enrichment/safe-fetch";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MerchandiseReviewDatabase } from "@/types/merchandise-review.generated";
import { merchandiseResultSchema } from "@/lib/enrichment/merchandise";
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
    const provider = configuredSearchProvider({ reviewTitles: true });
    if (!provider) throw new PreviewError("search_not_configured", 503);
    const identity = await withSchoolAliases(client, previewNewsIdentity(row));
    if (!merchandiseQueries(identity).length) throw new PreviewError("merchandise_identity_incomplete", 400);
    const admission = await client.rpc("admit_preview_discovery", { p_identity_hash: createHash("sha256").update(`merchandise:${previewIdentityKey(row)}`).digest("hex") });
    if (admission.error || !admission.data) throw new PreviewError("merchandise_rate_limited", 429);
    let succeeded = false;
    const startedAt = new Date().toISOString();
    try {
      const result = await discoverMerchandise(identity, provider, fetchProductMetadata, AbortSignal.any([req.signal, AbortSignal.timeout(45_000)]));
      const current = await client.from("preview_lockers").select("revision").eq("id", id).maybeSingle();
      if (current.error) throw new PreviewError("preview_unavailable", 503);
      if (!current.data || current.data.revision !== row.revision) throw new PreviewError("preview_conflict", 409);
      if (result.status === "unavailable" || (result.status === "partial" && !result.items.length)) return json({ result }, 503);
      const parsed = merchandiseResultSchema.safeParse(result);
      if (!parsed.success) throw new PreviewError("merchandise_review_unavailable", 503);
      const stored = await (client as SupabaseClient<MerchandiseReviewDatabase>).rpc("save_preview_merchandise_search", { p_preview_id: id, p_revision: row.revision, p_identity_key: previewIdentityKey(row), p_started_at: startedAt, p_result: parsed.data });
      if (stored.error) throw reviewError(stored.error.code);
      const review = merchandiseReviewSchema.safeParse(stored.data);
      if (!review.success) throw new PreviewError("merchandise_review_unavailable", 503);
      succeeded = true;
      return json({ revision: row.revision, result: visibleMerchandiseReview(review.data), review: review.data });
    } finally { await client.rpc("finalize_preview_discovery", { p_request_id: admission.data, p_succeeded: succeeded }); }
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
