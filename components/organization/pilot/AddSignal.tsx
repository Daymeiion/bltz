"use client";

import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconArrowUpRight, IconCheck, IconPlus, IconSparkles, IconX } from "@tabler/icons-react";
import { SCHOOL_SIGNAL_KINDS, type SchoolSignal, type SchoolSignalKind, type SignalSource } from "@/lib/enterprise-crm/pilot/school-signals-shared";
import type { PilotPlayer } from "@/lib/enterprise-crm/pilot/types";
import { cn } from "@/lib/utils";

type Match = { key: string; playerId: string | null; headline: string; targetDate: string; reason: string };
type Draft = { playerId: string | null; title: string; kind: SchoolSignalKind; targetDate: string; recurrence: "yearly" | "once"; why: string; sources: SignalSource[] };
type Result = { draft: Draft | null; matches: Match[]; question: string | null; candidates: SignalSource[] };

const KIND_LABEL: Record<SchoolSignalKind, string> = { anniversary: "Anniversary", birthday: "Birthday", milestone: "Milestone", event: "Event", business: "Business", other: "Other" };
/** Words every description shares; matching on them would flag unrelated dates. */
const GENERIC = new Set(["anniversary", "celebrate", "years", "since", "birthday", "career", "game", "season", "first"]);
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Template only: a stand-in for the AI that reads a date and a player name from the text. */
export function previewDraft(request: string, players: readonly PilotPlayer[], playerId: string | null): Result {
  const text = request.toLowerCase();
  const player = players.find((row) => row.id === playerId) ?? players.find((row) => text.includes(row.name.toLowerCase()) || text.includes(row.name.split(" ")[1]?.toLowerCase() ?? "\u0000")) ?? null;
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(request);
  const written = new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "i").exec(request);
  const date = iso ? iso[0] : written ? `${written[3]}-${String(MONTHS.indexOf(written[1].toLowerCase()) + 1).padStart(2, "0")}-${written[2].padStart(2, "0")}` : null;
  const matches: Match[] = player?.next && text.split(/\W+/).some((word) => word.length > 4 && !GENERIC.has(word) && player.next!.headline.toLowerCase().includes(word))
    ? [{ key: `next:${player.id}`, playerId: player.id, headline: player.next.headline, targetDate: player.next.targetDate, reason: "BLTZ already flags this date for this player." }] : [];
  const candidates = player ? [{ label: `Sample: ${player.name} career retrospective (Sample publication)`, url: "https://example.com/sample-retrospective" }] : [];
  const kind: SchoolSignalKind = /birthday|turns \d/.test(text) ? "birthday" : /business|company|opened|founded/.test(text) ? "business" : /reunion|event|homecoming|game day/.test(text) ? "event" : "anniversary";
  return {
    draft: date ? { playerId: player?.id ?? null, title: request.trim().replace(/\s+/g, " ").slice(0, 90), kind, targetDate: date, recurrence: kind === "event" ? "once" : "yearly", why: "Described by your staff. (Template: the live workspace drafts this with AI.)", sources: candidates } : null,
    matches,
    question: date ? null : "What date should this signal use? Add it to your description, for example \"November 18, 2006\".",
    candidates,
  };
}

/**
 * Add a signal: staff describe a date in their own words, AI drafts it (who, when,
 * why and sources) or points to a signal BLTZ already tracks, and staff review and
 * save it. Staff can also enter it themselves.
 */
export function AddSignal({ organizationId, players, defaultPlayerId = null, profileBaseHref, preview = false, label = "Add a signal", compact = false, onSaved }: {
  organizationId: string;
  players: PilotPlayer[];
  defaultPlayerId?: string | null;
  profileBaseHref: string;
  preview?: boolean;
  label?: string;
  compact?: boolean;
  onSaved?: (signal: SchoolSignal) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {compact
        ? <button type="button" className="pilot-icon-pill" aria-label={label} onClick={() => setOpen(true)}><IconPlus stroke={1.5} aria-hidden /></button>
        : <button type="button" className="pilot-pill pilot-pill--primary pilot-pill--compact pilot-add-signal" onClick={() => setOpen(true)}><IconSparkles stroke={1.5} aria-hidden />{label}</button>}
      {open ? <AddSignalDialog organizationId={organizationId} players={players} defaultPlayerId={defaultPlayerId} profileBaseHref={profileBaseHref} preview={preview} onClose={() => setOpen(false)} onSaved={onSaved} /> : null}
    </>
  );
}

function AddSignalDialog({ organizationId, players, defaultPlayerId, profileBaseHref, preview, onClose, onSaved }: {
  organizationId: string; players: PilotPlayer[]; defaultPlayerId: string | null; profileBaseHref: string; preview: boolean; onClose: () => void; onSaved?: (signal: SchoolSignal) => void;
}) {
  const router = useRouter();
  const [request, setRequest] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(defaultPlayerId);
  const [stage, setStage] = useState<"describe" | "drafting" | "review" | "saved">("describe");
  const [result, setResult] = useState<Result | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const api = `/api/organization/${organizationId}`;
  const name = (id: string | null) => players.find((row) => row.id === id)?.name ?? "Program-wide";
  const host = document.querySelector<HTMLElement>('[data-product="enterprise-crm"]') ?? document.body;

  async function draftWithAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.trim().length < 5) return;
    setStage("drafting"); setError(null);
    let next: Result | null = null;
    if (preview) {
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      next = previewDraft(request, players, playerId);
    } else {
      const response = await fetch(`${api}/signals/draft`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request: request.trim(), playerId }) }).catch(() => null);
      const body = await response?.json().catch(() => ({})) as Partial<Result> & { state?: string };
      if (response?.ok) next = { draft: body.draft ?? null, matches: body.matches ?? [], question: body.question ?? null, candidates: body.candidates ?? [] };
      else setError(body?.state === "not_configured" ? "AI drafting is not set up yet. You can enter the signal yourself." : body?.state === "refused" ? "AI could not draft this one. You can enter the signal yourself." : "AI drafting did not answer. Try again, or enter the signal yourself.");
    }
    setResult(next);
    setDraft(next?.draft ?? null);
    setStage(next ? "review" : "describe");
  }

  function enterManually() {
    setResult({ draft: null, matches: [], question: null, candidates: [] });
    setDraft({ playerId, title: request.trim().slice(0, 160), kind: "anniversary", targetDate: "", recurrence: "yearly", why: "", sources: [] });
    setStage("review"); setError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true); setError(null);
    const payload = { ...draft, why: draft.why || null, request: request.trim() || null, origin: result?.draft ? "ai" : "manual" };
    let saved: SchoolSignal | null = null;
    if (preview) {
      saved = { id: crypto.randomUUID(), playerId: draft.playerId, title: draft.title, kind: draft.kind, targetDate: draft.targetDate, recurrence: draft.recurrence, why: draft.why || null, sources: draft.sources, origin: payload.origin as "ai" | "manual", createdAt: new Date().toISOString() };
    } else {
      const response = await fetch(`${api}/signals`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
      const body = await response?.json().catch(() => ({})) as { signal?: SchoolSignal };
      saved = response?.ok && body.signal ? body.signal : null;
    }
    setBusy(false);
    if (!saved) { setError("That signal could not be saved. Check the title and date."); return; }
    onSaved?.(saved);
    if (!preview && !onSaved) router.refresh();
    setStage("saved");
  }

  const toggleSource = (source: SignalSource) => draft && setDraft({ ...draft, sources: draft.sources.some((row) => row.label === source.label) ? draft.sources.filter((row) => row.label !== source.label) : [...draft.sources, source].slice(0, 10) });

  return createPortal(
    <div className="pilot-modal" role="dialog" aria-modal="true" aria-labelledby="pilot-signal-title" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <div className="pilot-modal__scrim" onClick={onClose} />
      <div className="pilot-modal__panel pilot-signal-add">
        <div className="pilot-card-head">
          <div><h2 id="pilot-signal-title">Add a signal</h2><p>A date worth featuring a former player on, in your own words.</p></div>
          <button type="button" className="pilot-icon-pill" aria-label="Close" onClick={onClose}><IconX stroke={1.5} aria-hidden /></button>
        </div>

        {stage === "describe" || stage === "drafting" ? (
          <form className="pilot-signal-add__form" onSubmit={(event) => void draftWithAi(event)}>
            <label className="pilot-field">Describe it<textarea rows={4} maxLength={1000} required value={request} onChange={(event) => setRequest(event.target.value)}
              placeholder={"For example: Marcus scored his first touchdown on November 4, 2016. We'd like to mark the 10th anniversary."} /></label>
            <label className="pilot-field">Former player<select value={playerId ?? ""} onChange={(event) => setPlayerId(event.target.value || null)}>
              <option value="">Let AI work it out, or program-wide</option>
              {players.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select></label>
            {error ? <p role="alert" className="pilot-tool__error">{error}</p> : null}
            <div className="pilot-modal__actions">
              <button type="button" className="pilot-pill pilot-pill--quiet" onClick={enterManually}>Enter it myself</button>
              <button type="submit" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={stage === "drafting" || request.trim().length < 5}><IconSparkles stroke={1.5} aria-hidden />{stage === "drafting" ? "Drafting…" : "Draft with AI"}</button>
            </div>
            <p className="pilot-share__note">AI reads your description with this player&apos;s file, BLTZ research and a web search. It never invents a date; you review everything before it is saved.</p>
          </form>
        ) : null}

        {stage === "review" && result ? (
          <form className="pilot-signal-add__form" onSubmit={(event) => void save(event)}>
            {result.matches.length ? (
              <div className="pilot-signal-add__matches">
                <h3>Already tracked</h3>
                {result.matches.map((match) => (
                  <Link key={match.key} href={match.playerId ? `${profileBaseHref}/${match.playerId}` : profileBaseHref} className="pilot-signal-add__match">
                    <span><strong>{match.headline}</strong><small>{name(match.playerId)} · {match.targetDate} · {match.reason}</small></span>
                    <IconArrowUpRight stroke={1.5} aria-hidden />
                  </Link>
                ))}
                <p>Plan from the existing signal, or add yours below if it is something different.</p>
              </div>
            ) : null}
            {result.question && !draft ? (
              <div className="pilot-signal-add__question">
                <p>{result.question}</p>
                <div className="pilot-modal__actions">
                  <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => setStage("describe")}>Edit description</button>
                  <button type="button" className="pilot-pill pilot-pill--quiet" onClick={enterManually}>Enter it myself</button>
                </div>
              </div>
            ) : null}
            {draft ? (
              <>
                {result.draft ? <p className="pilot-signal-add__badge"><IconSparkles stroke={1.5} aria-hidden />Drafted with AI. Check it before saving.</p> : null}
                <label className="pilot-field">Title<input required maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
                <div className="pilot-signal-add__row">
                  <label className="pilot-field">Former player<select value={draft.playerId ?? ""} onChange={(event) => setDraft({ ...draft, playerId: event.target.value || null })}>
                    <option value="">Program-wide</option>
                    {players.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select></label>
                  <label className="pilot-field">Type<select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as SchoolSignalKind })}>
                    {SCHOOL_SIGNAL_KINDS.map((kind) => <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>)}
                  </select></label>
                </div>
                <div className="pilot-signal-add__row">
                  <label className="pilot-field">{draft.recurrence === "yearly" ? "Original date" : "Date"}<input type="date" required value={draft.targetDate} onChange={(event) => setDraft({ ...draft, targetDate: event.target.value })} /></label>
                  <label className="pilot-check"><input type="checkbox" checked={draft.recurrence === "yearly"} onChange={(event) => setDraft({ ...draft, recurrence: event.target.checked ? "yearly" : "once" })} />Comes back every year</label>
                </div>
                <label className="pilot-field">Why it matters<textarea rows={2} maxLength={1000} value={draft.why} onChange={(event) => setDraft({ ...draft, why: event.target.value })} /></label>
                {result.candidates.length ? (
                  <fieldset className="pilot-signal-add__sources">
                    <legend>Sources</legend>
                    {result.candidates.map((source) => {
                      const on = draft.sources.some((row) => row.label === source.label);
                      return (
                        <label key={source.label} className={cn("pilot-check", on && "pilot-check--on")}>
                          <input type="checkbox" checked={on} onChange={() => toggleSource(source)} />
                          <span>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a> : source.label}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                ) : null}
                {error ? <p role="alert" className="pilot-tool__error">{error}</p> : null}
                <div className="pilot-modal__actions">
                  <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => setStage("describe")}>Back</button>
                  <button type="submit" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={busy || !draft.title.trim() || !draft.targetDate}>{busy ? "Saving" : "Add signal"}</button>
                </div>
              </>
            ) : null}
          </form>
        ) : null}

        {stage === "saved" ? (
          <div className="pilot-signal-add__done">
            <span aria-hidden><IconCheck stroke={2} /></span>
            <p><strong>Signal added.</strong> It shows up with the player&apos;s other signals, with suggested activations, and BLTZ can see it too.</p>
            <div className="pilot-modal__actions"><button type="button" className="pilot-pill pilot-pill--primary pilot-pill--compact" onClick={onClose}>Done</button></div>
          </div>
        ) : null}
      </div>
    </div>,
    host,
  );
}
