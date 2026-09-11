"use client";

import { useState } from "react";
import type { League, PlayerStats } from "@/lib/sportradar/types";

type Player = { id: string; full_name: string; slug: string; position: string | null; school: string | null; team: string | null; dob: string | null };
type Review = { id: string; status: string; raw_profile: unknown; normalized: PlayerStats; fetched_at: string; cacheHit: boolean; player: Player };
const inputClass = "w-full rounded border border-slate-600 bg-transparent p-2";
const buttonClass = "rounded border border-slate-500 px-3 py-2 text-sm disabled:opacity-40";
const STATUS: Record<string, string> = { MANUAL_REVIEW: "Review Required", IMPORTED: "Imported", NO_DATA: "No Data" };

export function SportradarPanel({ previewId, athleteName }: { previewId: string; athleteName: string }) {
  const [query, setQuery] = useState(athleteName);
  const [players, setPlayers] = useState<Player[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [league, setLeague] = useState<League>("nfl");
  const [providerId, setProviderId] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Not Requested");
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<{ successful: number; failed: number; reserved: number; playersImported: number; lastRequest: { requested_at: string; response_status: number; error_code: string | null } | null } | null>(null);
  const [history, setHistory] = useState<unknown>(null);
  async function api(path = "", body?: unknown) {
    const r = await fetch(`/api/admin/sportradar${path}`, { cache: "no-store", ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || "Request failed");
    return result;
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); setStatus("Failed"); }
    finally { setBusy(false); }
  }
  function resetReview() { setReview(null); setApproved(false); setStatus("Not Requested"); }
  return <section className="space-y-4 rounded border border-slate-600 p-4" aria-label="Sportradar stats import">
    <h2 className="text-xl font-bold">Sportradar statistics</h2>
    <p className="text-sm">Manually link this preview to a canonical BLTZ athlete. Review name, team, position and career history before approving. No automatic name matching.</p>
    <label className="block">Find BLTZ athlete<input className={inputClass} value={query} disabled={busy} onChange={e => setQuery(e.target.value)} /></label>
    <button type="button" className={buttonClass} disabled={busy} onClick={() => run(async () => {
      const result = await api(`?q=${encodeURIComponent(query)}`); setPlayers(result.players);
      setStatus(result.players.length ? "Select athlete" : "No Match");
    })}>Search BLTZ</button>
    <ul className="space-y-2">{players.map(p => <li key={p.id}><button type="button" className={buttonClass} disabled={busy} onClick={() => run(async () => {
      setPlayer(p); setProviderId(""); resetReview();
      const result = await api(`?playerId=${p.id}`); setHistory(result);
      const mapping = result.mappings.find((m: { league: string }) => m.league === league);
      if (mapping) { setProviderId(mapping.provider_player_id); setStatus("Matched"); }
    })}>{p.full_name} · {p.position || "Position unknown"} · {p.school || p.team || p.slug} · {p.id}</button></li>)}</ul>
    {player && <>
      <p>Selected: <strong>{player.full_name}</strong> · {player.id}<br />Position: {player.position || "Unknown"} · School: {player.school || "Unknown"} · DOB: {player.dob || "Unknown"}</p>
      <label className="block">League<select className={inputClass} disabled={busy} value={league} onChange={e => { setLeague(e.target.value as League); setProviderId(""); resetReview(); }}><option value="nfl">NFL</option><option value="ncaafb" disabled>NCAA Football — disabled for cohort</option></select></label>
      <label className="block">Sportradar Player ID<input className={inputClass} disabled={busy} value={providerId} onChange={e => { setProviderId(e.target.value.trim()); resetReview(); }} placeholder="Player GUID from Sportradar" /></label>
      <div className="flex flex-wrap gap-2">{[false, true].map(refresh => <button type="button" className={buttonClass} disabled={busy || !providerId} key={String(refresh)} onClick={() => run(async () => {
        resetReview(); setStatus("Fetching");
        const result = await api("", { action: "preview", playerId: player.id, providerId, league, refresh });
        setReview(result); setStatus(STATUS[result.status] || result.status); setUsage(await api());
      })}>{refresh ? "Refresh from provider (uses quota)" : "Fetch / use cached profile"}</button>)}</div>
    </>}
    <p role="status">Stats Source: Sportradar · Stats Status: {status}{review ? ` · Last sync: ${review.fetched_at} · ${review.cacheHit ? "Cache hit" : "API response stored"}` : ""}</p>
    {error && <p role="alert" className="text-red-500">{error}</p>}
    {review && <>
      <details><summary>Review raw profile (admin only)</summary><pre className="max-h-80 overflow-auto text-xs">{JSON.stringify(review.raw_profile, null, 2)}</pre></details>
      <details open><summary>Review normalized statistics</summary><pre className="max-h-80 overflow-auto text-xs">{JSON.stringify(review.normalized, null, 2)}</pre></details>
      <label className="flex items-start gap-2"><input type="checkbox" checked={approved} disabled={busy} onChange={e => setApproved(e.target.checked)} />I verified this profile belongs to {player?.full_name} and this Preview Locker. Approve the mapping and publish these statistics.</label>
      <button type="button" className={buttonClass} disabled={busy || !approved || review.status === "NO_DATA"} onClick={() => run(async () => {
        await api("", { action: "import", ingestionId: review.id, previewId, approved: true });
        setStatus("Imported"); setUsage(await api());
      })}>Approve mapping and import statistics</button>
    </>}
    {history !== null && <details><summary>Saved mappings and ingestion history</summary><pre className="max-h-60 overflow-auto text-xs">{JSON.stringify(history, null, 2)}</pre></details>}
    <button type="button" className={buttonClass} disabled={busy} onClick={() => run(async () => setUsage(await api()))}>Load trial usage (no provider call)</button>
    {usage && <p className="text-sm">Sportradar Trial Usage: {usage.successful} successful API responses · {usage.failed} failed requests · {usage.reserved} quota reservations · {usage.playersImported} players imported · Last request: {usage.lastRequest?.requested_at || "None"} ({usage.lastRequest?.response_status ?? "—"})</p>}
  </section>;
}
