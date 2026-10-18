"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AwardImage, AwardImageLibrary } from "@/lib/award-images/model";
import { suggestAwardImageMatches, type AwardImageMatch } from "@/lib/award-images/matches";

export default function AwardImageMatches({ library, busy, onReload, onReview }: {
  library: AwardImageLibrary; busy: boolean; onReload: () => Promise<void>; onReview: (image: AwardImage) => void;
}) {
  const [query, setQuery] = useState(""), [replacements, setReplacements] = useState(false), [limit, setLimit] = useState(50);
  // Keep the reviewed revisions, rather than silently rebasing selections after a reload.
  const [selected, setSelected] = useState<Record<string, AwardImageMatch>>({});
  const [working, setWorking] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const proposals = useMemo(() => suggestAwardImageMatches(library), [library]);
  const matches = proposals.filter(row => (replacements || !row.award.image_asset_id) && `${row.sourceName} ${row.award.name}`.toLowerCase().includes(query.toLowerCase()));
  const visible = matches.slice(0, limit), count = Object.keys(selected).length, disabled = busy || working;
  const candidates = new Map<string, number>();
  for (const row of matches) candidates.set(row.award.id, (candidates.get(row.award.id) ?? 0) + 1);

  function choose(row: AwardImageMatch, checked: boolean) {
    setError(""); setMessage("");
    if (checked && !selected[row.award.id] && count >= 100) { setError("Approve this batch before selecting more than 100 awards."); return; }
    setSelected(previous => { const next = { ...previous }; if (checked) next[row.award.id] = row; else delete next[row.award.id]; return next; });
  }
  function selectClear() {
    const next = { ...selected };
    for (const row of visible) {
      if (row.confidence === "clear" && row.sourceKind === "filename" && !row.award.image_asset_id && candidates.get(row.award.id) === 1 && Object.keys(next).length < 100) next[row.award.id] = row;
    }
    setSelected(next); setError(""); setMessage("");
  }
  async function reload() {
    setWorking(true); setError("");
    try { await onReload(); setSelected({}); }
    catch { setError("Could not reload suggestions. Your selections are retained."); }
    finally { setWorking(false); }
  }
  async function approve() {
    if (!count || disabled) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/award-images/matches", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({matches: Object.values(selected).map(row => ({award_id: row.award.id, image_asset_id: row.image.id, award_updated_at: row.award.updated_at, image_revision: row.image.revision}))})});
      if (!response.ok) {
        if (response.status === 409) { setError("An image or award changed after you reviewed it. No mappings in this batch were changed. Reload suggestions and select again."); return; }
        if (response.status === 401 || response.status === 403) { setError("Admin access is required to approve matches."); return; }
        throw new Error();
      }
      const result = await response.json();
      const pending = new Set(Object.values(selected).filter(row => row.image.asset_status !== "approved").map(row => row.image.id)).size;
      setSelected({});
      setMessage(`${result.saved} mappings saved${result.unchanged ? `; ${result.unchanged} already applied` : ""}.${pending ? ` ${pending} selected images still need display review.` : ""}`);
      try { await onReload(); }
      catch { setError("Mappings were saved, but the library could not refresh. Reload suggestions to see the saved results."); }
    } catch { setError("Could not confirm the approval. Reload suggestions to check saved mappings before retrying."); }
    finally { setWorking(false); }
  }

  return <section aria-label="Filename match suggestions" className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
    <div><h2 className="text-xl font-semibold">Suggested filename matches</h2><p className="mt-2 text-sm text-muted-foreground">Review proposed award-to-image matches, then approve your selection together. Approving a match does not approve an image’s usage permission or verify an athlete’s achievement.</p></div>
    <div className="flex flex-wrap items-center gap-3"><Input aria-label="Search filename matches" className="min-w-0 max-w-md" placeholder="Search filenames or award names" value={query} onChange={e => {setQuery(e.target.value); setSelected({}); setLimit(50);}} /><Button type="button" variant="outline" disabled={disabled} onClick={() => void reload()}>Reload suggestions</Button></div>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={replacements} disabled={disabled} onChange={e => {setReplacements(e.target.checked); setSelected({}); setLimit(50);}} />Show replacement suggestions for awards that already have an image</label>
    <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" disabled={disabled || !visible.some(row => row.confidence === "clear" && row.sourceKind === "filename" && !row.award.image_asset_id && candidates.get(row.award.id) === 1)} onClick={selectClear}>Select clear matches</Button><Button type="button" variant="outline" disabled={disabled || !count} onClick={() => setSelected({})}>Clear match selection</Button><Button type="button" disabled={disabled || !count} onClick={() => void approve()}>{working ? "Saving matches…" : `Approve selected matches (${count})`}</Button></div>
    <p className="text-xs text-muted-foreground">Up to 100 awards per batch. One selected image per award; selecting another proposal replaces that selection. Clear-match selection excludes replacements and uncertain candidates.</p>
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
    {!matches.length && <p className="text-sm text-muted-foreground">No matching suggestions here yet. Upload descriptive filenames such as Jim-Thorpe-Award.png or First-Team-All-American.webp. You can add catalog aliases or map images manually below.{!replacements && proposals.some(row => row.award.image_asset_id) ? " Turn on replacement suggestions to review alternatives for mapped awards." : ""}</p>}
    <div className="space-y-3">{visible.map(row => {
      const current = library.images.find(image => image.id === row.award.image_asset_id);
      return <article key={row.key} className="min-w-0 space-y-3 rounded border p-3 sm:p-4">
        <label className="flex items-start gap-3"><input aria-label={`Select ${row.award.name} with ${row.sourceName}`} type="checkbox" className="mt-1" checked={selected[row.award.id]?.key === row.key} disabled={disabled} onChange={e => choose(row, e.target.checked)} /><span className="min-w-0"><span className="block font-semibold">{row.award.name}</span><span className="block break-all text-sm">{row.sourceName}</span></span></label>
        <div className="grid min-w-0 gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
          <div>{row.image.imageUrl && <img loading="lazy" src={row.image.imageUrl} alt={`Proposed artwork for ${row.award.name}`} className="h-28 w-full object-contain" />}</div>
          <div className="min-w-0 space-y-2 text-sm"><p>{row.confidence === "clear" ? "Name match" : "Review award variant"} · {row.reason}</p><p className="text-xs text-muted-foreground">{row.sourceKind === "filename" ? "Original upload filename" : "Saved title from an older upload; original filename unavailable"}</p>
            {row.award.image_asset_id ? <p className="break-words">Replaces current default: <strong>{current?.title || "Existing mapped image"}</strong>. Player-specific overrides stay in place.</p> : <p>No current library default.</p>}
            {(candidates.get(row.award.id) ?? 0) > 1 && <p className="text-xs text-muted-foreground">Several images suggest this award. Choose one.</p>}
            {row.image.asset_status !== "approved" && <p className="text-xs text-muted-foreground">Image display review pending. This match will stay hidden from Locker cards until the image is approved.</p>}
            <Button type="button" variant="outline" disabled={disabled} onClick={() => onReview(row.image)}>Review image details</Button>
          </div>
        </div>
      </article>;
    })}</div>
    {matches.length > limit && <Button type="button" variant="outline" disabled={disabled} onClick={() => setLimit(value => value + 50)}>Show more matches ({matches.length - limit} remaining)</Button>}
  </section>;
}
