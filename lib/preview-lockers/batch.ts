import { awardsOutcome, newsProblem } from "./build-all";
import type { EnrichmentReport } from "./enrichment";
import { mergeSuggestions } from "./merge-suggestions";
import { readDiscovery } from "./stream-client";
import { previewContent, previewIdentity, type PreviewContent } from "./validation";
import { searchErrorMessage } from "@/lib/search/errors";

export type BatchLine = { name: string; college: string | null };
export type BatchCandidate = { gsis_id: string; display_name: string; college_name: string | null; latest_team: string | null; position: string | null; last_season: number | null };
/** gsisId is set only when exactly one Player Master row matched the exact name. */
export type BatchMatch = BatchLine & { candidates: BatchCandidate[]; gsisId: string | null };

/** One player per line: "Name" or "Name, College". Blank and repeated lines are dropped. */
export function parseBatchLines(text: string): BatchLine[] {
  const seen = new Set<string>();
  return text.split(/\r?\n/).flatMap(raw => {
    const [name = "", ...rest] = raw.split(",");
    const clean = name.replace(/\s+/g, " ").trim().slice(0, 120);
    const college = rest.join(",").replace(/\s+/g, " ").trim().slice(0, 120) || null;
    const key = `${clean.toLowerCase()}|${college?.toLowerCase() ?? ""}`;
    if (clean.length < 2 || seen.has(key)) return [];
    seen.add(key);
    return [{ name: clean, college }];
  });
}

export type BatchStepResult = { ok: boolean; detail: string };
export type BatchBuildResult = { career: BatchStepResult; save: BatchStepResult; awards: BatchStepResult; news: BatchStepResult; merchandise: BatchStepResult; revision: number | null };
type SaveBody = { id: string; slug: string; revision: number; enrichment?: EnrichmentReport | { status: "unavailable"; errors: string[] } };

const skipped = (detail: string): BatchStepResult => ({ ok: false, detail });
async function errorCode(response: Response) { return (await response.json().catch(() => null))?.error as string | undefined; }

/**
 * Builds one saved preview without an editor: career search, blank-only merge,
 * one save that also maps awards and searches news, then merchandise. Combine
 * is left for the editor, because its suggestions are not saved anywhere.
 */
export async function buildSavedPreview(preview: { id: string; revision: number; content: PreviewContent }, signal: AbortSignal, onProgress: (text: string) => void): Promise<BatchBuildResult> {
  const result: BatchBuildResult = { career: skipped("Not started."), save: skipped("Not started."), awards: skipped("Not started."), news: skipped("Not started."), merchandise: skipped("Not started."), revision: null };
  const { content } = preview;
  const identity = previewIdentity.safeParse({ full_name: content.full_name, school: content.school, position: content.position, level: content.level });
  if (!identity.success) { result.career = skipped("The player's name is missing."); return result; }
  let merged = content;
  try {
    onProgress("Searching career sources…");
    const discovery = await readDiscovery(await fetch("/api/preview-lockers/discovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(identity.data), signal }), onProgress);
    if (discovery.draft) merged = mergeSuggestions(content, discovery.draft);
    result.career = { ok: true, detail: discovery.draft ? "Suggestions filled blank fields." : discovery.message };
  } catch (cause) {
    result.career = skipped(signal.aborted ? "Cancelled." : cause instanceof Error ? cause.message : "Career search unavailable.");
    return result;
  }
  const parsed = previewContent.safeParse(merged);
  if (!parsed.success) { result.save = skipped(`Open the editor to fix: ${parsed.error.issues.map(issue => issue.path.join(".")).slice(0, 5).join(", ")}.`); return result; }
  onProgress("Saving draft, mapping awards and searching news…");
  // A save is never aborted mid-request: its outcome would be unknown.
  const response = await fetch(`/api/preview-lockers/${preview.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: preview.revision, content: parsed.data, refreshNews: true }) });
  if (!response.ok) {
    const code = await errorCode(response);
    result.save = skipped(response.status === 409 ? code === "slug_conflict" ? "Its private URL is already used by another Locker." : "Someone saved this preview in the meantime. Open it to build there." : response.status === 401 || response.status === 403 ? "Your Admin session is no longer authorized. Sign in again." : "Save failed. Retry this player.");
    return result;
  }
  const saved = await response.json() as SaveBody;
  result.revision = saved.revision;
  result.save = { ok: true, detail: `Saved privately (revision ${saved.revision}).` };
  const awards = awardsOutcome(saved.enrichment);
  result.awards = { ok: awards.ok, detail: awards.detail };
  const news = newsProblem(saved.enrichment);
  const accepted = saved.enrichment && "articles_accepted" in saved.enrichment ? saved.enrichment.articles_accepted : 0;
  result.news = news.fatal ? skipped(news.message) : { ok: true, detail: `${accepted} article${accepted === 1 ? "" : "s"} found for review.${news.message ? ` ${news.message}` : ""}` };
  if (signal.aborted) { result.merchandise = skipped("Cancelled."); return result; }
  try {
    onProgress("Searching merchandise…");
    const merch = await fetch(`/api/preview-lockers/${preview.id}/merchandise`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: saved.revision }), signal });
    const body = await merch.json().catch(() => null);
    if (!merch.ok) {
      const codes: string[] = [...(Array.isArray(body?.result?.errors) ? body.result.errors : []), body?.error].filter(Boolean);
      result.merchandise = skipped(codes.map(code => searchErrorMessage(code)?.replace(/\bnews\b/gi, "merchandise")).filter(Boolean).join(" ") || "Merchandise search is unavailable. Run it from the editor.");
    } else {
      const items = Array.isArray(body?.review?.result?.items) ? body.review.result.items.length : 0;
      result.merchandise = { ok: true, detail: `${items} listing${items === 1 ? "" : "s"} found for review.` };
    }
  } catch { result.merchandise = skipped(signal.aborted ? "Cancelled." : "Merchandise search is unavailable. Run it from the editor."); }
  return result;
}
