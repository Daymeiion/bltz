"use client";
import { BuilderSection } from "./BuilderSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { socialPlatforms } from "@/lib/preview-lockers/social";
import type { PreviewContent } from "@/lib/preview-lockers/validation";
export default function SocialSection({ items, photos, videos, saved, onChange, onUpload }: {
  items: PreviewContent["social"]; photos: PreviewContent["photos"]; videos: PreviewContent["videos"]; saved: boolean;
  onChange: (items: PreviewContent["social"]) => void;
  onUpload: (kind: "photo" | "video", files: FileList | null, socialId: string) => void;
}) {
  const update = (index: number, patch: Partial<PreviewContent["social"][number]>) => onChange(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  const selectClass = "h-10 w-full min-w-0 rounded-md border bg-background px-3";
  return <BuilderSection title="Social" count={items.length} description="Add shorts and posts to the existing bento grids">
    <p className="text-sm text-muted-foreground">Add a public Instagram, Facebook, LinkedIn, or X / Twitter post link. Choose a cover image for the grid. Portrait shorts and square posts keep their existing layouts. Private or restricted posts may need to open on the original platform.</p>
    {items.map((item, index) => <details key={item.id} className="rounded-lg border p-4">
      <summary className="cursor-pointer font-medium">{item.title || `Social item ${index + 1}`} · {item.platform} · {item.kind === "short" ? "Shorts" : "Post"}</summary>
      <div className="mt-5 grid min-w-0 items-start gap-x-5 gap-y-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">Placement<select aria-label={`Social ${index + 1} placement`} className={selectClass} value={item.kind} onChange={e => update(index, { kind: e.target.value as typeof item.kind, format: e.target.value === "short" ? "portrait" : "square" })}><option value="short">Shorts</option><option value="post">Social post</option></select></label>
        <label className="grid gap-2 text-sm">Platform<select aria-label={`Social ${index + 1} platform`} className={selectClass} value={item.platform} onChange={e => update(index, { platform: e.target.value as typeof item.platform })}>{socialPlatforms.map(platform => <option key={platform} value={platform}>{platform === "X" ? "X / Twitter" : platform}</option>)}</select></label>
        <label className="grid gap-2 text-sm">Title<Input aria-label={`Social ${index + 1} title`} maxLength={160} value={item.title} onChange={e => update(index, { title: e.target.value })} /></label>
        <label className="grid gap-2 text-sm">Original post link<Input aria-label={`Social ${index + 1} link`} type="url" maxLength={2048} value={item.sourceUrl} onChange={e => update(index, { sourceUrl: e.target.value })} /></label>
        <label className="grid gap-2 text-sm">Handle / author<Input aria-label={`Social ${index + 1} handle`} maxLength={120} value={item.handle} onChange={e => update(index, { handle: e.target.value })} /></label>
        <label className="grid gap-2 text-sm">Card format<select aria-label={`Social ${index + 1} format`} className={selectClass} disabled={item.kind === "short"} value={item.kind === "short" ? "portrait" : item.format} onChange={e => update(index, { format: e.target.value as typeof item.format })}><option value="portrait">Portrait (9:16)</option><option value="square">Square (1:1)</option></select></label>
        <label className="grid gap-2 text-sm sm:col-span-2">Caption / post text<Textarea aria-label={`Social ${index + 1} caption`} maxLength={2000} value={item.caption} onChange={e => update(index, { caption: e.target.value })} /></label>
        <label className="grid gap-2 text-sm">Cover image<select aria-label={`Social ${index + 1} image`} className={selectClass} value={item.photoId ?? ""} onChange={e => update(index, { photoId: e.target.value || null })}><option value="">Text card / no cover</option>{photos.map(photo => <option key={photo.id} value={photo.id}>{photo.title || "Untitled photo"}</option>)}</select></label>
        <label className="grid gap-2 text-sm">Optional uploaded video<select aria-label={`Social ${index + 1} video`} className={selectClass} value={item.videoId ?? ""} onChange={e => update(index, { videoId: e.target.value || null })}><option value="">Use platform post</option>{videos.filter(video => "storagePath" in video || /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(video.url)).map(video => <option key={video.id} value={video.id}>{video.title || "Untitled video"}</option>)}</select></label>
        {saved && <><label className="grid gap-2 text-sm">Upload cover image<Input aria-label={`Social ${index + 1} upload image`} type="file" accept="image/png,image/jpeg,image/webp" disabled={photos.length >= 40} onChange={e => { onUpload("photo", e.target.files, item.id); e.target.value = ""; }} /></label><label className="grid gap-2 text-sm">Upload video<Input aria-label={`Social ${index + 1} upload video`} type="file" accept="video/mp4,video/webm,video/quicktime" disabled={videos.length >= 24} onChange={e => { onUpload("video", e.target.files, item.id); e.target.value = ""; }} /></label></>}
        <Button type="button" variant="outline" onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove social item</Button>
      </div>
    </details>)}
    <Button type="button" variant="outline" disabled={items.length >= 40} onClick={() => onChange([...items, { id: crypto.randomUUID(), title: "", platform: "Instagram", kind: "short", format: "portrait", sourceUrl: "", caption: "", handle: "" }])}>Add short or social post</Button>
  </BuilderSection>;
}
