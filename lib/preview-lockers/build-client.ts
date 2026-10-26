import { z } from "zod";
import { previewContent, previewIdentity, slugify, type PreviewContent } from "./validation";
import { mergeSuggestions } from "./merge-suggestions";
import { readDiscovery } from "./stream-client";
import { newsArticleKeys, newsReviewSchema, newsReviewArticleSchema } from "./news-review";
import { editScrapedArticle } from "./media";
import type { PlayerArticle } from "@/lib/enrichment/news";
import { merchandiseReviewSchema } from "./merchandise-review";
import { combineSearchSchema } from "@/lib/player/combine-review";
import { searchErrorMessage } from "@/lib/search/errors";

export const buildSearchKeys = ["news", "merchandise", "combine"] as const;
export type BuildSearchKey = typeof buildSearchKeys[number];
export type BuildStep = "career" | "save" | BuildSearchKey;
export type BuildProgress = { state: "waiting" | "running" | "complete" | "partial" | "failed" | "cancelled"; message: string };
export type SavedBuild = { id: string; slug: string; revision: number; complete?: boolean };
const savedSchema = z.object({ id: z.uuid(), slug: z.string().min(1), revision: z.number().int().positive(), complete: z.boolean().optional() });
const awardReport = z.object({ status: z.enum(["complete", "unavailable"]), awards_discovered: z.number(), awards_normalized: z.number(), unmapped_awards: z.array(z.string()), errors: z.array(z.string()), updated_at: z.string(), source_revision: z.number() });
export const buildNewsSchema = z.object({ status: z.number(), awards: awardReport.nullable(), newsStatus: z.enum(["complete", "partial", "unavailable", "skipped"]), errors: z.array(z.string()), articles: z.array(newsReviewArticleSchema).max(24), review: newsReviewSchema });
export const buildMerchandiseSchema = z.object({ status: z.number(), review: merchandiseReviewSchema });
export const buildCombineSchema = z.object({ status: z.number(), result: combineSearchSchema });
export type BuildNews = z.infer<typeof buildNewsSchema>;
export type BuildMerchandise = z.infer<typeof buildMerchandiseSchema>;
export type BuildCombine = z.infer<typeof buildCombineSchema>;

export function buildFailureMessage(status: number, code?: string): string {
  if (status === 409) return "The saved Locker changed. Keep this draft open and open the latest saved version before retrying.";
  if (status === 429 || code?.endsWith("_rate_limited")) return "Search is temporarily limited. The same search has a three-minute cooldown; all scrapers share the daily allowance. Existing results are retained.";
  if (code === "news_review_full" || code === "merchandise_review_full") return "The saved review queue is full. Review or dismiss existing suggestions before searching again.";
  if (code === "slug_conflict") return "That private URL slug is already used. Choose a different slug and retry. Your draft is retained.";
  if (status === 401 || status === 403) return "Your Admin session is no longer authorized. Sign in again before retrying; keep this draft open.";
  return (code && searchErrorMessage(code)) || "Search could not finish. Existing results and draft changes are retained. Retry this task or continue manually.";
}

/** Single owner for discovery -> additive merge -> one save -> parallel review searches. */
export async function runPreviewBuild(options: {
  draft: PreviewContent; saved: SavedBuild | null; createId: string; signal: AbortSignal; retry?: BuildSearchKey[]; existingArticles?: PlayerArticle[];
  onStep: (key: BuildStep, progress: BuildProgress) => void;
  onDraft: (draft: PreviewContent) => void;
  onSaved: (draft: PreviewContent, saved: SavedBuild) => void;
  onConflict?: (message: string) => void;
  onNews: (result: BuildNews, draft: PreviewContent) => void;
  onMerchandise: (result: BuildMerchandise, draft: PreviewContent) => void;
  onCombine: (result: BuildCombine, draft: PreviewContent) => void;
}) {
  const { signal, onStep } = options;
  let draft = previewContent.parse({ ...options.draft, slug: options.draft.slug || slugify(options.draft.full_name) });
  let saved = options.saved;
  const selected = options.retry ?? [...buildSearchKeys];
  // Legacy published articles live outside PreviewContent and are revision-scoped.
  // Preserve what the Locker already displays before a deferred save, including
  // cancellation after that save. Pending review suggestions are never copied.
  if (!options.retry && options.existingArticles?.length) {
    const seen = new Set(draft.article_edits.flatMap(item => newsArticleKeys({ article_url: item.articleUrl, canonical_url: item.sourceUrl ?? undefined, headline: item.headline })));
    const retained = options.existingArticles.filter(article => {
      const keys = newsArticleKeys(article);
      if (keys.some(key => seen.has(key))) return false;
      keys.forEach(key => seen.add(key)); return true;
    }).map(article => editScrapedArticle(article, crypto.randomUUID()));
    if (draft.article_edits.length + retained.length > 40) throw new Error("This Locker has more published articles and edits than one draft can retain. Review the article list before building; nothing has been changed.");
    draft = { ...draft, article_edits: [...draft.article_edits, ...retained] };
  }
  signal.throwIfAborted();
    if (!options.retry) {
      const identity = previewIdentity.parse({ full_name: draft.full_name, school: draft.school, position: draft.position, level: draft.level });
      onStep("career", { state: "running", message: "Gathering career details, jersey numbers and media…" });
      const discovery = await readDiscovery(await fetch("/api/preview-lockers/discovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(identity), signal }), message => onStep("career", { state: "running", message }));
      signal.throwIfAborted();
      if (!discovery.draft) throw new Error(discovery.message);
      draft = mergeSuggestions(draft, discovery.draft);
      options.onDraft(draft);
      onStep("career", { state: discovery.status && discovery.status !== "complete" ? "partial" : "complete", message: discovery.status && discovery.status !== "complete" ? "Some career sources were unavailable. Available suggestions and existing content retained." : "Career suggestions merged. Existing content retained." });
      onStep("save", { state: "running", message: "Saving private draft progress…" });
      // Let an admitted save finish even if Cancel is pressed: retain its revision
      // acknowledgement before stopping the remaining searches.
      const response = await fetch(saved ? `/api/preview-lockers/${saved.id}` : "/api/preview-lockers", {
        method: saved ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(saved ? { revision: saved.revision } : { id: options.createId }), content: draft, deferEnrichment: true }),
      });
      const body = await response.json();
      if (!response.ok) {
        const message = buildFailureMessage(response.status, body.error);
        if (response.status === 409) options.onConflict?.(message);
        throw new Error(message);
      }
      const parsed = savedSchema.safeParse(body);
      if (!parsed.success || parsed.data.id !== (saved?.id ?? options.createId) || (saved && parsed.data.revision <= saved.revision)) throw new Error("The private save could not be confirmed. Keep this draft open and check the latest saved version before retrying.");
      saved = parsed.data;
      options.onSaved(draft, saved);
      onStep("save", { state: "complete", message: "Private draft saved. No enrollment or completion approval recorded." });
    }
    signal.throwIfAborted();
    if (!saved) throw new Error("Save this draft before retrying searches.");
    selected.forEach(key => onStep(key, { state: "running", message: "Searching with the saved player name, college and team history…" }));
    const response = await fetch(`/api/preview-lockers/${saved.id}/build-search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: saved.revision, tasks: selected }), signal });
    const body = await response.json();
    signal.throwIfAborted();
    if (!response.ok || body.revision !== saved.revision) {
      const message = buildFailureMessage(body.revision !== undefined && body.revision !== saved.revision ? 409 : response.status, body.error);
      if (response.status === 409 || (body.revision !== undefined && body.revision !== saved.revision)) options.onConflict?.(message);
      selected.forEach(key => onStep(key, { state: "failed", message })); return;
    }
    for (const key of selected) {
      const outcome = body.tasks?.[key];
      if (outcome?.status === 409) options.onConflict?.(buildFailureMessage(409));
      if (!outcome || outcome.status !== 200) { onStep(key, { state: "failed", message: buildFailureMessage(outcome?.status ?? 503, outcome?.error ?? outcome?.errors?.[0]) }); continue; }
      if (key === "news") {
        const parsed = buildNewsSchema.safeParse(outcome);
        if (!parsed.success) { onStep(key, { state: "failed", message: "News response was invalid. Previous saved reviews are retained." }); continue; }
        options.onNews(parsed.data, draft);
        const partial = parsed.data.newsStatus !== "complete" || parsed.data.awards?.status === "unavailable";
        onStep(key, { state: partial ? "partial" : "complete", message: `${parsed.data.review.articles.length} saved news suggestions; ${parsed.data.awards?.awards_normalized ?? 0} awards mapped.${partial ? ` ${buildFailureMessage(503, parsed.data.errors[0])} Successful work is retained.` : " Review articles in Media."}` });
      } else if (key === "merchandise") {
        const parsed = buildMerchandiseSchema.safeParse(outcome);
        if (!parsed.success) { onStep(key, { state: "failed", message: "Merchandise response was invalid. Previous saved reviews are retained." }); continue; }
        options.onMerchandise(parsed.data, draft);
        const partial = parsed.data.review.result.status === "partial";
        onStep(key, { state: partial ? "partial" : "complete", message: `${parsed.data.review.result.items.length} saved merchandise suggestions. Review in Media.${partial ? " Some sources were unavailable." : ""}` });
      } else {
        const parsed = buildCombineSchema.safeParse(outcome);
        if (!parsed.success) { onStep(key, { state: "failed", message: "Combine response was invalid. Existing measurements are retained." }); continue; }
        options.onCombine(parsed.data, draft);
        const partial = parsed.data.result.status !== "complete";
        onStep(key, { state: partial ? "partial" : "complete", message: `${parsed.data.result.suggestions.length} Combine source suggestions. Review in Stats; existing measurements are unchanged.${partial ? " Some sources were unavailable." : ""}` });
      }
    }
}
