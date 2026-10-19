"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPreviewUrl, type PreviewContent } from "@/lib/preview-lockers/validation";

export type HeadshotTarget = "hero" | "bio";
export default function HeadshotFields({ target, photos, url, storagePath, imageUrls, heroImageUrl, saved, busy, onSelect, onUrl, onUpload, onReset }: {
  target: HeadshotTarget; photos: PreviewContent["photos"]; url: string | null; storagePath: string | null;
  imageUrls: Record<string,string>; heroImageUrl: string; saved: boolean; busy: boolean;
  onSelect: (id: string) => void; onUrl: (url: string | null) => void;
  onUpload: (file: File | undefined) => void; onReset: () => void;
}) {
  const label = target === "hero" ? "Hero headshot" : "Bio headshot";
  const selected = target === "hero" ? !storagePath && photos.find(photo => photo.isHeadshot)
    : photos.find(photo => storagePath ? "storagePath" in photo && photo.storagePath === storagePath : url && "url" in photo && photo.url === url);
  const value = selected ? selected.id : storagePath ? ":uploaded" : target === "bio" && url ? ":url" : "";
  const selectedUrl = selected ? "storagePath" in selected ? imageUrls[selected.storagePath] : selected.url : null;
  const source = storagePath ? imageUrls[storagePath] : selectedUrl || url || heroImageUrl;
  const imageUrl = source && (source === "/images/black-headshot-fallback.svg" || isPreviewUrl(source)) ? source : null;
  return <section aria-labelledby={`${target}-headshot-heading`} className="min-w-0 space-y-3 rounded-lg border p-4">
    <h2 id={`${target}-headshot-heading`} className="font-semibold">{label}</h2>
    <p className="text-sm text-muted-foreground">{target === "hero" ? "The main portrait in the Locker hero." : "The image in Bio / All. Uses the Hero headshot until you choose a separate image."}</p>
    {imageUrl ? (
      // Private signed URLs and external defaults must bypass the image optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={`${label} preview`} className="h-40 w-full rounded border object-contain p-2" />
    ) : <p className="text-sm text-muted-foreground">Image preview unavailable. You can choose or upload another image.</p>}
    <label className="grid gap-2 text-sm">{label} image<select aria-label={`${label} image`} className="h-10 min-w-0 rounded-md border bg-background px-3" value={value} onChange={event => { if (![":uploaded",":url"].includes(event.target.value)) onSelect(event.target.value); }}>
      <option value="">{target === "hero" ? "Use Hero URL / default image" : "Use Hero headshot"}</option>
      {value === ":uploaded" && <option value=":uploaded">Uploaded {label.toLowerCase()} image</option>}
      {value === ":url" && <option value=":url">Custom Bio image URL</option>}
      {photos.map(photo => <option key={photo.id} value={photo.id}>{photo.title || "Untitled photo"}</option>)}
    </select></label>
    <label className="grid gap-2 text-sm">{label} HTTPS URL<Input aria-label={`${label} HTTPS URL`} maxLength={2048} value={url ?? ""} onChange={event => onUrl(event.target.value || null)} /></label>
    <label className="grid gap-2 text-sm">Upload {label.toLowerCase()} image<Input aria-label={`Upload ${label.toLowerCase()} image`} type="file" accept="image/png,image/jpeg,image/webp" disabled={!saved || busy} onChange={event => { onUpload(event.target.files?.[0]); event.target.value = ""; }} /><span className="text-xs text-muted-foreground">PNG, JPG or WebP, up to 10 MB. Transparent PNGs keep transparency. Save the draft to apply.</span></label>
    {!saved && <p className="text-sm text-muted-foreground">Save the draft once before uploading images.</p>}
    {(storagePath || selected || target === "bio" && url) && <Button type="button" variant="outline" disabled={busy} onClick={onReset}>{target === "bio" ? "Use Hero headshot" : "Use Hero URL / default image"}</Button>}
  </section>;
}
