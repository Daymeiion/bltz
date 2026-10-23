"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ExternalLink, ImageOff, Link2, PlayCircle, RefreshCw, Search, X } from "lucide-react";
import { safeSourceUrl } from "@/lib/intelligence/lab-format";
import type { LockerMedia, MediaItem } from "./model";
import styles from "./lab.module.css";

type PickerContext = { locker: LockerMedia; athleteName: string };
const Ctx = createContext<PickerContext>({ locker: { state: "none", slug: null, photos: [], videos: [] }, athleteName: "" });
export function PickerProvider({ value, children }: { value: PickerContext; children: ReactNode }) { return <Ctx.Provider value={value}>{children}</Ctx.Provider>; }
export function usePickers() { return useContext(Ctx); }

/** Native modal dialog: focus containment, Escape and backdrop come from the platform. */
function Modal({ title, logo, onClose, children, footer }: { title: string; logo?: ReactNode; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  // No close() in cleanup: React's dev double-run would fire "close" and dismiss the picker.
  useEffect(() => { const node = ref.current; if (node && !node.open) node.showModal(); }, []);
  return <dialog ref={ref} className={`${styles.dialog} ${styles.pickerDialog}`} onClose={onClose} onClick={event => { if (event.target === ref.current) onClose(); }} aria-label={title}>
    <div className={styles.picker}>
      <header className={styles.pickerHead}>{logo}<h3>{title}</h3><button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close"><X size={16} aria-hidden="true" /></button></header>
      {children}
      <footer className={styles.pickerFoot}>{footer}</footer>
    </div>
  </dialog>;
}

function Tile({ selected, onToggle, children, label }: { selected: boolean; onToggle: () => void; children: ReactNode; label: string }) {
  return <button type="button" className={styles.tile} aria-pressed={selected} aria-label={label} onClick={onToggle}>{children}<span className={styles.tileCheck} aria-hidden="true"><Check size={14} /></span></button>;
}
function toggle(list: string[], id: string) { return list.includes(id) ? list.filter(row => row !== id) : [...list, id]; }

/* ---------- Player Locker ---------- */

export function LockerPicker({ kind, onAttach, onClose, existing }: { kind: "photo" | "video"; onAttach: (items: MediaItem[]) => void; onClose: () => void; existing: string[] }) {
  const { locker, athleteName } = usePickers();
  const [tab, setTab] = useState<"photos" | "videos">(kind === "video" ? "videos" : "photos");
  const [picked, setPicked] = useState<string[]>([]);
  const photos = locker.photos, videos = locker.videos;
  function attach() {
    const items: MediaItem[] = [
      ...photos.filter(row => picked.includes(`locker:photo:${row.id}`)).map(row => ({ id: `locker:photo:${row.id}`, title: row.title || `${athleteName} photo`, kind: "photo" as const, publisher: row.credits ? `Locker · ${row.credits}` : "Player Locker", date: null, url: row.sourceUrl, imageUrl: row.url, origin: "locker" as const })),
      ...videos.filter(row => picked.includes(`locker:video:${row.id}`)).map(row => ({ id: `locker:video:${row.id}`, title: row.title || `${athleteName} video`, kind: "video" as const, publisher: "Player Locker", date: null, url: row.url, imageUrl: row.thumb, origin: "locker" as const })),
    ];
    onAttach(items);
  }
  const empty = locker.state === "none" ? "This athlete has no Player Locker yet." : locker.state === "unavailable" ? "The Locker media could not be loaded. Try reloading." : null;
  return <Modal title={`${athleteName} · Player Locker`} onClose={onClose} footer={<><span className={styles.draftNote}>{picked.length ? `${picked.length} selected` : "Select media to attach"}</span><button type="button" className={styles.ghostButton} onClick={onClose}>Cancel</button><button type="button" className={styles.primaryButton} disabled={!picked.length} onClick={attach}>Attach {picked.length || ""}</button></>}>
    <div className={styles.momentTabs} role="tablist" aria-label="Locker media type">
      <button type="button" role="tab" aria-selected={tab === "photos"} onClick={() => setTab("photos")}>Photos ({photos.length})</button>
      <button type="button" role="tab" aria-selected={tab === "videos"} onClick={() => setTab("videos")}>Videos ({videos.length})</button>
    </div>
    {empty ? <div className={styles.pickerEmpty}><ImageOff size={24} aria-hidden="true" /><p>{empty}</p></div> : <div className={styles.tileGrid} role="tabpanel">
      {tab === "photos" && photos.map(row => { const id = `locker:photo:${row.id}`; const linked = existing.includes(id); return <Tile key={id} selected={picked.includes(id) || linked} onToggle={() => { if (!linked) setPicked(current => toggle(current, id)); }} label={`${row.title || "Photo"}${linked ? ", already linked" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={row.url} alt="" referrerPolicy="no-referrer" loading="lazy" /><span className={styles.tileCaption}>{row.title || "Untitled photo"}<small>{[row.level.toUpperCase(), row.season, linked ? "Linked" : null].filter(Boolean).join(" · ")}</small></span>
      </Tile>; })}
      {tab === "videos" && videos.map(row => { const id = `locker:video:${row.id}`; const linked = existing.includes(id); return <Tile key={id} selected={picked.includes(id) || linked} onToggle={() => { if (!linked) setPicked(current => toggle(current, id)); }} label={`${row.title || "Video"}${linked ? ", already linked" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {row.thumb ? <img src={row.thumb} alt="" referrerPolicy="no-referrer" loading="lazy" /> : <span className={styles.tileIcon}><PlayCircle size={30} aria-hidden="true" /></span>}<span className={styles.tileCaption}>{row.title || "Untitled video"}<small>{[row.level?.toUpperCase(), linked ? "Linked" : null].filter(Boolean).join(" · ") || "Video"}</small></span>
      </Tile>; })}
      {((tab === "photos" && !photos.length) || (tab === "videos" && !videos.length)) && <div className={styles.pickerEmpty}><ImageOff size={24} aria-hidden="true" /><p>No {tab} in this Locker yet.</p></div>}
    </div>}
  </Modal>;
}

/* ---------- Getty Images ---------- */

type GettyResult = { id: string; title: string; caption: string | null; date: string | null; artist: string | null; collection: string | null; thumb: string; comp: string | null; detailUrl: string; duration?: string | null };
type GettyState = { state: "idle" | "loading" | "ready" | "not_configured" | "unavailable" | "rate_limited"; images: GettyResult[]; total?: number };
const GETTY_LOGO = <img src="/images/getty-images-logo.svg" alt="Getty Images" className={styles.gettyMark} />;

/** Getty asset IDs from a gettyimages.com detail link, e.g. /detail/news-photo/...-news-photo/72137869. */
function gettyAssetFromLink(value: string): { id: string; url: string } | null {
  const url = safeSourceUrl(value.trim());
  if (!url) return null;
  const parsed = new URL(url);
  if (!/(^|\.)gettyimages\.[a-z.]+$/.test(parsed.hostname)) return null;
  const id = parsed.pathname.match(/\/detail\/(?:[^/]+\/)*?(?:[^/]*?-)?(\d{5,})(?:\/|$)/)?.[1] ?? parsed.pathname.match(/(\d{5,})\/?$/)?.[1];
  return id ? { id, url: `https://www.gettyimages.com/detail/${id}` } : null;
}

/** Getty editorial photos or video; both attach as linked references licensed on Getty. */
export function GettyPicker({ onAttach, onClose, existing, kind = "photo" }: { onAttach: (items: MediaItem[]) => void; onClose: () => void; existing: string[]; kind?: "photo" | "video" }) {
  const { athleteName } = usePickers();
  const video = kind === "video";
  const noun = video ? "video" : "image";
  const [tab, setTab] = useState<"api" | "site">("api");
  const [query, setQuery] = useState(athleteName);
  const [result, setResult] = useState<GettyState>({ state: "loading", images: [] });
  const [picked, setPicked] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [pasted, setPasted] = useState<MediaItem[]>([]);
  function search(phrase: string) {
    if (!phrase.trim()) return;
    setResult({ state: "loading", images: [] });
    void load(phrase);
  }
  async function load(phrase: string) {
    try {
      const response = await fetch(`/api/admin/intelligence/getty?${new URLSearchParams({ q: phrase.trim(), ...(video ? { type: "video" } : {}) })}`, { credentials: "same-origin", cache: "no-store" });
      const body = await response.json() as GettyState;
      setResult({ state: body.state ?? "unavailable", images: body.images ?? [], total: body.total });
    } catch { setResult({ state: "unavailable", images: [] }); }
  }
  // Load once when opened; later searches are explicit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(athleteName); }, []);
  const siteUrl = `https://www.gettyimages.com/${video ? "videos" : "photos"}/${encodeURIComponent(athleteName.trim().toLowerCase().replace(/\s+/g, "-"))}`;
  function addLink() {
    const asset = gettyAssetFromLink(link);
    if (!asset) return setLinkError(`Paste a gettyimages.com ${noun} link that ends in the ${noun} number.`);
    const id = `getty:${asset.id}`;
    if (!pasted.some(row => row.id === id)) setPasted([...pasted, { id, title: `Getty Images ${video ? "video " : ""}#${asset.id}`, kind, publisher: "Getty Images · license on Getty", date: null, url: asset.url, imageUrl: null, origin: "getty" }]);
    setPicked(current => current.includes(id) ? current : [...current, id]);
    setLink(""); setLinkError("");
  }
  function attach() {
    const fromApi: MediaItem[] = result.images.filter(row => picked.includes(`getty:${row.id}`)).map(row => ({ id: `getty:${row.id}`, title: row.title, kind, publisher: `Getty Images${row.artist ? ` · ${row.artist}` : ""}`, date: row.date, url: row.detailUrl, imageUrl: row.thumb, origin: "getty" }));
    onAttach([...fromApi, ...pasted.filter(row => picked.includes(row.id))]);
  }
  return <Modal title={video ? "Video library" : "Image library"} logo={GETTY_LOGO} onClose={onClose} footer={<><span className={styles.draftNote}>Licensing is confirmed on Getty Images before any use.</span><button type="button" className={styles.ghostButton} onClick={onClose}>Cancel</button><button type="button" className={styles.primaryButton} disabled={!picked.length} onClick={attach}>Attach {picked.length || ""}</button></>}>
    <div className={styles.momentTabs} role="tablist" aria-label="Getty source">
      <button type="button" role="tab" aria-selected={tab === "api"} onClick={() => setTab("api")}>Getty API library</button>
      <button type="button" role="tab" aria-selected={tab === "site"} onClick={() => setTab("site")}>gettyimages.com</button>
    </div>
    {tab === "api" && <div className={styles.pickerBody} role="tabpanel">
      <form className={styles.pickerSearch} role="search" onSubmit={event => { event.preventDefault(); search(query); }}>
        <Search size={16} aria-hidden="true" /><label className={styles.srOnly} htmlFor="getty-q">Search Getty Images</label>
        <input id="getty-q" value={query} onChange={event => setQuery(event.target.value)} maxLength={80} />
        <button type="submit" className={styles.ghostButton}><RefreshCw size={14} aria-hidden="true" />Search</button>
      </form>
      {result.state === "loading" && <div className={styles.tileGrid} aria-busy="true">{Array.from({ length: 8 }, (_, index) => <span key={index} className={styles.tileSkeleton} />)}</div>}
      {result.state === "not_configured" && <div className={styles.pickerEmpty}><Link2 size={24} aria-hidden="true" /><p><strong>Getty API not connected.</strong> Add a <code>GETTY_API_KEY</code> to the server environment to browse the Getty library here. Until then, use the gettyimages.com tab.</p><button type="button" className={styles.ghostButton} onClick={() => setTab("site")}>Use gettyimages.com</button></div>}
      {(result.state === "unavailable" || result.state === "rate_limited") && <div className={styles.pickerEmpty}><ImageOff size={24} aria-hidden="true" /><p>{result.state === "rate_limited" ? "Getty is limiting requests right now. Try again shortly." : "Getty search could not be reached. Try again."}</p></div>}
      {result.state === "ready" && (result.images.length ? <><p className={styles.quiet}>{result.total ?? result.images.length} editorial {noun} results. Showing {result.images.length}.</p><div className={styles.tileGrid}>{result.images.map(row => { const id = `getty:${row.id}`; const linked = existing.includes(id); return <Tile key={id} selected={picked.includes(id) || linked} onToggle={() => { if (!linked) setPicked(current => toggle(current, id)); }} label={`${row.title}${linked ? ", already linked" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={row.thumb} alt="" referrerPolicy="no-referrer" loading="lazy" />{row.duration && <span className={styles.tileDuration}>{row.duration}</span>}<span className={styles.tileCaption}>{row.title}<small>{[row.date, row.artist].filter(Boolean).join(" · ")}</small></span>
      </Tile>; })}</div></> : <div className={styles.pickerEmpty}><ImageOff size={24} aria-hidden="true" /><p>No Getty editorial {noun}s match “{query}”.</p></div>)}
    </div>}
    {tab === "site" && <div className={styles.pickerBody} role="tabpanel">
      <div className={styles.siteCard}>{GETTY_LOGO}<div><strong>{athleteName} on gettyimages.com</strong><p>Browse every {video ? "video" : "photo"} Getty has of {athleteName}, then copy the link of the {noun} you want.</p></div><a className={styles.primaryButton} href={siteUrl} target="_blank" rel="noopener noreferrer">Open Getty<ExternalLink size={14} aria-hidden="true" /></a></div>
      <form className={styles.pickerSearch} onSubmit={event => { event.preventDefault(); addLink(); }}>
        <Link2 size={16} aria-hidden="true" /><label className={styles.srOnly} htmlFor="getty-link">Getty {noun} link</label>
        <input id="getty-link" type="url" inputMode="url" value={link} onChange={event => { setLink(event.target.value); setLinkError(""); }} placeholder={`https://www.gettyimages.com/detail/${video ? "video" : "news-photo"}/…`} />
        <button type="submit" className={styles.ghostButton}>Add link</button>
      </form>
      {linkError && <p className={styles.formError} role="alert">{linkError}</p>}
      {pasted.length > 0 && <ul className={styles.pastedList}>{pasted.map(row => <li key={row.id}><label><input type="checkbox" checked={picked.includes(row.id)} onChange={() => setPicked(current => toggle(current, row.id))} /><span>{row.title}</span></label><a href={row.url!} target="_blank" rel="noopener noreferrer" aria-label={`Open ${row.title} on Getty`}><ExternalLink size={14} aria-hidden="true" /></a></li>)}</ul>}
    </div>}
  </Modal>;
}
