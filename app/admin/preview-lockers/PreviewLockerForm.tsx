"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { previewContent, previewIdentity, slugify, type PreviewContent, type PreviewRecord } from "@/lib/preview-lockers/validation";
import { readDiscovery } from "@/lib/preview-lockers/stream-client";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";
import PreviewViewerAccess from "./PreviewViewerAccess";

const initial = () => previewContent.parse({ slug: "private-preview", full_name: "".padEnd(2, "_") });
type Scalar = Exclude<keyof PreviewContent, "schools" | "pro_teams" | "awards" | "videos" | "photos">;

export default function PreviewLockerForm({
  record,
  viewerAssigned = false,
  gtmLinked = false,
  gtmCompleted = false,
}: {
  record?: PreviewRecord;
  viewerAssigned?: boolean;
  gtmLinked?: boolean;
  gtmCompleted?: boolean;
}) {
  const [draft, setDraft] = useState<PreviewContent>(() => record ? previewContent.parse(Object.fromEntries(Object.keys(previewContent.shape).map(k => [k, record[k as keyof PreviewRecord]]))) : { ...initial(), full_name: "", slug: "" });
  const [busy, setBusy] = useState<"discovery" | "save" | "complete" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [completionReviewed, setCompletionReviewed] = useState(false);
  const [completed, setCompleted] = useState(gtmCompleted);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState<{ id: string; slug: string; revision: number } | null>(record ?? null);
  const revision = useRef(record?.revision);
  const createId = useRef<string | null>(null);
  const pending = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const allowDraftDiscard = useRef(false);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    const departureProtected = dirty || busy !== null;
    if (!departureProtected) { allowDraftDiscard.current = false; return; }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (allowDraftDiscard.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const guardNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;
      if (target.dataset.draftDiscard === "true" && !busy) { allowDraftDiscard.current = true; return; }
      event.preventDefault();
      event.stopPropagation();
      setMessage(busy === "discovery"
        ? "Discovery is still running in this editor. Wait for it to finish or cancel it before leaving; navigating away would stop the admitted run."
        : busy
          ? "A private preview update is still being saved. Wait for it to finish before leaving."
          : "Unsaved scraped or manual changes are still in this editor. Review and save them, or explicitly reload the saved version to discard them, before leaving.");
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", guardNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", guardNavigation, true);
    };
  }, [dirty, busy]);
  function change(patch: Partial<PreviewContent>) { setDraft(current => ({ ...current, ...patch })); setReviewed(false); setCompletionReviewed(false); setDirty(true); setError(""); }
  function field(key: Scalar, label: string, maxLength = 160, numeric = false) {
    return <label className="grid gap-2 text-sm" key={key}>{label}<Input aria-label={label} maxLength={maxLength} type={numeric ? "number" : "text"} value={draft[key] ?? ""} onChange={event => change({ [key]: numeric ? event.target.value === "" ? null : Number(event.target.value) : event.target.value || null })} /></label>;
  }
  async function discover() {
    if (pending.current) return;
    const identity = previewIdentity.safeParse({ full_name: draft.full_name, school: draft.school, position: draft.position, level: draft.level });
    if (!identity.success) { setError("Enter a name of at least two characters before discovery."); return; }
    pending.current = true; setBusy("discovery"); setError(""); setMessage("Searching existing sources…");
    const controller = new AbortController(); abort.current = controller;
    try {
      const result = await readDiscovery(await fetch("/api/preview-lockers/discovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(identity.data), signal: controller.signal }), setMessage);
      if (!controller.signal.aborted) {
        if (result.draft) { const suggestion = result.draft; setDraft(current => mergeSuggestions(current, suggestion)); setReviewed(false); setCompletionReviewed(false); setDirty(true); }
        setMessage(result.message);
      }
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Discovery unavailable. Continue manually."); }
    finally { pending.current = false; setBusy(null); abort.current = null; }
  }
  async function save() {
    if (pending.current || !reviewed) return;
    const parsed = previewContent.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).slice(0, 5).join("; ")); return; }
    pending.current = true; setBusy("save"); setError("");
    createId.current ??= crypto.randomUUID();
    try {
      const response = await fetch(saved ? `/api/preview-lockers/${saved.id}` : "/api/preview-lockers", {
        method: saved ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saved ? { revision: revision.current, content: parsed.data } : { id: createId.current, content: parsed.data }),
      });
      if (!response.ok) throw new Error(response.status === 409 ? "Save conflict: this slug is in use, the record changed, or an earlier save may have completed. Your draft is retained. Open the saved list before retrying." : response.status === 401 || response.status === 403 ? "Your Admin session is no longer authorized. Sign in again before saving." : "Save failed. Your draft is retained; retry is safe.");
      const data = await response.json(); setSaved(data); revision.current = data.revision; setReviewed(false); setCompletionReviewed(false); setDirty(false);
      if (gtmLinked) setCompleted(data.complete === true);
      setMessage(data.completionStatus === "unavailable"
        ? "Saved privately. Completion status could not be refreshed; reload before marking this preview complete."
        : "Saved privately. No canonical athlete, claim, or public Locker was created.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Save failed. Your draft is retained."); }
    finally { pending.current = false; setBusy(null); }
  }
  async function completePreview() {
    if (pending.current || !saved || !gtmLinked || !completionReviewed || dirty) return;
    pending.current = true; setBusy("complete"); setError("");
    try {
      const response = await fetch(`/api/preview-lockers/${saved.id}/completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: revision.current }),
      });
      if (!response.ok) throw new Error(response.status === 409 ? "Completion conflict: this preview changed. Reload the saved version, review it, and try again." : response.status === 401 || response.status === 403 ? "Your Admin session is no longer authorized. Sign in again before completing this preview." : "Completion could not be saved. The preview remains draft / incomplete.");
      setCompleted(true); setCompletionReviewed(false);
      setMessage("Preview complete. This confirms private-demo review only; identity and media rights remain unverified.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Completion could not be saved. The preview remains draft / incomplete."); }
    finally { pending.current = false; setBusy(null); }
  }
  return <div className="space-y-6">
    <p className="text-sm">Private demo only. Media suggestions are unverified; saving does not grant rights or create an Athlete Career ID.</p>
    {message && <p role="status" className="rounded-lg border p-3">{message}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-500 p-3">{error}</p>}
    <fieldset disabled={!!busy} className="space-y-6 disabled:opacity-70">
      <legend className="mb-4 text-xl font-semibold">Identity and presentation</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">Full name<Input aria-label="Full name" maxLength={120} value={draft.full_name} onChange={event => change({ full_name: event.target.value, ...(!saved ? { slug: slugify(event.target.value) } : {}) })} /></label>
        {field("slug", "Private URL slug", 80)}{field("school", "School")}{field("position", "Position", 60)}
        <label className="grid gap-2 text-sm">Career level<select aria-label="Career level" className="h-10 rounded-md border bg-background px-3" value={draft.level ?? ""} onChange={event => change({ level: (event.target.value || null) as PreviewContent["level"] })}><option value="">Not recorded</option><option value="hs">High school</option><option value="college">College</option><option value="pro">Professional</option><option value="former">Former athlete</option></select></label>
        {field("hometown", "Hometown")}{field("jersey", "Jersey", 10)}{field("height_in", "Height (inches)", 2, true)}{field("weight_lbs", "Weight (lbs)", 3, true)}{field("games_played", "Games played", 4, true)}
      </div>
      {(!saved || gtmLinked) && <section className="space-y-3 rounded-lg border p-4" aria-labelledby="preview-scraper-heading"><div className="space-y-1"><h2 id="preview-scraper-heading" className="font-semibold">Build with web scraper</h2><p className="text-sm">Searches nflverse NFL roster data, cfbverse college roster data, Wikipedia, ESPN, and YouTube. Suggestions fill only blank fields and remain editable; they are not identity, accuracy, copyright, or rights verification.</p><p className="text-sm">Google Images is not queried. A future image-search provider requires an approved adapter. You can cancel, continue manually, or replace every suggestion before saving.</p><p className="text-sm font-medium">Scraped and manual changes are retained while this editor remains open, until you explicitly review and save. Preview pages open the last saved version in a new tab so the editor stays open. A previously closed unsaved draft cannot be recovered.</p></div><div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={discover}>Build with web scraper</Button><Button type="button" variant="outline" onClick={() => setMessage("Manual mode: complete the fields below, review, then save privately.")}>Continue manually</Button></div></section>}
      <div className="grid gap-4 sm:grid-cols-2">{field("headshot_url", "Headshot HTTPS URL", 2048)}{field("hero_video_url", "Hero video HTTPS URL (direct video)", 2048)}</div>
      <label className="grid gap-2 text-sm">Biography<Textarea aria-label="Biography" rows={6} maxLength={4000} value={draft.bio} onChange={event => change({ bio: event.target.value })} /></label>
      <div className="grid gap-4 sm:grid-cols-2">{field("athlete_quote", "Athlete quote", 600)}{field("athlete_quote_author", "Quote attribution")}</div>
      {(["schools", "pro_teams"] as const).map(kind => <section key={kind} className="space-y-3"><h2 className="font-semibold">{kind === "schools" ? "School history" : "Pro team history"}</h2>{draft[kind].map((team, index) => <div key={index} className="grid gap-2 sm:grid-cols-4"><Input aria-label={`${kind} ${index + 1} label`} value={team.label} maxLength={80} onChange={e => change({ [kind]: draft[kind].map((v, i) => i === index ? { ...v, label: e.target.value } : v) })} /><Input aria-label={`${kind} ${index + 1} color`} type="color" value={team.color} onChange={e => change({ [kind]: draft[kind].map((v, i) => i === index ? { ...v, color: e.target.value } : v) })} /><Input aria-label={`${kind} ${index + 1} logo HTTPS URL`} value={team.logo ?? ""} maxLength={2048} onChange={e => change({ [kind]: draft[kind].map((v, i) => i === index ? { ...v, logo: e.target.value || null } : v) })} /><Button type="button" variant="outline" onClick={() => change({ [kind]: draft[kind].filter((_, i) => i !== index) })}>Remove from draft</Button></div>)}<Button type="button" variant="outline" disabled={draft[kind].length >= 12} onClick={() => change({ [kind]: [...draft[kind], { label: "", color: "#152238", logo: null }] })}>Add {kind === "schools" ? "school" : "pro team"}</Button></section>)}
      <section className="space-y-3"><h2 className="font-semibold">Awards</h2>{draft.awards.map((award, index) => <div key={index} className="grid gap-2 sm:grid-cols-3"><Input aria-label={`Award ${index + 1} year`} maxLength={20} value={award.year} onChange={e => change({ awards: draft.awards.map((v, i) => i === index ? { ...v, year: e.target.value } : v) })} /><Input aria-label={`Award ${index + 1} label`} maxLength={200} value={award.label} onChange={e => change({ awards: draft.awards.map((v, i) => i === index ? { ...v, label: e.target.value } : v) })} /><Button type="button" variant="outline" onClick={() => change({ awards: draft.awards.filter((_, i) => i !== index) })}>Remove from draft</Button></div>)}<Button type="button" variant="outline" disabled={draft.awards.length >= 40} onClick={() => change({ awards: [...draft.awards, { year: "", label: "" }] })}>Add award</Button></section>
      <section className="space-y-3"><h2 className="font-semibold">Videos · {draft.videos.length}/24</h2>{draft.videos.map((video, index) => <fieldset className="space-y-2 rounded-lg border p-3" key={video.id}><legend>Video {index + 1}</legend>{(["title", "url", "thumb"] as const).map(key => <Input key={key} aria-label={`Video ${index + 1} ${key}`} placeholder={key === "title" ? "Title" : `${key} HTTPS URL`} maxLength={key === "title" ? 160 : 2048} value={video[key] ?? ""} onChange={e => change({ videos: draft.videos.map((v, i) => i === index ? { ...v, [key]: e.target.value || (key === "thumb" ? null : "") } : v) })} />)}<Button type="button" variant="outline" onClick={() => change({ videos: draft.videos.filter((_, i) => i !== index) })}>Remove video from draft</Button></fieldset>)}<Button type="button" variant="outline" disabled={draft.videos.length >= 24} onClick={() => change({ videos: [...draft.videos, { id: crypto.randomUUID(), title: "", url: "", thumb: null }] })}>Add video</Button></section>
      <section className="space-y-3"><h2 className="font-semibold">Photos · {draft.photos.length}/40</h2>{draft.photos.map((photo, index) => <fieldset className="space-y-2 rounded-lg border p-3" key={photo.id}><legend>Photo {index + 1}</legend>{(["title", "url", "credits", "sourceUrl", "season"] as const).map(key => <Input key={key} aria-label={`Photo ${index + 1} ${key}`} placeholder={key} maxLength={key === "title" ? 160 : key === "credits" ? 300 : key === "season" ? 20 : 2048} value={photo[key] ?? ""} onChange={e => change({ photos: draft.photos.map((v, i) => i === index ? { ...v, [key]: e.target.value || (["title", "url"].includes(key) ? "" : null) } : v) })} />)}<select aria-label={`Photo ${index + 1} level`} className="h-10 rounded-md border bg-background px-3" value={photo.level} onChange={e => change({ photos: draft.photos.map((v, i) => i === index ? { ...v, level: e.target.value as typeof photo.level } : v) })}>{["hs", "cfb", "pro", "off-field"].map(level => <option key={level}>{level}</option>)}</select><Button type="button" variant="outline" onClick={() => change({ photos: draft.photos.filter((_, i) => i !== index) })}>Remove photo from draft</Button></fieldset>)}<Button type="button" variant="outline" disabled={draft.photos.length >= 40} onClick={() => change({ photos: [...draft.photos, { id: crypto.randomUUID(), title: "", url: "", credits: null, sourceUrl: null, season: null, level: "off-field" }] })}>Add photo</Button></section>
      <label className="flex items-start gap-3"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} className="mt-1 h-5 w-5" />I reviewed this draft for private demo use. This is not public publication or rights verification.</label>
      <Button type="button" disabled={!reviewed} onClick={save}>{saved ? "Save changes privately" : "Save private preview"}</Button>
      {saved && gtmLinked && <section className="space-y-3 rounded-lg border p-4" aria-labelledby="preview-completion-heading">
        <div>
          <h2 id="preview-completion-heading" className="font-semibold">Cohort preview status</h2>
          <p className="mt-1 text-sm font-medium">{completed ? "✓ Preview complete" : "Draft / incomplete"}</p>
          <p className="mt-1 text-sm">Completion confirms explicit review of this persisted private demo only. It does not verify athlete identity, media accuracy, copyright, or rights.</p>
        </div>
        {!completed && <>
          <label className="flex items-start gap-3"><input type="checkbox" checked={completionReviewed} disabled={dirty} onChange={event => setCompletionReviewed(event.target.checked)} className="mt-1 h-5 w-5" />I explicitly reviewed the current persisted preview for private demo use.</label>
          {dirty && <p className="text-sm">Save or discard the unsaved edits before completing this preview.</p>}
          <Button type="button" disabled={!completionReviewed || dirty} onClick={completePreview}>Mark preview complete</Button>
        </>}
      </section>}
    </fieldset>
    {busy === "discovery" && <Button type="button" variant="outline" onClick={() => { abort.current?.abort(); setMessage("Discovery cancelled. Continue manually."); }}>Cancel discovery</Button>}
    {busy === "save" && <p role="status">Saving privately…</p>}
    {busy === "complete" && <p role="status">Saving completion…</p>}
    {saved && <PreviewViewerAccess previewId={saved.id} initialAssigned={record ? viewerAssigned : false} />}
    {dirty && <p role="status" className="rounded-lg border p-3 text-sm">Unsaved scraped or manual changes remain here while this editor stays open. Same-tab links and page reload are guarded. Save this draft or use the explicit discard action before leaving.</p>}
    <nav className="flex flex-wrap gap-4" aria-label="Preview navigation"><Link className="underline" href="/admin/preview-lockers">Back to saved previews</Link>{saved ? <><Link className="underline" href={`/preview-lockers/${saved.slug}`} target="_blank" rel="noopener noreferrer">Open last saved private Locker in new tab</Link><Link className="underline" href={`/preview-lockers/${saved.slug}/photos`} target="_blank" rel="noopener noreferrer">Open last saved private Photos in new tab</Link><Link className="underline" href={`/preview-lockers/${saved.slug}/videos`} target="_blank" rel="noopener noreferrer">Open last saved private Film Room in new tab</Link><a className="underline aria-disabled:cursor-not-allowed aria-disabled:opacity-50" aria-disabled={!!busy} href={`/admin/preview-lockers/${saved.id}/edit`} data-draft-discard="true" onClick={event => { if (busy) event.preventDefault(); else { allowDraftDiscard.current = true; window.setTimeout(() => { allowDraftDiscard.current = false; }, 0); } }}>Reload saved version (discards unsaved draft)</a></> : <a className="underline aria-disabled:cursor-not-allowed aria-disabled:opacity-50" aria-disabled={!!busy} href="/admin/preview-lockers" data-draft-discard="true" onClick={event => { if (busy) event.preventDefault(); else { allowDraftDiscard.current = true; window.setTimeout(() => { allowDraftDiscard.current = false; }, 0); } }}>Discard unsaved draft and return to saved previews</a>}</nav>
  </div>;
}
