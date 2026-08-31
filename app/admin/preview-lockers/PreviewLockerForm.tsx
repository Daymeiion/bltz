"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { previewContent, previewIdentity, slugify, type PreviewContent, type PreviewRecord } from "@/lib/preview-lockers/validation";
import { readDiscovery } from "@/lib/preview-lockers/stream-client";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";

const initial = () => previewContent.parse({ slug: "private-preview", full_name: "".padEnd(2, "_") });
type Scalar = Exclude<keyof PreviewContent, "schools" | "pro_teams" | "awards" | "videos" | "photos">;

export default function PreviewLockerForm({ record }: { record?: PreviewRecord }) {
  const [draft, setDraft] = useState<PreviewContent>(() => record ? previewContent.parse(Object.fromEntries(Object.keys(previewContent.shape).map(k => [k, record[k as keyof PreviewRecord]]))) : { ...initial(), full_name: "", slug: "" });
  const [busy, setBusy] = useState<"discovery" | "save" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [saved, setSaved] = useState<{ id: string; slug: string; revision: number } | null>(record ?? null);
  const revision = useRef(record?.revision);
  const createId = useRef<string | null>(null);
  const pending = useRef(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  function change(patch: Partial<PreviewContent>) { setDraft(current => ({ ...current, ...patch })); setReviewed(false); setError(""); }
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
        if (result.draft) { const suggestion = result.draft; setDraft(current => mergeSuggestions(current, suggestion)); setReviewed(false); }
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
      const data = await response.json(); setSaved(data); revision.current = data.revision; setReviewed(false);
      setMessage("Saved privately. No canonical athlete, claim, or public Locker was created.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Save failed. Your draft is retained."); }
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
      {!saved && <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={discover}>Find media suggestions</Button><Button type="button" variant="outline" onClick={() => setMessage("Manual mode: complete the fields below, review, then save privately.")}>Continue manually</Button></div>}
      <div className="grid gap-4 sm:grid-cols-2">{field("headshot_url", "Headshot HTTPS URL", 2048)}{field("hero_video_url", "Hero video HTTPS URL (direct video)", 2048)}</div>
      <label className="grid gap-2 text-sm">Biography<Textarea aria-label="Biography" rows={6} maxLength={4000} value={draft.bio} onChange={event => change({ bio: event.target.value })} /></label>
      <div className="grid gap-4 sm:grid-cols-2">{field("athlete_quote", "Athlete quote", 600)}{field("athlete_quote_author", "Quote attribution")}</div>
      {(["schools", "pro_teams"] as const).map(kind => <section key={kind} className="space-y-3"><h2 className="font-semibold">{kind === "schools" ? "School history" : "Pro team history"}</h2>{draft[kind].map((team, index) => <div key={index} className="grid gap-2 sm:grid-cols-4"><Input aria-label={`${kind} ${index + 1} label`} value={team.label} maxLength={80} onChange={e => change({ [kind]: draft[kind].map((v, i) => i === index ? { ...v, label: e.target.value } : v) })} /><Input aria-label={`${kind} ${index + 1} color`} type="color" value={team.color} onChange={e => change({ [kind]: draft[kind].map((v, i) => i === index ? { ...v, color: e.target.value } : v) })} /><Input aria-label={`${kind} ${index + 1} logo HTTPS URL`} value={team.logo ?? ""} maxLength={2048} onChange={e => change({ [kind]: draft[kind].map((v, i) => i === index ? { ...v, logo: e.target.value || null } : v) })} /><Button type="button" variant="outline" onClick={() => change({ [kind]: draft[kind].filter((_, i) => i !== index) })}>Remove from draft</Button></div>)}<Button type="button" variant="outline" disabled={draft[kind].length >= 12} onClick={() => change({ [kind]: [...draft[kind], { label: "", color: "#152238", logo: null }] })}>Add {kind === "schools" ? "school" : "pro team"}</Button></section>)}
      <section className="space-y-3"><h2 className="font-semibold">Awards</h2>{draft.awards.map((award, index) => <div key={index} className="grid gap-2 sm:grid-cols-3"><Input aria-label={`Award ${index + 1} year`} maxLength={20} value={award.year} onChange={e => change({ awards: draft.awards.map((v, i) => i === index ? { ...v, year: e.target.value } : v) })} /><Input aria-label={`Award ${index + 1} label`} maxLength={200} value={award.label} onChange={e => change({ awards: draft.awards.map((v, i) => i === index ? { ...v, label: e.target.value } : v) })} /><Button type="button" variant="outline" onClick={() => change({ awards: draft.awards.filter((_, i) => i !== index) })}>Remove from draft</Button></div>)}<Button type="button" variant="outline" disabled={draft.awards.length >= 40} onClick={() => change({ awards: [...draft.awards, { year: "", label: "" }] })}>Add award</Button></section>
      <section className="space-y-3"><h2 className="font-semibold">Videos · {draft.videos.length}/24</h2>{draft.videos.map((video, index) => <fieldset className="space-y-2 rounded-lg border p-3" key={video.id}><legend>Video {index + 1}</legend>{(["title", "url", "thumb"] as const).map(key => <Input key={key} aria-label={`Video ${index + 1} ${key}`} placeholder={key === "title" ? "Title" : `${key} HTTPS URL`} maxLength={key === "title" ? 160 : 2048} value={video[key] ?? ""} onChange={e => change({ videos: draft.videos.map((v, i) => i === index ? { ...v, [key]: e.target.value || (key === "thumb" ? null : "") } : v) })} />)}<Button type="button" variant="outline" onClick={() => change({ videos: draft.videos.filter((_, i) => i !== index) })}>Remove video from draft</Button></fieldset>)}<Button type="button" variant="outline" disabled={draft.videos.length >= 24} onClick={() => change({ videos: [...draft.videos, { id: crypto.randomUUID(), title: "", url: "", thumb: null }] })}>Add video</Button></section>
      <section className="space-y-3"><h2 className="font-semibold">Photos · {draft.photos.length}/40</h2>{draft.photos.map((photo, index) => <fieldset className="space-y-2 rounded-lg border p-3" key={photo.id}><legend>Photo {index + 1}</legend>{(["title", "url", "credits", "sourceUrl", "season"] as const).map(key => <Input key={key} aria-label={`Photo ${index + 1} ${key}`} placeholder={key} maxLength={key === "title" ? 160 : key === "credits" ? 300 : key === "season" ? 20 : 2048} value={photo[key] ?? ""} onChange={e => change({ photos: draft.photos.map((v, i) => i === index ? { ...v, [key]: e.target.value || (["title", "url"].includes(key) ? "" : null) } : v) })} />)}<select aria-label={`Photo ${index + 1} level`} className="h-10 rounded-md border bg-background px-3" value={photo.level} onChange={e => change({ photos: draft.photos.map((v, i) => i === index ? { ...v, level: e.target.value as typeof photo.level } : v) })}>{["hs", "cfb", "pro", "off-field"].map(level => <option key={level}>{level}</option>)}</select><Button type="button" variant="outline" onClick={() => change({ photos: draft.photos.filter((_, i) => i !== index) })}>Remove photo from draft</Button></fieldset>)}<Button type="button" variant="outline" disabled={draft.photos.length >= 40} onClick={() => change({ photos: [...draft.photos, { id: crypto.randomUUID(), title: "", url: "", credits: null, sourceUrl: null, season: null, level: "off-field" }] })}>Add photo</Button></section>
      <label className="flex items-start gap-3"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} className="mt-1 h-5 w-5" />I reviewed this draft for private demo use. This is not public publication or rights verification.</label>
      <Button type="button" disabled={!reviewed} onClick={save}>{saved ? "Save changes privately" : "Save private preview"}</Button>
    </fieldset>
    {busy === "discovery" && <Button type="button" variant="outline" onClick={() => { abort.current?.abort(); setMessage("Discovery cancelled. Continue manually."); }}>Cancel discovery</Button>}
    {busy === "save" && <p role="status">Saving privately…</p>}
    <nav className="flex flex-wrap gap-4" aria-label="Preview navigation"><Link className="underline" href="/admin/preview-lockers">Back to saved previews</Link>{saved && <><Link className="underline" href={`/preview-lockers/${saved.slug}`}>Open private Locker</Link><Link className="underline" href={`/preview-lockers/${saved.slug}/photos`}>Open private Photos</Link><a className="underline" href={`/admin/preview-lockers/${saved.id}/edit`}>Reload saved version (discards unsaved draft)</a></>}</nav>
  </div>;
}
