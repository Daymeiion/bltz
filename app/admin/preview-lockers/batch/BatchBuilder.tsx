"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildSavedPreview, type BatchBuildResult, type BatchMatch } from "@/lib/preview-lockers/batch";
import { addBatchToCohort, matchBatchNames, openBatchPreview } from "./actions";

type Row = { key: string; label: string; gsisId: string; state: "waiting" | "running" | "done" | "failed" | "skipped"; detail: string; previewId?: string; result?: BatchBuildResult };
const CONCURRENCY = 2;
const candidateLabel = (c: BatchMatch["candidates"][number]) => [c.display_name, c.position, c.college_name, c.latest_team, c.last_season ? `last season ${c.last_season}` : null].filter(Boolean).join(" · ");

export default function BatchBuilder() {
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<BatchMatch[] | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<"match" | "build" | null>(null);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    if (busy !== "build") return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  useEffect(() => () => abort.current?.abort(), []);

  async function findPlayers() {
    setBusy("match"); setError(""); setRows(null);
    try {
      const result = await matchBatchNames(text);
      if (!result.ok) { setError(result.message); return; }
      setMatches(result.matches);
    } catch { setError("Players could not be matched. Nothing was changed."); }
    finally { setBusy(null); }
  }
  const chosen = (matches ?? []).filter(match => match.gsisId);

  async function buildAll() {
    if (!chosen.length || busy) return;
    const controller = new AbortController(); abort.current = controller;
    let current: Row[] = chosen.map(match => ({ key: `${match.name}|${match.college ?? ""}`, label: match.candidates.find(c => c.gsis_id === match.gsisId)?.display_name ?? match.name, gsisId: match.gsisId!, state: "waiting", detail: "Waiting" }));
    const update = (gsisId: string, patch: Partial<Row>) => { current = current.map(row => row.gsisId === gsisId ? { ...row, ...patch } : row); setRows(current); };
    setRows(current); setBusy("build"); setError("");
    try {
      const cohort = await addBatchToCohort([...new Set(current.map(row => row.gsisId))]);
      if (!cohort.ok) { setError(`${cohort.message} No Lockers were built.`); current = current.map(row => ({ ...row, state: "skipped", detail: "Not started." })); setRows(current); return; }
      let next = 0;
      const worker = async () => {
        while (!controller.signal.aborted && next < current.length) {
          const { gsisId } = current[next++];
          update(gsisId, { state: "running", detail: "Creating private Locker…" });
          try {
            const opened = await openBatchPreview(gsisId);
            if (!opened.ok) { update(gsisId, { state: "failed", detail: opened.message }); continue; }
            update(gsisId, { previewId: opened.preview.id, detail: opened.created ? "Locker created." : "Existing Locker reopened." });
            const result = await buildSavedPreview(opened.preview, controller.signal, text => update(gsisId, { detail: text }));
            const problems = [result.career, result.save, result.awards, result.news, result.merchandise].filter(step => !step.ok).map(step => step.detail);
            update(gsisId, result.save.ok
              ? { state: "done", result, detail: problems.length ? `Built and needs review. Some searches need a retry in the editor: ${problems.join(" ")}` : "Built and needs review." }
              : { state: "failed", result, detail: [result.career, result.save].find(step => !step.ok)?.detail ?? "Build failed." });
          } catch { update(gsisId, { state: "failed", detail: controller.signal.aborted ? "Cancelled." : "Build failed. Open the Locker to retry." }); }
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, current.length) }, worker));
    } finally {
      if (controller.signal.aborted) { current = current.map(row => row.state === "waiting" || row.state === "running" ? { ...row, state: "skipped", detail: "Cancelled." } : row); setRows(current); }
      abort.current = null; setBusy(null);
    }
  }

  const done = rows?.filter(row => row.state === "done").length ?? 0;
  return <div className="space-y-6">
    {error && <p role="alert" className="rounded-lg border border-red-500 p-3">{error}</p>}
    <section className="space-y-3 rounded-lg border p-4" aria-labelledby="batch-names-heading">
      <h2 id="batch-names-heading" className="font-semibold">1. Paste players</h2>
      <label className="grid gap-2 text-sm">One player per line. Add the college after a comma when two players share a name.
        <Textarea aria-label="Player names, one per line" rows={8} value={text} disabled={busy !== null} onChange={event => { setText(event.target.value); setMatches(null); }} placeholder={"Antoine Cason\nDJ Moore, Maryland"} />
      </label>
      <Button type="button" disabled={busy !== null || text.trim().length < 2} onClick={() => { void findPlayers(); }}>{busy === "match" ? "Finding players…" : "Find players"}</Button>
    </section>
    {matches && <section className="space-y-3 rounded-lg border p-4" aria-labelledby="batch-match-heading">
      <h2 id="batch-match-heading" className="font-semibold">2. Confirm each player</h2>
      <p className="text-sm text-muted-foreground">Exact single matches are chosen for you. Pick the right player for anything else, or leave it skipped.</p>
      <ul className="space-y-2">{matches.map((match, index) => <li key={`${match.name}|${match.college ?? ""}`} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-center">
        <span className="font-medium break-words">{match.name}{match.college ? `, ${match.college}` : ""}</span>
        {match.candidates.length
          ? <select aria-label={`Player Master match for ${match.name}`} className="min-h-11 w-full min-w-0 rounded-md border bg-background px-2 text-sm" disabled={busy !== null} value={match.gsisId ?? ""} onChange={event => setMatches(current => current!.map((item, i) => i === index ? { ...item, gsisId: event.target.value || null } : item))}>
              <option value="">Skip this name{match.gsisId ? "" : match.candidates.length > 1 ? ` (${match.candidates.length} possible matches)` : " (close match, please confirm)"}</option>
              {match.candidates.map(c => <option key={c.gsis_id} value={c.gsis_id}>{candidateLabel(c)}</option>)}
            </select>
          : <span className="text-sm text-red-400">Not found in the Player Master list. Check the spelling, or build this Locker by hand.</span>}
      </li>)}</ul>
      <p className="text-sm">{chosen.length} of {matches.length} ready. Each player uses three of your 200 daily scraper searches; building runs two players at a time, so keep this tab open.</p>
      <p className="text-xs text-muted-foreground">Combine results are not searched here, because their suggestions are not saved. Run Combine from each Locker&apos;s Stats tab while you review it.</p>
      <Button type="button" disabled={busy !== null || !chosen.length} onClick={() => { void buildAll(); }}>Add to cohort and build {chosen.length} Locker{chosen.length === 1 ? "" : "s"}</Button>
    </section>}
    {rows && <section className="space-y-3 rounded-lg border p-4" aria-labelledby="batch-progress-heading">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="batch-progress-heading" className="font-semibold">3. Build progress · {done} of {rows.length} built</h2>
        {busy === "build" && <Button type="button" variant="outline" onClick={() => abort.current?.abort()}>Cancel remaining players</Button>}</div>
      <ol className="space-y-2" aria-live="polite">{rows.map(row => <li key={row.gsisId} data-state={row.state} className="grid gap-1 rounded-md border p-3 data-[state=failed]:border-red-500">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 font-medium">{row.state === "done" && <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ffbb00]" role="img" aria-label="Needs review" />}{row.label}</span>
          <span className="text-xs font-semibold uppercase text-muted-foreground">{row.state}</span></div>
        <p className="text-sm break-words">{row.detail}</p>
        {row.previewId && busy !== "build" && <Link className="text-sm underline" href={`/admin/preview-lockers/${row.previewId}/edit`}>Review Locker</Link>}
      </li>)}</ol>
      {busy !== "build" && done > 0 && <Link className="inline-flex min-h-11 items-center underline" href="/admin/preview-lockers">See all Lockers that need review</Link>}
    </section>}
  </div>;
}
