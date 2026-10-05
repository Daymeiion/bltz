"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { ArrowLeft, ArrowUpRight, BadgeCheck, Camera, Check, ChevronRight, CircleAlert, ExternalLink, FileImage, Fingerprint, FlaskConical, ImageOff, Mail, Moon, Network, Phone, Plus, Search, Shield, Sun, Target, Users, X, Zap } from "lucide-react";
import type { GraphEvidence } from "@/lib/intelligence/contracts";
import type { LabAthlete, LabGraphMoment, LabSection } from "@/lib/intelligence/lab-types";
import type { IntelligenceOpportunity, IntelligenceSignal } from "@/lib/intelligence/signals";
import type { WorkspaceAthleteSummary, WorkspaceProfile, WorkspaceResult } from "@/lib/intelligence/workspace-types";
import { safeSourceUrl, scalarStatistics } from "@/lib/intelligence/lab-format";
import styles from "./career-workspace.module.css";

const WATCHLIST_KEY = "bltz.intelligence.watchlist.v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Tab = "intelligence" | "moments" | "media" | "evidence" | "connections";
type View = "athlete" | "moment";

/** Scores are editorial priority; graph confidence uses a distinct 0–1 scale. */
export function reviewPriority(value: number | null): "Low" | "Mid" | "High" | "Awaiting review" {
  if (value === null || !Number.isFinite(value) || value < 0 || value > 100) return "Awaiting review";
  return value <= 40 ? "Low" : value <= 70 ? "Mid" : "High";
}
export function confidencePercent(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value >= 0 && value <= 1 ? Math.round(value * 100) : null;
}
function exactDay(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? value : null;
}
function dateLabel(value: string | null | undefined): string {
  const day = exactDay(value);
  return day ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`)) : "Date not recorded";
}
export function momentDate(moment: Pick<LabGraphMoment, "occurredOn" | "occurredYear" | "datePrecision">): string {
  if (moment.datePrecision === "day" && exactDay(moment.occurredOn)) return dateLabel(moment.occurredOn);
  return moment.datePrecision === "year" && Number.isInteger(moment.occurredYear) ? String(moment.occurredYear) : "Event date not established";
}
function initials(name: string): string { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] ?? "").join("").toUpperCase(); }
function human(value: string): string { return value.replace(/_/g, " ").replace(/^./, letter => letter.toUpperCase()); }
function sentence(value: string): string { return value.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() ?? value; }
function sourcePerformanceStatistics(data: Record<string, unknown>): [string, string][] {
  const statistics = data.statistics;
  const source = statistics && typeof statistics === "object" && !Array.isArray(statistics) ? statistics as Record<string, unknown> : data;
  return scalarStatistics(source).filter(([key, value]) =>
    !/review|rights|license|significance|fact.?type|version|date|source|url|provider|player|moment|status|method|confidence|team|opponent|sport|season|precision|(?:^|[ /_])id(?:$|[ /_])/i.test(key)
    && value.trim() !== "" && Number.isFinite(Number(value)));
}
function lockerUrl(value: string | null | undefined): string | null {
  if (!value || !/^\/(?:preview-lockers|locker)\/[a-zA-Z0-9._~-]+$/.test(value)) return null;
  return value;
}
function uniqueAthletes(rows: WorkspaceAthleteSummary[]): WorkspaceAthleteSummary[] {
  return Array.from(new Map(rows.map(row => [row.id, row])).values());
}
function summaryFor(data: WorkspaceResult): WorkspaceAthleteSummary | null {
  const athlete = data.result.selected;
  if (!athlete) return null;
  const supplied = [...data.directory.rows, ...data.result.search.rows].find(row => row.id === athlete.id);
  if (supplied) return supplied;
  const scores = athlete.intelligenceState === "ready" ? athlete.intelligence.signals.map(row => row.score).filter(Number.isFinite) : [];
  const priority = scores.length ? Math.max(...scores) : null;
  return { id: athlete.id, name: athlete.name, slug: athlete.slug, school: athlete.school, position: athlete.position, teamLabel: athlete.teamLabel, portraitUrl: data.profile?.portraitUrl ?? null, priority, priorityLabel: reviewPriority(priority), hasIntelligence: scores.length > 0, intelligenceState: athlete.intelligenceState };
}
function updateAddress(athlete: string, asOf: string, query: string, moment: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.set("athlete", athlete);
  url.searchParams.set("asOf", asOf);
  url.searchParams.set("view", moment ? "moment" : "athlete");
  if (query) url.searchParams.set("q", query); else url.searchParams.delete("q");
  if (moment) url.searchParams.set("moment", moment); else url.searchParams.delete("moment");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function PortraitImage({ url, name, large = false }: { url: string | null; name: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const safe = safeSourceUrl(url);
  useEffect(() => setFailed(false), [url]);
  if (!safe || failed) return large ? <div className={styles.portraitMissing}><strong aria-hidden="true">{initials(name)}</strong><span>Portrait not recorded</span></div> : <span aria-hidden="true">{initials(name)}</span>;
  // Provider images are already permission-filtered metadata. Keep the source URL intact.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={safe} alt={large ? name : ""} referrerPolicy="no-referrer" className={large ? styles.portraitImage : undefined} loading={large ? "eager" : "lazy"} onError={() => setFailed(true)} />;
}

function Popover({ label, icon, children, contactText }: { label: string; icon: ReactNode; children: ReactNode; contactText?: string }) {
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const suppressFocus = useRef(false);
  const open = pinned || hover || focused;
  const close = useCallback(() => { setPinned(false); setHover(false); setFocused(false); }, []);
  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) close(); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") { suppressFocus.current = true; close(); wrapper.current?.querySelector("button")?.focus(); } };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", escape); };
  }, [close, open]);
  return <div ref={wrapper} className={styles.popoverWrap} onMouseEnter={() => { suppressFocus.current = false; setHover(true); }} onMouseLeave={() => setHover(false)} onFocusCapture={() => { if (!suppressFocus.current) setFocused(true); }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) { suppressFocus.current = false; setFocused(false); } }}>
    <button type="button" className={contactText ? styles.contact : styles.popoverButton} aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => { suppressFocus.current = false; setPinned(!pinned); setHover(!pinned); if (pinned) setFocused(false); }}>
      {contactText ? <><span className={styles.contactIcon}>{icon}</span><span>{contactText}</span></> : icon}
    </button>
    {open && <div id={id} className={styles.popover} role="region" aria-label={label}>{children}</div>}
  </div>;
}

function FittedName({ name }: { name: string }) {
  const box = useRef<HTMLHeadingElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let disposed = false;
    const fit = () => {
      if (disposed || !box.current || !text.current) return;
      box.current.style.removeProperty("font-size");
      const natural = text.current.getBoundingClientRect().width;
      const available = box.current.getBoundingClientRect().width;
      if (available > 0 && natural > available) {
        const size = parseFloat(getComputedStyle(box.current).fontSize);
        box.current.style.fontSize = `${Math.max(10, Math.floor(size * available / natural * .99))}px`;
      }
    };
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    if (box.current) observer?.observe(box.current);
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => { disposed = true; observer?.disconnect(); window.removeEventListener("resize", fit); };
  }, [name]);
  return <h2 ref={box} className={styles.name}><span ref={text} className={styles.nameText}>{name}</span></h2>;
}

function Identity({ athlete, profile, onNotice }: { athlete: LabAthlete; profile: WorkspaceProfile | null; onNotice: (value: string) => void }) {
  const attribution = profile?.portraitAttribution;
  const locker = lockerUrl(profile?.lockerHref);
  const social = profile?.socialLinks.flatMap(row => { const href = safeSourceUrl(row.url); return href ? [{ ...row, url: href }] : []; }) ?? [];
  const status = profile?.status ?? "Career status not recorded";
  let statusDate = "";
  if (profile?.statusDatePrecision === "day" && exactDay(profile.statusDate)) {
    statusDate = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${profile.statusDate}T00:00:00Z`)).replace(/ (\d{2})$/, " $1'");
  } else if (profile?.statusDatePrecision === "year" && /^\d{4}$/.test(profile.statusDate ?? "")) statusDate = profile!.statusDate!;
  const copy = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); onNotice(`${label} copied.`); } catch { onNotice(`Copy unavailable. ${label}: ${value}`); }
  };
  return <section className={styles.identity} aria-label="Athlete identity">
    <div className={styles.portrait}>
      <PortraitImage url={profile?.portraitUrl ?? null} name={athlete.name} large />
      <div className={styles.attribution}>
        <Popover label="Photographer and source" icon={<Camera size={15} aria-hidden="true" />}><strong>Photographer & source</strong><p>Photographer: {attribution?.creator ?? "Not recorded"}</p><p>Credit: {attribution?.credits ?? "Not recorded"}</p><p>{profile?.portraitSource ?? "Portrait source not recorded"}</p>{safeSourceUrl(attribution?.sourceUrl) && <a href={safeSourceUrl(attribution?.sourceUrl)!} target="_blank" rel="noopener noreferrer">Open source <ArrowUpRight size={12} aria-hidden="true" /></a>}</Popover>
        <Popover label="Attribution and rights" icon={<Shield size={15} aria-hidden="true" />}><strong>Attribution & rights</strong><p>Owner: {attribution?.owner ?? "Not recorded"}</p><p>License: {attribution?.license ?? "Not recorded"}</p><p>Portrait inspection does not establish rights to an activation or a Moment.</p></Popover>
        <Popover label="Identity and provenance" icon={<Fingerprint size={15} aria-hidden="true" />}><strong>Identity & provenance</strong><p>Identity: {athlete.verified === true ? "Verified" : athlete.verified === false ? "Unverified" : "Verification not recorded"}</p><dl><div><dt>Athlete Career ID</dt><dd>{athlete.id}</dd></div>{athlete.externalIdentities.rows.map(row => <div key={row.id}><dt>{row.provider} · {row.sport} / {row.league}</dt><dd>{row.externalId}</dd></div>)}</dl>{!athlete.externalIdentities.rows.length && <p>External provider identities not recorded.</p>}<p>Provider mapping review is separate from athlete identity verification.</p></Popover>
      </div>
    </div>
    <div className={styles.identityInfo}>
      <FittedName name={athlete.name} />
      <p className={styles.profileLine}>{athlete.school ?? athlete.teamLabel ?? "School or team not recorded"} · {profile?.sport ?? "Sport not recorded"} · {athlete.position ?? "Position not recorded"}</p>
      <p className={styles.statusLine} title={profile?.statusDate ? `${status} · ${profile.statusDate}` : undefined}>{status}{statusDate ? ` ${statusDate}` : ""}</p>
      <div className={styles.contacts}>
        <button type="button" className={styles.contact} disabled={!profile?.email} aria-label={profile?.email ? `Copy email ${profile.email}` : "Email not recorded"} onClick={() => { if (profile?.email) void copy(profile.email, "Email"); }}><span className={styles.contactIcon}><Mail size={17} aria-hidden="true" /></span><span>{profile?.email ?? "Not recorded"}</span></button>
        {locker ? <a href={locker} className={styles.contact} target="_blank" rel="noopener noreferrer" aria-label={`Open ${athlete.name} Locker preview`}><span className={styles.contactIcon}><ExternalLink size={17} aria-hidden="true" /></span><span>Locker preview</span></a> : <button type="button" className={styles.contact} disabled aria-label="Locker preview not recorded"><span className={styles.contactIcon}><ExternalLink size={17} aria-hidden="true" /></span><span>Not recorded</span></button>}
        <button type="button" className={styles.contact} disabled={!profile?.phone} aria-label={profile?.phone ? `Copy phone ${profile.phone}` : "Phone not recorded"} onClick={() => { if (profile?.phone) void copy(profile.phone, "Phone"); }}><span className={styles.contactIcon}><Phone size={17} aria-hidden="true" /></span><span>{profile?.phone ?? "Not recorded"}</span></button>
        <Popover label="Social and content links" icon={<Network size={17} aria-hidden="true" />} contactText={social.length ? `${social.length} content link${social.length === 1 ? "" : "s"}` : "Not recorded"}><strong>Social & content links</strong>{social.length ? <><ul className={styles.socialList}>{social.map(row => <li key={`${row.label}-${row.url}`}><a href={row.url} target="_blank" rel="noopener noreferrer">{row.label}<ArrowUpRight size={13} aria-hidden="true" /></a></li>)}</ul><p>Linked content does not establish ownership of a social account.</p></> : <p>No verified social account or content link is recorded.</p>}</Popover>
      </div>
    </div>
  </section>;
}

function Metric({ value, kind }: { value: number | null; kind: "confidence" | "priority" }) {
  const valid = kind === "confidence" ? confidencePercent(value) : value !== null && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  const priority = kind === "priority" ? reviewPriority(valid) : undefined;
  const label = kind === "confidence" ? "Evidence confidence" : "Review priority";
  const text = valid === null ? "—" : kind === "confidence" ? `${valid}%` : priority;
  return <div className={styles.metric}><div className={styles.ring} data-priority={priority} role="img" aria-label={`${label}: ${valid === null ? "not recorded" : text}`}><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle className={styles.ringTrack} cx="32" cy="32" r="26" />{valid !== null && <circle className={styles.ringArc} cx="32" cy="32" r="26" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - valid} />}</svg><span className={styles.ringText}>{text}</span></div><span className={styles.metricLabel}>{label}</span></div>;
}
function Metrics({ priority, confidence }: { priority: number | null; confidence: number | null }) { return <div className={styles.metrics}><Metric value={priority} kind="priority" /><Metric value={confidence} kind="confidence" /></div>; }
function SectionState<T>({ section, empty }: { section: LabSection<T>; empty: string }) { return <>{section.state === "unavailable" && <p className={styles.sectionDescription} role="status">These records could not be loaded. Try reloading.</p>}{section.truncated && <p className={styles.sectionDescription}>Showing a bounded sample. Coverage is incomplete.</p>}{section.state === "ready" && !section.rows.length && <p className={styles.sectionDescription}>{empty}</p>}</>; }

function EvidenceCard({ row }: { row: GraphEvidence }) {
  const href = safeSourceUrl(row.source.locator);
  const recordLocator = row.source.locator && /^\/[a-zA-Z0-9][a-zA-Z0-9/._-]*$/.test(row.source.locator) ? row.source.locator : null;
  const statistics = row.factType === "performance" ? sourcePerformanceStatistics(row.data).slice(0, 12) : [];
  const confidence = confidencePercent(row.confidence);
  return <article className={styles.evidenceCard} id={`evidence-${row.id}`}>
    <div className={styles.sourceMark}><span aria-hidden="true">{initials(row.source.name)}</span><small>Logo not provided</small></div>
    <p className={styles.sourceSubtitle}>{row.source.provider} · {human(row.factType)}</p><h3>{row.source.name}</h3><p>{row.statement}</p>
    <details className={styles.disclosure}><summary>Evidence & dates<ChevronRight size={14} aria-hidden="true" /></summary><div className={styles.evidenceDetails}>
      <dl><div><dt>Review</dt><dd>{human(row.status)}</dd></div><div><dt>Confidence</dt><dd>{confidence === null ? "Not recorded" : `${confidence}%`}</dd></div><div><dt>Fetched</dt><dd>{row.source.fetchedAt ?? "Not recorded"}</dd></div><div><dt>Evidence ID</dt><dd className={styles.recordId}>{row.id}</dd></div><div><dt>Source ID</dt><dd className={styles.recordId}>{row.source.id ?? "Not recorded"}</dd></div>{recordLocator && <div><dt>Saved record</dt><dd className={styles.recordId}>{recordLocator}</dd></div>}</dl>
      {statistics.length > 0 && <dl className={styles.statistics}>{statistics.map(([key, value]) => <div key={key}><dt>{key.replace(/_/g, " ")}</dt><dd>{value}</dd></div>)}</dl>}
      <p className={styles.sectionDescription}>Source evidence establishes the recorded assertion. It does not establish media rights, contribution or commercial value.</p>
    </div></details>
    {href && <a className={styles.sourceLink} href={href} target="_blank" rel="noopener noreferrer">Open source<ArrowUpRight size={13} aria-hidden="true" /></a>}
  </article>;
}
function SourceGrid({ rows }: { rows: GraphEvidence[] }) { return <div className={styles.sourceGrid}>{rows.map(row => <EvidenceCard key={row.id} row={row} />)}</div>; }
function CareerTimeline({ athlete }: { athlete: LabAthlete }) { return <section className={styles.section}><h3>Career relationships</h3><SectionState section={athlete.relationships} empty="No normalized career relationships are recorded." /><ol className={styles.timeline}>{athlete.relationships.rows.map(row => <li key={row.id}><strong>{row.team} · {row.season}</strong><p>{row.organization}</p><p>{dateLabel(row.startsOn)} → {row.endsOn ? dateLabel(row.endsOn) : "End not recorded"} · {human(row.status)}</p></li>)}</ol></section>; }
function AthleteIntelligence({ data, onMoment }: { data: WorkspaceResult; onMoment: (id: string) => void }) {
  const athlete = data.result.selected!;
  const standalone = athlete.evidence.rows.filter(row => !row.momentId);
  return <>
    <dl className={styles.coverage}><div><dt>Career Moments</dt><dd>{athlete.moments.rows.length}</dd></div><div><dt>Evidence records</dt><dd>{athlete.evidence.rows.length}</dd></div><div><dt>Provider identities</dt><dd>{athlete.externalIdentities.rows.length}</dd></div></dl>
    <section className={styles.section}><h3>Reviewed career evidence</h3><SectionState section={athlete.moments} empty="No Moments are linked to this athlete." /><ul className={styles.reviewLinks}>{athlete.moments.rows.map(moment => <li key={moment.id}><button type="button" className={styles.reviewLink} onClick={() => onMoment(moment.id)}><strong>{moment.title}</strong><time dateTime={moment.datePrecision === "day" ? exactDay(moment.occurredOn) ?? undefined : undefined}>{momentDate(moment)}</time><ArrowUpRight size={15} aria-hidden="true" /></button></li>)}</ul></section>
    <section className={styles.section}><h3>Completeness</h3><dl className={styles.completeness}><div><dt>Athlete identity</dt><dd>{athlete.verified === true ? "Verified" : athlete.verified === false ? "Unverified" : "Verification not recorded"}</dd></div><div><dt>Graph evidence</dt><dd>{athlete.intelligenceState === "ready" ? "Loaded for this review" : "Incomplete — signals withheld"}</dd></div><div><dt>External mapping</dt><dd>{athlete.externalIdentities.rows.length ? "Reviewed mappings available" : "Not recorded"}</dd></div><div><dt>Moment media</dt><dd>Links not established</dd></div></dl><p className={styles.sectionDescription}>Profile labels, provider mapping and athlete verification are separate assessments.</p></section>
    <CareerTimeline athlete={athlete} />
    <details className={styles.disclosure}><summary>Source evidence<ChevronRight size={14} aria-hidden="true" /></summary><SectionState section={athlete.evidence} empty="No graph evidence is recorded." />{standalone.length ? <SourceGrid rows={standalone} /> : <p className={styles.sectionDescription}>Moment evidence is attached to each career event.</p>}</details>
    <details className={styles.disclosure}><summary>Season statistics<ChevronRight size={14} aria-hidden="true" /></summary><SectionState section={athlete.statistics} empty="No season statistics are recorded." /><p className={styles.sectionDescription}>Season context does not automatically establish a verified milestone or Moment.</p><ul className={styles.mediaList}>{athlete.statistics.rows.map(row => <li key={row.id} className={styles.evidenceCard}><h3>{row.season} · {row.phase}</h3><p className={styles.sourceSubtitle}>{row.team ?? "Team not recorded"} · {row.source}</p><dl className={styles.statistics}>{scalarStatistics(row.stats).map(([key, value]) => <div key={key}><dt>{key.replace(/_/g, " ")}</dt><dd>{value}</dd></div>)}</dl></li>)}</ul></details>
  </>;
}
function priorityFor(athlete: LabAthlete, momentId: string): number | null {
  const values = athlete.intelligenceState === "ready" ? athlete.intelligence.signals.filter(row => row.momentId === momentId).map(row => row.score).filter(Number.isFinite) : [];
  return values.length ? Math.max(...values) : null;
}
function MomentCards({ athlete, onMoment }: { athlete: LabAthlete; onMoment: (id: string) => void }) { return <><SectionState section={athlete.moments} empty="No Moments are linked to this athlete." /><ul className={styles.momentList}>{athlete.moments.rows.map(moment => <li key={moment.id} className={styles.momentCard}><div><p className={styles.momentOverline}>{moment.sport ?? "Sport not recorded"}</p><h3 className={styles.momentTitle}>{moment.title}</h3><p className={styles.momentDescription}>{sentence(moment.evidence.find(row => row.factType === "performance")?.statement ?? moment.evidence[0]?.statement ?? "Supporting description not recorded.")}</p><time className={styles.momentDate} dateTime={moment.datePrecision === "day" ? exactDay(moment.occurredOn) ?? undefined : undefined}>{momentDate(moment)}</time><Metrics priority={priorityFor(athlete, moment.id)} confidence={moment.confidence} /></div><div className={styles.mediaStack} aria-label="Moment media not established"><FileImage size={22} aria-hidden="true" /><span>No attached media</span></div><button type="button" className={styles.cardAction} onClick={() => onMoment(moment.id)}>Inspect moment<ArrowUpRight size={14} aria-hidden="true" /></button></li>)}</ul></>; }
function MomentHeader({ moment, onBack }: { moment: LabGraphMoment; onBack: () => void }) {
  const performance = moment.evidence.filter(row => row.factType === "performance").flatMap(row => sourcePerformanceStatistics(row.data)).slice(0, 9);
  return <header className={styles.momentEvent}><button type="button" className={styles.backButton} onClick={onBack}><ArrowLeft size={13} aria-hidden="true" />Back to athlete</button><p className={styles.momentOverline}>{moment.sport ?? "Sport not recorded"}</p><h2 className={styles.momentTitle}>{moment.title}</h2><time className={styles.momentDate} dateTime={moment.datePrecision === "day" ? exactDay(moment.occurredOn) ?? undefined : undefined}>{momentDate(moment)}</time>{performance.length > 0 && <dl className={styles.performanceGrid} aria-label="Source-reported performance">{performance.map(([key, value], index) => <div key={`${key}-${index}`}><dt>{key.replace(/_/g, " ")}</dt><dd>{value}</dd></div>)}</dl>}</header>;
}
function MomentConnections({ moment }: { moment: LabGraphMoment }) { return <section className={styles.section}><h3>Recorded relationships</h3><dl className={styles.completeness}><div><dt>Athlete role</dt><dd>{human(moment.relationship)}</dd></div><div><dt>Relationship review</dt><dd>{human(moment.relationshipStatus)}</dd></div><div><dt>Relationship confidence</dt><dd>{confidencePercent(moment.relationshipConfidence) === null ? "Not recorded" : `${confidencePercent(moment.relationshipConfidence)}%`}</dd></div><div><dt>Moment review</dt><dd>{human(moment.status)}</dd></div><div><dt>Event ID</dt><dd className={styles.recordId}>{moment.eventId ?? "Not recorded"}</dd></div><div><dt>Moment ID</dt><dd className={styles.recordId}>{moment.id}</dd></div></dl><p className={styles.sectionDescription}>Recorded participation does not infer contribution, rights ownership or financial participation.</p>{moment.athletes.length > 1 && <p className={styles.sectionDescription}>{moment.athletes.length} athlete relationships are recorded. Their identities and roles require their own evidence.</p>}</section>; }
function MomentMedia() { return <div className={styles.empty}><ImageOff size={27} aria-hidden="true" /><h3>No verified Moment media</h3><p>A photo or video has not been linked to this event. Athlete portraits and source documents do not establish a Moment media relationship.</p></div>; }

function AthleteMedia({ data }: { data: WorkspaceResult }) { return <>
  <h3 className={styles.sectionDescription}>Connected athlete media</h3><SectionState section={data.media} empty="No media metadata is linked to this athlete." />{data.mediaPreviewState === "unavailable" && <p className={styles.sectionDescription}>Preview metadata could not be loaded.</p>}
  <ul className={styles.mediaList}>{data.media.rows.map(row => <li key={`${row.model}-${row.id}`} className={styles.mediaCard}><div className={styles.mediaPreview}>{row.previewUrl ? <PortraitImage url={row.previewUrl} name={row.title} /> : <FileImage size={22} aria-hidden="true" />}</div><div><strong>{row.title}</strong><p>{row.kind} · {row.source ?? "Source not recorded"}</p><small>{human(row.publicationStatus)} · {row.permissionReason}</small>{row.credits && <small>Credit: {row.credits}</small>}{safeSourceUrl(row.sourceUrl) && <a className={styles.sourceLink} href={safeSourceUrl(row.sourceUrl)!} target="_blank" rel="noopener noreferrer">Inspect source<ArrowUpRight size={13} aria-hidden="true" /></a>}</div></li>)}</ul>
  <p className={styles.sectionDescription}>These legacy athlete records do not establish Moment-to-media links or clearance for an activation.</p>
  <section className={styles.section}><h3>Articles, interviews & public references</h3><SectionState section={data.content} empty="No reviewed public content references are recorded." /><ul className={styles.mediaList}>{data.content.rows.map(item => <li key={item.evidenceId} className={styles.evidenceCard}><p className={styles.sourceSubtitle}>{item.publisher} · {human(item.contentType)}</p><h3>{item.title}</h3><p>{item.assertion}</p><p>{item.careerContext === "postcareer" ? "Post-career content" : item.careerContext === "career_era" ? "Career-era content" : "Career context not established"}</p><dl className={styles.evidenceDetails}><div><dt>Published</dt><dd>{dateLabel(item.publishedOn)}</dd></div><div><dt>Released</dt><dd>{dateLabel(item.releasedOn)}</dd></div><div><dt>Described event</dt><dd>{dateLabel(item.describedEventOn)}</dd></div></dl>{item.metadataDateBasis && <p>{item.metadataDateBasis}</p>}{safeSourceUrl(item.url) && <a className={styles.sourceLink} href={safeSourceUrl(item.url)!} target="_blank" rel="noopener noreferrer">Open reference<ArrowUpRight size={13} aria-hidden="true" /></a>}<p className={styles.sectionDescription}>Reference only. No asset rights or Moment media relationship is inferred.</p></li>)}</ul></section>
  </>; }

function FolderTabs({ view, active, onChange }: { view: View; active: Tab; onChange: (key: Tab) => void }) {
  const tabs: Array<{ key: Tab; label: string }> = view === "athlete" ? [{ key: "intelligence", label: "Intelligence" }, { key: "moments", label: "Moments" }, { key: "media", label: "Media" }] : [{ key: "evidence", label: "Evidence" }, { key: "connections", label: "Connections" }, { key: "media", label: "Media" }];
  function keys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault(); onChange(tabs[next].key);
    (event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next])?.focus();
  }
  return <div className={styles.folderTabs} role="tablist" aria-label={view === "athlete" ? "Athlete related data" : "Moment details"}>{tabs.map((tab, index) => <button type="button" role="tab" key={tab.key} id={`career-tab-${tab.key}`} aria-controls={`career-panel-${tab.key}`} aria-selected={active === tab.key} tabIndex={active === tab.key ? 0 : -1} className={styles.folderTab} onClick={() => onChange(tab.key)} onKeyDown={event => keys(event, index)}><span>{tab.label}</span></button>)}</div>;
}
function RailEvidence({ evidence }: { evidence: IntelligenceSignal["evidence"] }) { return <details className={styles.disclosure}><summary>Supporting evidence<ChevronRight size={13} aria-hidden="true" /></summary><ul>{evidence.map(row => <li key={row.id}><p>{row.assertion}</p><p>{row.sourceLabel} · {row.sourceProvider}</p><p>Fetched: {row.fetchedAt || "Not recorded"}</p>{safeSourceUrl(row.sourceUrl) && <a className={styles.sourceLink} href={safeSourceUrl(row.sourceUrl)!} target="_blank" rel="noopener noreferrer">Open source<ArrowUpRight size={12} aria-hidden="true" /></a>}</li>)}</ul></details>; }
function SignalRow({ signal, moment, onMoment }: { signal: IntelligenceSignal; moment: LabGraphMoment | undefined; onMoment: (id: string) => void }) { return <details className={styles.railCard}><summary><span><small>{human(signal.type)}</small><strong>{moment?.title ?? "Recorded career signal"}</strong><time dateTime={exactDay(signal.targetDate) ?? undefined}>Target · {dateLabel(signal.targetDate)}</time></span><ChevronRight size={15} aria-hidden="true" /></summary><div className={styles.railContent}><Metrics priority={signal.score} confidence={signal.confidence} /><h3>Why it matters</h3><p>{signal.explanation}</p><p className={styles.railNote}>{signal.scoreScale}</p><RailEvidence evidence={signal.evidence} />{moment && <button type="button" className={styles.cardAction} onClick={() => onMoment(signal.momentId)}>Inspect moment<ArrowUpRight size={13} aria-hidden="true" /></button>}</div></details>; }
function OpportunityRow({ opportunity, moment, onMoment }: { opportunity: IntelligenceOpportunity; moment: LabGraphMoment | undefined; onMoment: (id: string) => void }) { return <details className={styles.railCard}><summary><span><small>From {opportunity.signalKeys.length} qualifying signal{opportunity.signalKeys.length === 1 ? "" : "s"}</small><strong>{human(opportunity.type)}</strong><small>Research needed</small></span><ChevronRight size={15} aria-hidden="true" /></summary><div className={styles.railContent}><Metrics priority={opportunity.strength} confidence={opportunity.confidence} /><p>{opportunity.explanation}</p><div className={styles.trace} aria-label="Moment to signal to opportunity"><span>Moment</span><ChevronRight size={10} aria-hidden="true" /><span>Signal</span><ChevronRight size={10} aria-hidden="true" /><span>Opportunity</span></div><p className={styles.railNote}>Potential action for human review. Media availability, rights and athlete preferences require separate verification.</p><RailEvidence evidence={opportunity.evidence} />{moment && <button type="button" className={styles.cardAction} onClick={() => onMoment(opportunity.momentId)}>Review moment<ArrowUpRight size={13} aria-hidden="true" /></button>}</div></details>; }
function IntelligenceRail({ athlete, moment, evaluatedAt, onMoment }: { athlete: LabAthlete | null; moment: LabGraphMoment | null; evaluatedAt: string; onMoment: (id: string) => void }) {
  const ready = athlete?.intelligenceState === "ready";
  const signals = ready ? athlete.intelligence.signals.filter(row => !moment || row.momentId === moment.id) : [];
  const opportunities = ready ? athlete.intelligence.opportunities.filter(row => !moment || row.momentId === moment.id) : [];
  return <aside className={styles.rail} aria-label="Intelligence findings">
    <section className={styles.railSection} aria-label="Signals"><div className={styles.railHeading}><div><Zap size={14} aria-hidden="true" /><h2>Signals</h2></div><span>{signals.length}</span></div>{signals.length ? <ul className={styles.railList}>{signals.map(signal => <li key={signal.key}><SignalRow signal={signal} moment={athlete?.moments.rows.find(row => row.id === signal.momentId)} onMoment={onMoment} /></li>)}</ul> : <p className={styles.railEmpty}>{!athlete ? "Select an athlete to inspect evidence-backed signals." : !ready ? "Signals are withheld while supporting graph evidence is incomplete." : "No qualifying signals in this evaluation window."}</p>}<p className={styles.railNote}>Evaluated {evaluatedAt} UTC. Review priority and evidence confidence are separate.</p></section>
    <section className={styles.railSection} aria-label="Opportunities"><div className={styles.railHeading}><div><Target size={14} aria-hidden="true" /><h2>Opportunities</h2></div><span>{opportunities.length}</span></div>{opportunities.length ? <ul className={styles.railList}>{opportunities.map(opportunity => <li key={opportunity.key}><OpportunityRow opportunity={opportunity} moment={athlete?.moments.rows.find(row => row.id === opportunity.momentId)} onMoment={onMoment} /></li>)}</ul> : <p className={styles.railEmpty}>No opportunities have been derived from qualifying signals.</p>}</section>
    <section className={styles.railSection} aria-label="Activations"><div className={styles.railHeading}><div><BadgeCheck size={14} aria-hidden="true" /><h2>Activations</h2></div><span>0</span></div><details className={styles.railCard}><summary><span><small>Recorded activity</small><strong>No activations recorded</strong></span><ChevronRight size={15} aria-hidden="true" /></summary><div className={styles.railContent}><p>A potential opportunity has not been converted into an approved activation record.</p><p>Brands, release dates, connected media and measured reach will appear when verified records exist.</p></div></details></section>
  </aside>;
}

export function CareerWorkspace({ initial, initialMomentId = null }: { initial: WorkspaceResult; initialMomentId?: string | null }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => setThemeReady(true), []);
  const darkAppearance = themeReady && resolvedTheme === "dark";
  const [data, setData] = useState(initial);
  const [watchlist, setWatchlist] = useState<WorkspaceAthleteSummary[]>(() => initial.directory.rows);
  const [query, setQuery] = useState(initial.result.query);
  const [searchRows, setSearchRows] = useState(initial.result.search.rows);
  const [searchState, setSearchState] = useState(initial.result.search.state);
  const [searchTruncated, setSearchTruncated] = useState(initial.result.search.truncated);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeOption, setActiveOption] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [momentId, setMomentId] = useState<string | null>(() => initial.result.selected?.moments.rows.some(row => row.id === initialMomentId) ? initialMomentId : null);
  const [tab, setTab] = useState<Tab>(() => initialMomentId ? "evidence" : "intelligence");
  const [asOf, setAsOf] = useState(initial.result.asOf);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const watchlistHost = useRef<HTMLElement>(null);
  const watchlistToggle = useRef<HTMLButtonElement>(null);
  const searchHost = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const selectionRequest = useRef<AbortController | null>(null);
  const searchRequest = useRef<AbortController | null>(null);
  const searchId = useId();
  const watchlistRestored = useRef(false);
  const athlete = data.result.selected;
  const moment = athlete?.moments.rows.find(row => row.id === momentId) ?? null;
  const view: View = moment ? "moment" : "athlete";

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(WATCHLIST_KEY) ?? "[]") as unknown;
      if (Array.isArray(saved)) {
        const recovered = saved.filter((row): row is WorkspaceAthleteSummary => Boolean(row && typeof row === "object" && UUID.test(row.id) && typeof row.name === "string" && row.name.length <= 200)).map(row => ({ id: row.id, name: row.name, slug: typeof row.slug === "string" ? row.slug : "", school: typeof row.school === "string" ? row.school : null, position: typeof row.position === "string" ? row.position : null, teamLabel: typeof row.teamLabel === "string" ? row.teamLabel : null, priority: null, priorityLabel: "Awaiting review" as const, hasIntelligence: false, portraitUrl: null, intelligenceState: "incomplete" as const }));
        setWatchlist(current => uniqueAthletes([...recovered, ...current]));
      }
    } catch { /* A blocked or stale browser session must not prevent graph inspection. */ }
    watchlistRestored.current = true;
    if (!initialMomentId) {
      const requested = new URL(window.location.href).searchParams.get("moment");
      if (requested && initial.result.selected?.moments.rows.some(row => row.id === requested)) { setMomentId(requested); setTab("evidence"); }
    }
    return () => { selectionRequest.current?.abort(); searchRequest.current?.abort(); };
  }, [initialMomentId, initial.result.selected]);
  useEffect(() => {
    if (!watchlistRestored.current) return;
    try { sessionStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist.map(({ id, name, slug, school, position, teamLabel }) => ({ id, name, slug, school, position, teamLabel })))); } catch { /* Session storage is optional. */ }
  }, [watchlist]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!searchHost.current?.contains(event.target as Node)) setSearchOpen(false); if (!watchlistHost.current?.contains(event.target as Node) && !watchlistToggle.current?.contains(event.target as Node)) setWatchlistOpen(false); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape" && watchlistOpen) { setWatchlistOpen(false); watchlistToggle.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [watchlistOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    const timeout = window.setTimeout(async () => {
      setSearchBusy(true); setSearchError("");
      try {
        const response = await fetch(`/api/admin/intelligence?${new URLSearchParams({ q: query, asOf: data.result.asOf })}`, { signal: controller.signal, credentials: "same-origin", cache: "no-store" });
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Your session cannot access athlete search. Sign in again." : "Athlete search could not be loaded. Try again.");
        const next = await response.json() as WorkspaceResult;
        if (controller.signal.aborted) return;
        setSearchRows(next.result.search.rows); setSearchState(next.result.search.state); setSearchTruncated(next.result.search.truncated); setActiveOption(-1);
      } catch (failure) { if (!controller.signal.aborted) setSearchError(failure instanceof Error ? failure.message : "Athlete search could not be loaded."); }
      finally { if (!controller.signal.aborted) setSearchBusy(false); }
    }, 250);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [query, searchOpen, data.result.asOf]);

  const selectAthlete = useCallback(async (row: WorkspaceAthleteSummary, evaluationDate = data.result.asOf) => {
    setSearchOpen(false); setWatchlistOpen(false); setSearchError(""); setNotice(""); setError("");
    selectionRequest.current?.abort();
    const controller = new AbortController(); selectionRequest.current = controller;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/intelligence?${new URLSearchParams({ athlete: row.id, q: query, asOf: evaluationDate })}`, { signal: controller.signal, credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Your session cannot access this career file. Sign in again." : "The career file could not be loaded. Your current file is still available.");
      const next = await response.json() as WorkspaceResult;
      if (controller.signal.aborted) return;
      setData(next); setAsOf(next.result.asOf); setMomentId(null); setTab("intelligence");
      const actual = summaryFor(next);
      if (actual) {
        setWatchlist(current => uniqueAthletes([...current, actual]));
        updateAddress(actual.id, next.result.asOf, query, null);
      }
      if (next.result.selectionState !== "ready") setNotice(next.result.selectionState === "not_found" ? "This Athlete Career ID could not be found." : "This athlete selection is unavailable.");
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "The career file could not be loaded."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }, [data.result.asOf, query]);
  function addToWatchlist(row: WorkspaceAthleteSummary) {
    if (watchlist.some(item => item.id === row.id)) return;
    setWatchlist(current => uniqueAthletes([...current, row]));
    setNotice(`${row.name} added to this browser-session watchlist.`);
  }
  function inspectMoment(id: string) {
    if (!athlete?.moments.rows.some(row => row.id === id)) return;
    setMomentId(id); setTab("evidence"); updateAddress(athlete.id, data.result.asOf, query, id);
    document.getElementById("career-folder")?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  function backToAthlete() { setMomentId(null); setTab("intelligence"); if (athlete) updateAddress(athlete.id, data.result.asOf, query, null); }
  function searchKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { event.preventDefault(); setSearchOpen(false); searchRequest.current?.abort(); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setSearchOpen(true); setActiveOption(index => Math.max(0, Math.min(searchRows.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))); }
    if (event.key === "Enter" && searchOpen && activeOption >= 0 && searchRows[activeOption]) { event.preventDefault(); void selectAthlete(searchRows[activeOption]); }
  }
  const tabs: Tab[] = view === "athlete" ? ["intelligence", "moments", "media"] : ["evidence", "connections", "media"];
  const activeTab = tabs.includes(tab) ? tab : tabs[0];
  return <div className={styles.workspace}>
    <header className={styles.topbar}>
      <div className={styles.brand}><span className={styles.brandIcon}><FlaskConical size={20} aria-hidden="true" /></span><div><h1>Intelligence Lab</h1><p className={styles.eyebrow}>BLTZ · Career intelligence</p></div></div>
      <div className={styles.searchWrap} ref={searchHost} onKeyDown={event => { if (event.key === "Escape") { searchInput.current?.focus(); setSearchOpen(false); searchRequest.current?.abort(); } }}><form role="search" aria-label="Search career graph" className={styles.searchForm} onSubmit={event => { event.preventDefault(); setSearchOpen(true); }}><Search size={16} aria-hidden="true" /><label className={styles.srOnly} htmlFor={searchId}>Search athletes, teams and moments</label><input ref={searchInput} id={searchId} className={styles.searchInput} type="search" role="combobox" aria-autocomplete="list" aria-expanded={searchOpen} aria-controls={`${searchId}-results`} aria-activedescendant={searchOpen && activeOption >= 0 ? `${searchId}-option-${activeOption}` : undefined} placeholder="Search athletes, teams and moments..." maxLength={120} autoComplete="off" value={query} onFocus={() => setSearchOpen(true)} onChange={event => { setQuery(event.target.value); setActiveOption(-1); setSearchOpen(true); }} onKeyDown={searchKeys} /></form>
        {searchOpen && <div className={styles.searchPopover}>{searchBusy && <p className={styles.searchStatus} role="status">Searching career records…</p>}{searchError && <p className={styles.searchStatus} role="alert">{searchError}</p>}{searchState === "unavailable" && <p className={styles.searchStatus}>Search is unavailable. Try reloading.</p>}<ul id={`${searchId}-results`} role="listbox" aria-label="Matching athletes">{searchRows.map((row, index) => { const added = watchlist.some(item => item.id === row.id); return <li key={row.id} role="presentation" className={styles.searchResultRow}><button type="button" id={`${searchId}-option-${index}`} className={styles.searchResult} role="option" aria-selected={activeOption === index} onClick={() => void selectAthlete(row)}><span className={styles.avatar}><PortraitImage url={row.portraitUrl} name={row.name} /></span><span><strong>{row.name}</strong><small>{row.school ?? row.teamLabel ?? "School or team not recorded"}</small></span></button><button type="button" className={styles.searchAdd} disabled={added} aria-label={added ? `${row.name} already in watchlist` : `Add ${row.name} to watchlist`} onClick={() => addToWatchlist(row)}>{added ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}</button></li>; })}</ul>{!searchBusy && !searchRows.length && searchState === "ready" && <p className={styles.searchStatus}>No canonical athletes match. Try a name, team or Moment.</p>}{searchTruncated && <p className={styles.searchStatus}>First matching records shown. Refine the search for more.</p>}</div>}
      </div>
      <div className={styles.topActions}><button ref={watchlistToggle} type="button" className={styles.mobileWatchlistToggle} aria-label="Open athlete watchlist" aria-expanded={watchlistOpen} aria-controls="career-watchlist" onClick={() => setWatchlistOpen(!watchlistOpen)}><Users size={16} aria-hidden="true" /></button><button type="button" className={styles.themeButton} disabled={!themeReady} onClick={() => setTheme(darkAppearance ? "light" : "dark")} aria-label={darkAppearance ? "Use light appearance" : "Use dark appearance"}>{darkAppearance ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}</button></div>
    </header>
    {error && <p className={styles.notice} role="alert"><CircleAlert size={16} aria-hidden="true" />{error}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.columns}>
      <aside ref={watchlistHost} id="career-watchlist" className={styles.watchlist} aria-label="Athlete watchlist" data-mobile-open={watchlistOpen}><div className={styles.listHeading}><h2>Review watchlist</h2><span>{watchlist.length}</span><button type="button" className={styles.mobileWatchlistClose} aria-label="Close athlete watchlist" onClick={() => { setWatchlistOpen(false); watchlistToggle.current?.focus(); }}><X size={15} aria-hidden="true" /></button></div>{data.directory.state === "unavailable" && <p className={styles.listNote}>Priority records could not be loaded.</p>}<ul>{watchlist.map(row => <li key={row.id} className={styles.athleteRow} data-selected={athlete?.id === row.id}><button type="button" className={styles.athleteSelect} aria-current={athlete?.id === row.id ? "true" : undefined} onClick={() => void selectAthlete(row)}><span className={styles.avatar}><PortraitImage url={row.portraitUrl} name={row.name} /></span><span className={styles.athleteRowText}><strong>{row.name}</strong><small>{row.school ?? row.teamLabel ?? "Affiliation not recorded"}</small><span className={styles.priorityLine}><span className={styles.priorityDot} data-priority={reviewPriority(row.priority)} aria-hidden="true" />{reviewPriority(row.priority)}</span></span></button><button type="button" className={styles.removeAthlete} aria-label={`Remove ${row.name} from watchlist`} onClick={() => { setWatchlist(current => current.filter(item => item.id !== row.id)); setNotice(`${row.name} removed from this browser-session watchlist.`); }}><X size={14} aria-hidden="true" /></button></li>)}</ul>{!watchlist.length && <p className={styles.listNote}>Search and add an athlete to this browser-session watchlist.</p>}<p className={styles.listNote}>Priorities come from qualifying signals. Added athletes await review until evidence supports a score.</p>{data.directory.truncated && <p className={styles.listNote}>Priority coverage is bounded. Search finds additional athletes.</p>}</aside>
      <div className={styles.center} aria-busy={busy}>
        {busy && <p className={styles.srOnly} role="status">Loading career file…</p>}
        {!athlete ? <section className={`${styles.empty} ${styles.emptyFile}`}><Users size={28} aria-hidden="true" /><h2>{data.result.selectionState === "not_found" ? "Athlete not found" : data.result.selectionState === "invalid" ? "Invalid athlete selection" : "Select an athlete"}</h2><p>Search for an existing Athlete Career ID to inspect its career, Moments and evidence.</p></section> : <>
          <Identity key={athlete.id} athlete={athlete} profile={data.profile} onNotice={setNotice} />
          {data.profileState === "unavailable" && <p className={styles.sectionDescription} role="status">Portrait and profile metadata could not be loaded.</p>}
          <div className={styles.folderWrap} id="career-folder"><div className={styles.folder}><FolderTabs view={view} active={activeTab} onChange={setTab} /><div className={styles.folderBody}>
            {moment && <MomentHeader moment={moment} onBack={backToAthlete} />}
            {tabs.map(key => <section key={`${view}-${key}`} id={`career-panel-${key}`} className={styles.folderPanel} role="tabpanel" aria-labelledby={`career-tab-${key}`} tabIndex={0} hidden={activeTab !== key}>
              {key === "intelligence" && <AthleteIntelligence data={data} onMoment={inspectMoment} />}
              {key === "moments" && <MomentCards athlete={athlete} onMoment={inspectMoment} />}
              {key === "media" && (moment ? <MomentMedia /> : <AthleteMedia data={data} />)}
              {key === "evidence" && moment && (moment.evidence.length ? <SourceGrid rows={moment.evidence} /> : <p className={styles.sectionDescription}>Supporting evidence is not recorded or could not be loaded.</p>)}
              {key === "connections" && moment && <MomentConnections moment={moment} />}
            </section>)}
          </div></div></div>
          <form className={styles.evaluation} onSubmit={event => { event.preventDefault(); const row = summaryFor(data); if (row && exactDay(asOf)) void selectAthlete(row, asOf); }}><label htmlFor="career-evaluation-date">Evaluation date · UTC</label><input type="date" id="career-evaluation-date" value={asOf} onChange={event => setAsOf(event.target.value)} /><button type="submit" disabled={busy || !exactDay(asOf)}>Re-evaluate</button></form>
        </>}
      </div>
      <IntelligenceRail athlete={athlete} moment={moment} evaluatedAt={data.result.evaluatedAt ?? data.result.asOf} onMoment={inspectMoment} />
    </div>
  </div>;
}
