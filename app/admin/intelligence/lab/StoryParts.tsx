"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin, rectIntersection, useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from "@dnd-kit/core";
import { ArrowUpRight, Camera, ChevronDown, ChevronLeft, ChevronRight, Megaphone, Mic, Minus, PenLine, Plus, Video, X, Zap } from "lucide-react";
import type { LabGraphMoment } from "@/lib/intelligence/lab-types";
import type { IntelligenceSignal } from "@/lib/intelligence/signals";
import { safeSourceUrl } from "@/lib/intelligence/lab-format";
import { signalHeadline, VERDICT_ACTION, VERDICT_LABEL } from "@/lib/intelligence/signal-copy";
import { confidencePercent, momentDate, reviewPriority } from "../CareerWorkspace";
import { MediaCard } from "./MediaCard";
import { GettyPicker, LockerPicker } from "./SourcePickers";
import { ShareRow } from "./ShareSheet";
import { dayLabel, daysBetween, human, initials, momentSummary, performanceStats, type MediaItem, type Model } from "./model";
import styles from "./lab.module.css";

/* ---------- activations (local drafts only) ---------- */

export type ActivationKind = "article" | "video" | "interview" | "social" | "gallery";
export type Activation = { id: string; kind: ActivationKind; title: string; momentId: string | null; signalKey: string | null; due: string | null; mediaIds: string[]; brief: string };
export type ActivationDraft = Omit<Activation, "id">;
export const KINDS: Record<ActivationKind, { label: string; icon: ReactNode }> = {
  article: { label: "Article", icon: <PenLine size={18} aria-hidden="true" /> },
  video: { label: "Video", icon: <Video size={18} aria-hidden="true" /> },
  interview: { label: "Interview request", icon: <Mic size={18} aria-hidden="true" /> },
  social: { label: "Social post", icon: <Megaphone size={18} aria-hidden="true" /> },
  gallery: { label: "Photo gallery", icon: <Camera size={18} aria-hidden="true" /> },
};
type Links = Record<string, string[]>;

type Suggestion = { kind: ActivationKind; title: string; why: string; ready: boolean; status: string; brief: string };

function years(moment: LabGraphMoment, signal: IntelligenceSignal): number | null {
  const from = moment.occurredOn?.slice(0, 4) ?? (moment.occurredYear ? String(moment.occurredYear) : null);
  const to = signal.targetDate?.slice(0, 4);
  return from && to ? Number(to) - Number(from) : null;
}
/** "tackles for loss" -> "tackle for loss", "pass deflections" -> "pass deflection". */
function singular(label: string): string {
  const words = label.split(" ");
  const at = words.indexOf("for") > 0 ? words.indexOf("for") - 1 : words.length - 1;
  words[at] = words[at].replace(/s$/, "");
  return words.join(" ");
}
function statLine(moment: LabGraphMoment): string | null {
  const stats = performanceStats(moment);
  if (!stats.length) return null;
  const parts = stats.slice(0, 3).map(([key, value]) => `${value} ${Number(value) === 1 ? singular(key.toLowerCase()) : key.toLowerCase()}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
}

function ordinal(value: number): string {
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][value % 10] ?? "th";
  return `${value}${suffix}`;
}

/** Context sentences are assembled only from recorded evidence, dates and linked references. */
function contextFor(signal: IntelligenceSignal, moment: LabGraphMoment | null, m: Model): string[] {
  const lines: string[] = [];
  const name = m.athlete?.name.split(" ")[0] ?? "The athlete";
  const target = dayLabel(signal.targetDate);
  if (!moment) {
    const age = signal.data.age;
    if (signal.type === "birthday" && typeof age === "number") {
      lines.push(`${name} turns ${age} on ${target}${age % 10 === 0 ? ", a round-number birthday worth a bigger moment" : age % 5 === 0 ? ", a milestone birthday" : ""}.`);
      lines.push("The date of birth comes from the admin-reviewed preview Locker, so the greeting can go out on the exact day.");
      const photos = m.media.filter(item => item.kind === "photo" || item.kind === "media").length;
      if (photos) lines.push(`${photos} photo${photos === 1 ? "" : "s"} on file for a throwback post.`);
    }
    return lines;
  }
  const span = years(moment, signal);
  const label = typeof signal.data.milestoneLabel === "string" ? signal.data.milestoneLabel : null;
  if (label && span) lines.push(`${target} marks ${span} years since ${name}'s ${label}${span % 5 === 0 ? ", a round anniversary fans and former teams tend to revisit" : ""}.`);
  else if (signal.type === "historical_anniversary" && span) lines.push(`${target} marks ${span} years since this game${span % 5 === 0 ? ", a milestone anniversary that fans and the program tend to revisit" : ""}.`);
  if (signal.type === "career_milestone") lines.push(`A reviewed career milestone lands on ${target}.`);
  const stats = statLine(moment);
  if (stats) lines.push(`${name} was credited with ${stats} in this game, per the reviewed source.`);
  const sources = [...new Set(moment.evidence.map(row => row.source.name))];
  if (sources.length) lines.push(`${moment.evidence.length} reviewed record${moment.evidence.length === 1 ? "" : "s"} from ${sources.slice(0, 2).join(" and ")}${sources.length > 2 ? ` and ${sources.length - 2} more` : ""} back it up, so every claim in an activation can cite a source.`);
  const interviews = m.media.filter(item => item.kind === "interview" && item.date).map(item => item.date!.slice(0, 4));
  if (interviews.length) lines.push(`${name} has done ${interviews.length} recorded interview${interviews.length === 1 ? "" : "s"} about the career (${[...new Set(interviews)].sort().join(", ")}), so a fresh conversation is a natural ask.`);
  return lines;
}

/** Moment media is keyed by Moment; athlete-level signals (birthdays) hold their own links. */
export function mediaKey(momentId: string | null, signalKey: string | null): string | null {
  return momentId ?? (signalKey ? `signal:${signalKey}` : null);
}

function birthdaySuggestions(signal: IntelligenceSignal, m: Model, linked: MediaItem[], hasContact: boolean): Suggestion[] {
  const name = m.athlete?.name ?? "the athlete";
  const first = name.split(" ")[0];
  const age = typeof signal.data.age === "number" ? signal.data.age : null;
  const day = dayLabel(signal.targetDate) ?? "the birthday";
  const isPhoto = (item: MediaItem) => item.kind === "photo" || item.kind === "media";
  const photos = linked.filter(isPhoto), videos = linked.filter(item => item.kind === "video");
  const onFile = (count: number, noun: string) => count ? `${count} ${noun}${count === 1 ? "" : "s"} on file. Link them in this signal's media below.` : `No ${noun}s on file yet. Add one in this signal's media below.`;
  return [
    { kind: "social", title: `Birthday post for ${first}`, why: `Schedule for ${day}${photos.length ? " with the linked photo" : ""}.`, ready: true, status: photos.length ? "Photo linked" : "Ready to draft", brief: `Happy ${age ? `${ordinal(age)} ` : ""}birthday to ${name}. Pair with a career photo cleared for this use.` },
    { kind: "gallery", title: "Throwback photo gallery", why: photos.length ? `${photos.length} linked photo${photos.length === 1 ? "" : "s"} to build from.` : onFile(m.media.filter(isPhoto).length, "photo"), ready: photos.length > 0, status: photos.length ? "Photos linked" : "Needs photos", brief: `Birthday throwback gallery for ${name}, ${day}. Use only photos cleared for this use.` },
    { kind: "video", title: "Birthday highlight reel", why: videos.length ? `${videos.length} linked video${videos.length === 1 ? "" : "s"} to cut from.` : onFile(m.media.filter(item => item.kind === "video").length, "video"), ready: videos.length > 0, status: videos.length ? "Footage linked" : "Needs footage", brief: `Short birthday highlight reel for ${name}, posted ${day}.` },
    { kind: "interview", title: `Ask ${first} for a birthday Q&A`, why: "A short where-are-they-now conversation timed to the day.", ready: hasContact, status: hasContact ? "Contact on file" : "Contact not on file", brief: `Birthday Q&A request: ${name}, timed for ${day}.` },
  ];
}

function suggestionsFor(signal: IntelligenceSignal, moment: LabGraphMoment, m: Model, linked: MediaItem[], hasContact: boolean): Suggestion[] {
  const span = years(moment, signal);
  const milestone = typeof signal.data.milestoneLabel === "string" ? signal.data.milestoneLabel : null;
  const label = span ? `${span}-year` : "Anniversary";
  const name = m.athlete?.name ?? "the athlete";
  if (milestone) {
    const first = name.split(" ")[0];
    const day = dayLabel(signal.targetDate) ?? "the anniversary";
    const videos = linked.filter(item => item.kind === "video");
    const stats = statLine(moment);
    return [
      { kind: "social", title: "\"On this day\" post", why: `Schedule for ${day}: ${span ? `${span} years since ` : ""}${milestone}.`, ready: true, status: "Ready to draft", brief: `On this day${span ? ` ${span} years ago` : ""}: ${name}'s ${milestone} (${moment.title}).${stats ? ` ${stats}.` : ""}` },
      { kind: "video", title: `${label} highlight clip`, why: videos.length ? `${videos.length} linked video${videos.length === 1 ? "" : "s"} to cut from.` : "Link game footage in this Moment's Media tab first.", ready: videos.length > 0, status: videos.length ? "Footage linked" : "Needs footage", brief: `Short clip marking ${name}'s ${milestone}. Use only footage linked to this Moment and cleared for this use.` },
      { kind: "interview", title: `Ask ${first} to look back`, why: `${first} recalls the ${milestone} in their own words.`, ready: hasContact, status: hasContact ? "Contact on file" : "Contact not on file", brief: `Interview request: ${name} on their ${milestone}, timed for ${day}.` },
      { kind: "article", title: `${label} retrospective`, why: `Built on the ${moment.evidence.length} record${moment.evidence.length === 1 ? "" : "s"} attached to this Moment.`, ready: moment.evidence.length > 0, status: moment.evidence.length ? "Sources on file" : "Needs sources", brief: `Retrospective on ${name}'s ${milestone} (${momentDate(moment)}). Cite the sources attached to this Moment.` },
    ];
  }
  const stats = statLine(moment);
  const videos = linked.filter(item => item.kind === "video");
  const photos = linked.filter(item => item.kind === "photo" || item.kind === "media");
  return [
    { kind: "article", title: `${label} retrospective article`, why: `Built on the ${moment.evidence.length} reviewed record${moment.evidence.length === 1 ? "" : "s"} attached to this Moment.`, ready: moment.evidence.length > 0, status: moment.evidence.length ? "Sources on file" : "Needs sources", brief: `Retrospective on ${moment.title} (${momentDate(moment)}). ${stats ? `Feature ${stats}. ` : ""}Cite the reviewed sources attached to this Moment.` },
    { kind: "video", title: "Anniversary highlight video", why: videos.length ? `${videos.length} linked video${videos.length === 1 ? "" : "s"} to cut from.` : "Link game footage in this Moment's Media tab first.", ready: videos.length > 0, status: videos.length ? "Footage linked" : "Needs footage", brief: `Short highlight package for the ${label.toLowerCase()} of ${moment.title}. Use only footage linked to this Moment and cleared for this use.` },
    { kind: "interview", title: `Request a new interview with ${name.split(" ")[0]}`, why: `Ask ${name.split(" ")[0]} to look back on this game for the anniversary.`, ready: hasContact, status: hasContact ? "Contact on file" : "Contact not on file", brief: `Interview request: ${name} reflecting on ${moment.title}, timed for ${dayLabel(signal.targetDate) ?? "the anniversary"}.` },
    { kind: "social", title: "Anniversary day social post", why: `Schedule for ${dayLabel(signal.targetDate) ?? "the anniversary"}${photos.length ? " with the linked photo" : ""}.`, ready: true, status: "Ready to draft", brief: `On this day: ${moment.title}. ${stats ? `${stats}.` : ""}` },
  ];
}

export function SignalCard({ m, links, hasContact, onMoment, onCreate, onLink, onAddMedia }: { m: Model; links: Links; hasContact: boolean; onMoment: (id: string) => void; onCreate: (draft: Partial<ActivationDraft>) => void; onLink: (key: string, ids: string[]) => void; onAddMedia: (items: MediaItem[]) => void }) {
  const [index, setIndex] = useState(0);
  const [mediaOpenFor, setMediaOpenFor] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const signal = m.signals[index];
  if (!signal) return <div className={styles.nextEmpty}><Zap size={20} aria-hidden="true" /><p>{m.ready ? "No dated facts on file yet. Add a reviewed date of birth or approve game Moments to get signals." : "Signals appear once this athlete's evidence is complete."}</p><button type="button" className={styles.ghostButton} onClick={() => onCreate({})}><Plus size={15} aria-hidden="true" />New activation</button></div>;
  const moment = m.moments.find(row => row.id === signal.momentId) ?? null;
  const days = daysBetween(m.asOf, signal.targetDate);
  const key = mediaKey(moment?.id ?? null, signal.key)!;
  const mediaOpen = mediaOpenFor === signal.key;
  const linkedIds = links[key] ?? [];
  const linked = m.media.filter(item => linkedIds.includes(item.id));
  const context = contextFor(signal, moment, m);
  const ideas = moment ? suggestionsFor(signal, moment, m, linked, hasContact) : signal.type === "birthday" ? birthdaySuggestions(signal, m, linked, hasContact) : [];
  const opp = m.opportunities.find(row => row.signalKeys.includes(signal.key));
  const headline = signal.type === "birthday" ? `${m.athlete?.name ?? "Athlete"} ${signalHeadline(signal).toLowerCase()}` : signalHeadline(signal);
  return <div className={styles.signalCard}>
    <div className={styles.signalTop}>
      <div className={styles.pager}>
        <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0} aria-label="Previous signal"><ChevronLeft size={18} aria-hidden="true" /></button>
        <span aria-live="polite">Signal {index + 1} of {m.signals.length}</span>
        <button type="button" onClick={() => setIndex(index + 1)} disabled={index >= m.signals.length - 1} aria-label="Next signal"><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
    </div>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={signal.key} initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -24 }} transition={{ duration: .25, ease: [0.16, 1, 0.3, 1] }} className={styles.signalMain}>
        <div className={styles.signalHead}>
          <div className={styles.countdown}><strong>{days === null ? "?" : Math.abs(days)}</strong><span>{days === null ? "date unknown" : days >= 0 ? `day${Math.abs(days) === 1 ? "" : "s"} to go` : "days ago"}</span><small>{dayLabel(signal.targetDate)}</small></div>
          <div className={styles.nextBody}>
            <span className={styles.verdict} data-verdict={signal.verdict}><Zap size={12} aria-hidden="true" />{VERDICT_LABEL[signal.verdict]}</span>
            <h4>{headline}</h4>
            {moment && <p className={styles.quiet}>{moment.title}</p>}
            <p className={styles.decision}>{VERDICT_ACTION[signal.verdict]}{signal.verdict !== "upcoming" ? ` Target date: ${dayLabel(signal.targetDate)}.` : ""}</p>
            <div className={styles.chain}>
              {moment ? <button type="button" onClick={() => onMoment(moment.id)}>Open moment</button> : <span data-on="true">{human(signal.type)}</span>}<ChevronRight size={14} aria-hidden="true" className={styles.chainArrowFlat} />
              <span data-on="true">Signal</span><ChevronRight size={14} aria-hidden="true" className={styles.chainArrowFlat} />
              <span data-on={Boolean(opp)}>{opp ? human(opp.type) : "No opportunity yet"}</span>
            </div>
          </div>
        </div>
        {context.length > 0 && <div><h5 className={styles.miniTitle}>Why it matters</h5><ul className={styles.why}>{context.map(line => <li key={line}>{line}</li>)}</ul></div>}
        {!moment && <div>
          <div className={styles.signalMediaHead}><h5 className={styles.miniTitle}>Media for this signal{linked.length ? ` (${linked.length})` : ""}</h5>
            <button type="button" className={styles.ghostButton} aria-expanded={mediaOpen} onClick={() => setMediaOpenFor(mediaOpen ? null : signal.key)}>{mediaOpen ? "Done" : linked.length ? "Edit media" : "Link media"}</button></div>
          {mediaOpen ? <MomentMedia scope="signal" items={m.media} linked={linkedIds} onChange={ids => onLink(key, ids)} onAdd={items => { onAddMedia(items); onLink(key, [...new Set([...linkedIds, ...items.map(item => item.id)])]); }} />
            : linked.length > 0 && <ul className={styles.linkedList}>{linked.map(item => <li key={item.id}><MediaCard item={item} /></li>)}</ul>}
        </div>}
        {ideas.length > 0 && <div><h5 className={styles.miniTitle}>Suggested activations</h5><div className={styles.ideas}>{ideas.map(idea => <div key={idea.kind} className={styles.idea} data-ready={idea.ready}>
          <span className={styles.ideaIcon}>{KINDS[idea.kind].icon}</span>
          <div className={styles.ideaBody}><strong>{idea.title}</strong><p>{idea.why}</p>
            <div className={styles.ideaFoot}><small data-ready={idea.ready}>{idea.status}</small><button type="button" className={styles.ghostButton} onClick={() => onCreate({ kind: idea.kind, title: idea.title, momentId: moment?.id ?? null, signalKey: signal.key, due: signal.targetDate, brief: idea.brief, mediaIds: linked.map(item => item.id) })}><Plus size={14} aria-hidden="true" />Create</button></div>
          </div>
        </div>)}</div></div>}
      </motion.div>
    </AnimatePresence>
    <div className={styles.signalFoot}>
      <button type="button" className={styles.ghostButton} onClick={() => setIndex(index + 1)} disabled={index >= m.signals.length - 1}>Next signal<ChevronRight size={15} aria-hidden="true" /></button>
      <button type="button" className={styles.primaryButton} onClick={() => onCreate({ momentId: moment?.id ?? null, signalKey: signal.key, due: signal.targetDate, mediaIds: linked.map(item => item.id) })}><Plus size={15} aria-hidden="true" />New activation</button>
    </div>
  </div>;
}

/* ---------- compact, expandable Moment ---------- */

function Dot({ value }: { value: number | null }) {
  const label = reviewPriority(value);
  return <span className={styles.priorityDot} data-priority={label}>{label === "Awaiting review" ? "No signal" : `${label} priority`}</span>;
}

export function MomentRow({ moment, m, open, onToggle, linked, onLink, highlight, onAddMedia, onCreate }: { moment: LabGraphMoment; m: Model; open: boolean; onToggle: () => void; linked: string[]; onLink: (ids: string[]) => void; highlight: boolean; onAddMedia: (items: MediaItem[]) => void; onCreate: (draft: Partial<ActivationDraft>) => void }) {
  const [tab, setTab] = useState<"overview" | "media" | "sources">("overview");
  const stats = performanceStats(moment);
  const scores = m.signals.filter(row => row.momentId === moment.id).map(row => row.score);
  const confidence = confidencePercent(moment.confidence);
  const candidate = moment.status === "candidate";
  const panelId = useId();
  return <article id={`moment-${moment.id}`} className={styles.momentRow} data-open={open} data-highlight={highlight}>
    <button type="button" className={styles.momentHead} aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
      <span className={styles.momentWhen}>{momentDate(moment)}</span>
      <span className={styles.momentName}>{moment.title}</span>
      <span className={styles.momentMeta}>
        {candidate && <span className={styles.needsReview}>Needs review</span>}
        {moment.status === "rejected" && <span className={styles.rejectedTag}>Rejected</span>}
        {stats.slice(0, 2).map(([key, value]) => <span key={key} className={styles.miniStat}><b>{value}</b> {key}</span>)}
        <Dot value={scores.length ? Math.max(...scores) : null} />
        {linked.length > 0 && <span className={styles.miniStat}><b>{linked.length}</b> media</span>}
      </span>
      <ChevronDown size={18} aria-hidden="true" className={styles.momentChevron} />
    </button>
    <AnimatePresence initial={false}>{open && <motion.div id={panelId} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .28, ease: [0.16, 1, 0.3, 1] }} className={styles.momentPanel}>
      <div className={styles.momentBar}>
        <div className={styles.momentTabs} role="tablist">{([["overview", "Overview"], ["media", `Media${linked.length ? ` (${linked.length})` : ""}`], ["sources", `Sources (${moment.evidence.length})`]] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
        <div className={styles.reviewActions}>
          {moment.status === "verified" && <MomentRemove momentId={moment.id} title={moment.title} />}
          <button type="button" className={styles.primaryButton} onClick={() => onCreate({ momentId: moment.id, signalKey: m.signals.find(row => row.momentId === moment.id)?.key ?? null, title: "", mediaIds: linked })}><Plus size={15} aria-hidden="true" />New activation</button>
        </div>
      </div>
      {candidate && <MomentReview momentId={moment.id} />}
      {tab === "overview" && <div className={styles.momentOverview}>
        <p className={styles.momentText}>{momentSummary(moment)}</p>
        {stats.length > 0 && <dl className={styles.statChips}>{stats.map(([key, value]) => <div key={key}><dd>{value}</dd><dt>{key}</dt></div>)}</dl>}
        <p className={styles.quiet}>{moment.sport ?? "Sport not recorded"} · {confidence === null ? "Confidence not recorded" : `${confidence}% evidence confidence`}</p>
      </div>}
      {tab === "media" && <MomentMedia items={m.media} linked={linked} onChange={onLink} onAdd={items => { onAddMedia(items); onLink([...new Set([...linked, ...items.map(item => item.id)])]); }} />}
      {tab === "sources" && <ul className={styles.sources}>{moment.evidence.map(row => { const href = safeSourceUrl(row.source.locator); return <li key={row.id}><span className={styles.sourceMark}>{initials(row.source.name)}</span><div><strong>{row.source.name}</strong><p>{row.statement}</p></div>{href && <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${row.source.name}`}><ArrowUpRight size={15} aria-hidden="true" /></a>}</li>; })}</ul>}
    </motion.div>}</AnimatePresence>
  </article>;
}

/** Status change through the review endpoint; graph rows are never deleted. */
function useMomentDecision(momentId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<"verified" | "rejected" | null>(null);
  const [error, setError] = useState(false);
  async function decide(decision: "verified" | "rejected") {
    setBusy(decision); setError(false);
    try {
      const response = await fetch("/api/admin/intelligence/review", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ momentId, decision }) });
      if (!response.ok) throw new Error("review_failed");
      router.refresh();
    } catch { setError(true); }
    setBusy(null);
  }
  return { busy, error, decide };
}

/** Removes an approved Moment from the Lab: it stops producing signals and is kept, hidden, as rejected. */
function MomentRemove({ momentId, title }: { momentId: string; title: string }) {
  const { busy, error, decide } = useMomentDecision(momentId);
  return <>
    {error && <small role="alert" className={styles.reviewCount}>Not removed. Try again.</small>}
    <button type="button" className={styles.ghostButton} disabled={busy !== null} onClick={() => { if (window.confirm(`Remove "${title}"? It stops producing signals and moves to the hidden rejected list. The record is kept for the audit trail.`)) void decide("rejected"); }}>{busy ? "Removing…" : "Remove"}</button>
  </>;
}

/** Approve or reject an imported candidate Moment; approved ones start producing signals. */
function MomentReview({ momentId }: { momentId: string }) {
  const { busy, error, decide } = useMomentDecision(momentId);
  return <div className={styles.reviewBanner}>
    <p>Imported from nflverse game stats. Check the Sources tab, then approve to turn it into signals.</p>
    <div className={styles.reviewActions}>
      {error && <small role="alert" className={styles.reviewCount}>Not saved. Try again.</small>}
      <button type="button" className={styles.ghostButton} disabled={busy !== null} onClick={() => decide("rejected")}>{busy === "rejected" ? "Rejecting…" : "Reject"}</button>
      <button type="button" className={styles.primaryButton} disabled={busy !== null} onClick={() => decide("verified")}>{busy === "verified" ? "Approving…" : "Approve"}</button>
    </div>
  </div>;
}

/* ---------- per-Moment media linking ---------- */

const FILTERS = [["all", "All"], ["photo", "Photos"], ["video", "Video"], ["article", "Articles"], ["interview", "Interviews"]] as const;
const collide: CollisionDetection = args => { const hits = pointerWithin(args); return hits.length ? hits : rectIntersection(args); };

function Drag({ item, children }: { item: MediaItem; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return <div ref={setNodeRef} {...listeners} {...attributes} className={styles.draggable} data-dragging={isDragging} aria-label={`Drag ${item.title}`}>{children}</div>;
}
function Drop({ id, label, className, children }: { id: string; label: string; className: string; children: ReactNode }) {
  const { setNodeRef, isOver, active } = useDroppable({ id });
  return <div ref={setNodeRef} className={className} data-over={isOver} data-armed={Boolean(active)} aria-label={label}>{children}</div>;
}

function MomentMedia({ items, linked, onChange, onAdd, scope = "moment" }: { items: MediaItem[]; linked: string[]; onChange: (ids: string[]) => void; onAdd: (items: MediaItem[]) => void; scope?: "moment" | "signal" }) {
  const id = useId();
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [dragging, setDragging] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));
  const attached = items.filter(item => linked.includes(item.id));
  const library = items.filter(item => !linked.includes(item.id) && (filter === "all" || item.kind === filter || (filter === "photo" && item.kind === "media") || (filter === "article" && item.kind === "profile")));
  const add = (itemId: string) => onChange([...new Set([...linked, itemId])]);
  const remove = (itemId: string) => onChange(linked.filter(row => row !== itemId));
  function end(event: DragEndEvent) {
    setDragging(null);
    const over = event.over?.id; const itemId = String(event.active.id);
    if (over === "linked") add(itemId); else if (over === "library") remove(itemId);
  }
  const active = items.find(item => item.id === dragging);
  return <DndContext id={id} sensors={sensors} collisionDetection={collide} onDragStart={event => setDragging(String(event.active.id))} onDragCancel={() => setDragging(null)} onDragEnd={end}>
    <div className={styles.momentMedia}>
      <Drop id="linked" label={`Media linked to this ${scope}`} className={styles.linkedZone}>
        <div className={styles.zoneHead}><strong>Linked to this {scope}</strong><span className={styles.draftNote}>Drafts, not saved</span><button type="button" className={styles.ghostButton} aria-expanded={adding} onClick={() => setAdding(!adding)}>{adding ? <X size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}{adding ? "Close" : "Add media"}</button></div>
        {adding && <AddMediaForm linked={linked} onAdd={added => { onAdd(added); setAdding(false); }} />}
        {attached.length ? <ul className={styles.linkedList}>{attached.map(item => <li key={item.id}><Drag item={item}><MediaCard item={item} /></Drag><button type="button" className={styles.iconButton} onClick={() => remove(item.id)} aria-label={`Unlink ${item.title}`}><Minus size={15} aria-hidden="true" /></button></li>)}</ul>
          : <p className={styles.zoneEmpty}>{dragging ? "Drop to link" : "Drag a photo, video, article or interview here"}</p>}
      </Drop>
      <Drop id="library" label="Athlete media library" className={styles.library}>
        <div className={styles.chips} role="group" aria-label="Filter media">{FILTERS.filter(([key]) => key === "all" || items.some(item => item.kind === key || (key === "photo" && item.kind === "media") || (key === "article" && item.kind === "profile"))).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
        <ul className={styles.libraryList}>{library.map(item => <li key={item.id}><Drag item={item}><MediaCard item={item} /></Drag><button type="button" className={styles.iconButton} onClick={() => add(item.id)} aria-label={`Link ${item.title}`}><Plus size={15} aria-hidden="true" /></button></li>)}</ul>
        {!library.length && <p className={styles.quiet}>{items.length ? "Everything in this filter is linked." : "No media recorded for this athlete yet. Use Add media."}</p>}
      </Drop>
    </div>
    <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>{active ? <div className={styles.overlay}><MediaCard item={active} /></div> : null}</DragOverlay>
  </DndContext>;
}

/* ---------- add new media (local only) ---------- */

const NEW_KINDS = [["photo", "Photo"], ["video", "Video"], ["article", "Article"], ["interview", "Interview"]] as const;
type NewKind = (typeof NEW_KINDS)[number][0];

function AddMediaForm({ onAdd, linked }: { onAdd: (items: MediaItem[]) => void; linked: string[] }) {
  const [picker, setPicker] = useState<"locker" | "getty" | null>(null);
  const [kind, setKind] = useState<NewKind>("photo");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [publisher, setPublisher] = useState("");
  const [date, setDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const uploads = kind === "photo" || kind === "video";
  function submit() {
    const link = url.trim() ? safeSourceUrl(url.trim()) : null;
    if (!title.trim()) return setError("Add a title.");
    if (url.trim() && !link) return setError("Use a full http or https link.");
    if (!link && !(uploads && file)) return setError(uploads ? "Choose a file or paste a link." : "Paste a link to the piece.");
    // Object URLs live only in this tab; nothing is uploaded.
    const preview = kind === "photo" && file ? URL.createObjectURL(file) : null;
    onAdd([{ id: `new:${Date.now()}`, title: title.trim(), kind, publisher: publisher.trim() || (file ? "Uploaded file" : "Added by you"), date: date || null, url: link, imageUrl: preview, origin: file ? "upload" : "link" }]);
  }
  return <div className={styles.addForm}>
    <div className={styles.chips} role="group" aria-label="Media type">{NEW_KINDS.map(([key, label]) => <button key={key} type="button" aria-pressed={kind === key} onClick={() => { setKind(key); setFile(null); setError(""); }}>{label}</button>)}</div>
    <div className={styles.addGrid}>
      <label className={styles.field}><span>Title</span><input value={title} onChange={event => setTitle(event.target.value)} placeholder={kind === "article" ? "Headline" : kind === "interview" ? "Who, about what" : "What it shows"} /></label>
      <label className={styles.field}><span>{kind === "article" || kind === "interview" ? "Publisher" : "Source or credit"}</span><input value={publisher} onChange={event => setPublisher(event.target.value)} placeholder="Optional" /></label>
      <label className={styles.field}><span>Link</span><input type="url" inputMode="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://" /></label>
      <label className={styles.field}><span>Published</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
    </div>
    {uploads && <div className={styles.sourceRow}>
      <label className={styles.fileDrop} data-has={Boolean(file)}><input type="file" accept={kind === "photo" ? "image/*" : "video/*"} onChange={event => setFile(event.target.files?.[0] ?? null)} /><Plus size={16} aria-hidden="true" />{file ? file.name : `Choose a ${kind} file`}</label>
      <button type="button" className={styles.sourceButton} onClick={() => setPicker("locker")}><span className={styles.sourceGlyph}>L</span>From Player Locker</button>
      {kind === "photo" && <button type="button" className={styles.sourceButton} onClick={() => setPicker("getty")} aria-label="From Getty Images">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/getty-images-logo.svg" alt="" className={styles.gettyInline} />
      </button>}
    </div>}
    {picker === "locker" && <LockerPicker kind={kind === "video" ? "video" : "photo"} existing={linked} onClose={() => setPicker(null)} onAttach={items => { setPicker(null); if (items.length) onAdd(items); }} />}
    {picker === "getty" && <GettyPicker existing={linked} onClose={() => setPicker(null)} onAttach={items => { setPicker(null); if (items.length) onAdd(items); }} />}
    {error && <p className={styles.formError} role="alert">{error}</p>}
    <div className={styles.addFoot}><span className={styles.draftNote}>Stays in this tab. Nothing is uploaded.</span><button type="button" className={styles.primaryButton} onClick={submit}>Add and link</button></div>
  </div>;
}

/* ---------- activation composer ---------- */

/** Mounted only while a draft is open; the parent keys it so each open starts clean. */
export function ActivationComposer({ draft, m, links, onClose, onSave }: { draft: Partial<ActivationDraft>; m: Model; links: Links; onClose: () => void; onSave: (value: ActivationDraft) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState<ActivationDraft>(() => ({ kind: draft.kind ?? "article", title: draft.title ?? "", momentId: draft.momentId ?? null, signalKey: draft.signalKey ?? null, due: draft.due ?? null, mediaIds: draft.mediaIds ?? [], brief: draft.brief ?? "" }));
  // No close() in cleanup: the dev double-run would fire "close" and dismiss the draft. Unmounting removes the modal.
  useEffect(() => { const node = dialog.current; if (node && !node.open) node.showModal(); }, []);
  const moment = m.moments.find(row => row.id === value.momentId) ?? null;
  const source = mediaKey(value.momentId, value.signalKey);
  const linkedIds = source ? links[source] ?? [] : [];
  const options = m.media.filter(item => linkedIds.includes(item.id));
  return <dialog ref={dialog} className={styles.dialog} onClose={onClose} aria-labelledby="composer-title">
    <form method="dialog" className={styles.composer} onSubmit={event => { event.preventDefault(); if (value.title.trim()) onSave({ ...value, title: value.title.trim() }); }}>
      <header><h3 id="composer-title">New activation</h3><button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close"><X size={16} aria-hidden="true" /></button></header>
      <fieldset className={styles.kindPicker}><legend>Type</legend>{(Object.keys(KINDS) as ActivationKind[]).map(kind => <label key={kind} data-on={value.kind === kind}><input type="radio" name="kind" value={kind} checked={value.kind === kind} onChange={() => setValue({ ...value, kind })} />{KINDS[kind].icon}{KINDS[kind].label}</label>)}</fieldset>
      <label className={styles.field}><span>Title</span><input required value={value.title} onChange={event => setValue({ ...value, title: event.target.value })} placeholder="What are we making?" /></label>
      <div className={styles.fieldRow}>
        <label className={styles.field}><span>Moment</span><select value={value.momentId ?? ""} onChange={event => setValue({ ...value, momentId: event.target.value || null, mediaIds: [] })}><option value="">Not tied to a moment</option>{m.moments.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
        <label className={styles.field}><span>Due</span><input type="date" value={value.due ?? ""} onChange={event => setValue({ ...value, due: event.target.value || null })} /></label>
      </div>
      <fieldset className={styles.field}><legend>Media to use</legend>{options.length ? <div className={styles.mediaPicks}>{options.map(item => <label key={item.id}><input type="checkbox" checked={value.mediaIds.includes(item.id)} onChange={event => setValue({ ...value, mediaIds: event.target.checked ? [...value.mediaIds, item.id] : value.mediaIds.filter(row => row !== item.id) })} />{item.title}</label>)}</div> : <p className={styles.quiet}>{moment ? "Link media in this moment's Media tab to use it here." : value.signalKey ? "Link media on the signal card to use it here." : "Pick a moment to choose its media."}</p>}</fieldset>
      <label className={styles.field}><span>Brief</span><textarea rows={4} value={value.brief} onChange={event => setValue({ ...value, brief: event.target.value })} placeholder="Angle, audience and must-have facts" /></label>
      <footer><span className={styles.draftNote}>Saved as a draft in this tab only</span><button type="button" className={styles.ghostButton} onClick={onClose}>Cancel</button><button type="submit" className={styles.primaryButton}>Save draft</button></footer>
    </form>
  </dialog>;
}

export function ActivationList({ items, m }: { items: Activation[]; m: Model }) {
  if (!items.length) return <p className={styles.quiet}>No drafts yet. Create one from a signal.</p>;
  return <>{items.map(item => <div key={item.id} className={styles.activation}><span className={styles.ideaIcon}>{KINDS[item.kind].icon}</span><div><strong>{item.title}</strong><small>{KINDS[item.kind].label}{item.due ? ` · due ${dayLabel(item.due)}` : ""}{item.mediaIds.length ? ` · ${item.mediaIds.length} media` : ""}</small>{item.momentId && <small>{m.moments.find(row => row.id === item.momentId)?.title}</small>}<ShareRow item={item} m={m} /></div></div>)}</>;
}

