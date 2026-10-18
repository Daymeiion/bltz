"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { AwardImageLibrary } from "@/lib/award-images/model";
import type { PreviewContent } from "@/lib/preview-lockers/validation";

type Award = PreviewContent["awards"][number];
export default function AwardImagePicker({ award, currentImageUrl, onChange }: { award: Award; currentImageUrl?: string | null; onChange: (patch: Partial<Award>) => void }) {
  const [open, setOpen] = useState(false), [library, setLibrary] = useState<AwardImageLibrary | null>(null);
  const [error, setError] = useState(""), [loading, setLoading] = useState(false), [query, setQuery] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { const response = await fetch("/api/admin/award-images", { cache: "no-store" }); if (!response.ok) throw new Error(); setLibrary(await response.json()); }
    catch { setError("Could not load images. Try refreshing."); } finally { setLoading(false); }
  }
  const selected = library?.images.find(image => image.id === award.imageAssetId);
  const imageUrl = award.imageMode === "none" ? null : selected?.imageUrl ?? currentImageUrl;
  const images = library?.images.filter(image => image.active && `${image.title} ${image.original_filename ?? ""}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  return <div className="space-y-3 sm:col-span-2">
    {imageUrl && <img src={imageUrl} alt={`${award.label || "Award"} image`} className="h-28 w-28 rounded border object-contain p-2" />}
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" onClick={() => { setOpen(true); setQuery(""); void load(); }}>Choose award image</Button>
      {(award.imageAssetId || award.photoId || award.imageUrl) && award.imageMode !== "none" && <Button type="button" variant="ghost" onClick={() => onChange({ photoId: null, imageAssetId: null, imageUrl: null, imageMode: "none" })}>Remove image</Button>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
      <DialogTitle>Choose image · {award.label || "New award"}</DialogTitle>
      <DialogDescription>Click an image to use it for this award. Save the Locker draft to keep your choice.</DialogDescription>
      <div className="flex flex-wrap items-center justify-between gap-3"><a href="/admin/award-images" target="_blank" rel="noopener noreferrer" className="text-sm underline">Upload more images</a><Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>Refresh</Button></div>
      <Input aria-label="Search library images" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search images" />
      {loading && <p role="status">Loading images…</p>}{error && <p role="alert">{error}</p>}
      {library && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map(image => <button key={image.id} type="button" aria-pressed={award.imageAssetId === image.id} disabled={loading || !image.imageUrl} className="min-w-0 space-y-2 rounded border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00] aria-pressed:border-[#ffbb00] disabled:opacity-50" onClick={() => { onChange({ photoId: null, imageUrl: null, imageAssetId: image.id, imageMode: "custom" }); setOpen(false); }}>
        {image.imageUrl ? <img loading="lazy" src={image.imageUrl} alt="" className="h-28 w-full object-contain" /> : <span className="grid h-28 place-items-center text-xs">Image unavailable</span>}<span className="block break-words text-sm">{image.title}</span>
      </button>)}</div>}
      {library && !images.length && <p className="text-sm">{query ? "No images match your search." : "No images yet. Upload images to the library to get started."}</p>}
    </DialogContent></Dialog>
  </div>;
}
