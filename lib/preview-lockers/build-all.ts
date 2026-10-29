import { searchErrorMessage } from "@/lib/search/errors";
import type { AwardEnrichmentReport, EnrichmentReport } from "./enrichment";

/** One-click "Build & search all": career search, one private save, then parallel searches. */
export const buildTasks = ["career", "save", "awards", "news", "merchandise", "combine"] as const;
export type BuildTask = (typeof buildTasks)[number];
export type BuildTaskState = "waiting" | "running" | "done" | "failed" | "skipped";
export type BuildStatus = Record<BuildTask, { state: BuildTaskState; detail: string }>;
/** Searches that can be retried on their own after the draft is saved. */
export const retryableTasks = ["news", "merchandise", "combine"] as const satisfies readonly BuildTask[];
export type RetryableTask = (typeof retryableTasks)[number];

export const buildTaskLabels: Record<BuildTask, string> = {
  career: "Career details", save: "Save private draft", awards: "Awards",
  news: "News", merchandise: "Merchandise", combine: "Combine",
};

export function initialBuildStatus(only?: readonly BuildTask[]): BuildStatus {
  return Object.fromEntries(buildTasks.map(task => [task, only && !only.includes(task)
    ? { state: "skipped", detail: "Not part of this retry." }
    : { state: "waiting", detail: "Waiting" }])) as BuildStatus;
}

/** Marks every task that has not finished, after a stop or an upstream failure. */
export function skipRemaining(status: BuildStatus, detail: string): BuildStatus {
  return Object.fromEntries(buildTasks.map(task => [task, ["waiting", "running"].includes(status[task].state) ? { state: "skipped", detail } : status[task]])) as BuildStatus;
}

export function failedRetryable(status: BuildStatus | null): RetryableTask[] {
  return status ? retryableTasks.filter(task => status[task].state === "failed") : [];
}

const enrichmentMessages: Record<string, string> = {
  news_rate_limited: "News search is cooling down (same player searched in the last 3 minutes) or today's search limit was reached. Retry later.",
  news_unavailable: "News search is unavailable. Retry later.",
  enrichment_unavailable: "Awards and news could not run during save. Retry later.",
  enrichment_not_saved: "Awards and news results could not be saved. Retry later.",
  preview_changed: "The draft changed while awards and news ran. Retry news.",
};
const explain = (code: string) => searchErrorMessage(code) ?? enrichmentMessages[code];

/** Awards row from the enrichment the save already ran. */
export function awardsOutcome(report: EnrichmentReport | { status: "unavailable"; errors: string[] } | undefined): { ok: boolean; detail: string; attempt: AwardEnrichmentReport | null } {
  const attempt = report && "last_awards_attempt" in report ? report.last_awards_attempt ?? null : null;
  if (!attempt || attempt.status !== "complete") return { ok: false, detail: "Award mapping is unavailable. Use Refresh awards on the Career tab.", attempt };
  const unmapped = attempt.unmapped_awards.length;
  return { ok: true, attempt, detail: `${attempt.awards_normalized} mapped to the award library${unmapped ? `, ${unmapped} need manual review` : ""}.` };
}

/** News problems reported by the save's enrichment run. Fatal means no new search results were saved. */
export function newsProblem(report: { errors?: string[]; news_status?: string } | undefined): { fatal: boolean; message: string } {
  if (!report) return { fatal: true, message: explain("enrichment_unavailable")! };
  const codes = (report.errors ?? []).filter(code => !code.startsWith("awards_"));
  const fatal = report.news_status === "unavailable" || codes.some(code => code in enrichmentMessages);
  return { fatal, message: [...new Set(codes.map(code => explain(code) ?? "Some news sources had a problem."))].join(" ") };
}
