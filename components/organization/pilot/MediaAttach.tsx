"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconExternalLink, IconLoader2, IconPhoto, IconPlayerPlay, IconSearch, IconUpload, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { gettyAssetFromLink } from "@/lib/getty/link";
import { createClient } from "@/lib/supabase/client";
import type { AthleteMediaKind } from "@/lib/enterprise-crm/pilot/types";

/** Media ready to save: an uploaded file, a Getty asset, or a link. Matches the API's media input. */
export type PendingMedia = {
  key: string;
  kind: AthleteMediaKind;
  title: string;
  url: string | null;
  source: "link" | "upload" | "getty";
  storagePath: string | null;
  thumbUrl: string | null;
  externalId: string | null;
  /** In-tab preview of a just-uploaded image; never saved. */
  localPreview?: string | null;
};

type GettyResult = { id: string; title: string; date: string | null; artist: string | null; thumb: string; detailUrl: string; duration?: string | null };
type GettyState = { state: "idle" | "loading" | "ready" | "not_configured" | "unavailable" | "rate_limited"; images: GettyResult[]; total?: number };

const ACCEPT = "video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp";
const VIDEO_MAX = 250 * 1024 * 1024;
const IMAGE_MAX = 15 * 1024 * 1024;

export function mediaPayload(item: PendingMedia) {
  return { kind: item.kind, title: item.title, url: item.url, source: item.source, storagePath: item.storagePath, thumbUrl: item.thumbUrl, externalId: item.externalId };
}

/** Upload a video or photo, or pick from Getty Images. Each finished item is handed to `onAdd`. */
export function MediaAttach({ organizationId, playerId, athleteName, preview = false, mode = "any", onAdd }: {
  organizationId: string;
  playerId: string | null;
  athleteName: string;
  preview?: boolean;
  /** Limit uploads and Getty results to video or photos. */
  mode?: "any" | "video" | "image";
  onAdd: (items: PendingMedia[]) => void;
}) {
  const accept = ACCEPT.split(",").filter((type) => mode === "any" || type.startsWith(mode === "video" ? "video/" : "image/")).join(",");
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [getty, setGetty] = useState(false);

  async function upload(file: File) {
    setError(null);
    const video = file.type.startsWith("video/");
    if (!accept.split(",").includes(file.type)) { setError(mode === "video" ? "Use an MP4, WebM or MOV video." : mode === "image" ? "Use a JPG, PNG or WebP photo." : "Use an MP4, WebM or MOV video, or a JPG, PNG or WebP photo."); return; }
    if (file.size > (video ? VIDEO_MAX : IMAGE_MAX)) { setError(video ? "Videos can be up to 250 MB." : "Photos can be up to 15 MB."); return; }
    const title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 200) || (video ? "Uploaded video" : "Uploaded photo");
    const base = { key: `upload-${Date.now()}`, kind: (video ? "highlight" : "image") as AthleteMediaKind, title, url: null, source: "upload" as const, thumbUrl: null, externalId: null, localPreview: video ? null : URL.createObjectURL(file) };
    if (preview) { onAdd([{ ...base, storagePath: `preview/${file.name}` }]); return; }
    if (!playerId) { setError("Uploads need a player who is already on BLTZ. Use Getty or a link instead."); return; }
    setUploading(file.name);
    try {
      const response = await fetch(`/api/organization/${organizationId}/media-uploads`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playerId, mime: file.type, size: file.size }) });
      const ticket = await response.json().catch(() => ({})) as { bucket?: string; path?: string; token?: string; state?: string };
      if (!response.ok || !ticket.bucket || !ticket.path || !ticket.token) throw new Error(ticket.state === "too_large" ? "too_large" : "ticket");
      const stored = await createClient().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (stored.error) throw new Error("upload");
      onAdd([{ ...base, storagePath: ticket.path }]);
    } catch (failure) {
      setError(failure instanceof Error && failure.message === "too_large" ? "That file is too large." : "The upload didn't finish. Check your connection and try again.");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="pilot-attach">
      <div className="pilot-attach__buttons">
        <button type="button" className="pilot-attach__button" onClick={() => input.current?.click()} disabled={Boolean(uploading)}>
          {uploading ? <IconLoader2 stroke={1.5} className="crm-spin" aria-hidden /> : <IconUpload stroke={1.5} aria-hidden />}
          <span>{uploading ? `Uploading ${uploading}` : mode === "video" ? "Upload video" : mode === "image" ? "Upload photo" : "Upload video or photo"}</span>
        </button>
        <button type="button" className="pilot-attach__button pilot-attach__button--getty" onClick={() => setGetty(true)} aria-label="Add from Getty Images">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
          <img src="/images/getty-images-logo.svg" alt="" />
        </button>
        <input ref={input} type="file" accept={accept} hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
      </div>
      {error ? <p className="pilot-error" role="alert">{error}</p> : null}
      {getty ? <GettyPicker organizationId={organizationId} athleteName={athleteName} preview={preview} initialType={mode === "video" ? "video" : "image"} onClose={() => setGetty(false)} onAttach={(items) => { setGetty(false); if (items.length) onAdd(items); }} /> : null}
    </div>
  );
}

const PREVIEW_GETTY: GettyResult[] = Array.from({ length: 8 }, (_, index) => ({
  id: `90000${index}`, title: `Sample editorial photo ${index + 1}`, date: "2015-11-0" + (index + 1), artist: "Getty Images", thumb: "", detailUrl: `https://www.gettyimages.com/detail/90000${index}`,
}));

function GettyPicker({ organizationId, athleteName, preview, initialType = "image", onClose, onAttach }: { organizationId: string; athleteName: string; preview: boolean; initialType?: "image" | "video"; onClose: () => void; onAttach: (items: PendingMedia[]) => void }) {
  const [type, setType] = useState<"image" | "video">(initialType);
  const [query, setQuery] = useState(athleteName);
  const [result, setResult] = useState<GettyState>({ state: "loading", images: [] });
  const [picked, setPicked] = useState<GettyResult[]>([]);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  function search(phrase: string, kind: "image" | "video") {
    if (!phrase.trim()) return;
    setResult({ state: "loading", images: [] });
    void fetchResults(phrase, kind);
  }

  /** Sets state only after the request settles, so it is safe to start from an effect. */
  async function fetchResults(phrase: string, kind: "image" | "video") {
    if (preview) { await Promise.resolve(); setResult({ state: "ready", images: PREVIEW_GETTY, total: PREVIEW_GETTY.length }); return; }
    try {
      const response = await fetch(`/api/organization/${organizationId}/getty?${new URLSearchParams({ q: phrase.trim(), ...(kind === "video" ? { type: "video" } : {}) })}`, { credentials: "same-origin", cache: "no-store" });
      const body = await response.json() as GettyState;
      setResult({ state: body.state ?? "unavailable", images: body.images ?? [], total: body.total });
    } catch {
      setResult({ state: "unavailable", images: [] });
    }
  }

  // Search the athlete's name once when the picker opens.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void fetchResults(athleteName, initialType); }, []);

  const toggle = (row: GettyResult) => setPicked((current) => current.some((item) => item.id === row.id) ? current.filter((item) => item.id !== row.id) : [...current, row]);

  function addLink() {
    const asset = gettyAssetFromLink(link);
    if (!asset) { setLinkError("Paste a gettyimages.com link that ends in the image or video number."); return; }
    setPicked((current) => current.some((item) => item.id === asset.id) ? current : [...current, { id: asset.id, title: `Getty Images #${asset.id}`, date: null, artist: null, thumb: "", detailUrl: asset.url }]);
    setLink(""); setLinkError(null);
  }

  function attach() {
    onAttach(picked.map((row) => ({
      key: `getty-${row.id}`, kind: type === "video" ? "highlight" : "image", title: row.title.slice(0, 200), url: row.detailUrl,
      source: "getty", storagePath: null, thumbUrl: row.thumb || null, externalId: row.id,
    })));
  }

  const siteUrl = `https://www.gettyimages.com/${type === "video" ? "videos" : "photos"}/${encodeURIComponent(athleteName.trim().toLowerCase().replace(/\s+/g, "-"))}`;

  // Rendered into the workspace root so it never nests inside another dialog's form or
  // inherits its size, while keeping the workspace's theme variables.
  const host = typeof document === "undefined" ? null : document.querySelector<HTMLElement>('[data-product="enterprise-crm"]') ?? document.body;
  if (!host) return null;
  return createPortal(
    <div className="pilot-modal pilot-modal--wide" role="dialog" aria-modal="true" aria-labelledby="pilot-getty-title" onKeyDown={(event) => { if (event.key !== "Escape") return; event.stopPropagation(); onClose(); }}>
      <div className="pilot-modal__scrim" onClick={onClose} />
      <div className="pilot-modal__panel pilot-getty">
        <div className="pilot-card-head">
          <div className="pilot-getty__brand">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
            <img src="/images/getty-images-logo.svg" alt="Getty Images" />
            <h2 id="pilot-getty-title">Editorial {type === "video" ? "video" : "photos"}</h2>
          </div>
          <button type="button" className="pilot-icon-pill" aria-label="Close" onClick={onClose}><IconX stroke={1.5} aria-hidden /></button>
        </div>
        <div className="pilot-getty__bar">
          <div className="pilot-pill-tabs pilot-pill-tabs--inline" role="tablist" aria-label="Getty media type">
            {(["image", "video"] as const).map((value) => (
              <button key={value} type="button" role="tab" aria-selected={type === value} className="pilot-pill-tabs__tab" onClick={() => { if (value === type) return; setType(value); setPicked([]); search(query, value); }}>
                {type === value ? <span className="pilot-pill-tabs__bg" /> : null}
                {value === "video" ? <IconPlayerPlay stroke={1.5} aria-hidden /> : <IconPhoto stroke={1.5} aria-hidden />}<span>{value === "video" ? "Video" : "Photos"}</span>
              </button>
            ))}
          </div>
          <form className="pilot-search pilot-search--block" role="search" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); search(query, type); }}>
            <IconSearch stroke={1.5} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={80} aria-label="Search Getty Images" />
          </form>
        </div>

        {result.state === "loading" ? <div className="pilot-getty__grid" aria-busy="true">{Array.from({ length: 8 }, (_, index) => <span key={index} className="pilot-getty__skeleton" />)}</div> : null}
        {result.state === "ready" && result.images.length ? (
          <div className="pilot-getty__grid">
            {result.images.map((row) => {
              const on = picked.some((item) => item.id === row.id);
              return (
                <button key={row.id} type="button" className={cn("pilot-getty__tile", on && "pilot-getty__tile--on")} aria-pressed={on} onClick={() => toggle(row)} aria-label={row.title}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Getty display sizes are remote */}
                  {row.thumb ? <img src={row.thumb} alt="" referrerPolicy="no-referrer" loading="lazy" /> : <span className="pilot-getty__placeholder">{type === "video" ? <IconPlayerPlay stroke={1.25} aria-hidden /> : <IconPhoto stroke={1.25} aria-hidden />}</span>}
                  {row.duration ? <em>{row.duration}</em> : null}
                  <span className="pilot-getty__caption">{row.title}</span>
                  {on ? <span className="pilot-getty__check"><IconCheck stroke={2} aria-hidden /></span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
        {result.state === "ready" && !result.images.length ? <p className="pilot-quiet">No Getty editorial {type === "video" ? "video" : "photos"} match “{query}”.</p> : null}
        {result.state === "not_configured" || result.state === "unavailable" || result.state === "rate_limited" ? (
          <div className="pilot-getty__fallback">
            <p>{result.state === "not_configured" ? "Getty search isn't connected yet. Find the asset on gettyimages.com and paste its link." : result.state === "rate_limited" ? "Getty is limiting searches right now. Paste a link instead, or try again shortly." : "Getty search couldn't be reached. Paste a link instead."}</p>
            <a className="pilot-pill pilot-pill--ghost" href={siteUrl} target="_blank" rel="noopener noreferrer"><span>Open Getty Images</span><span className="pilot-pill__icon" aria-hidden><IconExternalLink stroke={1.5} /></span></a>
          </div>
        ) : null}

        <form className="pilot-getty__link" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); addLink(); }}>
          <input type="url" inputMode="url" value={link} onChange={(event) => { setLink(event.target.value); setLinkError(null); }} placeholder="Or paste a gettyimages.com link" aria-label="Getty Images link" />
          <button type="submit" className="pilot-pill pilot-pill--quiet">Add link</button>
        </form>
        {linkError ? <p className="pilot-error" role="alert">{linkError}</p> : null}

        <div className="pilot-modal__actions">
          <span className="pilot-getty__note">Licensing is confirmed on Getty Images before any use.</span>
          <button type="button" className="pilot-pill pilot-pill--quiet" onClick={onClose}>Cancel</button>
          <button type="button" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={!picked.length} onClick={attach}>Attach{picked.length ? ` ${picked.length}` : ""}</button>
        </div>
      </div>
    </div>,
    host,
  );
}

/** Thumbnail for any attached or saved media item. */
export function MediaThumb({ item }: { item: { kind: AthleteMediaKind; source: "link" | "upload" | "getty"; thumbUrl: string | null; localPreview?: string | null } }) {
  const src = item.localPreview ?? item.thumbUrl;
  return (
    <span className={cn("pilot-thumb", `pilot-thumb--${item.source}`)} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote or in-tab previews */}
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : item.kind === "highlight" ? <IconPlayerPlay stroke={1.25} /> : <IconPhoto stroke={1.25} />}
      {item.source === "getty" ? <b>Getty</b> : item.source === "upload" ? <b>{item.kind === "highlight" ? "Video" : "Photo"}</b> : null}
    </span>
  );
}
