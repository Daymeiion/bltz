"use client";

import { useMemo, useState, type FormEvent } from "react";
import { IconArrowUpRight, IconCheck, IconPlus, IconRocket, IconTrash } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  ATHLETE_MEDIA_KINDS,
  type AthleteMediaKind,
  type LaunchStatus,
  type PilotLaunch,
  type PilotPlayer,
} from "@/lib/enterprise-crm/pilot/types";
import { Bezel, Eyebrow } from "./PilotPrimitives";
import { AnimatePresence, HeroTitle, MotionItem } from "./PilotMotion";
import { RosterPanel } from "./RosterPanel";
import type { RosterAthlete } from "@/lib/enterprise-crm/pilot/roster-shared";

export const MEDIA_KIND_LABEL: Record<AthleteMediaKind, string> = { highlight: "Highlight", image: "Image", archive: "Archive", business: "Business" };
const MEDIA_HINT: Record<AthleteMediaKind, string> = {
  highlight: "YouTube, Hudl or team video link",
  image: "Photo link from your archive or Getty",
  archive: "Program, article or scanned media link",
  business: "The player's company, brand or foundation",
};
const STEPS: Array<{ status: LaunchStatus; label: string }> = [
  { status: "requested", label: "Launched" },
  { status: "building", label: "BLTZ building" },
  { status: "invited", label: "Invite sent" },
  { status: "live", label: "Live" },
];

type MediaDraft = { key: number; kind: AthleteMediaKind; title: string; url: string; description: string; occurredOn: string };

function emptyMedia(key: number, kind: AthleteMediaKind = "highlight"): MediaDraft {
  return { key, kind, title: "", url: "", description: "", occurredOn: "" };
}

export function LaunchLocker({ organizationId, schoolName, players, initialLaunches, canManage, roster, intelligenceHref, preview = false }: {
  /** Every former player on record for the school, with Locker and invite status. */
  roster?: { state: "ready" | "unavailable"; athletes: RosterAthlete[] };
  intelligenceHref?: string;
  organizationId: string;
  schoolName: string;
  players: PilotPlayer[];
  initialLaunches: PilotLaunch[];
  canManage: boolean;
  preview?: boolean;
}) {
  const [launches, setLaunches] = useState(initialLaunches);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [years, setYears] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(`Your ${schoolName} Locker is ready to claim. It brings your career, highlights and what you're building today into one place fans can visit.`);
  const [media, setMedia] = useState<MediaDraft[]>([emptyMedia(1), emptyMedia(2, "business")]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launched, setLaunched] = useState<string | null>(null);
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);
  const selected = sortedPlayers.find((player) => player.id === playerId) ?? null;

  function patchMedia(key: number, patch: Partial<MediaDraft>) {
    setMedia((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const playerName = mode === "existing" ? selected?.name ?? "" : name.trim();
    if (playerName.length < 2) { setError("Choose a player or enter their name."); return; }
    const filled = media.filter((item) => item.title.trim());
    if (filled.some((item) => item.url.trim() && !item.url.trim().startsWith("https://"))) { setError("Media links must start with https://"); return; }
    const body = {
      playerId: mode === "existing" ? selected?.id ?? null : null,
      playerName,
      position: mode === "new" ? position.trim() || null : selected?.position ?? null,
      years: mode === "new" ? years.trim() || null : null,
      contactEmail: email.trim() || null,
      message: message.trim() || null,
      media: filled.map((item) => ({ kind: item.kind, title: item.title.trim(), url: item.url.trim() || null, description: item.description.trim() || null, occurredOn: item.occurredOn || null })),
    };
    setBusy(true);
    try {
      let launch: PilotLaunch;
      if (preview) {
        const now = new Date().toISOString();
        launch = { id: `preview-${Date.now()}`, playerId: body.playerId, playerName, position: body.position, years: body.years, contactEmail: body.contactEmail, message: body.message, status: "requested", statusNote: null, createdAt: now,
          media: body.media.map((item, index) => ({ id: `pm-${Date.now()}-${index}`, playerId: body.playerId, launchId: null, activationId: null, kind: item.kind, title: item.title, url: item.url, description: item.description, occurredOn: item.occurredOn, reviewStatus: "pending", createdAt: now, source: "link", thumbUrl: null })) };
      } else {
        const response = await fetch(`/api/organization/${organizationId}/launches`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.state ?? "failed");
        launch = payload.launch as PilotLaunch;
      }
      setLaunches((current) => [launch, ...current]);
      setLaunched(playerName);
      setName(""); setPosition(""); setYears(""); setEmail(""); setPlayerId("");
      setMedia([emptyMedia(Date.now()), emptyMedia(Date.now() + 1, "business")]);
    } catch {
      setError("The launch could not be sent. Check the details and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pilot-page">
      {preview ? <p className="pilot-preview-note">Fictional preview · launches are not saved</p> : null}
      <header className="pilot-hero pilot-hero--compact">
        <Eyebrow>{schoolName}</Eyebrow>
        <HeroTitle text="Bring a legend home." />
        <p className="pilot-hero__lede">Add their highlights, archive media and what they&apos;re building now. BLTZ builds the Locker, clears the media and sends them the invite to claim it.</p>
      </header>

      {roster && intelligenceHref && canManage ? <RosterPanel organizationId={organizationId} initial={roster.athletes} unavailable={roster.state === "unavailable"} intelligenceHref={intelligenceHref} preview={preview} /> : null}

      {launched ? (
        <Bezel label="Launched" index={1} coreClassName="pilot-launched">
          <span className="pilot-launched__icon" aria-hidden><IconRocket stroke={1.25} /></span>
          <div><strong>{launched}&apos;s Locker is launched.</strong><span>BLTZ is building it now. You&apos;ll see each step below, and their businesses and dated media will start showing up as signals.</span></div>
          <button type="button" className="pilot-pill pilot-pill--ghost" onClick={() => setLaunched(null)}><span>Launch another</span><span className="pilot-pill__icon" aria-hidden><IconPlus stroke={1.5} /></span></button>
        </Bezel>
      ) : canManage ? (
        <form onSubmit={submit} className="pilot-launch-form">
          <Bezel label="Who" index={1}>
            <div className="pilot-card-head"><div><span className="pilot-step">1</span><h2>Who are you launching?</h2></div></div>
            <div className="pilot-kind-picker" role="radiogroup" aria-label="Player">
              <button type="button" role="radio" aria-checked={mode === "new"} className={cn("pilot-chip", mode === "new" && "pilot-chip--on")} onClick={() => setMode("new")}>New to BLTZ</button>
              <button type="button" role="radio" aria-checked={mode === "existing"} className={cn("pilot-chip", mode === "existing" && "pilot-chip--on")} onClick={() => setMode("existing")} disabled={!players.length}>Already has a Locker</button>
            </div>
            {mode === "new" ? (
              <div className="pilot-field-row">
                <label className="pilot-field pilot-field--wide">Full name<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Marcus Hale" /></label>
                <label className="pilot-field">Position<input maxLength={40} value={position} onChange={(event) => setPosition(event.target.value)} placeholder="WR" /></label>
                <label className="pilot-field">Years at {schoolName.split(" ")[0]}<input maxLength={40} value={years} onChange={(event) => setYears(event.target.value)} placeholder="2012–15" /></label>
              </div>
            ) : (
              <label className="pilot-field">Former player<select value={playerId} onChange={(event) => setPlayerId(event.target.value)} required><option value="">Choose a player</option>{sortedPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}{player.position ? ` · ${player.position}` : ""}</option>)}</select></label>
            )}
          </Bezel>

          <Bezel label="Media and businesses" index={2}>
            <div className="pilot-card-head">
              <div><span className="pilot-step">2</span><h2>Media and businesses</h2><p>Links only for now. Add a date to get an anniversary signal.</p></div>
              <button type="button" className="pilot-icon-pill" aria-label="Add another item" onClick={() => setMedia((current) => [...current, emptyMedia(Date.now())])} disabled={media.length >= 20}><IconPlus stroke={1.5} aria-hidden /></button>
            </div>
            <ul className="pilot-media-drafts">
              {media.map((item) => (
                <li key={item.key}>
                  <div className="pilot-kind-picker" role="radiogroup" aria-label="Media type">
                    {ATHLETE_MEDIA_KINDS.map((kind) => <button key={kind} type="button" role="radio" aria-checked={item.kind === kind} className={cn("pilot-chip", item.kind === kind && "pilot-chip--on")} onClick={() => patchMedia(item.key, { kind })}>{MEDIA_KIND_LABEL[kind]}</button>)}
                    <button type="button" className="pilot-icon-pill pilot-icon-pill--quiet" aria-label="Remove item" onClick={() => setMedia((current) => current.filter((row) => row.key !== item.key))}><IconTrash stroke={1.5} aria-hidden /></button>
                  </div>
                  <div className="pilot-field-row">
                    <label className="pilot-field pilot-field--wide">{item.kind === "business" ? "Business name" : "Title"}<input maxLength={200} value={item.title} onChange={(event) => patchMedia(item.key, { title: event.target.value })} placeholder={item.kind === "business" ? "Hale Performance Training" : "2015 conference title highlights"} /></label>
                    <label className="pilot-field">{item.kind === "business" ? "Founded" : "Date"}<input type="date" value={item.occurredOn} onChange={(event) => patchMedia(item.key, { occurredOn: event.target.value })} /></label>
                  </div>
                  <label className="pilot-field">Link<input type="url" inputMode="url" maxLength={2048} value={item.url} onChange={(event) => patchMedia(item.key, { url: event.target.value })} placeholder={`https:// · ${MEDIA_HINT[item.kind]}`} /></label>
                  {item.kind === "business" ? <label className="pilot-field">What they do<input maxLength={1000} value={item.description} onChange={(event) => patchMedia(item.key, { description: event.target.value })} placeholder="Speed and strength training for youth athletes" /></label> : null}
                </li>
              ))}
            </ul>
          </Bezel>

          <Bezel label="Invite" index={3}>
            <div className="pilot-card-head"><div><span className="pilot-step">3</span><h2>Invite</h2><p>BLTZ sends this with the claim link once the Locker is ready.</p></div></div>
            <label className="pilot-field">Player&apos;s email<input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Optional · BLTZ can find it if you don't have it" /></label>
            <label className="pilot-field">Note from {schoolName.split(" ")[0]}<textarea rows={3} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
            {error ? <p className="pilot-error" role="alert">{error}</p> : null}
            <div className="pilot-launch-actions">
              <button type="submit" className="pilot-pill pilot-pill--primary pilot-pill--launch" disabled={busy}>
                <span>{busy ? "Launching" : "Launch Locker"}</span><span className="pilot-pill__icon" aria-hidden><IconRocket stroke={1.5} /></span>
              </button>
            </div>
          </Bezel>
        </form>
      ) : (
        <Bezel label="Launch unavailable" index={1}><p className="pilot-quiet">Ask your BLTZ contact to turn on launching for your account.</p></Bezel>
      )}

      <Bezel label="Launched Lockers" index={4}>
        <div className="pilot-card-head"><div><h2>Launched Lockers</h2><p>Where each launch stands</p></div><span className="pilot-count pilot-count--muted">{launches.length}</span></div>
        {launches.length === 0 ? <p className="pilot-quiet">Nothing launched yet.</p> : (
          <ul className="pilot-launches"><AnimatePresence initial={false}>
            {launches.map((launch) => {
              const reached = STEPS.findIndex((step) => step.status === launch.status);
              return (
                <MotionItem key={launch.id}>
                  <div className="pilot-launches__head">
                    <div><strong>{launch.playerName}</strong><small>{[launch.position, launch.years].filter(Boolean).join(" · ") || "Former player"} · launched {new Date(launch.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></div>
                    {launch.status === "live" && launch.playerId ? <a className="pilot-pill pilot-pill--ghost" href={`/organization/${organizationId}/intelligence/${launch.playerId}`}><span>Open</span><span className="pilot-pill__icon" aria-hidden><IconArrowUpRight stroke={1.5} /></span></a> : null}
                  </div>
                  {launch.status === "declined" ? <p className="pilot-quiet">BLTZ couldn&apos;t build this one{launch.statusNote ? `: ${launch.statusNote}` : "."}</p> : (
                    <ol className="pilot-progress" aria-label="Launch progress">
                      {STEPS.map((step, index) => <li key={step.status} className={cn(index <= reached && "pilot-progress--done", index === reached && "pilot-progress--current")}>{index < reached ? <IconCheck stroke={2} aria-hidden /> : <span aria-hidden />}{step.label}</li>)}
                    </ol>
                  )}
                  {launch.media.length ? <p className="pilot-launches__media">{launch.media.map((item) => `${MEDIA_KIND_LABEL[item.kind]}: ${item.title}`).join(" · ")}</p> : null}
                </MotionItem>
              );
            })}
          </AnimatePresence></ul>
        )}
      </Bezel>
    </div>
  );
}
