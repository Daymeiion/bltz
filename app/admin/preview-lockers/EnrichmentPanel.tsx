"use client";
import { useState } from "react";
import type { EnrichmentReport } from "@/lib/preview-lockers/enrichment";
import { searchErrorMessage } from "@/lib/search/errors";

export default function EnrichmentPanel({ id, initialReport, stale }: { id: string; initialReport: EnrichmentReport | null; stale: boolean }) {
  const [report, setReport] = useState(initialReport);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isStale, setStale] = useState(stale);
  async function refresh() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/preview-lockers/${id}/news`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = await response.json();
      const saved = body.report?.updated_at && !body.report.errors?.some((code: string) => ["preview_changed", "enrichment_not_saved"].includes(code));
      if (saved) { setReport(body.report); setStale(false); }
      if (!response.ok) setError(saved
        ? "The attempt was saved, but discovery is unavailable. Previous matching articles are retained."
        : "Enrichment could not be saved. Your preview is still available. Try again after checking the source status.");
    } catch { setError("News refresh is unavailable. Your saved preview is unchanged."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-white/10 bg-[#121923] p-5" aria-labelledby="enrichment-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="enrichment-heading" className="text-lg font-semibold text-white">Awards & news enrichment</h2>
      <button type="button" disabled={busy} onClick={refresh} className="min-h-11 rounded-md border border-[#ffbb00]/50 px-4 text-sm text-[#ffbb00] focus-visible:outline focus-visible:outline-2 disabled:opacity-50">{busy ? "Refreshing…" : "Refresh News"}</button></div>
    <div role="status" aria-live="polite" className="space-y-2 text-sm text-white/70">
      {report ? <><p>Status: {report.status}{isStale ? " · preview edited since last enrichment" : ""}</p>
        <p>Latest attempt — Awards: {report.awards_normalized}/{report.awards_discovered} mapped. News: {report.news_status ?? report.status}.</p>
        {report.last_news_success ? <p>Last successful news discovery ({report.last_news_success.updated_at}): {report.last_news_success.article_candidates} candidates, {report.last_news_success.articles_accepted} accepted, {report.last_news_success.articles_rejected} rejected, {report.last_news_success.article_duplicates} duplicates.</p> : <p>No successful news discovery saved yet.</p>}
        {(report.news_status === "unavailable" || report.news_status === "skipped") && <p>Previous matching articles are retained.</p>}
        {!!report.unmapped_awards.length && <p>Unmapped awards: {report.unmapped_awards.join("; ")}</p>}
        <p>Last attempt: <time dateTime={report.updated_at}>{report.updated_at}</time></p>
        {!!report.errors.length && <p>Source status: {report.errors.join(", ")}</p>}</> : <p>No saved enrichment run yet. Refresh News also maps the saved awards.</p>}
      {report?.errors.map(code => searchErrorMessage(code)).filter(Boolean).map(message => <p key={message}>{message}</p>)}
      {error && <p role="alert">{error}</p>}
    </div>
    <p className="text-xs text-white/50">Save builder edits before refreshing. Discovered awards remain unverified. News links open the publisher; article text and images are not copied.</p>
  </section>;
}
