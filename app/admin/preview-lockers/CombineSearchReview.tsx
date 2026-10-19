"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { combineEventLabel, combineMetricInfo, combineValue, type CombineResult } from "@/lib/player/combine";
import { addReviewedCombine, combineChoiceKey, combineSearchSchema, type CombineSearch, type CombineSuggestion } from "@/lib/player/combine-review";

export type CombineDiscoveryProps = {
  preview?: { id: string; revision: number } | null; identityKey: string;
  searchDisabled: boolean; onBusyChange: (busy: boolean) => void;
};
export default function CombineSearchReview({ preview, identityKey, searchDisabled, onBusyChange, value, onChange }: CombineDiscoveryProps & {
  value: CombineResult[]; onChange: (value: CombineResult[]) => void;
}) {
  const [review, setReview] = useState<{ identity: string; result: CombineSearch } | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null), identity = useRef(identityKey);
  useEffect(() => { identity.current = identityKey; controller.current?.abort(); }, [identityKey]);
  useEffect(() => () => controller.current?.abort(), []);
  const result = review?.identity === identityKey ? review.result : null;
  async function search() {
    if (!preview || searchDisabled || controller.current) return;
    const requestIdentity = identityKey;
    controller.current = new AbortController(); setBusy(true); onBusyChange(true); setMessage("");
    try {
      const response = await fetch(`/api/preview-lockers/${preview.id}/combine`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: preview.revision }), signal: controller.current.signal });
      const body = await response.json(), parsed = combineSearchSchema.safeParse(body.result);
      if (!response.ok || !parsed.success || body.revision !== preview.revision) throw new Error(response.status === 409
        ? "The saved preview changed. Reload it before searching again. Your measurements are retained."
        : response.status === 429 ? "Search is temporarily limited. Try again shortly. Your measurements are retained."
        : body.error === "combine_identity_incomplete" ? "Add a college or team and save the draft before searching."
        : "Combine search is unavailable. Previous suggestions and your measurements are retained.");
      if (identity.current !== requestIdentity) return;
      // Append new evidence; failed/repeated searches cannot clear earlier review.
      setReview(current => {
        const previous = current?.identity === requestIdentity ? current.result : null;
        const suggestions = [...(previous?.suggestions ?? [])];
        for (const candidate of parsed.data.suggestions) {
          const key = JSON.stringify([candidate.event.sourceUrl, candidate.event.eventType, candidate.event.year, candidate.event.measurements]);
          if (!suggestions.some(item => JSON.stringify([item.event.sourceUrl, item.event.eventType, item.event.year, item.event.measurements]) === key) && suggestions.length < 24)
            suggestions.push({ ...candidate, id: crypto.randomUUID() });
        }
        return { identity: requestIdentity, result: { ...parsed.data, suggestions } };
      });
      setMessage(parsed.data.status === "partial" ? "Some sources were unavailable. Review the available evidence below." : parsed.data.suggestions.length ? "Results ready for review. Nothing has been added or saved." : "No unambiguous testing results found. Check source links or enter results manually.");
    } catch (error) { if (!controller.current?.signal.aborted) setMessage(error instanceof Error ? error.message : "Search unavailable. Your measurements are retained."); }
    finally { controller.current = null; setBusy(false); onBusyChange(false); }
  }
  function blocked(suggestion: CombineSuggestion, metric: string) {
    const event = value.find(event => event.eventType === suggestion.event.eventType && (suggestion.event.year !== null
      ? event.year === suggestion.event.year : event.year === null && event.sourceUrl === suggestion.event.sourceUrl));
    return event?.measurements.some(item => item.metric === metric) ? "Already entered; kept unchanged" : event && event.timing !== "not_recorded" && suggestion.event.timing !== "not_recorded" && event.timing !== suggestion.event.timing ? "Timing differs; enter as a separate event manually" : "";
  }
  function choose(suggestion: CombineSuggestion, metric: string, checked: boolean) {
    const key = combineChoiceKey(suggestion, metric);
    // A reviewer picks one source/value per metric and event, never a silent winner.
    const competing = (result?.suggestions ?? []).filter(item => item.event.eventType === suggestion.event.eventType && item.event.year === suggestion.event.year).map(item => combineChoiceKey(item, metric));
    setChoices(current => [...current.filter(choice => !competing.includes(choice)), ...(checked ? [key] : [])]);
  }
  return <section className="space-y-3 rounded-lg border p-3" aria-label="Search Combine and Pro Day results">
    <p className="text-sm">Search Wikipedia, Pro Football Reference, NFL reports and Draft Scout using this player’s college and teams. Review each value and source. Existing measurements stay unchanged; approved results fill only blank fields in the same event. Keep unknown-year events separate until you confirm the year.</p>
    <Button type="button" variant="outline" disabled={!preview || searchDisabled || busy} onClick={() => void search()}>{busy ? "Searching Combine & Pro Day…" : "Search Combine & Pro Day results"}</Button>
    {(!preview || searchDisabled && !busy) && <p className="text-xs text-muted-foreground">Save the draft before searching with the current player information.</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {result && <div className="space-y-4">
      {result.suggestions.map(suggestion => <section key={suggestion.id} className="space-y-2 border-t pt-3" aria-label={`${combineEventLabel(suggestion.event)} suggestion from ${suggestion.sourceLabel}`}>
        <h4 className="font-semibold">{combineEventLabel(suggestion.event)} · {suggestion.sourceLabel}</h4>
        <p className="text-xs">{suggestion.event.year === null ? "Year not confirmed. " : ""}{suggestion.event.timing === "not_recorded" ? "Timing not specified" : `${suggestion.event.timing} timing`}</p>
        {suggestion.event.measurements.map(item => {
          const reason = blocked(suggestion, item.metric);
          const alternatives = result.suggestions.filter(other => other.event.eventType === suggestion.event.eventType && other.event.year === suggestion.event.year).flatMap(other => other.event.measurements.filter(otherItem => otherItem.metric === item.metric));
          const conflict = new Set(alternatives.map(other => other.value)).size > 1;
          return <label key={item.metric} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" disabled={!!reason} checked={!reason && choices.includes(combineChoiceKey(suggestion, item.metric))} onChange={event => choose(suggestion, item.metric, event.target.checked)}
              aria-label={`Review ${combineMetricInfo[item.metric].label} ${combineValue(item.metric, item.value)} from ${suggestion.sourceLabel} ${suggestion.event.eventType} ${suggestion.event.year ?? "unknown year"}`} />
            <span>{combineMetricInfo[item.metric].label}: <strong>{combineValue(item.metric, item.value)}</strong> {item.metric === "broad_jump" ? "FT / IN" : combineMetricInfo[item.metric].unit}
              {conflict && <span className="block text-amber-400">Sources disagree — choose the value supported by your review.</span>}
              {reason && <span className="block text-muted-foreground">{reason}</span>}
              <a className="ml-2 underline" href={item.sourceUrl ?? suggestion.event.sourceUrl!} target="_blank" rel="noopener noreferrer">View source</a>
            </span>
          </label>;
        })}
      </section>)}
      {result.suggestions.length > 0 && <Button type="button" disabled={!choices.length || busy} onClick={() => {
        const next = addReviewedCombine(value, result.suggestions, choices);
        const added = next.reduce((sum, event) => sum + event.measurements.length, 0) - value.reduce((sum, event) => sum + event.measurements.length, 0);
        if (added) onChange(next);
        setChoices([]); setMessage(added ? `${added} reviewed measurement(s) added to the draft. Save draft to keep them in the Locker.` : "No measurements added. Existing values are retained; remove an unused event if the ten-event limit is reached.");
      }}>Add selected measurements to draft</Button>}
      <details><summary className="cursor-pointer text-sm">Sources checked</summary><ul className="mt-2 space-y-2 text-sm">{result.sources.map(source => <li key={source.url}><a className="underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a> · {source.status === "results" ? "Results found" : source.status === "no_match" ? "No unambiguous player/event results" : "Unavailable"}</li>)}</ul></details>
      <p className="text-xs text-muted-foreground">Review suggestions stay in this open editor. Save the draft after adding measurements to retain them for later visits.</p>
    </div>}
  </section>;
}
