"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { motion } from "motion/react";
import {
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandX,
  IconBrandFacebook,
  IconCheck,
  IconExternalLink,
  IconMicrophone,
  IconShare,
  IconUser,
  IconNews,
  IconPhoto,
  IconVideo,
  IconLink,
  IconMail,
  IconPlus,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { VERDICT_LABEL, whenLabel } from "@/lib/intelligence/signal-copy";
import {
  ACTIVATION_CHANNELS,
  ACTIVATION_KINDS,
  mediaSignals,
  type AthleteMediaKind,
  type PilotAthleteMedia,
  type PilotPlayer,
  SOCIAL_PLATFORMS,
  summarizeReach,
  type ActivationChannel,
  type ActivationKind,
  type AthleteFile,
  type PilotActivation,
  type PilotSocialReach,
  type SocialPlatformKey,
} from "@/lib/enterprise-crm/pilot/types";
import { Bezel, Eyebrow, LockerButton, Portrait, WhenChip } from "./PilotPrimitives";
import { CopyLockerLink } from "./CopyLockerLink";

import { AthleteAvatars } from "./AthleteAvatars";
import { MediaAttach, MediaThumb, mediaPayload, type PendingMedia } from "./MediaAttach";
import { gettyAssetFromLink } from "@/lib/getty/link";
import { PlayerColumn } from "./PlayerColumn";
import { SignalSuggestions } from "./SignalSuggestions";
import { MomentTimeline } from "./MomentTimeline";
import { AddSignal } from "./AddSignal";
import { toFileSignal, type SchoolSignal } from "@/lib/enterprise-crm/pilot/school-signals-shared";
import { ShareActivation } from "./ShareActivation";
import type { IntegrationStatus } from "@/lib/enterprise-crm/pilot/integrations-shared";
import { backingFor, reachHistory, type Backing, type ReachHistory } from "@/lib/enterprise-crm/pilot/suggestions";
import { AnimatePresence, HeroTitle, MotionItem } from "./PilotMotion";

const KIND_LABEL: Record<ActivationKind, string> = { post: "Social post", video: "Video", article: "Article", campaign: "Campaign", event: "Event" };
const CHANNEL_LABEL: Record<ActivationChannel, string> = { instagram: "Instagram", x: "X", facebook: "Facebook", linkedin: "LinkedIn", tiktok: "TikTok", youtube: "YouTube", email: "Email", website: "Website", in_person: "In person", other: "Other" };
const SIDE_LIMIT = 4;
type FolderTab = "intelligence" | "moments" | "opportunities";
const FOLDER_TABS: Array<{ id: FolderTab; label: string }> = [
  { id: "intelligence", label: "Intelligence" },
  { id: "moments", label: "Moments" },
  { id: "opportunities", label: "Opportunities" },
];
const PLATFORM_ICON: Partial<Record<string, typeof IconBrandX>> = { instagram: IconBrandInstagram, x: IconBrandX, facebook: IconBrandFacebook, linkedin: IconBrandLinkedin };

export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

type Draft = { kind: ActivationKind; title: string; brief: string; dueOn: string; signalKey: string | null; momentId: string | null; additionalPlayerIds?: string[]; media?: PendingMedia[] };

async function send<T>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const response = await fetch(url, { method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.state === "string" ? payload.state : "failed");
  return payload as T;
}

/**
 * The school's Intelligence workspace: players on the left, the selected
 * player's file in the center, and signals, activations and reach on the right.
 */
export function AthleteIntelligence({ organizationId, schoolName, file, roster = [], contactEmail = null, initialActivations, initialReach, initialMedia = [], initialSchoolSignals = [], schoolHistory, connections = [], canManage, profileBaseHref, preview = false }: {
  organizationId: string;
  schoolName: string;
  file: AthleteFile;
  roster?: PilotPlayer[];
  contactEmail?: string | null;
  initialActivations: PilotActivation[];
  initialReach: PilotSocialReach[];
  initialMedia?: PilotAthleteMedia[];
  /** Reach of every posted activation at the school, by kind; falls back to this athlete's own. */
  schoolHistory?: ReachHistory;
  /** Signals the school added itself for this player. */
  initialSchoolSignals?: SchoolSignal[];
  /** Tools connected in Settings, so Share can send directly. */
  connections?: IntegrationStatus[];
  canManage: boolean;
  profileBaseHref: string;
  preview?: boolean;
}) {
  const [activations, setActivations] = useState(initialActivations);
  const [reach, setReach] = useState(initialReach);
  const [media, setMedia] = useState(initialMedia);
  // Engine signals plus anniversaries of what the school connected, soonest first.
  const [schoolSignals, setSchoolSignals] = useState(initialSchoolSignals);
  const signals = [...file.signals, ...mediaSignals(media), ...schoolSignals.flatMap((row) => toFileSignal(row) ?? [])].sort((a, b) => a.daysUntil - b.daysUntil);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialActivations[0]?.id ?? null);
  const [focusedSignal, setFocusedSignal] = useState<string | null>(null);
  const [tab, setTab] = useState<FolderTab>("intelligence");
  const [showAll, setShowAll] = useState({ signals: false, activations: false });
  const selected = activations.find((row) => row.id === selectedId) ?? activations[0] ?? null;
  const api = `/api/organization/${organizationId}`;
  const { player } = file;
  const totals = summarizeReach(activations);
  const followers = reach.reduce((sum, row) => sum + row.followers, 0);
  const history = schoolHistory ?? reachHistory(activations);

  function upsert(next: PilotActivation) {
    setActivations((current) => {
      const existing = current.find((row) => row.id === next.id);
      return existing ? current.map((row) => row.id === next.id ? { ...next, visits: row.visits, playerName: row.playerName } : row) : [next, ...current];
    });
    setSelectedId(next.id);
  }

  /** Opens a folder tab, then brings the requested item into view once the tab has swapped in. */
  function reveal(target: FolderTab, id: string) {
    const delay = tab === target ? 0 : 320;
    setTab(target);
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }), delay);
  }

  function showSignal(key: string) {
    setFocusedSignal(key);
    reveal("intelligence", `signal-${key}`);
    window.setTimeout(() => setFocusedSignal((current) => current === key ? null : current), 2200);
  }

  function showActivation(id: string) {
    setSelectedId(id);
    reveal("opportunities", "activation-detail");
  }

  async function createActivation(value: Draft) {
    setError(null);
    const additionalPlayerIds = (value.additionalPlayerIds ?? []).filter((id) => id !== player.id);
    const attached = value.media ?? [];
    const body = { playerId: player.id, kind: value.kind, title: value.title, brief: value.brief || null, dueOn: value.dueOn || null, signalKey: value.signalKey, momentId: value.momentId, additionalPlayerIds, media: attached.map(mediaPayload) };
    if (preview) {
      const id = `preview-${Date.now()}`;
      const athletes = [player, ...roster.filter((row) => additionalPlayerIds.includes(row.id))].map((row) => ({ id: row.id, name: row.name, portraitUrl: row.portraitUrl }));
      const now = new Date().toISOString();
      const media = attached.map((item): PilotAthleteMedia => ({ id: item.key, playerId: player.id, launchId: null, activationId: id, kind: item.kind, title: item.title, url: item.url, description: null, occurredOn: null, reviewStatus: "pending", createdAt: now, source: item.source, thumbUrl: item.localPreview ?? item.thumbUrl }));
      upsert({ id, playerId: player.id, playerName: player.name, athletes, media, kind: value.kind, title: value.title, brief: value.brief || null, signalKey: value.signalKey, momentId: value.momentId, dueOn: value.dueOn || null, status: "planned", channel: null, postUrl: null, postedAt: null, impressions: null, engagements: null, visits: 0, trackedHref: player.lockerHref, createdAt: new Date().toISOString() });
    } else {
      try { upsert((await send<{ activation: PilotActivation }>(`${api}/activations`, "POST", body)).activation); }
      catch { setError("The activation could not be saved. Try again."); return; }
    }
    setDraft(null);
  }

  async function updateActivation(id: string, patch: Partial<Pick<PilotActivation, "status" | "channel" | "postUrl" | "impressions" | "engagements">>) {
    setError(null);
    const current = activations.find((row) => row.id === id);
    if (!current) return;
    if (preview) { upsert({ ...current, ...patch, postedAt: patch.status === "posted" ? new Date().toISOString() : current.postedAt }); return; }
    try { upsert((await send<{ activation: PilotActivation }>(`${api}/activations/${id}`, "PATCH", patch)).activation); }
    catch { setError("That update could not be saved. Check the link starts with https:// and try again."); }
  }

  async function addMedia(item: NewMedia) {
    setError(null);
    const { localPreview, ...fields } = item;
    const next: PilotAthleteMedia | null = preview
      ? { id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, momentId: fields.momentId ?? null, storagePath: fields.storagePath ?? null, playerId: player.id, launchId: null, activationId: null, kind: fields.kind, title: fields.title, url: fields.url, description: fields.description, occurredOn: fields.occurredOn, reviewStatus: "pending", createdAt: new Date().toISOString(), source: fields.source ?? "link", thumbUrl: localPreview ?? fields.thumbUrl ?? null }
      : await send<{ media: PilotAthleteMedia }>(`${api}/athlete-media`, "POST", { playerId: player.id, ...fields }).then((result) => result.media).catch(() => null);
    if (!next) { setError("That item could not be saved. Links must start with https://"); return false; }
    setMedia((current) => [next, ...current]);
    return true;
  }

  /** Ties a school media item to a Moment (or unties it with null). */
  async function linkMedia(mediaId: string, momentId: string | null) {
    setError(null);
    const ok = preview ? true : await send(`${api}/athlete-media/${mediaId}`, "PATCH", { momentId }).then(() => true).catch(() => false);
    if (!ok) { setError("That media could not be updated."); return false; }
    setMedia((current) => current.map((item) => item.id === mediaId ? { ...item, momentId } : item));
    return true;
  }

  /** The Moment's own media, ready to attach to a new activation. */
  function momentDraftMedia(momentId: string): PendingMedia[] {
    return media.filter((item) => item.momentId === momentId).flatMap((item) => {
      const externalId = item.source === "getty" && item.url ? gettyAssetFromLink(item.url)?.id ?? null : null;
      if ((item.source === "getty" && !externalId) || (item.source === "upload" && !item.storagePath)) return [];
      return [{ key: item.id, kind: item.kind, title: item.title, url: item.source === "upload" ? null : item.url, source: item.source, storagePath: item.source === "upload" ? item.storagePath ?? null : null, thumbUrl: item.thumbUrl, externalId }];
    });
  }

  async function recordReach(platform: SocialPlatformKey, followersCount: number, handle: string) {
    setError(null);
    const body = { playerId: player.id, platform, followers: followersCount, handle: handle || null };
    const next = preview
      ? { platform, handle: handle || null, followers: followersCount, recordedAt: new Date().toISOString() }
      : await send<{ reach: PilotSocialReach }>(`${api}/social-reach`, "POST", body).then((result) => result.reach).catch(() => null);
    if (!next) { setError("The follower count could not be saved."); return; }
    setReach((current) => [next, ...current.filter((row) => row.platform !== platform)].sort((a, b) => b.followers - a.followers));
  }

  const firstName = player.name.split(" ")[0];
  const posted = activations.filter((row) => row.status === "posted");
  const maxReach = Math.max(1, ...posted.map((row) => row.impressions ?? 0));

  return (
    <div className="pilot-intel">
      {preview ? <p className="pilot-preview-note">Fictional preview · sample data, changes are not saved</p> : null}
      <header className="pilot-intel__head">
        <Eyebrow>{schoolName}</Eyebrow>
        <h1>Intelligence Engine</h1>
      </header>

      <div className="pilot-intel__grid">
        <PlayerColumn players={roster.length ? roster : [player]} currentId={player.id} baseHref={profileBaseHref} />

        <main className="pilot-intel__center" aria-label={`${player.name} intelligence file`}>
          <Bezel label="Player" as="div" coreClassName="pilot-id">
            <div className="pilot-id__photo">
              {/* eslint-disable-next-line @next/next/no-img-element -- headshots come from approved Locker hosts */}
              {player.portraitUrl ? <img src={player.portraitUrl} alt={player.name} /> : <span aria-hidden>{player.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>}
            </div>
            <div className="pilot-id__copy">
              <HeroTitle text={player.name} />
              <p>{[player.position, player.team].filter(Boolean).join(" · ") || "Former player"}</p>
              <dl className="pilot-id__contact">
                <div><dt><IconMail stroke={1.5} aria-hidden />Email</dt><dd>{contactEmail ? <a href={`mailto:${contactEmail}`}>{contactEmail}</a> : <span>Not on file</span>}</dd></div>
                <div><dt><IconLink stroke={1.5} aria-hidden />Locker</dt><dd><a href={player.lockerHref} target="_blank" rel="noopener">{player.lockerHref.replace("/player/", "bltz.me/")}</a></dd></div>
                <div><dt><IconUsers stroke={1.5} aria-hidden />Socials</dt><dd className="pilot-id__socials">
                  {file.socialLinks.length || reach.length ? <>
                    {file.socialLinks.map((link) => {
                      const Icon = PLATFORM_ICON[link.platform.toLowerCase()];
                      const count = reach.find((row) => row.platform === link.platform.toLowerCase());
                      return <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{Icon ? <Icon stroke={1.5} aria-hidden /> : null}{link.handle || link.platform}{count ? <b>{formatCount(count.followers)}</b> : null}</a>;
                    })}
                    {reach.filter((row) => !file.socialLinks.some((link) => link.platform.toLowerCase() === row.platform)).map((row) => {
                      const Icon = PLATFORM_ICON[row.platform];
                      return <span key={row.platform}>{Icon ? <Icon stroke={1.5} aria-hidden /> : null}{row.handle ?? CHANNEL_LABEL[row.platform]}<b>{formatCount(row.followers)}</b></span>;
                    })}
                  </> : <span className="pilot-quiet">None recorded</span>}
                </dd></div>
              </dl>
              <div className="pilot-id__actions">
                <CopyLockerLink href={player.lockerHref} name={player.name} />
                <LockerButton href={player.lockerHref} />
              </div>
            </div>
          </Bezel>

          {error ? <p className="pilot-error" role="alert">{error}</p> : null}

          <section className="pilot-folder" aria-label="Player file">
            <div className="pilot-folder__tabs" role="tablist" aria-label="Player file sections" onKeyDown={(event) => {
              const index = FOLDER_TABS.findIndex((item) => item.id === tab);
              const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
              if (!step) return;
              event.preventDefault();
              const next = FOLDER_TABS[(index + step + FOLDER_TABS.length) % FOLDER_TABS.length].id;
              setTab(next);
              document.getElementById(`folder-tab-${next}`)?.focus();
            }}>
              {FOLDER_TABS.map((item) => {
                const count = item.id === "intelligence" ? signals.length : item.id === "moments" ? file.moments.length : file.opportunities.length + activations.length;
                return (
                  <button key={item.id} id={`folder-tab-${item.id}`} type="button" role="tab" aria-selected={tab === item.id} aria-controls="folder-panel" tabIndex={tab === item.id ? 0 : -1} className="pilot-folder__tab" onClick={() => setTab(item.id)}>
                    {tab === item.id ? <motion.span layoutId="pilot-folder-tab" className="pilot-folder__tab-bg" transition={{ type: "spring", stiffness: 420, damping: 36 }} /> : null}
                    <span className="pilot-folder__tab-label">{item.label}</span>
                    <span className="pilot-folder__tab-count">{count}</span>
                  </button>
                );
              })}
            </div>
            <div id="folder-panel" className="pilot-folder__body" role="tabpanel" aria-labelledby={`folder-tab-${tab}`}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} className="pilot-folder__page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}>
                  {tab === "intelligence" ? (
                    <section aria-label="Intelligence">
                      <div className="pilot-card-head"><div><h2>Intelligence</h2><p>Dated reasons to feature {firstName}, soonest first</p></div></div>
                      {file.state === "incomplete" ? <p className="pilot-quiet">Signals appear once BLTZ finishes verifying this career.</p>
                        : signals.length === 0 ? <p className="pilot-quiet">No dated moments on file yet.</p>
                        : <ul className="pilot-signals">{signals.map((signal) => {
                          const planned = activations.some((row) => row.signalKey === signal.key && row.status !== "cancelled");
                          return (
                            <li key={signal.key} id={`signal-${signal.key}`} className={cn("pilot-signal", `pilot-signal--${signal.verdict}`, focusedSignal === signal.key && "pilot-signal--focus")}>
                              <div className="pilot-signal__top"><span className="pilot-signal__chips"><WhenChip daysUntil={signal.daysUntil} verdict={signal.verdict} />{signal.key.startsWith("school:") ? <span className="pilot-signal__mine">Added by your staff</span> : null}</span><span className="pilot-signal__verdict">{VERDICT_LABEL[signal.verdict]}</span></div>
                              <strong>{signal.headline}</strong>
                              <div className="pilot-signal__meta">
                                <span><i style={{ "--pilot-meter": `${signal.priority}%` } as CSSProperties} />Priority {signal.priority}</span>
                                <span><i style={{ "--pilot-meter": `${Math.round(signal.confidence * 100)}%` } as CSSProperties} />Confidence {Math.round(signal.confidence * 100)}%</span>
                                <span>{signal.sources} source{signal.sources === 1 ? "" : "s"}</span>
                              </div>
                              <SignalSuggestions signal={signal} playerName={player.name} momentTitle={file.moments.find((moment) => moment.id === signal.momentId)?.title ?? null} media={media} hasContact={Boolean(contactEmail)} followers={followers} history={history} canManage={canManage} planned={planned}
                                onPlan={(idea) => setDraft({ kind: idea.kind, title: idea.title, brief: idea.brief, dueOn: signal.targetDate, signalKey: signal.key, momentId: signal.momentId })}
                                onPlanManual={() => setDraft({ kind: "post", title: signal.headline, brief: "", dueOn: signal.targetDate, signalKey: signal.key, momentId: signal.momentId })} />
                            </li>
                          );
                        })}</ul>}
                    </section>
                  ) : null}

                  {tab === "moments" ? (
                    <>
                      <section aria-label="Moments">
                        <div className="pilot-card-head"><div><h2>Moments</h2><p>Verified, sourced events that drive the signals</p></div></div>
                        {file.moments.length ? <MomentTimeline file={file} activations={activations} media={media} organizationId={organizationId} preview={preview} canManage={canManage} onShowActivation={showActivation}
                          onAddMedia={({ key: _key, momentId, ...item }) => addMedia({ ...item, momentId, description: null, occurredOn: null })} onLinkMedia={linkMedia}
                          onPlan={(moment) => { const signal = file.signals.find((row) => row.momentId === moment.id); setDraft({ kind: "post", title: moment.title, brief: "", dueOn: signal?.targetDate ?? "", signalKey: signal?.key ?? null, momentId: moment.id, media: momentDraftMedia(moment.id) }); }} />
                          : <p className="pilot-quiet">No career moments recorded yet.</p>}
                        {file.seasons.length ? <details className="pilot-seasons-toggle"><summary>Season statistics ({file.seasons.length})</summary><ul className="pilot-seasons">{file.seasons.map((row) => <li key={row.id}><strong>{row.season}</strong><span>{row.team ?? ""}</span><em>{row.line}</em></li>)}</ul></details> : null}
                      </section>
                      <section aria-label="From your school" className="pilot-folder__section">
                        <div className="pilot-card-head"><div><h2>From your school</h2><p>Video, images and publications your staff connected. BLTZ clears media before it appears on the Locker; dated items become signals.</p></div></div>
                        <SchoolMediaHub media={media} canManage={canManage} organizationId={organizationId} playerId={player.id} athleteName={player.name} preview={preview} onSave={addMedia} />
                      </section>
                    </>
                  ) : null}

                  {tab === "opportunities" ? (
                    <>
                      <section aria-label="Suggested opportunities">
                        <div className="pilot-card-head"><div><h2>Suggested opportunities</h2><p>Plays worth running in the next 90 days</p></div></div>
                        {file.opportunities.length ? <ul className="pilot-opps-list">{file.opportunities.map((opportunity) => {
                          const signal = signals.find((row) => opportunity.signalKeys.includes(row.key));
                          return (
                            <li key={opportunity.key}>
                              <div><strong>{opportunity.label}</strong><span>{opportunity.explanation}</span></div>
                              {canManage && signal ? <button type="button" className="pilot-icon-pill" aria-label={`Plan ${opportunity.label}`} onClick={() => setDraft({ kind: "campaign", title: `${opportunity.label}: ${player.name}`, brief: opportunity.explanation, dueOn: signal.targetDate, signalKey: signal.key, momentId: signal.momentId })}><IconPlus stroke={1.5} aria-hidden /></button> : null}
                            </li>
                          );
                        })}</ul> : <p className="pilot-quiet">No opportunities in the next 90 days.</p>}
                      </section>
                      <section aria-label="Activation detail" className="pilot-folder__section">
                        <div id="activation-detail" className="pilot-card-head">
                          <div><h2>Activations</h2><p>{selected ? "The selected activation in detail. Pick another from the list on the right." : "Plan one from a signal, then share its tracked link to measure fan visits."}</p></div>
                          {canManage ? <button type="button" className="pilot-icon-pill" aria-label="Plan a new activation" onClick={() => setDraft({ kind: "post", title: "", brief: "", dueOn: "", signalKey: null, momentId: null })}><IconPlus stroke={1.5} aria-hidden /></button> : null}
                        </div>
                        {selected ? <ul className="pilot-activations"><AnimatePresence mode="popLayout" initial={false}><ActivationRow key={selected.id} row={selected} canManage={canManage} detailed profileBaseHref={profileBaseHref} schoolName={schoolName}
                          share={{ organizationId, connections, preview, settingsHref: `${profileBaseHref.replace(/\/intelligence$/, "")}/settings` }} onUpdate={(patch) => updateActivation(selected.id, patch)} /></AnimatePresence></ul> : null}
                      </section>
                    </>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>
          </section>
        </main>

        <aside className="pilot-intel__right" aria-label="Signals, activations and analytics">
          <Bezel label="Signals list">
            <div className="pilot-card-head"><div><h2>Signals</h2></div><span className="pilot-signals-head"><span className="pilot-count pilot-count--muted">{signals.length}</span>{canManage ? <AddSignal compact organizationId={organizationId} players={roster.length ? roster : [player]} defaultPlayerId={player.id} profileBaseHref={profileBaseHref} preview={preview} onSaved={(signal) => { if (signal.playerId === player.id) { setSchoolSignals((current) => [...current, signal]); window.setTimeout(() => showSignal(`school:${signal.id}`), 400); } }} /> : null}</span></div>
            {signals.length ? <ul className="pilot-side-list">{(showAll.signals ? signals : signals.slice(0, SIDE_LIMIT)).map((signal) => (
              <li key={signal.key}><button type="button" onClick={() => showSignal(signal.key)}>
                <span className={cn("pilot-side-list__dot", `pilot-side-list__dot--${signal.verdict}`)} aria-hidden />
                <span><strong>{signal.headline}</strong><small>{VERDICT_LABEL[signal.verdict]} · {whenLabel(signal.daysUntil)}</small></span>
              </button></li>
            ))}</ul> : <p className="pilot-quiet">Nothing dated yet.</p>}
            {signals.length > SIDE_LIMIT ? <button type="button" className="pilot-side-more" onClick={() => setShowAll((current) => ({ ...current, signals: !current.signals }))}>{showAll.signals ? "Show fewer" : `Show all ${signals.length}`}</button> : null}
          </Bezel>

          <Bezel label="Activations list">
            <div className="pilot-card-head">
              <div><h2>Activations</h2></div>
              {canManage ? <button type="button" className="pilot-icon-pill" aria-label="New activation" onClick={() => setDraft({ kind: "post", title: "", brief: "", dueOn: "", signalKey: null, momentId: null })}><IconPlus stroke={1.5} aria-hidden /></button> : null}
            </div>
            {activations.length ? <ul className="pilot-side-list"><AnimatePresence initial={false}>{(showAll.activations ? activations : activations.slice(0, SIDE_LIMIT)).map((row) => (
              <MotionItem key={row.id}><button type="button" aria-pressed={selected?.id === row.id} onClick={() => showActivation(row.id)}>
                <span className={cn("pilot-side-list__dot", `pilot-side-list__dot--${row.status}`)} aria-hidden />
                <span><strong>{row.title}</strong><small>{KIND_LABEL[row.kind]} · {row.status === "posted" ? `${row.impressions === null ? "—" : formatCount(row.impressions)} reach` : row.status === "planned" ? "Planned" : "Cancelled"}</small></span>
              </button></MotionItem>
            ))}</AnimatePresence></ul> : <p className="pilot-quiet">Nothing planned yet.</p>}
            {activations.length > SIDE_LIMIT ? <button type="button" className="pilot-side-more" onClick={() => setShowAll((current) => ({ ...current, activations: !current.activations }))}>{showAll.activations ? "Show fewer" : `Show all ${activations.length}`}</button> : null}
          </Bezel>

          <Bezel label="Analytics">
            <div className="pilot-card-head"><div><h2>Analytics</h2><p>Reach of {firstName}&apos;s activations</p></div></div>
            <div className="pilot-analytics">
              <div><strong>{formatCount(totals.impressions)}</strong><span>Post reach</span></div>
              <div><strong>{formatCount(totals.engagements)}</strong><span>Engagements</span></div>
              <div><strong>{formatCount(totals.visits)}</strong><span>Locker visits</span></div>
              <div><strong>{followers ? formatCount(followers) : "—"}</strong><span>Followers</span></div>
            </div>
            {posted.length ? <ul className="pilot-bars" aria-label="Reach by activation">{[...posted].sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0)).slice(0, SIDE_LIMIT).map((row) => (
              <li key={row.id}><span>{row.title}</span><i style={{ "--pilot-bar": `${Math.round(((row.impressions ?? 0) / maxReach) * 100)}%` } as CSSProperties} /><b>{row.impressions === null ? "—" : formatCount(row.impressions)}</b></li>
            ))}</ul> : <p className="pilot-quiet">Reach appears here once an activation is posted.</p>}
            {canManage ? <details className="pilot-reach-toggle"><summary>Record followers</summary><ReachForm onSave={recordReach} /></details> : null}
          </Bezel>
        </aside>
      </div>

      {draft ? <ActivationComposer draft={draft} backing={draft.signalKey ? backingFor(file, draft.signalKey) : null} lead={player} others={roster.filter((row) => row.id !== player.id)} organizationId={organizationId} preview={preview} onClose={() => setDraft(null)} onSave={createActivation} /> : null}
    </div>
  );
}

function ActivationRow({ row, canManage, detailed = false, profileBaseHref, schoolName, share, onUpdate }: { row: PilotActivation; canManage: boolean; detailed?: boolean; profileBaseHref?: string; schoolName?: string; share?: { organizationId: string; connections: IntegrationStatus[]; preview: boolean; settingsHref: string }; onUpdate: (patch: Partial<PilotActivation>) => Promise<void> }) {
  const [mode, setMode] = useState<"idle" | "post" | "reach">("idle");
  const [sharing, setSharing] = useState(false);
  const [channel, setChannel] = useState<ActivationChannel>(row.channel ?? "instagram");
  const [postUrl, setPostUrl] = useState(row.postUrl ?? "");
  const [impressions, setImpressions] = useState(row.impressions?.toString() ?? "");
  const [engagements, setEngagements] = useState(row.engagements?.toString() ?? "");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent, patch: Partial<PilotActivation>) {
    event.preventDefault();
    setBusy(true);
    await onUpdate(patch);
    setBusy(false);
    setMode("idle");
  }
  const number = (value: string) => value.trim() === "" ? null : Math.max(0, Math.round(Number(value)));

  return (
    <MotionItem className={cn("pilot-activation", `pilot-activation--${row.status}`)}>
      <div className="pilot-activation__top">
        <span className="pilot-tag">{KIND_LABEL[row.kind]}</span>
        <span className={cn("pilot-status", `pilot-status--${row.status}`)}>{row.status === "posted" ? `Posted${row.channel ? ` · ${CHANNEL_LABEL[row.channel]}` : ""}` : row.status === "planned" ? row.dueOn ? `Planned · ${new Date(`${row.dueOn}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "Planned" : "Cancelled"}</span>
      </div>
      <strong>{row.title}</strong>
      {detailed && profileBaseHref && row.athletes.length > 1 ? <div className="pilot-activation__featuring"><span>Featuring</span><AthleteAvatars athletes={row.athletes} baseHref={profileBaseHref} max={8} /></div> : null}
      {detailed && row.brief ? <p className="pilot-activation__brief">{row.brief}</p> : null}
      {detailed && row.media.length ? <ul className="pilot-media-strip" aria-label="Attached media">{row.media.map((item) => <li key={item.id}>{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" title={item.title}><MediaThumb item={item} /></a> : <span title={item.title}><MediaThumb item={item} /></span>}<small>{item.reviewStatus === "approved" ? "Cleared" : "BLTZ review"}</small></li>)}</ul> : null}
      {detailed ? <p className="pilot-activation__meta">{row.dueOn ? `Due ${new Date(`${row.dueOn}T12:00:00Z`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}` : "No date set"}{row.postedAt ? ` · posted ${new Date(row.postedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}</p> : null}
      {row.status === "posted" ? (
        <div className="pilot-activation__reach">
          <span><b>{row.impressions === null ? "—" : formatCount(row.impressions)}</b> reach</span>
          <span><b>{row.engagements === null ? "—" : formatCount(row.engagements)}</b> engagements</span>
          <span><b>{formatCount(row.visits)}</b> Locker visits</span>
          {row.postUrl ? <a href={row.postUrl} target="_blank" rel="noopener noreferrer">View post</a> : null}
        </div>
      ) : null}
      {row.status !== "cancelled" ? (
        <div className="pilot-activation__actions">
          <CopyLockerLink href={row.trackedHref} name={`${row.title} (tracked link)`} label="Copy tracked link" />
          {detailed && schoolName && share ? <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => setSharing(true)}><IconShare stroke={1.5} aria-hidden />Share</button> : null}
          {canManage && row.status === "planned" ? <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => setMode(mode === "post" ? "idle" : "post")}>Mark posted</button> : null}
          {canManage && row.status === "posted" ? <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => setMode(mode === "reach" ? "idle" : "reach")}>Update reach</button> : null}
          {canManage && row.status === "planned" ? <button type="button" className="pilot-text-button" onClick={() => void onUpdate({ status: "cancelled" })}>Cancel</button> : null}
        </div>
      ) : null}
      {mode === "post" ? (
        <form className="pilot-inline-form" onSubmit={(event) => submit(event, { status: "posted", channel, postUrl: postUrl.trim() || null })}>
          <label>Where<select value={channel} onChange={(event) => setChannel(event.target.value as ActivationChannel)}>{ACTIVATION_CHANNELS.map((value) => <option key={value} value={value}>{CHANNEL_LABEL[value]}</option>)}</select></label>
          <label>Post link<input type="url" inputMode="url" placeholder="https://" value={postUrl} onChange={(event) => setPostUrl(event.target.value)} /></label>
          <button type="submit" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={busy}>Save</button>
        </form>
      ) : null}
      {mode === "reach" ? (
        <form className="pilot-inline-form" onSubmit={(event) => submit(event, { impressions: number(impressions), engagements: number(engagements) })}>
          <label>Reach<input type="number" min={0} inputMode="numeric" value={impressions} onChange={(event) => setImpressions(event.target.value)} /></label>
          <label>Engagements<input type="number" min={0} inputMode="numeric" value={engagements} onChange={(event) => setEngagements(event.target.value)} /></label>
          <button type="submit" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={busy}>Save</button>
        </form>
      ) : null}
      {sharing && schoolName && share ? <ShareActivation row={row} schoolName={schoolName} {...share} onClose={() => setSharing(false)} /> : null}
    </MotionItem>
  );
}

type NewMedia = { momentId?: string | null; kind: AthleteMediaKind; title: string; url: string | null; description: string | null; occurredOn: string | null; source?: "link" | "upload" | "getty"; storagePath?: string | null; thumbUrl?: string | null; externalId?: string | null; localPreview?: string | null };

type HubCategory = "videos" | "images" | "publications";
const HUB: Array<{ id: HubCategory; label: string; icon: typeof IconVideo; kinds: AthleteMediaKind[]; hint: string }> = [
  { id: "videos", label: "Videos", icon: IconVideo, kinds: ["highlight"], hint: "Highlights and game film" },
  { id: "images", label: "Images", icon: IconPhoto, kinds: ["image"], hint: "Photos from your archive or Getty" },
  { id: "publications", label: "Publications", icon: IconNews, kinds: ["archive", "business"], hint: "Articles, programs and the player's businesses" },
];

/** Videos, Images and Publications as three large tiles; the chosen one opens below with its items and add controls. */
function SchoolMediaHub({ media, canManage, organizationId, playerId, athleteName, preview, onSave }: { media: PilotAthleteMedia[]; canManage: boolean; organizationId: string; playerId: string; athleteName: string; preview: boolean; onSave: (item: NewMedia) => Promise<boolean> }) {
  const counts = Object.fromEntries(HUB.map((item) => [item.id, media.filter((row) => item.kinds.includes(row.kind)).length])) as Record<HubCategory, number>;
  const [open, setOpen] = useState<HubCategory>(() => HUB.reduce((best, item) => counts[item.id] > counts[best.id] ? item : best, HUB[0]).id);
  const category = HUB.find((item) => item.id === open)!;
  const items = media.filter((row) => category.kinds.includes(row.kind));
  return (
    <div className="pilot-hub">
      <div className="pilot-hub__tiles" role="tablist" aria-label="School media type">
        {HUB.map(({ id, label, icon: Icon, hint }) => (
          <button key={id} type="button" role="tab" aria-selected={open === id} className="pilot-hub__tile" onClick={() => setOpen(id)}>
            {open === id ? <motion.span layoutId="pilot-hub-tile" className="pilot-hub__tile-bg" transition={{ type: "spring", stiffness: 380, damping: 32 }} /> : null}
            <span className="pilot-hub__icon"><Icon stroke={1.25} aria-hidden /></span>
            <strong>{label}</strong>
            <small>{hint}</small>
            <em>{counts[id]}</em>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={open} role="tabpanel" aria-label={category.label} className="pilot-hub__panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
          {items.length ? (
            <ul className="pilot-school-media"><AnimatePresence initial={false}>
              {items.map((item) => (
                <MotionItem key={item.id}>
                  <MediaThumb item={item} />
                  <div><strong>{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a> : item.title}</strong>{item.description ? <small>{item.description}</small> : item.kind === "business" ? <small>Business</small> : null}</div>
                  {item.occurredOn ? <em>{item.kind === "business" ? "Founded" : "Dated"} {new Date(`${item.occurredOn}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</em> : <em />}
                  <span className={cn("pilot-status", item.reviewStatus === "approved" && "pilot-status--posted")}>{item.reviewStatus === "approved" ? "On Locker" : "With BLTZ for review"}</span>
                </MotionItem>
              ))}
            </AnimatePresence></ul>
          ) : <p className="pilot-quiet pilot-hub__empty">No {category.label.toLowerCase()} connected yet.</p>}
          {canManage ? <MediaForm category={open} organizationId={organizationId} playerId={playerId} athleteName={athleteName} preview={preview} onSave={onSave} /> : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}


function MediaForm({ category, organizationId, playerId, athleteName, preview, onSave }: { category: HubCategory; organizationId: string; playerId: string; athleteName: string; preview: boolean; onSave: (item: NewMedia) => Promise<boolean> }) {
  const publications = category === "publications";
  const [kind, setKind] = useState<AthleteMediaKind>(publications ? "business" : category === "videos" ? "highlight" : "image");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="pilot-media-form">
      {!publications ? (
        <MediaAttach organizationId={organizationId} playerId={playerId} athleteName={athleteName} preview={preview} mode={category === "videos" ? "video" : "image"} onAdd={async (items) => {
          for (const item of items) await onSave({ ...mediaPayload(item), description: null, occurredOn: null, localPreview: item.localPreview ?? null });
        }} />
      ) : null}
      <form className="pilot-inline-form pilot-inline-form--stack" onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        const saved = await onSave({ kind, title: title.trim(), url: url.trim() || null, description: description.trim() || null, occurredOn: occurredOn || null });
        setBusy(false);
        if (saved) { setTitle(""); setUrl(""); setOccurredOn(""); setDescription(""); }
      }}>
        {publications ? (
          <div className="pilot-kind-picker" role="radiogroup" aria-label="Publication type">
            {(["business", "archive"] as const).map((value) => <button key={value} type="button" role="radio" aria-checked={kind === value} className={cn("pilot-chip", kind === value && "pilot-chip--on")} onClick={() => setKind(value)}>{value === "business" ? "Business" : "Article or archive"}</button>)}
          </div>
        ) : <p className="pilot-media-form__or">Or add a link</p>}
        <label>{kind === "business" ? "Business name" : "Title"}<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Link<input type="url" inputMode="url" maxLength={2048} placeholder="https://" value={url} onChange={(event) => setUrl(event.target.value)} /></label>
        <label>{kind === "business" ? "Founded" : "Date"}<input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} /></label>
        {kind === "business" ? <label>What they do<input maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} /></label> : null}
        <button type="submit" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={busy || !title.trim()}>Connect</button>
      </form>
    </div>
  );
}

function ReachForm({ onSave }: { onSave: (platform: SocialPlatformKey, followers: number, handle: string) => Promise<void> }) {
  const [platform, setPlatform] = useState<SocialPlatformKey>("instagram");
  const [followers, setFollowers] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="pilot-inline-form" onSubmit={async (event) => {
      event.preventDefault();
      const value = Number(followers);
      if (!Number.isFinite(value) || value < 0) return;
      setBusy(true);
      await onSave(platform, Math.round(value), handle.trim());
      setBusy(false);
      setFollowers("");
    }}>
      <label>Platform<select value={platform} onChange={(event) => setPlatform(event.target.value as SocialPlatformKey)}>{SOCIAL_PLATFORMS.map((value) => <option key={value} value={value}>{CHANNEL_LABEL[value]}</option>)}</select></label>
      <label>Handle<input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@handle" maxLength={120} /></label>
      <label>Followers<input type="number" min={0} inputMode="numeric" required value={followers} onChange={(event) => setFollowers(event.target.value)} /></label>
      <button type="submit" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={busy}>Record</button>
    </form>
  );
}

function ActivationComposer({ draft, backing, lead, others, organizationId, preview, onClose, onSave }: { draft: Draft; backing: Backing | null; lead: PilotPlayer; others: PilotPlayer[]; organizationId: string; preview: boolean; onClose: () => void; onSave: (value: Draft) => Promise<void> }) {
  const [value, setValue] = useState<Draft>({ ...draft, additionalPlayerIds: draft.additionalPlayerIds ?? [], media: draft.media ?? [] });
  const attached = value.media ?? [];
  const [busy, setBusy] = useState(false);
  const [find, setFind] = useState("");
  const featured = value.additionalPlayerIds ?? [];
  const matches = find.trim() ? others.filter((row) => !featured.includes(row.id) && row.name.toLowerCase().includes(find.trim().toLowerCase())).slice(0, 5) : [];
  const toggle = (id: string) => setValue({ ...value, additionalPlayerIds: featured.includes(id) ? featured.filter((row) => row !== id) : [...featured, id] });
  return (
    <div className="pilot-modal" role="dialog" aria-modal="true" aria-labelledby="pilot-composer-title" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <div className="pilot-modal__scrim" onClick={onClose} />
      <form className="pilot-modal__panel" onSubmit={async (event) => { event.preventDefault(); if (!value.title.trim()) return; setBusy(true); await onSave({ ...value, title: value.title.trim() }); setBusy(false); }}>
        <div className="pilot-card-head"><div><h2 id="pilot-composer-title">Plan an activation</h2><p>{draft.signalKey ? "From a signal. Share its tracked link when it goes out." : "Anything you post, run or host for this athlete."}</p></div><button type="button" className="pilot-icon-pill" aria-label="Close" onClick={onClose}><IconX stroke={1.5} aria-hidden /></button></div>
        <div className="pilot-kind-picker" role="radiogroup" aria-label="Type">
          {ACTIVATION_KINDS.map((kind) => <button key={kind} type="button" role="radio" aria-checked={value.kind === kind} className={cn("pilot-chip", value.kind === kind && "pilot-chip--on")} onClick={() => setValue({ ...value, kind })}>{KIND_LABEL[kind]}</button>)}
        </div>
        <label className="pilot-field">Title<input autoFocus required maxLength={200} value={value.title} onChange={(event) => setValue({ ...value, title: event.target.value })} /></label>
        <label className="pilot-field">Date<input type="date" value={value.dueOn} onChange={(event) => setValue({ ...value, dueOn: event.target.value })} /></label>
        {backing ? <BackedBy backing={backing} /> : null}
        {others.length ? (
          <div className="pilot-field">
            <span>Also featuring</span>
            <div className="pilot-featuring">
              <span className="pilot-chip pilot-chip--on pilot-chip--static">{lead.name}</span>
              {featured.map((id) => { const row = others.find((item) => item.id === id); return row ? <button key={id} type="button" className="pilot-chip pilot-chip--on" onClick={() => toggle(id)} aria-label={`Remove ${row.name}`}>{row.name}<IconX stroke={1.5} aria-hidden /></button> : null; })}
              <input value={find} onChange={(event) => setFind(event.target.value)} placeholder="Add a former player" aria-label="Add a featured player" />
            </div>
            {matches.length ? <ul className="pilot-featuring__matches">{matches.map((row) => <li key={row.id}><button type="button" onClick={() => { toggle(row.id); setFind(""); }}><Portrait player={row} />{row.name}</button></li>)}</ul> : null}
          </div>
        ) : null}
        <div className="pilot-field">
          <span>Media</span>
          {attached.length ? <ul className="pilot-media-strip pilot-media-strip--edit">{attached.map((item) => <li key={item.key}><MediaThumb item={item} /><button type="button" className="pilot-media-strip__remove" aria-label={`Remove ${item.title}`} onClick={() => setValue({ ...value, media: attached.filter((row) => row.key !== item.key) })}><IconX stroke={2} aria-hidden /></button><small>{item.title}</small></li>)}</ul> : null}
          <MediaAttach organizationId={organizationId} playerId={lead.id} athleteName={lead.name} preview={preview} onAdd={(items) => setValue((current) => ({ ...current, media: [...(current.media ?? []), ...items.filter((item) => !(current.media ?? []).some((row) => row.key === item.key))].slice(0, 10) }))} />
        </div>
        <label className="pilot-field">Notes<textarea rows={3} maxLength={4000} value={value.brief} onChange={(event) => setValue({ ...value, brief: event.target.value })} placeholder="Angle, copy ideas, who's posting" /></label>
        <div className="pilot-modal__actions">
          <button type="button" className="pilot-pill pilot-pill--quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={busy || !value.title.trim()}>{busy ? "Saving" : "Save activation"}</button>
        </div>
      </form>
    </div>
  );
}

const RESEARCH_LABEL: Record<NonNullable<AthleteFile["research"]>[number]["type"], string> = { article: "Article", interview: "Interview", video: "Video", podcast: "Podcast", profile: "Profile" };
const RESEARCH_ICON: Record<NonNullable<AthleteFile["research"]>[number]["type"], typeof IconNews> = { article: IconNews, interview: IconMicrophone, video: IconVideo, podcast: IconMicrophone, profile: IconUser };

function researchDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** The reviewed sources and past coverage behind a planned activation, to cite and link. */
function BackedBy({ backing }: { backing: Backing }) {
  return (
    <section className="pilot-backed" aria-label="Backed by">
      <h3>Backed by</h3>
      {backing.sources.length ? (
        <ul className="pilot-backed__sources">
          {backing.sources.map((source) => (
            <li key={`${source.label}-${source.url ?? ""}`}>
              <IconCheck stroke={2} aria-hidden />
              <span>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a> : <strong>{source.label}</strong>}{source.note ? <small>{source.note}</small> : null}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {backing.research.length ? (
        <>
          <h4>Past coverage from BLTZ research</h4>
          <ul className="pilot-backed__research">
            {backing.research.map((item) => {
              const Icon = RESEARCH_ICON[item.type];
              return (
                <li key={item.id}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <span className="pilot-backed__icon" aria-hidden><Icon stroke={1.5} /></span>
                    <span><strong>{item.title}</strong><small>{[RESEARCH_LABEL[item.type], item.publisher, researchDate(item.date)].filter(Boolean).join(" · ")}</small></span>
                    <IconExternalLink stroke={1.5} aria-hidden className="pilot-backed__out" />
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}
