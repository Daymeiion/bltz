"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { ChevronDown, ExternalLink, FlaskConical, Mail, Moon, Network, Phone, Search, Sparkles, Sun, Target, Zap } from "lucide-react";
import type { WorkspaceAthleteSummary, WorkspaceResult } from "@/lib/intelligence/workspace-types";
import { safeSourceUrl } from "@/lib/intelligence/lab-format";
import { signalHeadline, VERDICT_LABEL, whenLabel } from "@/lib/intelligence/signal-copy";
import { confidencePercent, reviewPriority } from "../CareerWorkspace";
import { buildModel, firstSentence, human, initials, type LockerMedia, type MediaItem, type Model } from "./model";
import { ActivationComposer, ActivationList, MomentRow, SignalCard, type Activation, type ActivationDraft } from "./StoryParts";
import { PickerProvider } from "./SourcePickers";
import styles from "./lab.module.css";

const LAB = "/admin/intelligence";
type Props = { data: WorkspaceResult; m: Model };
function labHref(params: Record<string, string | null | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  return `${LAB}?${query}`;
}

/* ---------- atoms ---------- */

function Portrait({ url, name, size }: { url: string | null; name: string; size: "xl" | "md" | "sm" }) {
  const [failed, setFailed] = useState(false);
  const safe = safeSourceUrl(url);
  if (!safe || failed) return <span className={styles.portraitFallback} data-size={size}><strong aria-hidden="true">{initials(name)}</strong></span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={styles.portrait} data-size={size} src={safe} alt={size === "sm" ? "" : name} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}
function Ring({ value, kind }: { value: number | null; kind: "priority" | "confidence" }) {
  const pct = kind === "confidence" ? confidencePercent(value) : value !== null && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  const label = kind === "priority" ? reviewPriority(pct) : null;
  const text = pct === null ? "?" : kind === "priority" ? label === "Awaiting review" ? "?" : label : `${pct}%`;
  return <div className={styles.ringWrap}><div className={styles.ring} data-priority={label ?? undefined} role="img" aria-label={`${kind === "priority" ? "Review priority" : "Evidence confidence"}: ${pct === null ? "not recorded" : text}`}>
    <svg viewBox="0 0 64 64" aria-hidden="true"><circle className={styles.ringTrack} cx="32" cy="32" r="27" />{pct !== null && <circle className={styles.ringArc} cx="32" cy="32" r="27" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - pct} />}</svg><span>{text}</span>
  </div><small>{kind === "priority" ? "Priority" : "Confidence"}</small></div>;
}
function Section({ title, icon, children, action }: { title: string; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return <section className={styles.block}><header className={styles.blockHead}><h3>{icon}{title}</h3>{action}</header>{children}</section>;
}

/* ---------- shell: approved three columns ---------- */

export function LabWorkspace({ data, locker, initialMomentId = null }: { data: WorkspaceResult; locker: LockerMedia; initialMomentId?: string | null }) {
  const m = useMemo(() => buildModel(data), [data]);
  const [activations, setActivations] = useState<Activation[]>([]);
  const athleteId = m.athlete?.id ?? null;
  return <PickerProvider value={{ locker, athleteName: m.athlete?.name ?? "" }}><div className={styles.root}>
    <TopBar data={data} />
    <div className={styles.columns}>
      <Watchlist data={data} m={m} />
      <main className={styles.center} key={athleteId ?? "none"}>
        {!m.athlete ? <div className={styles.mapEmpty}><Search size={24} aria-hidden="true" /><p>{data.result.selectionState === "not_found" ? "That athlete could not be found. Search for another." : data.result.selectionState === "invalid" ? "That athlete link is not valid. Search for an athlete." : "Search for an athlete to open their career file."}</p></div>
          : <Story data={data} m={m} initialMomentId={initialMomentId} onActivation={value => setActivations(current => [{ ...value, id: `draft-${Date.now()}` }, ...current])} />}
      </main>
      <Rail m={m} activations={activations} />
    </div>
  </div></PickerProvider>;
}

function TopBar({ data }: { data: WorkspaceResult }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // next-themes only knows the theme after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const [asOf, setAsOf] = useState(data.result.asOf);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(asOf);
  return <header className={styles.topbar}>
    <div className={styles.brand}><span className={styles.brandIcon}><FlaskConical size={18} aria-hidden="true" /></span><h1>Intelligence Lab</h1></div>
    <div className={styles.topActions}>
      <form className={styles.evalForm} onSubmit={event => { event.preventDefault(); if (valid) router.push(labHref({ athlete: data.result.selected?.id, asOf })); }}>
        <label htmlFor="lab-as-of">Evaluation date</label>
        <input id="lab-as-of" type="date" value={asOf} onChange={event => setAsOf(event.target.value)} />
        <button type="submit" className={styles.ghostButton} disabled={!valid || asOf === data.result.asOf}>Update</button>
      </form>
      <Link className={styles.ghostButton} href={labHref({ view: "findings" })}>Findings</Link>
      <button type="button" className={styles.themeToggle} disabled={!mounted} onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>{dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button>
    </div>
  </header>;
}

/** Searches canonical athletes through the existing authorized Lab API; the watchlist shows prioritized athletes. */
function Watchlist({ data, m }: Props) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<WorkspaceAthleteSummary[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const listId = useId();
  const term = query.trim();
  useEffect(() => {
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState("loading");
      try {
        const response = await fetch(`/api/admin/intelligence?${new URLSearchParams({ q: term, asOf: data.result.asOf })}`, { signal: controller.signal, credentials: "same-origin", cache: "no-store" });
        if (!response.ok) throw new Error("search_failed");
        const body = await response.json() as WorkspaceResult;
        setRows(body.result.search.rows); setState("ready");
      } catch { if (!controller.signal.aborted) setState("error"); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [term, data.result.asOf]);
  const searching = term.length >= 2;
  const row = (athlete: WorkspaceAthleteSummary) => {
    const next = athlete.next;
    const meta = next ? `${next.headline} · ${whenLabel(next.daysUntil)}` : athlete.link ? "Link the player record to load career facts" : athlete.school ?? athlete.teamLabel ?? "Nothing dated on file";
    if (athlete.link) return <li key={athlete.id}><div className={styles.watchRow}>
      <Portrait url={athlete.portraitUrl} name={athlete.name} size="sm" />
      <span><strong>{athlete.name}</strong><small>{meta}</small></span>
      <LinkRecord athlete={athlete} link={athlete.link} />
    </div></li>;
    const priority = reviewPriority(athlete.priority);
    return <li key={athlete.id}><Link href={labHref({ athlete: athlete.id, asOf: data.result.asOf })} className={styles.watchRow} aria-current={m.athlete?.id === athlete.id ? "true" : undefined}>
      <Portrait url={athlete.portraitUrl} name={athlete.name} size="sm" />
      <span><strong>{athlete.name}</strong><small>{meta}</small></span>
      <span className={styles.watchSide}>
        {next ? <em data-verdict={next.verdict}>{VERDICT_LABEL[next.verdict]}</em> : <em data-priority={priority}>{priority === "Awaiting review" ? "No signal" : priority}</em>}
        {athlete.pendingReview > 0 && <small className={styles.reviewCount}>{athlete.pendingReview} to review</small>}
      </span>
    </Link></li>;
  };
  return <aside className={styles.watch} aria-label="Athletes">
    <label className={styles.search}><Search size={17} aria-hidden="true" /><span className={styles.srOnly}>Search athletes, teams and moments</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search athletes, teams and moments…" maxLength={120} aria-controls={listId} /></label>
    {searching ? <>
      <h2 className={styles.watchTitle}>Results {state === "ready" && <span>{rows.length}</span>}</h2>
      <ul id={listId} className={styles.watchList} aria-busy={state === "loading"}>{state === "ready" && rows.map(row)}</ul>
      {state === "loading" && <p className={styles.quiet}>Searching…</p>}
      {state === "error" && <p className={styles.quiet} role="alert">Search is unavailable. Try again.</p>}
      {state === "ready" && !rows.length && <p className={styles.quiet}>No athletes match “{term}”.</p>}
    </> : <>
      <h2 className={styles.watchTitle}>Cohort <span>{m.watchlist.length}</span></h2>
      <ul id={listId} className={styles.watchList}>{m.watchlist.map(row)}</ul>
      {!m.watchlist.length && <p className={styles.quiet}>Preview-Locker athletes appear here, soonest signal first. Search to open anyone else.</p>}
      {data.directory.state === "unavailable" && <p className={styles.quiet}>The watchlist could not be loaded. Search still works.</p>}
    </>}
  </aside>;
}

/** Uses the existing audited identity review (admin session + database audit log). */
function LinkRecord({ athlete, link }: { athlete: WorkspaceAthleteSummary; link: NonNullable<WorkspaceAthleteSummary["link"]> }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [message, setMessage] = useState("");
  async function run() {
    const question = link.existingPlayerName
      ? `Link ${athlete.name}'s preview Locker to the existing player record "${link.existingPlayerName}" (NFL ID ${link.gsisId})?`
      : `No player record exists for ${athlete.name}. Create one from the NFL master list (NFL ID ${link.gsisId}) and link the preview Locker?`;
    if (!window.confirm(question)) return;
    setState("busy");
    try {
      const response = await fetch("/api/admin/sportradar", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link_identity", previewId: link.previewId, gsisId: link.gsisId, existingPlayerId: link.existingPlayerId, approved: true }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Link failed.");
      router.refresh();
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "Link failed."); return; }
    setState("idle");
  }
  return <span className={styles.watchSide}>
    <button type="button" className={styles.ghostButton} data-size="sm" onClick={run} disabled={state === "busy"}>{state === "busy" ? "Linking…" : "Link record"}</button>
    {state === "error" && <small role="alert" className={styles.reviewCount} title={message}>Failed</small>}
  </span>;
}

function Rail({ m, activations }: { m: Model; activations: Activation[] }) {
  const title = (id: string | null) => m.moments.find(row => row.id === id)?.title ?? (id ? "Career signal" : "Athlete signal");
  // Opportunities are decisions to make now: anything beyond the 90-day planning horizon waits.
  const actionable = m.opportunities.filter(opp => m.signals.find(row => opp.signalKeys.includes(row.key))?.verdict !== "upcoming");
  return <aside className={styles.rail} aria-label="Intelligence findings">
    <RailSection icon={<Zap size={16} aria-hidden="true" />} title="Signals" count={m.signals.length}>
      {m.signals.map((signal, index) => <details key={signal.key} className={styles.railCard} open={index === 0}><summary><span><small data-verdict={signal.verdict}>{VERDICT_LABEL[signal.verdict]} · {whenLabel(signal.daysUntil)}</small><strong>{signalHeadline(signal)}</strong></span><ChevronDown size={16} aria-hidden="true" /></summary>
        <div className={styles.railBody}><div className={styles.rings}><Ring value={signal.score} kind="priority" /><Ring value={signal.confidence} kind="confidence" /></div><p>{firstSentence(signal.explanation)}</p><p className={styles.quiet}>{signal.evidence.length} supporting source{signal.evidence.length === 1 ? "" : "s"}</p></div></details>)}
      {!m.signals.length && <p className={styles.quiet}>{!m.athlete ? "Select an athlete." : m.ready ? "No dated facts on file yet." : "Waiting on complete evidence."}</p>}
    </RailSection>
    <RailSection icon={<Target size={16} aria-hidden="true" />} title="Opportunities" count={actionable.length}>
      {actionable.map(opp => <details key={opp.key} className={styles.railCard}><summary><span><small>{title(opp.momentId)}</small><strong>{human(opp.type)}</strong></span><ChevronDown size={16} aria-hidden="true" /></summary>
        <div className={styles.railBody}><div className={styles.rings}><Ring value={opp.strength} kind="priority" /><Ring value={opp.confidence} kind="confidence" /></div>{m.signals.some(row => opp.signalKeys.includes(row.key) && firstSentence(row.explanation) === firstSentence(opp.explanation)) ? <p className={styles.quiet}>From {opp.signalKeys.length} signal{opp.signalKeys.length === 1 ? "" : "s"}. Ready for review.</p> : <p>{firstSentence(opp.explanation)}</p>}</div></details>)}
      {!actionable.length && <p className={styles.quiet}>Nothing in the next 90 days.</p>}
    </RailSection>
    <RailSection icon={<Sparkles size={16} aria-hidden="true" />} title="Activations" count={activations.length}><ActivationList items={activations} m={m} /></RailSection>
  </aside>;
}
function RailSection({ icon, title, count, children }: { icon: ReactNode; title: string; count: number; children: ReactNode }) {
  return <section className={styles.railSection}><h2>{icon}{title}<span>{count}</span></h2><div className={styles.railList}>{children}</div></section>;
}

/* ---------- identity ---------- */

function Identity({ data, m }: Props) {
  const athlete = m.athlete!;
  const profile = data.profile;
  const locker = profile?.lockerHref && /^\/(?:preview-lockers|locker)\/[a-zA-Z0-9._~-]+$/.test(profile.lockerHref) ? profile.lockerHref : null;
  const meta = [athlete.school ?? athlete.teamLabel, profile?.sport, athlete.position].filter(Boolean).join(" · ") || "Affiliation not recorded";
  const status = profile?.status ?? (m.lastSeason ? `Last recorded season ${m.lastSeason.season}, ${m.lastSeason.team}` : "Career status not recorded");
  return <header className={styles.identity}>
    <Portrait url={profile?.portraitUrl ?? null} name={athlete.name} size="xl" />
    <div className={styles.idInfo}>
      <h2 className={styles.idName}>{athlete.name}</h2>
      <p className={styles.idMeta}>{meta}</p>
      <p className={styles.idStatus}>{status}</p>
      <div className={styles.contacts}>
        <span className={styles.contact} data-off="true"><i><Mail size={17} aria-hidden="true" /></i>Email not recorded</span>
        {locker ? <a className={styles.contact} href={locker} target="_blank" rel="noopener noreferrer"><i><ExternalLink size={17} aria-hidden="true" /></i>Locker preview</a> : <span className={styles.contact} data-off="true"><i><ExternalLink size={17} aria-hidden="true" /></i>No Locker</span>}
        <span className={styles.contact} data-off="true"><i><Phone size={17} aria-hidden="true" /></i>Phone not recorded</span>
        <span className={styles.contact} data-off={!profile?.socialLinks.length}><i><Network size={17} aria-hidden="true" /></i>{profile?.socialLinks.length ? `${profile.socialLinks.length} links` : "No social links"}</span>
      </div>
    </div>
  </header>;
}

/* ---------- middle column ---------- */

function Story({ data, m, onActivation, initialMomentId }: Props & { onActivation: (value: ActivationDraft) => void; initialMomentId: string | null }) {
  const reduce = useReducedMotion();
  const startMoment = m.moments.some(row => row.id === initialMomentId) ? initialMomentId : null;
  const [focus, setFocus] = useState<string | null>(null);
  const [active, setActive] = useState("intel");
  const [open, setOpen] = useState<string | null>(startMoment);
  const [links, setLinks] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState<Partial<ActivationDraft> | null>(null);
  const [added, setAdded] = useState<MediaItem[]>([]);
  const mm = useMemo(() => ({ ...m, media: [...added, ...m.media] }), [m, added]);
  const focusTimer = useRef<number | null>(null);
  function go(id: string) {
    setFocus(id);
    requestAnimationFrame(() => document.getElementById(`moment-${id}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }));
    if (focusTimer.current) window.clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(() => setFocus(current => current === id ? null : current), 2200);
  }
  useEffect(() => {
    if (startMoment) requestAnimationFrame(() => document.getElementById(`moment-${startMoment}`)?.scrollIntoView({ block: "center" }));
    const sections = ["intel", "moments"].map(id => document.getElementById(`story-${id}`)).filter((node): node is HTMLElement => Boolean(node));
    const observer = new IntersectionObserver(entries => { const top = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (top) setActive(top.target.id.replace("story-", "")); }, { rootMargin: "-20% 0px -60% 0px" });
    sections.forEach(node => observer.observe(node));
    // The last section can be too short to reach the trigger line, so seeing the end of the page selects it.
    const end = document.getElementById("story-end");
    const tail = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) setActive("moments"); });
    if (end) tail.observe(end);
    return () => { observer.disconnect(); tail.disconnect(); if (focusTimer.current) window.clearTimeout(focusTimer.current); };
  }, [startMoment]);
  const openMoment = (id: string) => { setOpen(id); go(id); };
  const pending = m.moments.filter(row => row.status === "candidate");
  const tabs = [["intel", "Intelligence"], ["moments", "Moments"]] as const;
  return <div className={styles.story}>
    <Identity data={data} m={m} />
    <nav className={styles.storyNav} aria-label="Sections">{tabs.map(([id, label]) => <a key={id} href={`#story-${id}`} aria-current={active === id ? "true" : undefined} onClick={event => { event.preventDefault(); document.getElementById(`story-${id}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); }}>{active === id && <motion.span layoutId="story-pill" className={styles.storyPill} transition={{ type: "spring", stiffness: 300, damping: 30 }} />}<span>{label}</span></a>)}</nav>
    <div id="story-intel" className={styles.anchor}>
      <Section title="Intelligence" icon={<Zap size={18} aria-hidden="true" />}>{pending.length > 0 && <div className={styles.reviewBanner}>
        <p><strong>{pending.length} game Moment{pending.length === 1 ? "" : "s"}</strong> imported from nflverse {pending.length === 1 ? "needs" : "need"} your review. Approved ones become signals.</p>
        <button type="button" className={styles.primaryButton} onClick={() => openMoment(pending[0].id)}>Review</button>
      </div>}<SignalCard m={mm} links={links} hasContact={Boolean(data.profile?.email || data.profile?.phone)} onMoment={openMoment} onCreate={setDraft} /></Section>
    </div>
    <div id="story-moments" className={styles.anchor}><Section title="Moments" action={m.moments.length ? <span className={styles.quiet}>{m.moments.length}</span> : undefined}>{m.moments.length ? <div className={styles.momentStack}>{m.moments.map(moment => <MomentRow key={moment.id} moment={moment} m={mm} open={open === moment.id} onAddMedia={items => setAdded(current => { const known = new Set([...current, ...m.media].map(row => row.id)); return [...items.filter(row => !known.has(row.id)), ...current]; })} onCreate={setDraft} onToggle={() => setOpen(open === moment.id ? null : moment.id)} linked={links[moment.id] ?? []} onLink={ids => setLinks(current => ({ ...current, [moment.id]: ids }))} highlight={focus === moment.id} />)}</div> : <p className={styles.quiet}>{m.athlete!.moments.state === "unavailable" ? "Moments could not be loaded. Try reloading." : "No Moments linked yet."}</p>}</Section></div>
    <div id="story-end" aria-hidden="true" />
    {draft && <ActivationComposer key={JSON.stringify(draft)} draft={draft} m={mm} links={links} onClose={() => setDraft(null)} onSave={value => { onActivation(value); setDraft(null); }} />}
  </div>;
}
