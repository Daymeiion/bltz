import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError, PREVIEW_COLUMNS } from "@/lib/preview-lockers/server";
import { previewRecord } from "@/lib/preview-lockers/validation";
import { createServiceClient } from "@/lib/supabase/service";
import { previewNewsIdentity, withSchoolAliases, readPreviewNewsCandidates, tryEnrichSavedPreview, readPreviewEnrichment } from "@/lib/preview-lockers/enrichment";
import { readNewsReview } from "@/lib/preview-lockers/news-review-server";
import { configuredSearchProvider } from "@/lib/enrichment/search-provider";
import { limitSearchProvider } from "@/lib/enrichment/search-limiter";
import { searchSavedCombine, searchSavedMerchandise } from "@/lib/preview-lockers/search-server";

export const runtime = "nodejs";
export const maxDuration = 120;
const tasks = ["news", "merchandise", "combine"] as const;
const inputSchema = z.object({
  revision: z.number().int().positive(),
  tasks: z.array(z.enum(tasks)).min(1).max(3).refine(value => new Set(value).size === value.length).default([...tasks]),
}).strict();

/** Request-owned work on one saved snapshot. No Locker content/measurements writes. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await previewAdmin();
    const { id } = await params;
    const input = inputSchema.safeParse(await readBody(req, 1024));
    if (!z.uuid().safeParse(id).success || !input.success) throw new PreviewError("invalid_input", 400);
    const saved = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle();
    if (saved.error) throw new PreviewError("preview_unavailable", 503);
    if (!saved.data) throw new PreviewError("preview_not_found", 404);
    const row = previewRecord.parse(saved.data);
    if (row.revision !== input.data.revision) throw new PreviewError("preview_conflict", 409);
    req.signal.throwIfAborted();
    const configured = configuredSearchProvider({ reviewTitles: true });
    const provider = configured ? limitSearchProvider(configured) : null;
    const identity = await withSchoolAliases(client, previewNewsIdentity(row));
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(65_000)]);
    const outcomes = await Promise.all(input.data.tasks.map(async task => {
      try {
        signal.throwIfAborted();
        if (task === "news") {
          const knownUrls = await readPreviewNewsCandidates(createServiceClient(), id, row, row.revision);
          const report = await tryEnrichSavedPreview(client, id, row, row.revision, true, knownUrls, "all", { provider, signal, identity });
          // One operation maps awards and saves news, avoiding shared-row races.
          if (report.errors.includes("preview_changed")) throw new PreviewError("preview_conflict", 409);
          if (report.errors.includes("enrichment_not_saved") || report.errors.includes("news_review_full")) {
            return [task, { status: 503, error: report.errors.includes("news_review_full") ? "news_review_full" : "enrichment_not_saved" }];
          }
          signal.throwIfAborted();
          const [enrichment, review] = await Promise.all([readPreviewEnrichment(client, id, row, row.revision), readNewsReview(client, id, row)]);
          return [task, { status: report.status === "unavailable" ? 503 : 200, awards: "last_awards_attempt" in report ? report.last_awards_attempt ?? null : null, newsStatus: "news_status" in report ? report.news_status ?? "unavailable" : "unavailable", errors: report.errors, articles: enrichment.articles, review }];
        }
        const outcome = task === "merchandise"
          ? await searchSavedMerchandise(client, row, signal, provider, identity)
          : await searchSavedCombine(client, row, signal, provider, identity);
        return [task, { status: outcome.status, ...outcome.body }];
      } catch (error) {
        return [task, { status: error instanceof PreviewError ? error.status : 503, error: error instanceof PreviewError ? error.code : "search_unavailable" }];
      }
    }));
    req.signal.throwIfAborted();
    const current = await client.from("preview_lockers").select("revision").eq("id", id).maybeSingle();
    if (current.error) throw new PreviewError("preview_unavailable", 503);
    if (!current.data || current.data.revision !== row.revision) throw new PreviewError("preview_conflict", 409);
    return json({ revision: row.revision, tasks: Object.fromEntries(outcomes) });
  } catch (error) { return failure(error); }
}
