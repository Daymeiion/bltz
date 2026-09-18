"use client";

import { useEffect, useState } from "react";
import type { League, PlayerStats } from "@/lib/sportradar/types";
import type { ProviderCandidate } from "@/lib/sportradar/search";

type Player = { id: string; full_name: string; slug: string; position: string | null; school: string | null; team: string | null; dob: string | null };
type Master = { gsis_id: string; display_name: string; position: string | null; college_name: string | null; latest_team: string | null; birth_date: string | null };
type Review = { id: string; status: string; raw_profile: unknown; normalized: PlayerStats; fetched_at: string; cacheHit: boolean; player: Player };
const inputClass = "w-full rounded border border-slate-600 bg-transparent p-2";
const buttonClass = "rounded border border-slate-500 px-3 py-2 text-sm disabled:opacity-40";
const STATUS: Record<string, string> = { MANUAL_REVIEW: "Review Required", IMPORTED: "Imported", NO_DATA: "No Data" };
const ERRORS: Record<string, string> = {
  lookup_team_required: "Open Adjust team or season and enter an NFL team, such as BUF, then retry.",
  provider_access_denied: "The Sportradar key does not have access to this feed. Check the NFL subscription or trial access.",
  provider_quota_limited: "Sportradar has reached its request limit. Try again after the quota resets.",
  trial_budget_exhausted: "The configured Sportradar request budget is exhausted. An administrator must review the budget before more requests.",
  request_throttled: "Another provider request just ran. Wait a few seconds and retry.",
  request_in_progress: "This provider lookup is already running. Wait a moment and retry.",
  lookup_storage_unavailable: "Player lookup is temporarily unavailable. Please retry.",
};

async function api(path = "", body?: unknown, signal?: AbortSignal) {
  try {
    const r = await fetch(`/api/admin/sportradar${path}`, { cache: "no-store", signal: signal ?? AbortSignal.timeout(45000), ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
    const result = await r.json();
    if (!r.ok) throw new Error(ERRORS[result.error] || result.error || "Request failed");
    return result;
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new Error("The athlete request timed out. Please retry.");
    throw error;
  }
}

export function SportradarPanel({ previewId, athleteName, importDisabled = false, onBusyChange, onImported }: { previewId: string; athleteName: string; importDisabled?: boolean; onBusyChange?: (busy: boolean) => void; onImported?: () => void }) {
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
  const [identityState, setIdentityState] = useState<"loading" | "linked" | "unlinked" | "error">("loading");
  const [identityMessage, setIdentityMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [master, setMaster] = useState<Master | null>(null);
  const [candidates, setCandidates] = useState<Player[]>([]);
  const [existingPlayerId, setExistingPlayerId] = useState("");
  const [identityApproved, setIdentityApproved] = useState(false);
  const [searchName, setSearchName] = useState(athleteName);
  const [searchTeam, setSearchTeam] = useState("");
  const [searchSeason, setSearchSeason] = useState("");
  const [providerCandidates, setProviderCandidates] = useState<ProviderCandidate[]>([]);
  const [lookupMessage, setLookupMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIdentityState("loading"); setError("");
    void api(`?previewId=${encodeURIComponent(previewId)}`, undefined, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
      .then(result => {
        if (!active) return;
        setPlayer(result.player); setIdentityState(result.linked ? "linked" : "unlinked");
        if (result.player) setSearchName(result.player.full_name);
        setIdentityMessage(result.message || "");
        setMaster(result.master ?? null); setCandidates(result.candidates ?? []); setIdentityApproved(false);
        setProviderId(result.mappings?.find((m: { league: string }) => m.league === "nfl")?.provider_player_id || "");
        setStatus(result.player ? "Athlete loaded from saved preview" : "Athlete link required");
      }).catch(error => { if (active) { setIdentityState("error"); setError(error instanceof Error ? error.message : "Athlete lookup failed. Please retry."); } });
    return () => { active = false; controller.abort(); };
  }, [previewId, retry]);
  async function run(action: () => Promise<void>) {
    setBusy(true); onBusyChange?.(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); setStatus("Failed"); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  function resetReview() { setReview(null); setApproved(false); setStatus("Not Requested"); }
  return <section className="space-y-4 rounded border border-slate-600 p-4" aria-label="Sportradar stats import">
    <h2 className="text-xl font-bold">Sportradar statistics</h2>
    {identityState === "loading" && <p role="status">Loading this preview’s athlete…</p>}
    {identityState === "error" && <button type="button" className={buttonClass} onClick={() => setRetry(value => value + 1)}>Retry athlete lookup</button>}
    {identityMessage && <p role="status">{identityMessage}</p>}
    {identityState === "linked" && master && !player && <div className="space-y-3 rounded border border-slate-600 p-3">
      <h3 className="font-semibold">Review athlete identity</h3>
      <p>{master.display_name} · {master.position || "Position unknown"} · {master.college_name || "School unknown"} · {master.latest_team || "Team unknown"}<br />DOB: {master.birth_date || "Unknown"} · Player Master ID: {master.gsis_id}</p>
      <label className="block">Connect athlete<select aria-label="Connect athlete" className={inputClass} value={existingPlayerId} disabled={busy} onChange={e => { setExistingPlayerId(e.target.value); setIdentityApproved(false); }}>
        <option value="">{candidates.length ? "Select an existing athlete" : "Create a private, unclaimed athlete identity"}</option>
        {candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.full_name} · {candidate.school || candidate.team || "Unknown school/team"} · {candidate.dob || "Unknown DOB"} · {candidate.id}</option>)}
      </select></label>
      <p className="text-sm">{candidates.length ? "Existing name matches need your review to avoid duplicate identities." : "This creates a canonical BLTZ athlete linked to this Player Master record. It does not create an account, verify a claim, or publish a Locker."}</p>
      <label className="flex gap-2"><input type="checkbox" disabled={busy} checked={identityApproved} onChange={e => setIdentityApproved(e.target.checked)} />I reviewed this athlete and approve connecting this identity to the preview.</label>
      <button type="button" className={buttonClass} disabled={busy || importDisabled || !identityApproved || (candidates.length > 0 && !existingPlayerId)} onClick={() => run(async () => {
        await api("", { action: "link_identity", previewId, gsisId: master.gsis_id, existingPlayerId: existingPlayerId || null, approved: true });
        onImported?.();
        setRetry(value => value + 1);
      })}>Confirm athlete identity</button>
    </div>}
    {identityState === "linked" && player && <p className="text-sm">Athlete loaded from this preview’s saved identity link. Review the provider profile before importing statistics.</p>}
    {identityState === "unlinked" && <>
    <p className="text-sm">This preview has no saved athlete link. Search for and select its existing BLTZ athlete to continue.</p>
    <label className="block">Find BLTZ athlete<input className={inputClass} value={query} disabled={busy} onChange={e => setQuery(e.target.value)} /></label>
    <button type="button" className={buttonClass} disabled={busy} onClick={() => run(async () => {
      setStatus("Searching BLTZ athletes…");
      const result = await api(`?q=${encodeURIComponent(query.trim())}`); setPlayers(result.players);
      setStatus(result.players.length ? "Select athlete" : "No Match");
    })}>Search BLTZ</button>
    <ul className="space-y-2">{players.map(p => <li key={p.id}><button type="button" className={buttonClass} disabled={busy} onClick={() => run(async () => {
      setPlayer(p); setProviderId(""); resetReview();
      setSearchName(p.full_name); setProviderCandidates([]); setLookupMessage(""); setSearchTeam(""); setSearchSeason("");
      const result = await api(`?playerId=${p.id}`); setHistory(result);
      const mapping = result.mappings.find((m: { league: string }) => m.league === league);
      if (mapping) { setProviderId(mapping.provider_player_id); setStatus("Matched"); }
    })}>{p.full_name} · {p.position || "Position unknown"} · {p.school || p.team || p.slug} · {p.id}</button></li>)}</ul>
    {status === "No Match" && <p>No canonical BLTZ athlete matched this name. A Player Master contact alone may not yet have a BLTZ athlete identity.</p>}
    </>}
    {player && <>
      <p>Selected: <strong>{player.full_name}</strong> · {player.id}<br />Position: {player.position || "Unknown"} · School: {player.school || "Unknown"} · DOB: {player.dob || "Unknown"}</p>
      <label className="block">League<select className={inputClass} disabled={busy} value={league} onChange={e => { setLeague(e.target.value as League); setProviderId(""); resetReview(); }}><option value="nfl">NFL</option><option value="ncaafb" disabled>NCAA Football — disabled for cohort</option></select></label>
      <label className="block">Player name<input aria-label="Sportradar player name" className={inputClass} disabled={busy} value={searchName} onChange={e => { setSearchName(e.target.value); setProviderCandidates([]); setLookupMessage(""); }} /></label>
      <p className="text-sm">Find the player in Sportradar using their name and saved career team/season. No player ID is needed. Uncached searches use API quota.</p>
      <details><summary>Adjust team or season</summary><div className="grid gap-3 sm:grid-cols-2">
        <label>NFL team<input aria-label="Sportradar search team" className={inputClass} disabled={busy} value={searchTeam} placeholder="Use saved team (e.g. BUF)" onChange={e => { setSearchTeam(e.target.value); setProviderCandidates([]); }} /></label>
        <label>Season<input aria-label="Sportradar search season" className={inputClass} type="number" min="2000" max={new Date().getUTCFullYear()} disabled={busy} value={searchSeason} placeholder="Use saved last season" onChange={e => { setSearchSeason(e.target.value); setProviderCandidates([]); }} /></label>
      </div></details>
      <button type="button" className={buttonClass} disabled={busy || searchName.trim().length < 2} onClick={() => run(async () => {
        setProviderCandidates([]); setLookupMessage(""); setStatus("Searching Sportradar…");
        const result = await api("", { action: "search_provider", playerId: player.id, name: searchName, ...(searchTeam.trim() ? { team: searchTeam.trim() } : {}), ...(searchSeason ? { season: Number(searchSeason) } : {}) });
        setProviderCandidates(result.candidates); setLookupMessage(result.message); setSearchTeam(result.team); setSearchSeason(String(result.season));
        setStatus(result.candidates.length ? "Select provider match" : "No provider match");
      })}>Find player on Sportradar <QuotaIndicator /></button>
      {lookupMessage && <p role="status">{lookupMessage}</p>}
      <ul className="space-y-2">{providerCandidates.map(candidate => <li key={candidate.id}><button type="button" className={buttonClass} disabled={busy} onClick={() => run(async () => {
        resetReview(); setProviderId(candidate.id); setStatus("Fetching");
        await new Promise(resolve => setTimeout(resolve, 1200));
        const result = await api("", { action: "preview", playerId: player.id, providerId: candidate.id, league, refresh: false });
        setReview(result); setStatus(STATUS[result.status] || result.status); setUsage(await api());
      })}>Review {candidate.name} · {candidate.position || "Position unknown"} · {candidate.team} · {candidate.season} <QuotaIndicator /></button></li>)}</ul>
      <details><summary>Advanced: provider player ID</summary><label className="block">Sportradar Player ID<input className={inputClass} disabled={busy} value={providerId} onChange={e => { setProviderId(e.target.value.trim()); resetReview(); }} placeholder="Optional manual override" /></label></details>
      {!providerId && <p className="text-sm">No saved Sportradar mapping exists. Use Find player on Sportradar to find a match.</p>}
      <div className="flex flex-wrap gap-2">{[false, true].map(refresh => <button type="button" className={buttonClass} disabled={busy || !providerId} key={String(refresh)} onClick={() => run(async () => {
        resetReview(); setStatus("Fetching");
        const result = await api("", { action: "preview", playerId: player.id, providerId, league, refresh });
        setReview(result); setStatus(STATUS[result.status] || result.status); setUsage(await api());
      })}>{refresh ? "Refresh from provider" : "Fetch / use cached profile"} <QuotaIndicator refresh={refresh} /></button>)}</div>
    </>}
    <p role="status">Stats Source: Sportradar · Stats Status: {status}{review ? ` · Last sync: ${review.fetched_at} · ${review.cacheHit ? "Cache hit" : "API response stored"}` : ""}</p>
    {error && <p role="alert" className="text-red-500">{error}</p>}
    {importDisabled && <p className="text-sm">Save any unsaved builder changes before importing statistics. After an import, reload the saved version before further edits.</p>}
    {review && <>
      <details><summary>Review raw profile (admin only)</summary><pre className="max-h-80 overflow-auto text-xs">{JSON.stringify(review.raw_profile, null, 2)}</pre></details>
      <details open><summary>Review normalized statistics</summary><pre className="max-h-80 overflow-auto text-xs">{JSON.stringify(review.normalized, null, 2)}</pre></details>
      <label className="flex items-start gap-2"><input type="checkbox" checked={approved} disabled={busy} onChange={e => setApproved(e.target.checked)} />I verified this profile belongs to {player?.full_name} and this Preview Locker. Approve the mapping and publish these statistics.</label>
      <button type="button" className={buttonClass} disabled={busy || importDisabled || !approved || review.status === "NO_DATA"} onClick={() => run(async () => {
        if (importDisabled) return;
        await api("", { action: "import", ingestionId: review.id, previewId, approved: true });
        setStatus("Imported"); onImported?.(); setUsage(await api());
      })}>Approve mapping and import statistics</button>
    </>}
    {history !== null && <details><summary>Saved mappings and ingestion history</summary><pre className="max-h-60 overflow-auto text-xs">{JSON.stringify(history, null, 2)}</pre></details>}
    <button type="button" className={buttonClass} disabled={busy} onClick={() => run(async () => setUsage(await api()))}>Load trial usage (no provider call)</button>
    {usage && <p className="text-sm">Sportradar Trial Usage: {usage.successful} successful API responses · {usage.failed} failed requests · {usage.reserved} quota reservations · {usage.playersImported} players imported · Last request: {usage.lastRequest?.requested_at || "None"} ({usage.lastRequest?.response_status ?? "—"})</p>}
  </section>;
}

function QuotaIndicator({ refresh = false }: { refresh?: boolean }) {
  return <span className="ml-2 inline-block border-l border-current/30 pl-2 text-xs font-semibold text-amber-300">{refresh ? "Uses API quota" : "API quota if uncached"}</span>;
}
