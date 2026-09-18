"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ImageIcon, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isPreviewUrl, type PreviewContent } from "@/lib/preview-lockers/validation";
import { previewVideoSource } from "@/lib/preview-lockers/video";

const SectionOpen = createContext(false);
type Media = PreviewContent["photos"][number] | PreviewContent["videos"][number];
type Kind = "photo" | "video";
const safeUrl = (url?: string | null) => url && isPreviewUrl(url) ? url : null;

export function MediaSection({ title, count, limit, children }: { title: string; count: number; limit: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <details className="group/section rounded-xl border bg-card" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="flex min-h-20 cursor-pointer list-none items-center gap-4 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00] [&::-webkit-details-marker]:hidden sm:p-5">
      <span className="min-w-0 flex-1"><span className="block text-lg font-semibold">{title} <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">{count}/{limit}</span></span><span className="text-sm text-muted-foreground">Expand to preview and edit</span></span>
      <ChevronDown aria-hidden="true" className="size-5 shrink-0 group-open/section:rotate-180" />
    </summary>
    <SectionOpen.Provider value={open}><div className="space-y-3 border-t p-4 sm:p-5">{count === 0 && <p className="text-sm text-muted-foreground">No {title.toLowerCase()} yet. Add a link or upload a file below.</p>}{children}</div></SectionOpen.Provider>
  </details>;
}

function MediaImage({ src, title, className }: { src: string; title: string; className: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="p-3 text-xs text-muted-foreground">Image unavailable</span>
    // External sources and temporary private URLs cannot use the image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    : <img src={src} alt={title} loading="lazy" referrerPolicy="no-referrer" className={className} onError={() => setFailed(true)} />;
}

function ExpandedPreview({ media, kind }: { media: Media; kind: Kind }) {
  const path = "storagePath" in media ? media.storagePath : null;
  const [signed, setSigned] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!path) return;
    let active = true;
    async function load() {
      try {
        const { data, error } = await createClient().storage.from(kind === "photo" ? "preview-locker-photos" : "preview-locker-videos").createSignedUrl(path!, 3600);
        if (active) { setSigned(data?.signedUrl ?? null); setFailed(!!error || !data?.signedUrl); }
      } catch { if (active) setFailed(true); }
    }
    void load();
    return () => { active = false; };
  }, [path, kind]);
  const url = path ? signed : safeUrl("url" in media ? media.url : null);
  const video = url && kind === "video" ? previewVideoSource(url) : null;
  return <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
    {failed ? <p className="p-4 text-sm text-muted-foreground">Preview unavailable. Check the link, or reopen to retry.</p>
      : !url ? <p role="status" className="p-4 text-sm text-muted-foreground">{path ? "Loading private preview…" : "Enter a valid HTTPS link to preview this item."}</p>
      : kind === "photo" ? <MediaImage key={url} src={url} title={media.title || "Photo preview"} className="max-h-80 w-full object-contain" />
      : video?.playbackUrl ? <video src={video.playbackUrl} controls playsInline preload="metadata" aria-label={media.title || "Video preview"} className="max-h-80 w-full" onError={() => setFailed(true)} />
      : video?.embedUrl ? <iframe src={video.embedUrl} title={media.title || "Video preview"} className="aspect-video w-full border-0" allow="encrypted-media; fullscreen; picture-in-picture" referrerPolicy="no-referrer" allowFullScreen />
      : <p className="p-4 text-sm text-muted-foreground">This provider does not support an inline preview. <a href={url} target="_blank" rel="noopener noreferrer" className="underline">Open video in a new tab</a></p>}
  </div>;
}

export function MediaItem({ media, kind, index, children }: { media: Media; kind: Kind; index: number; children: ReactNode }) {
  const sectionOpen = useContext(SectionOpen);
  const [open, setOpen] = useState(!media.title && "url" in media && !media.url);
  const label = `${kind === "photo" ? "Photo" : "Video"} ${index + 1}`;
  const external = "url" in media ? safeUrl(media.url) : null;
  const thumbnail = kind === "photo" ? external : safeUrl("thumb" in media ? media.thumb : null);
  const Icon = kind === "photo" ? ImageIcon : Play;
  const info = "storagePath" in media ? "Private upload" : external ? new URL(external).hostname : "Add a media link";
  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="group/item overflow-hidden rounded-lg border open:border-[#ffbb00]/40">
    <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-3 hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00] [&::-webkit-details-marker]:hidden">
      <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">{thumbnail && sectionOpen ? <MediaImage key={thumbnail} src={thumbnail} title="" className="h-full w-full object-cover" /> : <Icon aria-hidden="true" className="size-5 text-muted-foreground" />}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{media.title || `Untitled ${kind}`}</span><span className="block truncate text-xs text-muted-foreground">{label} · {info}{"heroDevice" in media && media.heroDevice ? ` · ${media.heroDevice} hero` : ""}</span></span>
      <span className="hidden text-xs text-muted-foreground sm:block">{open ? "Close" : "Preview & edit"}</span><ChevronDown aria-hidden="true" className="size-4 shrink-0 group-open/item:rotate-180" />
    </summary>
    <div className="grid gap-4 border-t p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {open && sectionOpen && <ExpandedPreview key={external ?? ("storagePath" in media ? media.storagePath : media.id)} media={media} kind={kind} />}
      <fieldset className="min-w-0 space-y-3"><legend className="sr-only">{label} details</legend>{children}</fieldset>
    </div>
  </details>;
}
