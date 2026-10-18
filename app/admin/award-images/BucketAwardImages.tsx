"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BucketFile = {filename: string; size: number};
export default function BucketAwardImages({ busy, onBusyChange, onReload }: {busy: boolean; onBusyChange: (value: boolean) => void; onReload: () => Promise<void>}) {
  const [files, setFiles] = useState<BucketFile[]>([]), [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<string[]>([]), [error, setError] = useState(""), [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {const response = await fetch("/api/admin/award-images/bucket-imports", {cache: "no-store"}); if (!response.ok) throw new Error(); const body = await response.json(); if (!Array.isArray(body.files)) throw new Error(); setFiles(body.files);}
    catch {setError("Could not list images already in the bucket. Try checking again.");}
    finally {setLoading(false);}
  }, []);
  useEffect(() => {void load();}, [load]);
  async function importFiles() {
    if (busy || !files.length) return;
    onBusyChange(true); setError(""); setMessage(""); setProgress([]);
    let saved = 0, duplicates = 0, failed = 0;
    for (const file of files) {
      try {
        const response = await fetch("/api/admin/award-images/bucket-imports", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({filename: file.filename})});
        if (!response.ok) throw new Error();
        const result = await response.json(); if (result.duplicate) duplicates++; else saved++;
        setProgress(rows => [...rows, `${file.filename}: ${result.duplicate ? "Already saved" : "Imported for review"}`]);
      } catch {failed++; setProgress(rows => [...rows, `${file.filename}: Could not import; check again to retry.`]);}
    }
    try {await onReload();} catch {setError("Imports finished, but the library could not refresh. Reload it to see saved images.");}
    setMessage(`${saved} images imported · ${duplicates} already saved · ${failed} failed. New images need display review; suggested matches are ready below.`);
    onBusyChange(false);
  }
  return <section aria-label="Images already in Supabase" className="space-y-3 rounded-lg border bg-card p-5">
    <h2 className="text-lg font-semibold">Images already in Supabase</h2>
    <p className="text-sm text-muted-foreground">Bring named files uploaded directly to award-library / images into this review workflow. Original files stay in place; validated artwork uses an immutable copy, and repeated imports are deduplicated.</p>
    <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" disabled={busy || loading} onClick={() => void load()}>Check bucket images</Button><Button type="button" disabled={busy || loading || !files.length} onClick={() => void importFiles()}>Import bucket images ({files.length})</Button></div>
    {loading && <p role="status" className="text-sm">Checking named bucket files…</p>}{error && <p role="alert" className="text-sm text-red-500">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
    {progress.length > 0 && <details open={busy}><summary className="cursor-pointer text-sm">Bucket import progress ({progress.length}/{files.length})</summary><ul className="mt-3 max-h-48 overflow-auto text-xs" aria-live="polite">{progress.map((row, index) => <li key={index} className="break-all py-1">{row}</li>)}</ul></details>}
  </section>;
}
