import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError, PREVIEW_COLUMNS } from "@/lib/preview-lockers/server";
import { previewRecord } from "@/lib/preview-lockers/validation";
import { createServiceClient } from "@/lib/supabase/service";
import { previewIdentityKey, readPreviewEnrichment, readPreviewNewsCandidates, tryEnrichSavedPreview } from "@/lib/preview-lockers/enrichment";
import { readNewsReview } from "@/lib/preview-lockers/news-review-server";
import { reviewDismissalSchema } from "@/lib/preview-lockers/review-dismissal";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewsReviewDatabase } from "@/types/news-review.generated";

export const runtime = "nodejs";
export const maxDuration = 60;
/** Admin-only source list. Never runs discovery or returns another preview's data. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new PreviewError("invalid_input", 400);
    const offset = z.coerce.number().int().min(0).max(1_000_000).safeParse(new URL(req.url).searchParams.get("dismissedOffset") ?? 0);
    if (!offset.success) throw new PreviewError("invalid_input", 400);
    const result = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle();
    if (result.error) throw new PreviewError("preview_unavailable", 503);
    if (!result.data) throw new PreviewError("preview_not_found", 404);
    const row = previewRecord.parse(result.data);
    const [enrichment, review] = await Promise.all([readPreviewEnrichment(client, id, row, row.revision), readNewsReview(client, id, row, offset.data)]);
    return json({ articles: enrichment.articles, revision: row.revision, review });
  } catch (error) { return failure(error); }
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await params;
    const input = z.object({ revision: z.number().int().positive().optional() }).strict().safeParse(await readBody(req, 256));
    if (!z.uuid().safeParse(id).success || !input.success) throw new PreviewError("invalid_input", 400);
    const result = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle();
    if (result.error) throw new PreviewError("preview_unavailable", 503);
    if (!result.data) throw new PreviewError("preview_not_found", 404);
    const row = previewRecord.parse(result.data);
    if (input.data.revision !== undefined && row.revision !== input.data.revision) throw new PreviewError("preview_conflict", 409);
    // Admin and preview authorization above precede this bounded historical read.
    const knownUrls = await readPreviewNewsCandidates(createServiceClient(), id, row, row.revision);
    const report = await tryEnrichSavedPreview(client, id, row, row.revision, true, knownUrls, "news");
    return json({ report }, report.errors?.includes("preview_changed") ? 409 : report.errors?.includes("news_review_full") ? 422 : report.status === "unavailable" ? 503 : 200);
  } catch (error) { return failure(error); }
}

/** Review changes only affect the private saved review queue. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin(); const { id } = await params;
    const input = reviewDismissalSchema.safeParse(await readBody(req, 450_000));
    if (!z.uuid().safeParse(id).success || !input.success) throw new PreviewError("invalid_input", 400);
    const rowResult = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle();
    if (rowResult.error) throw new PreviewError("preview_unavailable", 503);
    if (!rowResult.data) throw new PreviewError("preview_not_found", 404);
    const row = previewRecord.parse(rowResult.data);
    if (row.revision !== input.data.revision) throw new PreviewError("preview_conflict", 409);
    const db = client as SupabaseClient<NewsReviewDatabase>;
    const args = { p_preview_id: id, p_revision: row.revision, p_version: input.data.version };
    const stored = "action" in input.data ? ("urls" in input.data
      ? await db.rpc("restore_preview_news_articles", { ...args, p_urls: input.data.urls, p_identity_key: previewIdentityKey(row) })
      : await db.rpc("restore_preview_news_article", { ...args, p_url: input.data.url, p_identity_key: previewIdentityKey(row) }))
      : "urls" in input.data ? await db.rpc("dismiss_preview_news_articles", { ...args, p_urls: input.data.urls })
      : await db.rpc("dismiss_preview_news_article", { ...args, p_url: input.data.url });
    if (stored.error) throw new PreviewError(stored.error.code === "PT422" ? "news_review_full" : stored.error.code === "PT409" ? "preview_conflict" : "news_review_unavailable", stored.error.code === "PT422" ? 422 : stored.error.code === "PT409" ? 409 : 503);
    return json({ revision: row.revision, review: await readNewsReview(client, id, row) });
  } catch (error) { return failure(error); }
}
