"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTheme } from "next-themes";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Eye,
  FileSearch,
  Filter,
  Gauge,
  Layers3,
  Moon,
  RotateCcw,
  ScanSearch,
  Sparkles,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  BetaAthleteSummary,
  BetaDashboardFilters,
  BetaIntelligenceReadModel,
  InsightSeverity,
  InsightStatus,
} from "@/lib/beta-intelligence/contracts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const categoryLabels: Record<string, string> = {
  missing_career_media: "Missing career media",
  incorrect_career_information: "Incorrect career information",
  outdated_athlete_profiles: "Outdated athlete profiles",
  fragmented_identity: "Fragmented identity",
  missing_awards: "Missing awards",
  missing_stats: "Missing stats",
  social_identity_issues: "Social identity issues",
  search_discoverability: "Search discoverability",
  brand_consistency: "Brand consistency",
  legacy_gaps: "Legacy gaps",
};

const initialFilters: BetaDashboardFilters = {
  cohort: "all",
  participantStatus: "all",
  dateRange: "all",
  insightCategory: "all",
  insightSeverity: "all",
  insightStatus: "all",
};

function formatCategory(value: string) {
  return categoryLabels[value] ?? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function percent(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

export function filterBetaAthletes(
  athletes: BetaAthleteSummary[],
  filters: Pick<BetaDashboardFilters, "cohort" | "participantStatus" | "dateRange">,
  now = new Date(),
) {
  const days = filters.dateRange === "all" ? null : Number(filters.dateRange.replace("d", ""));
  const cutoff = days === null ? null : new Date(now.getTime() - days * 86_400_000);

  return athletes.filter((athlete) => {
    const inCohort = filters.cohort === "all" || athlete.cohort === filters.cohort;
    const inStatus = filters.participantStatus === "all" || athlete.status === filters.participantStatus;
    const inDateRange = !cutoff || (athlete.invitedAt !== null && new Date(athlete.invitedAt) >= cutoff);
    return inCohort && inStatus && inDateRange;
  });
}

const panel = "border border-neutral-200/90 bg-white/85 shadow-[0_18px_60px_rgba(23,23,23,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/75 dark:shadow-[0_24px_80px_rgba(0,0,0,0.24)]";

function StatusTag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "gold" | "green" | "red" }) {
  const tones = {
    neutral: "border-neutral-300 bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    gold: "border-amber-300 bg-amber-100 text-amber-950 dark:border-[#ffbb00]/30 dark:bg-[#ffbb00]/10 dark:text-[#ffd45d]",
    green: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    red: "border-red-300 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  };
  return <span className={cn("inline-flex rounded-full border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]", tones[tone])}>{children}</span>;
}

function FilterSelect({ label, value, onValueChange, options }: { label: string; value: string; onValueChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="min-w-0 flex-1 sm:min-w-40">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full rounded-xl border-neutral-200 bg-white text-neutral-900 shadow-none focus:ring-[#ffbb00]/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-12 text-center">
      <FileSearch className="mb-4 h-7 w-7 text-neutral-400" aria-hidden="true" />
      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
      <p className="mt-2 max-w-md text-xs leading-5 text-neutral-500 dark:text-neutral-400">{description}</p>
    </div>
  );
}

function AthleteDetail({ athlete }: { athlete: BetaAthleteSummary | null }) {
  if (!athlete) return null;
  const activityRows = [
    ["Locker views", athlete.activity.lockerViews], ["Shares", athlete.activity.shares],
    ["Film Room opens", athlete.activity.filmRoomOpens], ["Photos opens", athlete.activity.photosOpens],
    ["Profile edits", athlete.activity.profileEdits], ["Media uploads", athlete.activity.mediaUploads],
  ];

  return (
    <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-neutral-200 bg-neutral-50 p-0 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
      <DialogHeader className="border-b border-neutral-200 px-6 py-6 pr-12 dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-3">
          <DialogTitle className="text-2xl tracking-tight">{athlete.name}</DialogTitle>
          <StatusTag tone={athlete.status === "completed" ? "green" : "neutral"}>{athlete.status}</StatusTag>
        </div>
        <DialogDescription className="text-neutral-500 dark:text-neutral-400">{athlete.cohort} · Last activity {formatDate(athlete.activity.lastActivityAt)}</DialogDescription>
      </DialogHeader>
      <div className="space-y-7 p-6">
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Locker activity</h3>
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-800">
            {activityRows.map(([label, value]) => (
              <div key={label} className="border-b border-r border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-[11px] text-neutral-500">{label}</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Feedback</h3>
          {athlete.feedback ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="grid grid-cols-3 gap-4">
                {[["Locker value", athlete.feedback.lockerValueRating], ["Career accuracy", athlete.feedback.careerAccuracyRating], ["Media value", athlete.feedback.mediaValueRating]].map(([label, value]) => (
                  <div key={label}><p className="text-[10px] text-neutral-500">{label}</p><p className="mt-1 text-lg font-semibold">{value ?? "—"}<span className="text-xs text-neutral-400">/5</span></p></div>
                ))}
              </div>
              <p className="mt-5 border-t border-neutral-200 pt-4 text-sm leading-6 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">{athlete.feedback.biggestProblem ?? "No qualitative response provided."}</p>
            </div>
          ) : <EmptyState title="No feedback yet" description="Structured feedback has not been completed for this athlete." />}
        </section>
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Insights discovered</h3>
          {athlete.insights.length ? <div className="space-y-3">{athlete.insights.map((insight) => (
            <article key={insight.id} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-wrap items-center gap-2"><p className="mr-auto text-sm font-semibold">{formatCategory(insight.category)}</p><StatusTag tone={insight.severity === "critical" ? "red" : insight.severity === "high" ? "gold" : "neutral"}>{insight.severity}</StatusTag><StatusTag>{insight.status}</StatusTag></div>
              <p className="mt-3 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{insight.description}</p>
            </article>
          ))}</div> : <EmptyState title="No insights discovered" description="No athlete problem records are associated with this participant." />}
        </section>
      </div>
    </DialogContent>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
    </button>
  );
}

export function BetaIntelligenceDashboard({ data }: { data: BetaIntelligenceReadModel }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedAthlete, setSelectedAthlete] = useState<BetaAthleteSummary | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const cohorts = useMemo(() => Array.from(new Set(data.athletes.map((athlete) => athlete.cohort))).sort(), [data.athletes]);
  const categories = useMemo(() => Array.from(new Set(data.athletes.flatMap((athlete) => athlete.insights.map((insight) => insight.category)))).sort(), [data.athletes]);
  const athletes = useMemo(() => filterBetaAthletes(data.athletes, filters, new Date(data.generatedAt)), [data, filters]);
  const insights = useMemo(() => athletes.flatMap((athlete) => athlete.insights).filter((insight) =>
    (filters.insightCategory === "all" || insight.category === filters.insightCategory) &&
    (filters.insightSeverity === "all" || insight.severity === filters.insightSeverity) &&
    (filters.insightStatus === "all" || insight.status === filters.insightStatus)
  ), [athletes, filters]);

  const funnel = [
    { label: "Invited", count: athletes.filter((a) => a.invitedAt).length },
    { label: "Joined", count: athletes.filter((a) => a.joinedAt).length },
    { label: "Viewed locker", count: athletes.filter((a) => a.lockerViewedAt).length },
    { label: "Claimed locker", count: athletes.filter((a) => a.lockerClaimedAt).length },
    { label: "Edited locker", count: athletes.filter((a) => a.lockerEditedAt).length },
    { label: "Shared locker", count: athletes.filter((a) => a.lockerSharedAt).length },
    { label: "Returned", count: athletes.filter((a) => a.activity.returned).length },
  ];
  const feedback = athletes.flatMap((athlete) => athlete.feedback ? [athlete.feedback] : []);
  const caseStudies = athletes.filter((athlete) => athlete.caseStudyCandidate);
  const claimRate = percent(funnel[3].count, funnel[0].count);
  const highPriority = insights.filter((item) => item.severity === "high" || item.severity === "critical").length;
  const problemGroups = Object.values(insights.reduce<Record<string, { category: string; count: number; open: number; high: number }>>((groups, insight) => {
    const group = groups[insight.category] ?? { category: insight.category, count: 0, open: 0, high: 0 };
    group.count += 1;
    if (insight.status === "open" || insight.status === "monitoring") group.open += 1;
    if (insight.severity === "high" || insight.severity === "critical") group.high += 1;
    groups[insight.category] = group;
    return groups;
  }, {})).sort((a, b) => b.count - a.count);
  const activeFilterCount = Object.values(filters).filter((value) => value !== "all").length;

  useGSAP(() => {
    const motion = gsap.matchMedia();
    motion.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-reveal]", { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power3.out" });
      gsap.fromTo("[data-word]", { opacity: 0.18 }, {
        opacity: 1,
        stagger: 0.08,
        scrollTrigger: { trigger: "[data-word-line]", start: "top 82%", end: "bottom 45%", scrub: true },
      });
      gsap.to("[data-marquee-track]", { xPercent: -50, duration: 28, repeat: -1, ease: "none" });
      gsap.utils.toArray<HTMLElement>("[data-stack-card]").forEach((card) => {
        gsap.fromTo(card, { y: 60, scale: 0.96, opacity: 0.35 }, {
          y: 0, scale: 1, opacity: 1, ease: "none",
          scrollTrigger: { trigger: card, start: "top 92%", end: "top 48%", scrub: true },
        });
      });
    });
    return () => motion.revert();
  }, { scope: rootRef, dependencies: [athletes.length, problemGroups.length] });

  const setFilter = <Key extends keyof BetaDashboardFilters>(key: Key, value: BetaDashboardFilters[Key]) => setFilters((current) => ({ ...current, [key]: value }));
  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div ref={rootRef} className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#f1f0ed] text-neutral-950 transition-colors duration-500 dark:bg-[#0b0c0e] dark:text-neutral-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(circle_at_75%_8%,rgba(255,187,0,0.14),transparent_32%),radial-gradient(circle_at_20%_20%,rgba(115,115,115,0.14),transparent_28%)] dark:bg-[radial-gradient(circle_at_75%_8%,rgba(255,187,0,0.10),transparent_30%),radial-gradient(circle_at_20%_20%,rgba(82,82,82,0.18),transparent_28%)]" />

      <div className="sticky top-0 z-30 border-b border-black/5 bg-[#f1f0ed]/85 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b0c0e]/85">
        <div className="mx-auto flex max-w-[1540px] items-center gap-2 px-4 py-3 sm:px-6 lg:px-10">
          <button onClick={() => jumpTo("overview")} className="mr-auto text-sm font-semibold tracking-tight">Beta Intelligence</button>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Dashboard sections">
            {[["Overview", "overview"], ["Activation", "activation"], ["Problems", "problems"], ["Participants", "participants"]].map(([label, id]) => (
              <button key={id} onClick={() => jumpTo(id)} className="rounded-full px-3 py-2 text-xs text-neutral-500 transition hover:bg-white hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white">{label}</button>
            ))}
          </nav>
          <button onClick={() => setFiltersOpen((open) => !open)} className="relative inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 text-xs font-medium transition hover:-translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-900">
            <Filter className="h-4 w-4" /> Filters
            {activeFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ffbb00] px-1 text-[10px] font-bold text-black">{activeFilterCount}</span>}
          </button>
          <ThemeToggle />
        </div>
        {filtersOpen && (
          <div className="border-t border-black/5 dark:border-white/10">
            <div className="mx-auto flex max-w-[1540px] flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:px-6 lg:px-10">
              <FilterSelect label="Cohort" value={filters.cohort} onValueChange={(value) => setFilter("cohort", value)} options={[{ value: "all", label: "All cohorts" }, ...cohorts.map((value) => ({ value, label: value }))]} />
              <FilterSelect label="Athlete status" value={filters.participantStatus} onValueChange={(value) => setFilter("participantStatus", value as BetaDashboardFilters["participantStatus"])} options={[{ value: "all", label: "All statuses" }, ...["invited", "active", "completed", "withdrawn"].map((value) => ({ value, label: value }))]} />
              <FilterSelect label="Invited" value={filters.dateRange} onValueChange={(value) => setFilter("dateRange", value as BetaDashboardFilters["dateRange"])} options={[{ value: "all", label: "All time" }, { value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "90d", label: "Last 90 days" }]} />
              <button onClick={() => setFilters(initialFilters)} className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
            </div>
          </div>
        )}
      </div>

      <main className="relative mx-auto max-w-[1540px] px-4 pb-28 sm:px-6 lg:px-10">
        <header id="overview" className="scroll-mt-28 pb-16 pt-16 sm:pb-24 sm:pt-24 lg:pb-28 lg:pt-28">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div data-reveal>
              <div className="mb-7 flex items-center gap-3"><StatusTag tone="gold">Phase one beta</StatusTag><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Internal intelligence</span></div>
              <h1 className="max-w-5xl text-[clamp(3rem,6vw,6.6rem)] font-semibold leading-[0.9] tracking-[-0.06em]">
                See the signal <span aria-hidden="true" className="mx-[0.06em] inline-block h-[0.55em] w-[1.35em] overflow-hidden rounded-full bg-[url('https://picsum.photos/seed/bltz-stadium-grey/320/160')] bg-cover bg-center align-[0.05em] grayscale contrast-125" /> before the noise.
              </h1>
            </div>
            <div data-reveal className="border-l border-neutral-300 pl-6 dark:border-neutral-700">
              <p data-word-line className="text-base leading-7 text-neutral-600 dark:text-neutral-300">
                {"A calmer operating view of athlete activation, product value, and the problems worth solving next.".split(" ").map((word, index) => <span data-word key={`${word}-${index}`} className="mr-[0.3em] inline-block">{word}</span>)}
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500"><Clock3 className="h-3.5 w-3.5" /> Snapshot {formatDate(data.generatedAt)}</div>
            </div>
          </div>
        </header>

        {data.source === "fixture" && (
          <div data-reveal role="status" className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-100/70 px-4 py-3 text-amber-950 dark:border-[#ffbb00]/20 dark:bg-[#ffbb00]/[0.07] dark:text-amber-100">
            <Database className="mt-0.5 h-4 w-4 shrink-0" />
            <div><p className="text-xs font-semibold">Fixture preview — not live beta data</p><p className="mt-1 text-[11px] leading-5 opacity-70">The interface is connected through a typed server boundary and is ready for the approved aggregate query.</p></div>
          </div>
        )}

        {athletes.length === 0 ? <section className={cn(panel, "rounded-3xl")}><EmptyState title="No beta athletes match these filters" description="Adjust the cohort, status, or invite date range to restore the cohort view." /></section> : <>
          <section data-reveal className="grid grid-flow-dense grid-cols-1 gap-3 lg:grid-cols-12" aria-label="Cohort overview">
            <article className={cn(panel, "group relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:col-span-8")}>
              <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_50%,rgba(255,187,0,0.12))] opacity-70" />
              <div className="relative flex min-h-64 flex-col justify-between">
                <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Locker claim rate</p><p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">The clearest activation signal in the current cohort.</p></div><Gauge className="h-6 w-6 text-neutral-400 transition-transform duration-700 group-hover:scale-110" /></div>
                <div className="mt-12 flex items-end justify-between gap-6"><p className="text-[clamp(4.5rem,10vw,8.5rem)] font-semibold leading-none tracking-[-0.08em]">{claimRate}<span className="text-[0.35em] text-neutral-400">%</span></p><div className="mb-3 text-right text-xs leading-5 text-neutral-500"><strong className="block text-base text-neutral-900 dark:text-white">{funnel[3].count} claimed</strong>from {funnel[0].count} invites</div></div>
              </div>
            </article>
            <article className={cn(panel, "group rounded-3xl p-6 lg:col-span-4")}>
              <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Activation pulse</p><Activity className="h-5 w-5 text-[#d59b00] transition-transform duration-700 group-hover:scale-110" /></div>
              <p className="mt-10 text-5xl font-semibold tracking-[-0.06em]">{athletes.filter((a) => a.status === "active").length}</p>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">athletes actively participating</p>
              <div className="mt-8 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"><div className="h-full rounded-full bg-[#ffbb00]" style={{ width: `${percent(athletes.filter((a) => a.status === "active").length, athletes.length)}%` }} /></div>
            </article>
            {[
              { label: "Feedback completed", value: feedback.length, note: `${percent(feedback.length, athletes.length)}% of cohort`, icon: CheckCircle2 },
              { label: "High-priority problems", value: highPriority, note: `${insights.length} total findings`, icon: AlertTriangle },
              { label: "Evidence-ready stories", value: caseStudies.length, note: "Case-study candidates", icon: Sparkles },
            ].map(({ label, value, note, icon: Icon }) => (
              <article key={label} className={cn(panel, "group rounded-3xl p-6 transition-transform duration-500 hover:-translate-y-1 lg:col-span-4")}>
                <div className="flex items-center justify-between"><Icon className="h-5 w-5 text-neutral-400 transition-transform duration-700 group-hover:scale-110" /><ArrowUpRight className="h-4 w-4 text-neutral-300 dark:text-neutral-700" /></div>
                <p className="mt-10 text-4xl font-semibold tracking-[-0.05em]">{value}</p><p className="mt-2 text-sm font-medium">{label}</p><p className="mt-1 text-xs text-neutral-500">{note}</p>
              </article>
            ))}
          </section>

          <div className="my-16 overflow-hidden border-y border-neutral-300 py-4 dark:border-neutral-800 sm:my-24">
            <div data-marquee-track className="flex w-max items-center whitespace-nowrap">
              {[...cohorts, ...cohorts].map((cohort, index) => <div key={`${cohort}-${index}`} className="flex items-center"><span className="mx-7 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{cohort}</span><span className="h-1.5 w-1.5 rounded-full bg-[#ffbb00]" /></div>)}
            </div>
          </div>

          <section id="activation" className="scroll-mt-28 py-12 sm:py-20">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Activation path</p><h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Where momentum holds.</h2></div><p className="max-w-sm text-sm leading-6 text-neutral-500 dark:text-neutral-400">Hover each stage to isolate its conversion from the previous action.</p></div>
            <div className="flex min-h-[300px] flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white lg:flex-row dark:border-neutral-800 dark:bg-neutral-900">
              {funnel.map((stage, index) => {
                const previous = index === 0 ? stage.count : funnel[index - 1].count;
                return <article key={stage.label} className="group relative flex min-h-36 flex-1 flex-col justify-between overflow-hidden border-b border-neutral-200 p-5 transition-[flex] duration-700 ease-out hover:flex-[2.25] lg:border-b-0 lg:border-r dark:border-neutral-800">
                  <div className="absolute inset-x-0 bottom-0 h-0 bg-[#ffbb00] transition-all duration-700 group-hover:h-full" />
                  <p className="relative text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500 transition-colors group-hover:text-black/60">{stage.label}</p>
                  <div className="relative"><p className="text-4xl font-semibold tracking-[-0.06em] transition-colors group-hover:text-black">{stage.count}</p><p className="mt-2 whitespace-nowrap text-[10px] font-semibold text-neutral-400 opacity-100 transition group-hover:text-black/60 lg:opacity-0 lg:group-hover:opacity-100">{index === 0 ? "Starting cohort" : `${percent(stage.count, previous)}% from prior`}</p></div>
                </article>;
              })}
            </div>
          </section>

          <section id="problems" className="scroll-mt-28 py-16 sm:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
              <div className="lg:sticky lg:top-28 lg:self-start"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Problem intelligence</p><h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">What the cohort keeps revealing.</h2><p className="mt-5 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">Structured findings, ranked by frequency and urgency. Filters affect this view without exposing private notes.</p>
                <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <FilterSelect label="Category" value={filters.insightCategory} onValueChange={(value) => setFilter("insightCategory", value)} options={[{ value: "all", label: "All categories" }, ...categories.map((value) => ({ value, label: formatCategory(value) }))]} />
                  <FilterSelect label="Severity" value={filters.insightSeverity} onValueChange={(value) => setFilter("insightSeverity", value as "all" | InsightSeverity)} options={[{ value: "all", label: "All severities" }, ...["low", "medium", "high", "critical"].map((value) => ({ value, label: value }))]} />
                  <FilterSelect label="Resolution" value={filters.insightStatus} onValueChange={(value) => setFilter("insightStatus", value as "all" | InsightStatus)} options={[{ value: "all", label: "All states" }, ...["open", "monitoring", "resolved", "dismissed"].map((value) => ({ value, label: value }))]} />
                </div>
              </div>
              <div className="space-y-5">
                {problemGroups.length ? problemGroups.map((group, index) => (
                  <article data-stack-card key={group.category} style={{ top: `${112 + index * 10}px` }} className={cn(panel, "group sticky overflow-hidden rounded-3xl p-6 sm:p-8")}>
                    <div className="absolute inset-y-0 left-0 w-1 bg-[#ffbb00] transition-all duration-700 group-hover:w-2" />
                    <div className="flex items-start justify-between gap-6"><div><p className="text-lg font-semibold tracking-tight sm:text-xl">{formatCategory(group.category)}</p><p className="mt-2 text-xs text-neutral-500">{group.open} active · {group.high} high priority</p></div><span className="text-5xl font-semibold tracking-[-0.06em] text-neutral-300 dark:text-neutral-700">{String(group.count).padStart(2, "0")}</span></div>
                    <div className="mt-10 h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"><div className="h-full bg-neutral-900 transition-all duration-700 group-hover:bg-[#ffbb00] dark:bg-neutral-200" style={{ width: `${percent(group.count, Math.max(...problemGroups.map((item) => item.count)))}%` }} /></div>
                  </article>
                )) : <div className={cn(panel, "rounded-3xl")}><EmptyState title="No insights match these filters" description="Change category, severity, or resolution to restore findings." /></div>}
              </div>
            </div>
          </section>

          <section id="participants" className="scroll-mt-28 py-16 sm:py-28">
            <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Participant index</p><h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">People behind the pattern.</h2></div><button onClick={() => setFiltersOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"><Filter className="h-4 w-4" /> Refine cohort</button></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {athletes.map((athlete) => <button key={athlete.id} type="button" onClick={() => setSelectedAthlete(athlete)} className={cn(panel, "group flex min-h-48 flex-col rounded-3xl p-5 text-left transition-transform duration-500 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]")}>
                <div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 font-mono text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700">{athlete.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><Eye className="h-4 w-4 text-neutral-300 transition duration-500 group-hover:scale-110 group-hover:text-neutral-900 dark:text-neutral-700 dark:group-hover:text-white" /></div>
                <div className="mt-auto pt-8"><div className="flex items-center gap-2"><p className="truncate text-base font-semibold">{athlete.name}</p><StatusTag tone={athlete.status === "completed" ? "green" : "neutral"}>{athlete.status}</StatusTag></div><p className="mt-2 text-xs text-neutral-500">{athlete.cohort}</p><div className="mt-4 flex items-center gap-4 border-t border-neutral-200 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:border-neutral-800"><span>{athlete.insights.length} findings</span><span>{athlete.engagementLevel} engagement</span><ChevronRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-1" /></div></div>
              </button>)}
            </div>
          </section>

          <section className="pb-8 pt-16 sm:pt-24">
            <div className="relative overflow-hidden rounded-[2rem] bg-neutral-950 px-6 py-12 text-white sm:px-10 sm:py-16 dark:bg-neutral-100 dark:text-black">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ffbb00]/20 blur-3xl" />
              <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><ScanSearch className="h-6 w-6 text-[#ffbb00]" /><h2 className="mt-8 max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Ready for the next layer of athlete intelligence.</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400 dark:text-neutral-600">Digital presence scores remain intentionally empty until verified sources, completeness rules, and scan history are available.</p></div><div className="flex items-center gap-3 rounded-full border border-white/15 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] dark:border-black/15"><Layers3 className="h-4 w-4" /> Not scanned</div></div>
            </div>
          </section>
        </>}
      </main>

      <Dialog open={selectedAthlete !== null} onOpenChange={(open) => !open && setSelectedAthlete(null)}>
        <AthleteDetail athlete={selectedAthlete} />
      </Dialog>
    </div>
  );
}
