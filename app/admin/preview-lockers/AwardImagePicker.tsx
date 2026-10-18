"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { awardArtwork, type AwardImageLibrary } from "@/lib/award-images/model";
import type { PreviewContent } from "@/lib/preview-lockers/validation";

type Award = PreviewContent["awards"][number];
export default function AwardImagePicker({ award, onChange }: { award: Award; onChange: (patch: Partial<Award>) => void }) {
  const [open, setOpen] = useState(false), [library, setLibrary] = useState<AwardImageLibrary | null>(null);
  const [error, setError] = useState(""), [loading, setLoading] = useState(false), [query, setQuery] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { const response = await fetch("/api/admin/award-images", { cache: "no-store" }); if (!response.ok) throw new Error(); setLibrary(await response.json()); }
    catch { setError("Could not load the image library. Try reloading it."); } finally { setLoading(false); }
  }
  const artwork = library ? awardArtwork(award, library) : null;
  const reset = { photoId: null, imageAssetId: null, imageUrl: null };
  return <div className="space-y-2 sm:col-span-2">
    <p className="text-sm text-muted-foreground">Image: {award.imageMode === "none" ? "hidden" : award.imageAssetId ? "library override" : award.photoId || award.imageUrl ? "custom image" : "catalog default"}. Review the award match and choose shared artwork.</p>
    <Button type="button" variant="outline" onClick={() => { setOpen(true); void load(); }}>Choose from Award Image Library</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
      <DialogTitle>Award image · {award.label || "New award"}</DialogTitle>
      <DialogDescription>Choose the award definition and image. Save the Locker draft to keep your choices. Matching artwork does not verify the achievement.</DialogDescription>
      <div className="flex flex-wrap items-center gap-3"><a href="/admin/award-images" target="_blank" rel="noopener noreferrer" className="text-sm underline">Open library / upload images</a><Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>Reload library</Button></div>
      {loading && <p role="status">Loading images…</p>}{error && <p role="alert">{error}</p>}
      {library && <>
        <label className="grid gap-2 text-sm">Award catalog match<select aria-label="Award catalog match" className="min-h-11 w-full min-w-0 rounded border bg-background px-3" value={award.catalogAwardId === undefined ? "auto" : award.catalogAwardId ?? "unmapped"} onChange={e => onChange({ catalogAwardId: e.target.value === "auto" ? undefined : e.target.value === "unmapped" ? null : e.target.value })}>
          <option value="auto">Automatic exact name / alias match</option><option value="unmapped">Keep unmatched</option>{library.catalog.filter(row => row.active).map(row => <option key={row.id} value={row.id}>{row.name} · {row.level || row.sport}</option>)}
        </select></label>
        <p className="text-sm">{artwork?.catalog ? `Matched: ${artwork.catalog.name}` : "No unique catalog match. Select the correct definition above or keep it unmatched."}</p>
        <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={() => onChange({ ...reset, imageMode: "auto" })}>Use catalog default</Button><Button type="button" variant="outline" onClick={() => onChange({ ...reset, imageMode: "none" })}>Hide award image</Button></div>
        <Input aria-label="Search library images" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search images" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{library.images.filter(image => image.active && image.asset_status === "approved" && image.title.toLowerCase().includes(query.toLowerCase())).map(image => <button key={image.id} type="button" aria-pressed={award.imageAssetId === image.id} className="min-w-0 space-y-2 rounded border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00] aria-pressed:border-[#ffbb00]" onClick={() => onChange({ ...reset, imageAssetId: image.id, imageMode: "custom" })}>
          {image.imageUrl && <img src={image.imageUrl} alt="" className="h-28 w-full object-contain" />}<span className="block break-words text-sm">{image.title}</span>
        </button>)}</div>
        {!library.images.some(image => image.active && image.asset_status === "approved") && <p className="text-sm">Upload images in the library, review their source, usage permission and credit, then approve them for Locker cards.</p>}
        <Button type="button" onClick={() => setOpen(false)}>Done</Button>
      </>}
    </DialogContent></Dialog>
  </div>;
}
