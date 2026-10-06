"use client";

import {
  IconAlertTriangle, IconCheck, IconFileUpload, IconRefresh,
  IconShieldCheck, IconUserSearch,
} from "@tabler/icons-react";
import { startTransition, useMemo, useState } from "react";
import {
  commitGtmCsv, inspectGtmCsv, previewGtmCsv,
  type GtmCsvInspection, type GtmCsvPreview,
} from "@/app/admin/gtm/actions";
import { GtmNavigation } from "@/components/admin/gtm/GtmNavigation";
import { GTM_CSV_MAX_BYTES, GTM_CSV_MAX_ROWS, GTM_IMPORT_FIELDS, type GtmFieldMapping, type GtmImportField } from "@/lib/gtm/import-contract";
import {
  captureImportReviewProgress, restoreImportReviewProgress, importReviewPage,
  GTM_REVIEW_CHECKPOINT_MAX_BYTES, type ImportReviewSelections,
} from "@/lib/gtm/import-review-progress";
import { cn } from "@/lib/utils";
import type { PlayerMatchReview } from "@/lib/gtm/player-matching";

const fieldLabels: Record<GtmImportField, string> = {
  displayName: "Display name", firstName: "First name", lastName: "Last name",
  email: "Email", linkedinUrl: "LinkedIn URL", currentCompany: "Company",
  currentTitle: "Title", connectedOn: "Connected on", contactType: "Contact type",
  sport: "Sport", leagueLevel: "League / level", doNotAutomate: "Do not automate",
  sourceRecordId: "Source record ID",
};

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:border-neutral-700 dark:bg-neutral-950";
const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:bg-neutral-800";
const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200";

const steps = ["Upload", "Map fields", "Validate", "Review results", "Player matches", "Confirm", "Import"] as const;

type MatchDecisions = ImportReviewSelections["matches"];

function statusLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function downloadJson(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
}

export function GtmImportWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<GtmCsvInspection | null>(null);
  const [mapping, setMapping] = useState<GtmFieldMapping>({});
  const [preview, setPreview] = useState<GtmCsvPreview | null>(null);
  const [decisions, setDecisions] = useState<MatchDecisions>({});
  const [deferred, setDeferred] = useState<string[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [automaticPage, setAutomaticPage] = useState(1);
  const [automaticExpanded, setAutomaticExpanded] = useState(false);
  const [issuePage, setIssuePage] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [complete, setComplete] = useState<string | null>(null);
  const [previewStale, setPreviewStale] = useState(false);

  const deferredIds = useMemo(() => new Set(deferred), [deferred]);
  const uncertainReviews = useMemo(() => preview?.playerReviews.filter((review) => review.strength !== "strong") ?? [], [preview]);
  const automaticReviews = useMemo(() => preview?.playerReviews.filter((review) => review.strength === "strong") ?? [], [preview]);
  const unresolvedReviews = uncertainReviews.filter((review) => !Object.hasOwn(decisions, review.sourceRecordId) && !deferredIds.has(review.sourceRecordId)).length;
  const reviewSlice = importReviewPage(uncertainReviews, reviewPage);
  const automaticSlice = importReviewPage(automaticReviews, automaticPage);
  const issueSlice = importReviewPage(preview?.issues ?? [], issuePage);
  const currentStep = complete ? 7 : confirmed ? 6 : preview ? (unresolvedReviews > 0 ? 5 : 6) : inspection ? 2 : file ? 1 : 1;

  const formDataFor = () => {
    const formData = new FormData();
    if (file) formData.set("file", file);
    formData.set("mapping", JSON.stringify(mapping));
    if (preview) formData.set("idempotencyKey", preview.idempotencyKey);
    formData.set("playerMatchDecisions", JSON.stringify(decisions));
    formData.set("deferredPlayerMatches", JSON.stringify(deferred));
    return formData;
  };

  const selectFile = (next: File | null) => {
    setFile(next); setInspection(null); setMapping({}); setPreview(null); setDecisions({}); setDeferred([]);
    setReviewPage(1); setAutomaticPage(1); setAutomaticExpanded(false); setIssuePage(1);
    setConfirmed(false); setComplete(null); setNotice(null); setPreviewStale(false);
  };

  const inspect = () => {
    if (!file) { setNotice("Choose a CSV file first."); return; }
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await inspectGtmCsv(formDataFor());
      setPending(false);
      if (!result.ok) { setNotice(result.message); return; }
      setInspection(result.value); setMapping(result.value.mapping); setPreview(null);
    });
  };

  const validate = () => {
    if (!file || !inspection) return;
    setPending(true); setNotice(null); setConfirmed(false);
    startTransition(async () => {
      try {
        const saved = preview ? await captureImportReviewProgress(preview, { matches: decisions, deferred }) : null;
        const result = await previewGtmCsv(formDataFor());
        if (!result.ok) { setNotice(result.message); return; }
        setPreview(result.value); setMapping(result.value.mapping); setPreviewStale(false);
        setConfirmed(false); setReviewPage(1); setAutomaticPage(1); setIssuePage(1);
        setDecisions({}); setDeferred([]);
        if (saved) {
          try {
            const restored = await restoreImportReviewProgress(saved, result.value, true);
            setDecisions(restored.matches); setDeferred(restored.deferred);
            if (Object.keys(restored.matches).length + restored.deferred.length < Object.keys(decisions).length + deferred.length) {
              setNotice("Changed Player candidates were cleared. Choices for unchanged candidates were preserved; review the remaining matches.");
            }
          } catch {
            setNotice("The file mapping changed. Previous choices were cleared; review the current results again.");
          }
        }
      } catch (error) { setNotice(error instanceof Error ? error.message : "The CSV could not be validated."); }
      finally { setPending(false); }
    });
  };

  const setChoice = (sourceRecordId: string, choice: string | null, defer = false) => {
    setConfirmed(false);
    if (defer) {
      setDecisions((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== sourceRecordId)));
      setDeferred((current) => [...new Set([...current, sourceRecordId])]);
    } else {
      setDeferred((current) => current.filter((id) => id !== sourceRecordId));
      setDecisions((current) => ({ ...current, [sourceRecordId]: choice }));
    }
  };

  const saveProgress = async () => {
    if (!preview || previewStale) return;
    setNotice(null); setPending(true);
    try {
      downloadJson(await captureImportReviewProgress(preview, { matches: decisions, deferred }), "bltz-player-review-progress.json");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Review progress could not be saved."); }
    finally { setPending(false); }
  };

  const resumeProgress = async (checkpoint: File | undefined) => {
    if (!checkpoint || !preview || previewStale) return;
    setConfirmed(false); setNotice(null); setPending(true);
    try {
      if (checkpoint.size > GTM_REVIEW_CHECKPOINT_MAX_BYTES) throw new Error("The review checkpoint exceeds 3 MB.");
      const restored = await restoreImportReviewProgress(await checkpoint.text(), preview);
      setDecisions(restored.matches); setDeferred(restored.deferred); setReviewPage(1);
      setNotice("Review progress restored against the current CSV and Player candidates. Confirm the results before importing.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Review progress could not be restored."); }
    finally { setPending(false); }
  };

  const commit = () => {
    if (!file || !preview || !confirmed || previewStale || unresolvedReviews > 0 || preview.counts.newContacts + preview.counts.updates === 0) return;
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await commitGtmCsv(formDataFor());
      setPending(false);
      if (!result.ok) { setNotice(result.message); return; }
      setComplete(`${result.value.created} created, ${result.value.updated} updated, ${result.value.skipped} skipped, ${result.value.failed} failed.`);
    });
  };

  const pagination = (value: { page: number; pages: number; total: number }, onChange: (page: number) => void, name: string) => (
    <nav aria-label={`${name} pages`} className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
      <span>{value.total} total · Page {value.page} of {value.pages}</span>
      <span className="flex gap-2"><button type="button" disabled={pending || value.page === 1} onClick={() => onChange(value.page - 1)} className={secondaryButton} aria-label={`Previous ${name} page`}>Previous</button><button type="button" disabled={pending || value.page === value.pages} onClick={() => onChange(value.page + 1)} className={secondaryButton} aria-label={`Next ${name} page`}>Next</button></span>
    </nav>
  );

  const reviewCards = (reviews: PlayerMatchReview[]) => reviews.map((review) => {
    const selected = Object.hasOwn(decisions, review.sourceRecordId) ? decisions[review.sourceRecordId]
      : review.strength === "strong" ? review.candidates.find((candidate) => candidate.matchType !== "name_only" && candidate.confidence >= 0.9)?.id : undefined;
    return <fieldset key={review.sourceRecordId} disabled={pending} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <legend className="px-1 text-sm font-semibold">Row {review.rowNumber} · {review.displayName}</legend>
      <p className="mt-1 text-xs text-neutral-500">{review.currentCompany || "No organization context"} · {statusLabel(review.strength)} match{review.strength === "strong" && !Object.hasOwn(decisions, review.sourceRecordId) ? " · Automatic suggestion, not manually verified" : ""}</p>
      <div className="mt-3 grid gap-2">{review.candidates.map((candidate) => <label key={candidate.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"><input type="radio" name={`match-${review.sourceRecordId}`} checked={!deferredIds.has(review.sourceRecordId) && selected === candidate.id} onChange={() => setChoice(review.sourceRecordId, candidate.id)} /><span className="min-w-0 flex-1"><span className="font-semibold">{candidate.name}</span><span className="block text-xs text-neutral-500">{[candidate.position, candidate.team, candidate.school, candidate.level].filter(Boolean).join(" · ") || "Canonical Player record"}</span></span><span className="font-mono text-xs">{Math.round(candidate.confidence * 100)}%</span></label>)}
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"><input type="radio" name={`match-${review.sourceRecordId}`} checked={!deferredIds.has(review.sourceRecordId) && selected === null} onChange={() => setChoice(review.sourceRecordId, null)} /><span><span className="font-semibold">Reject match</span><span className="block text-xs text-neutral-500">Import the contact without a new Player link.</span></span></label>
        {review.strength !== "strong" && <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"><input type="radio" name={`match-${review.sourceRecordId}`} checked={deferredIds.has(review.sourceRecordId)} onChange={() => setChoice(review.sourceRecordId, null, true)} /><span><span className="font-semibold">Review later</span><span className="block text-xs text-neutral-500">Preserve the contact in the identity review queue without a new Player link.</span></span></label>}
      </div>
    </fieldset>;
  });

  return (
    <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
      <div className="flex flex-col gap-5 border-b border-neutral-300 pb-6 lg:flex-row lg:items-end lg:justify-between dark:border-neutral-800">
        <header><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">LinkedIn connections</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Import contacts</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">Map changing export headers, inspect every exception, and approve the import before any contact is committed. Player Master remains a separate canonical reference.</p></header>
        <GtmNavigation />
      </div>

      <ol aria-label="Import progress" className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-4 xl:grid-cols-7 dark:border-neutral-800 dark:bg-neutral-800">
        {steps.map((step, index) => {
          const number = index + 1;
          const done = number < currentStep || Boolean(complete && number === 7);
          const active = number === currentStep;
          return <li key={step} aria-current={active ? "step" : undefined} className={cn("flex min-h-16 items-center gap-3 bg-white px-3 py-2 text-xs dark:bg-neutral-900", active && "bg-amber-50 dark:bg-amber-950/30")}><span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-mono font-semibold", done ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black" : active ? "border-[#ffbb00] bg-[#ffbb00] text-black" : "border-neutral-300 text-neutral-400 dark:border-neutral-700")}>{done ? <IconCheck className="h-4 w-4" /> : number}</span><span className={cn("font-semibold", !active && !done && "text-neutral-400")}>{step}</span></li>;
        })}
      </ol>

      {notice && <p role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{notice}</p>}
      {previewStale && <p role="status" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">Field mapping changed. Validate the file again before confirming.</p>}
      {complete && <section className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/30"><IconShieldCheck className="h-7 w-7 text-emerald-700 dark:text-emerald-300" /><h2 className="mt-3 text-xl font-semibold">Import complete</h2><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{complete}</p></section>}

      {!complete && <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="upload-file">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800"><IconFileUpload className="h-5 w-5" /></span><div><h2 id="upload-file" className="font-semibold">1. Upload LinkedIn CSV</h2><p className="mt-1 text-xs leading-5 text-neutral-500">Raw CSV rows are parsed for this request and are not retained. Choosing another file clears choices; download a review checkpoint first. Maximum {(GTM_CSV_MAX_BYTES / 1_000_000).toFixed(0)} MB and {GTM_CSV_MAX_ROWS.toLocaleString()} rows.</p></div></div>
            <input aria-label="LinkedIn CSV file" type="file" accept=".csv,text/csv" disabled={pending} className="mt-4 block w-full rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm file:mr-4 file:min-h-11 file:rounded-xl file:border-0 file:bg-neutral-950 file:px-4 file:text-sm file:font-semibold file:text-white dark:border-neutral-700 dark:bg-neutral-950 dark:file:bg-white dark:file:text-black" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
            <div className="mt-4 flex justify-end"><button type="button" onClick={inspect} disabled={pending || !file || Boolean(inspection)} className={secondaryButton}>{pending && !inspection ? "Reading headers…" : "Read headers"}</button></div>
          </section>

          {inspection && <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="map-fields">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="map-fields" className="font-semibold">2. Map fields</h2><p className="mt-1 text-xs text-neutral-500">{inspection.rowsFound} rows found in {inspection.filename}. Confirm BLTZ fields against the detected headers.</p></div><span className="font-mono text-xs text-neutral-500">{inspection.headers.length} headers</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{GTM_IMPORT_FIELDS.map((field) => <label key={field} className="text-sm font-medium">{fieldLabels[field]}<select disabled={pending} value={mapping[field] ?? ""} onChange={(event) => { setMapping((current) => ({ ...current, [field]: event.target.value || undefined })); setPreviewStale(Boolean(preview)); setConfirmed(false); }} className={inputClass}><option value="">Not mapped</option>{inspection.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div>
            <div className="mt-5 flex justify-end"><button type="button" onClick={validate} disabled={pending} className={primaryButton}>{pending ? "Validating…" : preview ? <><IconRefresh className="h-4 w-4" />Validate again</> : "3. Validate and preview"}</button></div>
          </section>}

          {preview && !previewStale && <>
            <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="review-results">
              <h2 id="review-results" className="font-semibold">4. Review results</h2>
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 sm:grid-cols-4 dark:border-neutral-800 dark:bg-neutral-800">{[
                ["Rows found", preview.counts.found], ["New", preview.counts.newContacts], ["Existing", preview.counts.existingContacts], ["Updates", preview.counts.updates],
                ["Duplicates", preview.counts.duplicate], ["Matched Players", preview.counts.matchedPlayers], ["Possible matches", preview.counts.possiblePlayerMatches],
                ["Auto classified", preview.counts.automaticClassifications], ["Needs classification", preview.counts.needsReview], ["Unclassified", preview.counts.unclassified], ["Invalid", preview.counts.invalid],
              ].map(([name, value]) => <div key={String(name)} className="bg-neutral-50 p-3 dark:bg-neutral-950"><p className="font-mono text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-neutral-500">{name}</p></div>)}</div>
              <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800"><table className="w-full min-w-[58rem] text-left text-sm"><thead className="bg-neutral-100 text-xs text-neutral-500 dark:bg-neutral-950"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Organization</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Segment</th><th className="px-3 py-2">Classification</th><th className="px-3 py-2">Player review</th><th className="px-3 py-2">Result</th></tr></thead><tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">{preview.sample.map((row) => <tr key={row.rowNumber}><td className="px-3 py-2 font-mono">{row.rowNumber}</td><td className="px-3 py-2"><span className="font-semibold">{row.displayName}</span>{row.email && <span className="block text-xs text-neutral-500">{row.email}</span>}</td><td className="px-3 py-2">{row.currentCompany || "—"}</td><td className="px-3 py-2">{statusLabel(row.contactType)}</td><td className="px-3 py-2">{row.segment ?? "—"}</td><td className="px-3 py-2"><span className="font-medium">{statusLabel(row.classificationStatus)}</span><span className="block font-mono text-xs text-neutral-500">{Math.round(row.classificationConfidence * 100)}%</span></td><td className="px-3 py-2">{row.playerMatchStatus ? statusLabel(row.playerMatchStatus) : "—"}</td><td className="px-3 py-2">{statusLabel(row.outcome)}</td></tr>)}</tbody></table></div>
              {preview.sample.length < preview.counts.found && <p className="mt-2 text-xs text-neutral-500">Showing the first {preview.sample.length} rows. Counts include the complete file.</p>}
              {preview.issues.length > 0 && <details className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30"><summary className="cursor-pointer font-semibold">Review excluded rows ({preview.counts.invalid})</summary><p className="mt-2 text-xs leading-5">These rows are excluded from this preview. Keep the original CSV; diagnostics contain row numbers and reasons only. Conflicting identities require correction, not an automatic merge.</p><ul className="mt-2 space-y-1 text-neutral-700 dark:text-neutral-300">{issueSlice.rows.map((issue) => <li key={issue.rowNumber}>Row {issue.rowNumber}: {issue.message}</li>)}</ul>{pagination(issueSlice, setIssuePage, "excluded rows")}<button type="button" disabled={pending} onClick={() => downloadJson(JSON.stringify({ version: 1, contentSha256: preview.contentSha256, issues: preview.issues }, null, 2), "bltz-csv-row-diagnostics.json")} className={cn(secondaryButton, "mt-3")}>Download all row diagnostics</button></details>}

            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="player-matches">
              <div className="flex items-start gap-3"><IconUserSearch className="mt-0.5 h-5 w-5" /><div><h2 id="player-matches" className="font-semibold">5. Review uncertain Player matches</h2><p className="mt-1 text-xs leading-5 text-neutral-500">A name never confirms identity by itself. Accept, reject, or defer uncertain matches. Deferred contacts keep their review status without a new Player link; existing relationships are preserved.</p></div></div>
              <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={pending || !unresolvedReviews} className={secondaryButton} onClick={() => { setDeferred((current) => [...new Set([...current, ...uncertainReviews.filter((review) => !Object.hasOwn(decisions, review.sourceRecordId)).map((review) => review.sourceRecordId)])]); setConfirmed(false); }}>Defer remaining uncertain matches</button><span className="text-xs text-neutral-500">{deferred.length} deferred for later review</span></div>
              {uncertainReviews.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">No uncertain Player candidates found.</p> : <><div className="mt-4 space-y-3">{reviewCards(reviewSlice.rows)}</div>{pagination(reviewSlice, setReviewPage, "uncertain matches")}</>}
              {automaticReviews.length > 0 && <details className="mt-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800" onToggle={(event) => setAutomaticExpanded(event.currentTarget.open)}><summary className="cursor-pointer text-sm font-semibold">Automatic suggestions ({automaticReviews.length}) · not manually verified</summary>{automaticExpanded && <><p className="mt-2 text-xs text-neutral-500">Only a unique exact name and exact team or college context produces an automatic suggestion. Selecting a candidate explicitly verifies that choice.</p><div className="mt-4 space-y-3">{reviewCards(automaticSlice.rows)}</div>{pagination(automaticSlice, setAutomaticPage, "automatic suggestions")}</>}</details>}
              <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800"><h3 className="text-sm font-semibold">Save or resume review progress</h3><p className="mt-1 text-xs leading-5 text-neutral-500">Download a checkpoint before leaving. Re-upload the original CSV and validate the same mapping, then load this checkpoint. It contains hashes and reviewed identifiers, not CSV rows, contact names or email addresses. No review data is saved automatically in browser storage. Checkpoints are untrusted progress metadata; the server rechecks current candidates and your own preview. Confirmation is never restored.</p><div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={saveProgress} disabled={pending} className={secondaryButton}>Download review progress</button><label className="text-xs font-medium">Resume review checkpoint<input aria-label="Resume review checkpoint" type="file" accept=".json,application/json" disabled={pending} className="mt-1 block max-w-full text-xs" onChange={(event) => { void resumeProgress(event.target.files?.[0]); event.target.value = ""; }} /></label></div></div>
              {unresolvedReviews > 0 && <p role="status" className="mt-4 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300"><IconAlertTriangle className="h-4 w-4" />Review {unresolvedReviews} uncertain {unresolvedReviews === 1 ? "match" : "matches"} before confirming.</p>}
            </section>
          </>}
        </div>

        <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 xl:sticky xl:top-5 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="confirm-import">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Approval gate</p><h2 id="confirm-import" className="mt-1 text-xl font-semibold">6. Confirm import</h2>
          {!preview || previewStale ? <p className="mt-3 text-sm leading-6 text-neutral-500">Upload, map, and validate a CSV before approval.</p> : <><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt>Contacts to write</dt><dd className="font-mono font-semibold">{preview.counts.newContacts + preview.counts.updates}</dd></div><div className="flex justify-between gap-3"><dt>Rows skipped</dt><dd className="font-mono font-semibold">{preview.counts.duplicate + preview.counts.invalid}</dd></div><div className="flex justify-between gap-3"><dt>Unresolved choices</dt><dd className="font-mono font-semibold">{unresolvedReviews}</dd></div></dl><label className={cn("mt-5 flex min-h-12 items-start gap-3 rounded-xl border p-3 text-sm", unresolvedReviews ? "cursor-not-allowed border-neutral-200 text-neutral-400 dark:border-neutral-800" : "cursor-pointer border-neutral-300 dark:border-neutral-700")}><input type="checkbox" disabled={pending || unresolvedReviews > 0 || preview.counts.newContacts + preview.counts.updates === 0} checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4" /><span><span className="font-semibold">I reviewed the results</span><span className="mt-1 block text-xs leading-5">Approve creates, updates, excluded rows, Player-link choices and deferred reviews shown here.</span></span></label><button type="button" onClick={commit} disabled={pending || !confirmed || unresolvedReviews > 0 || preview.counts.newContacts + preview.counts.updates === 0} className={cn(primaryButton, "mt-4 w-full")}>{pending ? "Importing…" : "7. Import contacts"}</button></>}
          <p className="mt-4 text-xs leading-5 text-neutral-500">The batch uses the existing reviewed import transaction. Excluded or invalid rows are reported and can remain unimported; retain the original CSV and diagnostics.</p>
        </aside>
      </div>}
    </main>
  );
}
