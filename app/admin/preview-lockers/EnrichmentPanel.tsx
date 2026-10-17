"use client";
import type { AwardEnrichmentReport } from "@/lib/preview-lockers/enrichment";

export default function EnrichmentPanel({ report, stale, disabled, busy, error, onRefresh }: {
  report: AwardEnrichmentReport | null; stale: boolean; disabled: boolean; busy: boolean; error: string; onRefresh: () => void;
}) {
  return <section className="space-y-3 rounded-xl border border-white/10 bg-[#121923] p-5" aria-labelledby="awards-enrichment-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="awards-enrichment-heading" className="text-lg font-semibold text-white">Awards enrichment</h2>
      <button type="button" disabled={disabled} onClick={onRefresh} className="min-h-11 rounded-md border border-[#ffbb00]/50 px-4 text-sm text-[#ffbb00] focus-visible:outline focus-visible:outline-2 disabled:opacity-50">{busy ? "Refreshing awards…" : "Refresh awards"}</button></div>
    <div role="status" aria-live="polite" className="space-y-2 break-words text-sm text-white/70">
      {report ? <><p>Status: {report.status}{stale ? " · preview edited since last awards enrichment" : ""}</p>
        <p>Awards: {report.awards_normalized}/{report.awards_discovered} mapped.</p>
        {!!report.unmapped_awards.length && <p>Unmapped awards: {report.unmapped_awards.join("; ")}</p>}
        <p>Last awards attempt: <time dateTime={report.updated_at}>{report.updated_at}</time></p>
        {!!report.errors.length && <p>Source status: {report.errors.join(", ")}</p>}</> : <p>No saved awards enrichment run yet.</p>}
      {error && <p role="alert">{error}</p>}
    </div>
    <p className="text-xs text-white/50">Save builder edits before refreshing. Maps saved awards to the award catalog; awards remain unverified. Search and review news articles in Media.</p>
  </section>;
}
