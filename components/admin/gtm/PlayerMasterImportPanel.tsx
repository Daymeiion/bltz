"use client";

import { IconCheck, IconDatabaseImport, IconShieldCheck } from "@tabler/icons-react";
import { startTransition, useState } from "react";
import {
  commitPlayerMasterCsv,
  previewPlayerMasterCsv,
  type PlayerMasterPreview,
} from "@/app/admin/gtm/player-master-actions";
import { PLAYER_MASTER_CSV_MAX_BYTES, PLAYER_MASTER_CSV_MAX_ROWS } from "@/lib/players/master-import-contract";
import { cn } from "@/lib/utils";

const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:bg-neutral-800";
const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200";

export function PlayerMasterImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PlayerMasterPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [complete, setComplete] = useState<string | null>(null);

  const formDataFor = () => {
    const formData = new FormData();
    if (file) formData.set("file", file);
    if (preview) formData.set("idempotencyKey", preview.idempotencyKey);
    return formData;
  };

  const selectFile = (next: File | null) => {
    setFile(next);
    setPreview(null);
    setConfirmed(false);
    setNotice(null);
    setComplete(null);
  };

  const previewFile = () => {
    if (!file) return;
    setPending(true);
    setNotice(null);
    startTransition(async () => {
      const result = await previewPlayerMasterCsv(formDataFor());
      setPending(false);
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setPreview(result.value);
      setConfirmed(false);
    });
  };

  const commit = () => {
    if (!file || !preview || !confirmed) return;
    setPending(true);
    setNotice(null);
    startTransition(async () => {
      const result = await commitPlayerMasterCsv(formDataFor());
      setPending(false);
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setComplete(`${result.value.created.toLocaleString()} created, ${result.value.updated.toLocaleString()} updated, ${result.value.skipped.toLocaleString()} duplicates skipped, ${result.value.failed.toLocaleString()} rows held for review.`);
    });
  };

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900" aria-labelledby="player-master-import">
      <div className="grid gap-5 border-b border-neutral-200 bg-neutral-50 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffbb00] text-black"><IconDatabaseImport className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Canonical athlete reference</p>
            <h2 id="player-master-import" className="mt-1 text-xl font-semibold">Player Master</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">Imports NFL player reference records by stable GSIS ID. This does not create GTM contacts or public Player Locker records.</p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"><IconShieldCheck className="h-4 w-4" />Preview required</span>
      </div>

      <div className="p-5">
        {notice && <p role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{notice}</p>}
        {complete ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
            <IconCheck className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
            <h3 className="mt-2 font-semibold">Player Master import complete</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{complete}</p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <label className="text-sm font-semibold" htmlFor="player-master-file">Player Master CSV</label>
              <p className="mt-1 text-xs leading-5 text-neutral-500">Maximum {(PLAYER_MASTER_CSV_MAX_BYTES / 1_000_000).toFixed(0)} MB and {PLAYER_MASTER_CSV_MAX_ROWS.toLocaleString()} rows. Rows without GSIS ID are never imported automatically.</p>
              <input id="player-master-file" type="file" accept=".csv,text/csv" className="mt-3 block w-full rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm file:mr-4 file:min-h-11 file:rounded-xl file:border-0 file:bg-neutral-950 file:px-4 file:text-sm file:font-semibold file:text-white dark:border-neutral-700 dark:bg-neutral-950 dark:file:bg-white dark:file:text-black" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
              <div className="mt-4 flex justify-end"><button type="button" className={secondaryButton} onClick={previewFile} disabled={!file || pending}>{pending && !preview ? "Analyzing Player Master…" : "Preview Player Master"}</button></div>

              {preview && <div className="mt-5">
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 sm:grid-cols-3 lg:grid-cols-6 dark:border-neutral-800 dark:bg-neutral-800">{[
                  ["Rows found", preview.counts.found], ["Valid", preview.counts.valid], ["New", preview.counts.newPlayers],
                  ["Existing", preview.counts.existingPlayers], ["Duplicates", preview.counts.duplicates], ["Review", preview.counts.invalid],
                ].map(([label, value]) => <div key={String(label)} className="bg-neutral-50 p-3 dark:bg-neutral-950"><p className="font-mono text-xl font-semibold">{Number(value).toLocaleString()}</p><p className="mt-1 text-xs text-neutral-500">{label}</p></div>)}</div>
                <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-800"><table className="w-full min-w-[38rem] text-left text-sm"><thead className="sticky top-0 bg-neutral-100 text-xs text-neutral-500 dark:bg-neutral-950"><tr><th className="px-3 py-2">GSIS ID</th><th className="px-3 py-2">Player</th><th className="px-3 py-2">Team</th><th className="px-3 py-2">Position</th><th className="px-3 py-2">Result</th></tr></thead><tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">{preview.sample.map((row) => <tr key={row.gsisId}><td className="px-3 py-2 font-mono text-xs">{row.gsisId}</td><td className="px-3 py-2 font-semibold">{row.displayName}</td><td className="px-3 py-2">{row.team || "—"}</td><td className="px-3 py-2">{row.position || "—"}</td><td className="px-3 py-2 capitalize">{row.outcome}</td></tr>)}</tbody></table></div>
                {preview.issues.length > 0 && <details className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30"><summary className="cursor-pointer font-semibold">Rows held for manual review ({preview.counts.invalid.toLocaleString()})</summary><ul className="mt-2 space-y-1 text-neutral-700 dark:text-neutral-300">{preview.issues.map((issue) => <li key={`${issue.rowNumber}-${issue.message}`}>Row {issue.rowNumber}: {issue.message}</li>)}</ul></details>}
              </div>}
            </div>

            <aside className="h-fit rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Approval gate</p>
              {!preview ? <p className="mt-3 text-sm leading-6 text-neutral-500">Choose and preview the Player Master before approval.</p> : <>
                <dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt>Players to write</dt><dd className="font-mono font-semibold">{preview.counts.valid.toLocaleString()}</dd></div><div className="flex justify-between gap-3"><dt>Rows excluded</dt><dd className="font-mono font-semibold">{(preview.counts.invalid + preview.counts.duplicates).toLocaleString()}</dd></div></dl>
                <label className="mt-4 flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-neutral-300 p-3 text-sm dark:border-neutral-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4" /><span><span className="font-semibold">I reviewed this Player Master</span><span className="mt-1 block text-xs leading-5">Approve stable-ID creates, updates, and excluded exceptions.</span></span></label>
                <button type="button" onClick={commit} disabled={pending || !confirmed} className={cn(primaryButton, "mt-4 w-full")}>{pending ? "Importing players…" : "Import Player Master"}</button>
              </>}
              <p className="mt-4 text-xs leading-5 text-neutral-500">The database operation is atomic. A failed commit keeps no partial Player Master batch.</p>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
