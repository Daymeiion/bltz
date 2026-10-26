import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PreviewRecord } from "./validation";
import { PreviewError } from "./server";
import { previewIdentityKey, previewNewsIdentity, withSchoolAliases } from "./enrichment";
import { configuredSearchProvider } from "@/lib/enrichment/search-provider";
import type { SearchProvider, NewsIdentity } from "@/lib/enrichment/news";
import { discoverCombine, combineSearchPlan } from "@/lib/enrichment/combine";
import { discoverMerchandise, merchandiseQueries, merchandiseResultSchema } from "@/lib/enrichment/merchandise";
import { fetchCombineResults, fetchProductMetadata } from "@/lib/enrichment/safe-fetch";
import type { MerchandiseReviewDatabase } from "@/types/merchandise-review.generated";
import { merchandiseReviewSchema, visibleMerchandiseReview } from "./merchandise-review";
function reviewError(code: string) {
  return code === "PT422" ? new PreviewError("merchandise_review_full", 422)
    : code === "PT409" ? new PreviewError("preview_conflict", 409)
    : new PreviewError("merchandise_review_unavailable", 503);
}
// Callers must authorize the saved Locker and revision before invoking these workers.
export async function searchSavedMerchandise(client: SupabaseClient, row: PreviewRecord, signal: AbortSignal, suppliedProvider?: SearchProvider | null, suppliedIdentity?: NewsIdentity) {
  const id = row.id; signal.throwIfAborted();
    const provider = suppliedProvider === undefined ? configuredSearchProvider({ reviewTitles: true }) : suppliedProvider;
    if (!provider) throw new PreviewError("search_not_configured", 503);
    const identity = suppliedIdentity ?? await withSchoolAliases(client, previewNewsIdentity(row));
    if (!merchandiseQueries(identity).length) throw new PreviewError("merchandise_identity_incomplete", 400);
    const admission = await client.rpc("admit_preview_discovery", { p_identity_hash: createHash("sha256").update(`merchandise:${previewIdentityKey(row)}`).digest("hex") });
    if (admission.error || !admission.data) throw new PreviewError("merchandise_rate_limited", 429);
    let succeeded = false;
    const startedAt = new Date().toISOString();
    try {
      const result = await discoverMerchandise(identity, provider, fetchProductMetadata, AbortSignal.any([signal, AbortSignal.timeout(45_000)]));
      const current = await client.from("preview_lockers").select("revision").eq("id", id).maybeSingle();
      if (current.error) throw new PreviewError("preview_unavailable", 503);
      if (!current.data || current.data.revision !== row.revision) throw new PreviewError("preview_conflict", 409);
      if (result.status === "unavailable" || (result.status === "partial" && !result.items.length)) return { status: 503, body: { result } };
      const parsed = merchandiseResultSchema.safeParse(result);
      if (!parsed.success) throw new PreviewError("merchandise_review_unavailable", 503);
      signal.throwIfAborted();
      const stored = await (client as SupabaseClient<MerchandiseReviewDatabase>).rpc("save_preview_merchandise_search", { p_preview_id: id, p_revision: row.revision, p_identity_key: previewIdentityKey(row), p_started_at: startedAt, p_result: parsed.data });
      if (stored.error) throw reviewError(stored.error.code);
      const review = merchandiseReviewSchema.safeParse(stored.data);
      if (!review.success) throw new PreviewError("merchandise_review_unavailable", 503);
      succeeded = true;
      return { status: 200, body: { revision: row.revision, result: visibleMerchandiseReview(review.data), review: review.data } };
    } finally { await client.rpc("finalize_preview_discovery", { p_request_id: admission.data, p_succeeded: succeeded }); }
}

export async function searchSavedCombine(client: SupabaseClient, row: PreviewRecord, signal: AbortSignal, suppliedProvider?: SearchProvider | null, suppliedIdentity?: NewsIdentity) {
  const id = row.id; signal.throwIfAborted();
    const provider = suppliedProvider === undefined ? configuredSearchProvider({ reviewTitles: true }) : suppliedProvider;
    if (!provider) throw new PreviewError("search_not_configured", 503);
    const identity = suppliedIdentity ?? await withSchoolAliases(client, previewNewsIdentity(row));
    if (!combineSearchPlan(identity).length) throw new PreviewError("combine_identity_incomplete", 400);
    const admission = await client.rpc("admit_preview_discovery", { p_identity_hash: createHash("sha256").update(`combine:${previewIdentityKey(row)}`).digest("hex") });
    if (admission.error || !admission.data) throw new PreviewError("combine_rate_limited", 429);
    let succeeded = false;
    try {
      const result = await discoverCombine(identity, provider, fetchCombineResults, AbortSignal.any([signal, AbortSignal.timeout(45_000)]));
      const current = await client.from("preview_lockers").select("revision").eq("id", id).maybeSingle();
      if (current.error) throw new PreviewError("preview_unavailable", 503);
      if (!current.data || current.data.revision !== row.revision) throw new PreviewError("preview_conflict", 409);
      succeeded = result.status !== "unavailable";
      signal.throwIfAborted();
      return { status: succeeded ? 200 : 503, body: { revision: row.revision, result } };
    } finally { await client.rpc("finalize_preview_discovery", { p_request_id: admission.data, p_succeeded: succeeded }); }
}
