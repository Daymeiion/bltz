"use client";

import { useState } from "react";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StructuredStats } from "@/components/player/StructuredStats";
import { CSV_LIMIT, cfbCategories, columnOptions, combineCfbImports, inspectCsv, reviewCsv, type CfbCategory, type CfbImport, type CsvTable } from "@/lib/preview-lockers/cfb-csv";

export default function CfbCsvImport({ athleteName, value, onChange }: { athleteName: string; value: CfbImport[]; onChange: (value: CfbImport[]) => void }) {
  const [source, setSource] = useState("");
  const [category, setCategory] = useState<CfbCategory>("defense");
  const [csv, setCsv] = useState("");
  const [table, setTable] = useState<CsvTable | null>(null);
  const [mapping, setMapping] = useState<string[]>([]);
  const [review, setReview] = useState<ReturnType<typeof reviewCsv> | null>(null);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState(false);
  function reset() { setTable(null); setReview(null); setApproved(false); setError(""); setMessage(""); }
  function fail(cause: unknown) { setError(cause instanceof ZodError ? cause.issues.map(issue => issue.message).slice(0, 3).join(" ") : cause instanceof Error ? cause.message : "Unable to read CSV."); }
  return <section aria-label="Import college statistics CSV" className="space-y-4 rounded-lg border p-4">
    <div><h2 className="text-xl font-semibold">Import college statistics</h2><p className="text-sm text-muted-foreground">Paste a Sports Reference season table or upload its CSV export for {athleteName || "this player"}. Imports stay in this private preview. Save the draft after adding a reviewed table.</p></div>
    <label className="grid gap-2 text-sm font-medium">Player source URL<Input aria-label="Player source URL" type="url" value={source} onChange={e => { setSource(e.target.value); setReview(null); setApproved(false); }} placeholder="https://www.sports-reference.com/cfb/players/player-name-1.html" /></label>
    <label className="grid gap-2 text-sm font-medium">Table category<select aria-label="Table category" className="rounded border bg-background p-2" value={category} onChange={e => { setCategory(e.target.value as CfbCategory); reset(); }}>{cfbCategories.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium">Upload CSV<Input aria-label="Upload college CSV" type="file" accept=".csv,text/csv" disabled={reading} onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
      reset();
      if (!/\.csv$/i.test(file.name) || file.size > CSV_LIMIT) { setError("Choose a .csv file of 100 KB or smaller."); return; }
      setReading(true);
      try { setCsv(await file.text()); } catch (cause) { fail(cause); } finally { setReading(false); }
    }} /></label>
    <label className="grid gap-2 text-sm font-medium">Or paste CSV<Textarea aria-label="College statistics CSV" rows={6} value={csv} maxLength={CSV_LIMIT} disabled={reading} onChange={e => { setCsv(e.target.value); reset(); }} placeholder="Year,School,G,Solo,Ast,Tot,Sk" /></label>
    <Button type="button" variant="outline" disabled={reading || !csv.trim()} onClick={() => { reset(); try { const result = inspectCsv(csv, category); setTable(result); setMapping(result.mapping); } catch (cause) { fail(cause); } }}>Read CSV columns</Button>
    {table && <div className="space-y-3"><p className="text-sm">Confirm what each column means. Unmapped columns are skipped. Map repeated headers such as Yds or TD to their correct category.</p>
      <div className="grid gap-3 sm:grid-cols-2">{table.headers.map((header, index) => <label key={index} className="grid gap-1 text-sm">{header || `Column ${index + 1}`}<select aria-label={`Map column ${index + 1}: ${header}`} className="min-w-0 rounded border bg-background p-2" value={mapping[index]} onChange={e => { setMapping(mapping.map((key, i) => i === index ? e.target.value : key)); setReview(null); setApproved(false); }}><option value="">Skip column</option>{Object.entries(columnOptions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>)}</div>
      <Button type="button" variant="outline" onClick={() => { setError(""); setReview(null); setApproved(false); try { const result = reviewCsv(table, mapping, category, source); combineCfbImports([...value.filter(item => item.category !== category), result.imported]); setReview(result); } catch (cause) { fail(cause); } }}>Review college statistics</Button>
    </div>}
    {review && <div className="space-y-3">
      <p className="text-sm">{review.imported.seasons.length} season/team rows for {athleteName}. {value.some(item => item.category === category) ? `This replaces the existing ${category} import when you add it to the draft.` : "This adds a new table to the draft."}</p>
      <div className="rounded-lg bg-[#0c1524]"><StructuredStats records={combineCfbImports([review.imported])} /></div>
      {review.warnings.length > 0 && <details><summary className="cursor-pointer">{review.warnings.length} skipped columns or summary rows</summary><ul className="list-inside list-disc text-sm">{review.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />I verified this source, player, seasons, column mappings, and skipped data for {athleteName}.</label>
      <Button type="button" disabled={!approved} onClick={() => { try { const next = [...value.filter(item => item.category !== category), review.imported]; combineCfbImports(next); onChange(next); reset(); setCsv(""); setMessage("College statistics added to draft. Save draft to persist them privately."); } catch (cause) { fail(cause); } }}>Add reviewed statistics to draft</Button>
    </div>}
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
    {value.length > 0 && <div className="space-y-3"><h3 className="font-semibold">College tables in this draft</h3>{value.map(item => <div key={item.category} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"><div className="text-sm"><p>{item.category} · {item.seasons.length} season/team rows</p><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all underline">Source player page</a></div><Button type="button" variant="outline" onClick={() => { onChange(value.filter(batch => batch.category !== item.category)); setReview(null); setApproved(false); }}>Remove {item.category} from draft</Button></div>)}</div>}
  </section>;
}
