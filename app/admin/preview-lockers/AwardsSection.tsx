"use client";
import AwardImagePicker from "./AwardImagePicker";
import type { ReactNode } from "react";
import { BuilderSection } from "./BuilderSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PreviewContent } from "@/lib/preview-lockers/validation";

export default function AwardsSection({ awards, photos, onChange, enrichment }: {
  awards: PreviewContent["awards"]; photos: PreviewContent["photos"];
  enrichment?: ReactNode;
  onChange: (awards: PreviewContent["awards"]) => void;
}) {
  const update = (index: number, patch: Partial<PreviewContent["awards"][number]>) => onChange(awards.map((award, i) => i === index ? { ...award, ...patch } : award));
  return <BuilderSection title="Awards" count={awards.length} description="Expand to review and edit achievements">
    {enrichment}
    {awards.map((award, index) => <section key={index} aria-label={`Award ${index + 1} details`} className="min-w-0 space-y-5 rounded-lg border p-4 sm:p-5">
      <h3 className="text-sm font-semibold">Award {index + 1}</h3>
      <div className="grid min-w-0 items-start gap-x-5 gap-y-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm">Year<Input aria-label={`Award ${index + 1} year`} maxLength={20} value={award.year} onChange={e => update(index, { year: e.target.value })} /></label>
        <label className="grid min-w-0 gap-2 text-sm">Award name<Input aria-label={`Award ${index + 1} label`} maxLength={200} value={award.label} onChange={e => update(index, { label: e.target.value })} /></label>
        <label className="grid min-w-0 gap-2 text-sm sm:col-span-2">Description<Textarea aria-label={`Award ${index + 1} description`} placeholder="What does this award recognize?" rows={2} maxLength={160} value={award.description ?? ""} onChange={e => update(index, { description: e.target.value })} /></label>
        <label className="grid min-w-0 gap-2 text-sm sm:col-span-2">Related article URL<Input type="url" aria-label={`Award ${index + 1} article URL`} placeholder="https://… (optional)" value={award.sourceUrl ?? ""} onChange={e => update(index, { sourceUrl: e.target.value || null })} /></label>
        <AwardImagePicker award={award} currentImageUrl={award.imageUrl || photos.flatMap(photo => photo.id === award.photoId && "url" in photo ? [photo.url] : [])[0]} onChange={patch => update(index, patch)} />
      </div>
      <div className="flex flex-wrap gap-3 border-t pt-4"><Button type="button" variant="outline" onClick={() => onChange(awards.filter((_, i) => i !== index))}>Remove from draft</Button></div>
    </section>)}
    <Button type="button" variant="outline" disabled={awards.length >= 40} onClick={() => onChange([...awards, { year: "", label: "" }])}>Add award</Button>
  </BuilderSection>;
}
