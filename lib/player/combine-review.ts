import { z } from "zod";
import { combineMetricKeys, type CombineResult } from "./combine";
import { previewCombineResult, previewUrl } from "@/lib/preview-lockers/validation";

export const combineSuggestionSchema = z.object({
  id: z.string().min(1).max(160), event: previewCombineResult,
  sourceLabel: z.string().min(1).max(200),
}).strict();
export const combineSearchSchema = z.object({
  suggestions: z.array(combineSuggestionSchema).max(24),
  sources: z.array(z.object({ url: previewUrl, label: z.string().max(200), status: z.enum(["results", "no_match", "unavailable"]) }).strict()).max(12),
  status: z.enum(["complete", "partial", "unavailable"]),
}).strict();
export type CombineSuggestion = z.infer<typeof combineSuggestionSchema>;
export type CombineSearch = z.infer<typeof combineSearchSchema>;
export const combineChoiceKey = (suggestion: CombineSuggestion, metric: string) => `${suggestion.id}:${metric}`;

export type CombineReviewState = { identity: string; key: string; result: CombineSearch };
/** Append unique evidence without replacing earlier source values. */
export function mergeCombineSearch(previous: CombineSearch | null, incoming: CombineSearch): CombineSearch {
  const suggestions = [...(previous?.suggestions ?? [])];
  for (const candidate of incoming.suggestions.filter(item => item.event.eventType === "combine")) {
    const fingerprint = (item: CombineSuggestion) => JSON.stringify([item.event.sourceUrl, item.event.eventType, item.event.year, item.event.measurements]);
    if (suggestions.length < 24 && !suggestions.some(item => fingerprint(item) === fingerprint(candidate)))
      suggestions.push({ ...candidate, id: crypto.randomUUID() });
  }
  return { ...incoming, suggestions };
}

/** Only explicit review adds measurements. Existing event fields and values win,
 * including zero reps. Unknown-year events cannot be safely merged by year. */
export function addReviewedCombine(current: CombineResult[], suggestions: CombineSuggestion[], choices: string[]): CombineResult[] {
  const next = current.map(event => ({ ...event, measurements: [...event.measurements] }));
  const selected = new Set(choices);
  for (const suggestion of suggestions) {
    const candidate = suggestion.event;
    if (candidate.eventType !== "combine") continue;
    let target = next.find(event => event.eventType === candidate.eventType && (
      candidate.year !== null ? event.year === candidate.year : event.year === null && event.sourceUrl === candidate.sourceUrl));
    const measurements = candidate.measurements.filter(item => selected.has(combineChoiceKey(suggestion, item.metric)));
    if (!measurements.length) continue;
    if (target && target.timing !== "not_recorded" && candidate.timing !== "not_recorded" && target.timing !== candidate.timing) continue;
    if (!target) {
      if (next.length >= 10) continue;
      target = { ...candidate, id: `review-${crypto.randomUUID()}`, measurements: [] };
      next.push(target);
    }
    for (const item of measurements) {
      if (target.measurements.some(saved => saved.metric === item.metric)) continue;
      // Retain the evidence even when an existing event has another default source.
      target.measurements.push({ ...item, sourceUrl: item.sourceUrl ?? candidate.sourceUrl });
    }
  }
  return next;
}

export const reviewMetricOrder = combineMetricKeys;
