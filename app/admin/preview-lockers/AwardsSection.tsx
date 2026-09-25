"use client";
import { BuilderSection } from "./BuilderSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PreviewContent } from "@/lib/preview-lockers/validation";

export default function AwardsSection({ awards, photos, saved, onChange, onUpload }: {
  awards: PreviewContent["awards"]; photos: PreviewContent["photos"]; saved: boolean;
  onChange: (awards: PreviewContent["awards"]) => void;
  onUpload: (files: FileList | null, index: number) => void;
}) {
  const update = (index: number, patch: Partial<PreviewContent["awards"][number]>) => onChange(awards.map((award, i) => i === index ? { ...award, ...patch } : award));
  return <BuilderSection title="Awards" count={awards.length} description="Expand to review and edit achievements">
    {awards.map((award, index) => <section key={index} aria-label={`Award ${index + 1} details`} className="min-w-0 space-y-5 rounded-lg border p-4 sm:p-5">
      <h3 className="text-sm font-semibold">Award {index + 1}</h3>
      <div className="grid min-w-0 items-start gap-x-5 gap-y-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm">Year<Input aria-label={`Award ${index + 1} year`} maxLength={20} value={award.year} onChange={e => update(index, { year: e.target.value })} /></label>
        <label className="grid min-w-0 gap-2 text-sm">Award name<Input aria-label={`Award ${index + 1} label`} maxLength={200} value={award.label} onChange={e => update(index, { label: e.target.value })} /></label>
        <label className="grid min-w-0 gap-2 text-sm sm:col-span-2">Description<Textarea aria-label={`Award ${index + 1} description`} placeholder="What does this award recognize?" rows={2} maxLength={160} value={award.description ?? ""} onChange={e => update(index, { description: e.target.value })} /></label>
        <label className="grid min-w-0 gap-2 text-sm sm:col-span-2">Related article URL<Input type="url" aria-label={`Award ${index + 1} article URL`} placeholder="https://… (optional)" value={award.sourceUrl ?? ""} onChange={e => update(index, { sourceUrl: e.target.value || null })} /></label>
        <label className="grid min-w-0 gap-2 text-sm sm:col-span-2">Award image<select aria-label={`Award ${index + 1} image`} className="h-10 w-full min-w-0 rounded-md border bg-background px-3" value={award.photoId ?? ""} onChange={e => update(index, { photoId: e.target.value || null })}><option value="">Use image URL / no image</option>{photos.map(photo => <option key={photo.id} value={photo.id}>{photo.title || "Untitled photo"}</option>)}</select></label>
        <label className="grid min-w-0 gap-2 text-sm sm:col-span-2">Image URL (optional)<Input type="url" aria-label={`Award ${index + 1} image URL`} placeholder="https://…" value={award.imageUrl ?? ""} onChange={e => update(index, { imageUrl: e.target.value || null })} /></label>
        {saved && <label className="grid min-w-0 gap-2 text-sm sm:col-span-2">Upload award image<Input aria-label={`Award ${index + 1} upload image`} type="file" accept="image/png,image/jpeg,image/webp" disabled={photos.length >= 40} onChange={e => { onUpload(e.target.files, index); e.target.value = ""; }} /><span className="text-xs text-muted-foreground">PNG, JPG, or WebP. Up to 10 MB.</span></label>}
      </div>
      <div className="flex flex-wrap gap-3 border-t pt-4"><Button type="button" variant="outline" onClick={() => onChange(awards.filter((_, i) => i !== index))}>Remove from draft</Button></div>
    </section>)}
    <Button type="button" variant="outline" disabled={awards.length >= 40} onClick={() => onChange([...awards, { year: "", label: "" }])}>Add award</Button>
  </BuilderSection>;
}
