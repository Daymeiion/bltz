"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Eye,
  FileSearch,
  MessageSquareText,
  ScanSearch,
  Sparkles,
  UserCheck,
  Users,
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

const categoryLabels: Record<string, string> = {
  missing_career_media: "Missing Career Media",
  incorrect_career_information: "Incorrect Career Information",
  outdated_athlete_profiles: "Outdated Athlete Profiles",
  fragmented_identity: "Fragmented Identity",
  missing_awards: "Missing Awards",
  missing_stats: "Missing Stats",
  social_identity_issues: "Social Identity Issues",
  search_discoverability: "Search Discoverability",
  brand_consistency: "Brand Consistency",
  legacy_gaps: "Legacy Gaps",
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

function average(values: Array<number | null>) {
  const measured = values.filter((value): value is number => value !== null);
  if (!measured.length) return null;
  return measured.reduce((sum, value) => sum + value, 0) / measured.length;
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

function Surface({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-neutral-800 bg-neutral-950/70", className)}>{children}</section>;
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-neutral-800 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffbb00]">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function MetricCard({ label, value, note, icon: Icon }: { label: string; value: string | number; note: string; icon: typeof Users }) {
  return (
    <div className="min-w-0 border-b border-r border-neutral-800 bg-neutral-950 p-4 last:border-r-0 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-neutral-400">{label}</p>
        <Icon aria-hidden="true" className="h-4 w-4 text-neutral-600" />
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-white">{value}</p>
      <p className="mt-1 truncate text-[11px] text-neutral-500">{note}</p>
    </div>
  );
}

function FilterSelect({ label, value, onValueChange, options }: { label: string; value: string; onValueChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[150px]">
      <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full border-neutral-800 bg-neutral-950 text-neutral-200 focus:ring-[#ffbb00]/30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-neutral-800 bg-neutral-950 text-neutral-200">
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

function StatusTag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "gold" | "green" | "red" | "blue" }) {
  const tones = {
    neutral: "border-neutral-700 bg-neutral-900 text-neutral-300",
    gold: "border-[#ffbb00]/30 bg-[#ffbb00]/10 text-[#ffd45d]",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  };
  return <span className={cn("inline-flex rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide", tones[tone])}>{children}</span>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-5 py-10 text-center">
      <FileSearch className="mb-3 h-6 w-6 text-neutral-600" aria-hidden="true" />
      <p className="text-sm font-medium text-neutral-200">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-neutral-500">{description}</p>
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
    <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-neutral-800 bg-[#080a0f] p-0 text-white">
      <DialogHeader className="border-b border-neutral-800 px-5 py-5 pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle className="text-xl">{athlete.name}</DialogTitle>
          <StatusTag tone={athlete.status === "completed" ? "green" : athlete.status === "active" ? "blue" : "neutral"}>{athlete.status}</StatusTag>
        </div>
        <DialogDescription className="text-neutral-400">{athlete.cohort} · Last activity {formatDate(athlete.activity.lastActivityAt)}</DialogDescription>
      </DialogHeader>

      <div className="space-y-6 p-5">
        <div>
          <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffbb00]">Locker activity</h3>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-800 bg-neutral-800 sm:grid-cols-3">
            {activityRows.map(([label, value]) => (
              <div key={label} className="bg-neutral-950 p-3"><p className="text-[11px] text-neutral-500">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffbb00]">Feedback</h3>
          {athlete.feedback ? (
            <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <div className="grid grid-cols-3 gap-3">
                {[["Locker value", athlete.feedback.lockerValueRating], ["Career accuracy", athlete.feedback.careerAccuracyRating], ["Media value", athlete.feedback.mediaValueRating]].map(([label, value]) => (
                  <div key={label} className="min-w-0"><p className="truncate text-[10px] text-neutral-500">{label}</p><p className="mt-1 font-mono text-sm text-white">{value ?? "—"}/5</p></div>
                ))}
              </div>
              <dl className="grid gap-3 border-t border-neutral-800 pt-3 text-xs sm:grid-cols-2">
                <div><dt className="text-neutral-500">Biggest problem</dt><dd className="mt-1 text-neutral-200">{athlete.feedback.biggestProblem ?? "Not provided"}</dd></div>
                <div><dt className="text-neutral-500">Favorite feature</dt><dd className="mt-1 text-neutral-200">{athlete.feedback.favoriteFeature ?? "Not provided"}</dd></div>
                <div><dt className="text-neutral-500">Missing feature</dt><dd className="mt-1 text-neutral-200">{athlete.feedback.missingFeature ?? "Not provided"}</dd></div>
                <div><dt className="text-neutral-500">Payment expectation</dt><dd className="mt-1 text-neutral-200">{athlete.feedback.paymentExpectation ?? "Not provided"}</dd></div>
              </dl>
            </div>
          ) : <EmptyState title="No feedback yet" description="Structured feedback has not been completed for this athlete." />}
        </div>

        <div>
          <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffbb00]">Insights discovered</h3>
          {athlete.insights.length ? <div className="space-y-2">{athlete.insights.map((insight) => (
            <div key={insight.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
              <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium text-white">{formatCategory(insight.category)}</p><StatusTag tone={insight.severity === "critical" ? "red" : insight.severity === "high" ? "gold" : "neutral"}>{insight.severity}</StatusTag><StatusTag>{insight.status}</StatusTag></div>
              <p className="mt-2 text-xs leading-5 text-neutral-400">{insight.description}</p>
            </div>
          ))}</div> : <EmptyState title="No insights discovered" description="No athlete problem records are associated with this participant." />}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffbb00]">Case study</h3>
            <dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-4"><dt className="text-neutral-500">Candidate</dt><dd>{athlete.caseStudyCandidate ? "Yes" : "No"}</dd></div><div className="flex justify-between gap-4"><dt className="text-neutral-500">Baseline</dt><dd>{athlete.baselineCapturedAt ? formatDate(athlete.baselineCapturedAt) : "Not captured"}</dd></div><div className="flex justify-between gap-4"><dt className="text-neutral-500">Testimonial permission</dt><dd className="capitalize">{athlete.caseStudyPermission.replaceAll("_", " ")}</dd></div></dl>
          </div>
          <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-950 p-4">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Future intelligence</h3>
            <div className="mt-4 flex items-start gap-3"><ScanSearch className="mt-0.5 h-5 w-5 text-neutral-600"/><div><p className="text-sm text-neutral-300">Not scanned</p><p className="mt-1 text-xs leading-5 text-neutral-500">Digital Presence Score, verified sources, completeness and scan history will appear only after the intelligence contract exists.</p></div></div>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

export function BetaIntelligenceDashboard({ data }: { data: BetaIntelligenceReadModel }) {
  const [filters, setFilters] = useState(initialFilters);
  const [selectedAthlete, setSelectedAthlete] = useState<BetaAthleteSummary | null>(null);

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
    { label: "Viewed Locker", count: athletes.filter((a) => a.lockerViewedAt).length },
    { label: "Claimed Locker", count: athletes.filter((a) => a.lockerClaimedAt).length },
    { label: "Edited Locker", count: athletes.filter((a) => a.lockerEditedAt).length },
    { label: "Shared Locker", count: athletes.filter((a) => a.lockerSharedAt).length },
    { label: "Returned", count: athletes.filter((a) => a.activity.returned).length },
  ];
  const engagement = [
    ["Viewed Locker", "lockerViews"], ["Opened Film Room", "filmRoomOpens"], ["Opened Photos", "photosOpens"],
    ["Viewed media", "mediaViews"], ["Edited profile", "profileEdits"], ["Submitted correction", "careerCorrections"],
    ["Uploaded media", "mediaUploads"], ["Shared Locker", "shares"], ["Clicked social link", "socialLinkClicks"],
  ] as const;
  const feedback = athletes.flatMap((athlete) => athlete.feedback ? [athlete.feedback] : []);
  const problemGroups = Object.values(insights.reduce<Record<string, { category: string; count: number; open: number; high: number }>>((groups, insight) => {
    const group = groups[insight.category] ?? { category: insight.category, count: 0, open: 0, high: 0 };
    group.count += 1;
    if (insight.status === "open" || insight.status === "monitoring") group.open += 1;
    if (insight.severity === "high" || insight.severity === "critical") group.high += 1;
    groups[insight.category] = group;
    return groups;
  }, {})).sort((a, b) => b.count - a.count);
  const caseStudies = athletes.filter((athlete) => athlete.caseStudyCandidate);

  const setFilter = <Key extends keyof BetaDashboardFilters>(key: Key, value: BetaDashboardFilters[Key]) => setFilters((current) => ({ ...current, [key]: value }));
  const booleanRate = (field: "wouldShare" | "willingnessToPay" | "digitalIntelligenceInterest" | "analyticsInterest" | "organizationInterest") => {
    const measured = feedback.filter((item) => item[field] !== null);
    return measured.length ? `${percent(measured.filter((item) => item[field]).length, measured.length)}%` : "—";
  };

  return (
    <div className="mx-auto max-w-[1680px] space-y-5 p-3 pb-12 text-neutral-100 sm:p-5 lg:p-8">
      <header className="flex flex-col gap-4 border-b border-neutral-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2"><StatusTag tone="gold">Phase one beta</StatusTag><span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">Internal · Private</span></div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Beta Intelligence</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">Athlete acquisition, activation and product-learning signals for the controlled Locker cohort.</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-neutral-500"><Clock3 className="h-3.5 w-3.5"/>Snapshot {formatDate(data.generatedAt)}</div>
      </header>

      {data.source === "fixture" && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-[#ffbb00]" aria-hidden="true"/>
          <div><p className="text-xs font-semibold text-amber-100">Fixture preview — not live beta data</p><p className="mt-0.5 text-[11px] leading-5 text-amber-200/60">The UI is connected through a typed server boundary. Replace the fixture adapter when the approved aggregate query contract lands.</p></div>
        </div>
      )}

      <Surface>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:p-5">
          <FilterSelect label="Cohort" value={filters.cohort} onValueChange={(value) => setFilter("cohort", value)} options={[{ value: "all", label: "All cohorts" }, ...cohorts.map((value) => ({ value, label: value }))]} />
          <FilterSelect label="Athlete status" value={filters.participantStatus} onValueChange={(value) => setFilter("participantStatus", value as BetaDashboardFilters["participantStatus"])} options={[{ value: "all", label: "All statuses" }, ...["invited", "active", "completed", "withdrawn"].map((value) => ({ value, label: value }))]} />
          <FilterSelect label="Invited" value={filters.dateRange} onValueChange={(value) => setFilter("dateRange", value as BetaDashboardFilters["dateRange"])} options={[{ value: "all", label: "All time" }, { value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "90d", label: "Last 90 days" }]} />
          <button type="button" onClick={() => setFilters(initialFilters)} className="self-end rounded-md border border-neutral-800 px-3 py-2 text-xs text-neutral-400 transition hover:border-neutral-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]">Reset filters</button>
        </div>
      </Surface>

      {athletes.length === 0 ? <Surface><EmptyState title="No beta athletes match these filters" description="Adjust the cohort, status or invite date range to view participants." /></Surface> : <>
        <Surface className="overflow-hidden">
          <SectionHeader eyebrow="01 · Cohort overview" title="Controlled cohort health" description="Counts use the currently filtered beta participant set." />
          <div className="grid grid-cols-2 border-t-0 sm:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Athletes invited" value={funnel[0].count} note="Invite recorded" icon={Users}/>
            <MetricCard label="Athletes joined" value={funnel[1].count} note={`${percent(funnel[1].count, funnel[0].count)}% of invited`} icon={UserCheck}/>
            <MetricCard label="Lockers claimed" value={funnel[3].count} note={`${percent(funnel[3].count, funnel[1].count)}% of joined`} icon={CheckCircle2}/>
            <MetricCard label="Active athletes" value={athletes.filter((a) => a.status === "active").length} note="Current participant status" icon={Activity}/>
            <MetricCard label="Feedback completed" value={feedback.length} note={`${percent(feedback.length, athletes.length)}% of filtered athletes`} icon={MessageSquareText}/>
            <MetricCard label="Case-study candidates" value={caseStudies.length} note="Explicit candidate state" icon={Sparkles}/>
          </div>
        </Surface>

        <Surface>
          <SectionHeader eyebrow="02 · Activation funnel" title="From invite to return" description="Stages appear only where a corresponding timestamp or measured activity is available." />
          <div className="overflow-x-auto p-4 sm:p-5">
            <div className="flex min-w-[900px] items-stretch gap-2">
              {funnel.map((stage, index) => {
                const previous = index === 0 ? stage.count : funnel[index - 1].count;
                return <div key={stage.label} className="contents"><div className="flex min-w-0 flex-1 flex-col rounded-lg border border-neutral-800 bg-neutral-950 p-3"><p className="text-[11px] text-neutral-500">{stage.label}</p><p className="mt-2 text-xl font-semibold tabular-nums text-white">{stage.count}</p><p className="mt-auto pt-3 font-mono text-[10px] text-[#ffbb00]">{index === 0 ? "START" : `${percent(stage.count, previous)}% FROM PRIOR`}</p></div>{index < funnel.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 self-center text-neutral-700"/>}</div>;
              })}
            </div>
          </div>
        </Surface>

        <Surface>
          <SectionHeader eyebrow="03 · Locker engagement" title="Actions across beta athletes" description="Percentages use filtered beta athletes as the denominator; raw totals are aggregate event counts." />
          <div className="grid gap-px bg-neutral-800 sm:grid-cols-2 xl:grid-cols-3">
            {engagement.map(([label, key]) => {
              const actors = athletes.filter((athlete) => athlete.activity[key] > 0).length;
              const total = athletes.reduce((sum, athlete) => sum + athlete.activity[key], 0);
              return <div key={key} className="bg-neutral-950 p-4"><div className="flex items-baseline justify-between gap-4"><p className="text-xs text-neutral-300">{label}</p><p className="text-sm font-semibold tabular-nums text-white">{percent(actors, athletes.length)}%</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-800"><div className="h-full rounded-full bg-[#ffbb00]" style={{ width: `${percent(actors, athletes.length)}%` }}/></div><p className="mt-2 font-mono text-[10px] text-neutral-500">{actors}/{athletes.length} athletes · {total} total</p></div>;
            })}
          </div>
        </Surface>

        <Surface>
          <SectionHeader eyebrow="04 · Athlete problem intelligence" title="Recurring digital infrastructure gaps" description="Filter structured insight records without exposing private notes." action={<div className="flex items-center gap-2 text-[10px] text-neutral-500"><AlertTriangle className="h-3.5 w-3.5"/>{insights.filter((item) => item.severity === "high" || item.severity === "critical").length} high priority</div>} />
          <div className="flex flex-col gap-3 border-b border-neutral-800 p-4 sm:flex-row sm:flex-wrap">
            <FilterSelect label="Category" value={filters.insightCategory} onValueChange={(value) => setFilter("insightCategory", value)} options={[{ value: "all", label: "All categories" }, ...categories.map((value) => ({ value, label: formatCategory(value) }))]} />
            <FilterSelect label="Severity" value={filters.insightSeverity} onValueChange={(value) => setFilter("insightSeverity", value as "all" | InsightSeverity)} options={[{ value: "all", label: "All severities" }, ...["low", "medium", "high", "critical"].map((value) => ({ value, label: value }))]} />
            <FilterSelect label="Resolution" value={filters.insightStatus} onValueChange={(value) => setFilter("insightStatus", value as "all" | InsightStatus)} options={[{ value: "all", label: "All states" }, ...["open", "monitoring", "resolved", "dismissed"].map((value) => ({ value, label: value }))]} />
          </div>
          {problemGroups.length ? <div className="divide-y divide-neutral-800">{problemGroups.map((group) => (
            <div key={group.category} className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 sm:grid-cols-[minmax(220px,1fr)_2fr_70px_70px] sm:px-5"><p className="text-xs font-medium text-neutral-200">{formatCategory(group.category)}</p><div className="hidden h-1.5 overflow-hidden rounded-full bg-neutral-800 sm:block"><div className="h-full bg-blue-500" style={{ width: `${percent(group.count, Math.max(...problemGroups.map((item) => item.count)))}%` }}/></div><p className="text-right font-mono text-[10px] text-neutral-500"><span className="text-white">{group.count}</span> total</p><p className="hidden text-right font-mono text-[10px] text-neutral-500 sm:block"><span className="text-[#ffbb00]">{group.open}</span> active</p></div>
          ))}</div> : <EmptyState title="No insights match these filters" description="Change the category, severity or resolution filters to see recorded athlete problems." />}
        </Surface>

        <Surface>
          <SectionHeader eyebrow="05 · Athlete feedback" title="What athletes are telling us" description="Structured responses are aggregated; only concise excerpts appear here." />
          {feedback.length ? <><div className="grid grid-cols-2 gap-px bg-neutral-800 lg:grid-cols-4 xl:grid-cols-8">
            {[["Locker value", average(feedback.map((f) => f.lockerValueRating))?.toFixed(1) ?? "—"], ["Career accuracy", average(feedback.map((f) => f.careerAccuracyRating))?.toFixed(1) ?? "—"], ["Media value", average(feedback.map((f) => f.mediaValueRating))?.toFixed(1) ?? "—"], ["Would share", booleanRate("wouldShare")], ["Willing to pay", booleanRate("willingnessToPay")], ["Digital intelligence", booleanRate("digitalIntelligenceInterest")], ["Analytics", booleanRate("analyticsInterest")], ["Organization", booleanRate("organizationInterest")]].map(([label, value], index) => <div key={label} className="bg-neutral-950 p-3"><p className="truncate text-[10px] text-neutral-500">{label}</p><p className="mt-2 text-lg font-semibold text-white">{value}{index < 3 && value !== "—" ? <span className="text-xs text-neutral-600">/5</span> : null}</p></div>)}
          </div><div className="divide-y divide-neutral-800">{athletes.filter((a) => a.feedback).slice(0, 3).map((athlete) => <button key={athlete.id} type="button" onClick={() => setSelectedAthlete(athlete)} className="grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffbb00] sm:grid-cols-[170px_1fr_auto] sm:items-center sm:px-5"><div><p className="text-xs font-medium text-white">{athlete.name}</p><p className="mt-1 text-[10px] text-neutral-500">{formatDate(athlete.feedback?.completedAt ?? null)}</p></div><p className="line-clamp-2 text-xs leading-5 text-neutral-400">{athlete.feedback?.biggestProblem}</p><ChevronRight className="hidden h-4 w-4 text-neutral-600 sm:block"/></button>)}</div></> : <EmptyState title="No feedback collected" description="Aggregate ratings and qualitative excerpts will appear after athletes complete structured feedback." />}
        </Surface>

        <Surface>
          <SectionHeader eyebrow="06 · Case study candidates" title="Evidence-ready athlete stories" description="Candidate and baseline states come from explicit records. No frontend-only changes are available." />
          {caseStudies.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="border-b border-neutral-800 bg-neutral-950 text-[10px] uppercase tracking-wider text-neutral-600"><tr>{["Athlete", "Cohort", "Locker", "Feedback", "Engagement", "Problems", "Permission", "Baseline", ""].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-neutral-800">{caseStudies.map((athlete) => <tr key={athlete.id} className="hover:bg-white/[0.025]"><td className="px-4 py-3 font-medium text-white">{athlete.name}</td><td className="px-4 py-3 text-neutral-400">{athlete.cohort}</td><td className="px-4 py-3"><StatusTag tone={athlete.lockerClaimedAt ? "green" : "neutral"}>{athlete.lockerClaimedAt ? "claimed" : "unclaimed"}</StatusTag></td><td className="px-4 py-3 text-neutral-400">{athlete.feedback ? "Complete" : "Pending"}</td><td className="px-4 py-3 capitalize text-neutral-300">{athlete.engagementLevel}</td><td className="px-4 py-3 tabular-nums text-neutral-300">{athlete.insights.length}</td><td className="px-4 py-3 capitalize text-neutral-400">{athlete.caseStudyPermission.replaceAll("_", " ")}</td><td className="px-4 py-3 text-neutral-400">{athlete.baselineCapturedAt ? "Captured" : "Not captured"}</td><td className="px-4 py-3"><button type="button" onClick={() => setSelectedAthlete(athlete)} className="rounded p-1 text-neutral-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]" aria-label={`View ${athlete.name}`}><ChevronRight className="h-4 w-4"/></button></td></tr>)}</tbody></table></div> : <EmptyState title="No case-study candidates" description="Athletes appear here only after the backend candidate state is explicitly set." />}
        </Surface>

        <Surface>
          <SectionHeader eyebrow="07 · Athlete drill-down" title="Beta participant index" description="Open an athlete to inspect activity, feedback, insights and case-study readiness." />
          <div className="grid gap-px bg-neutral-800 sm:grid-cols-2 xl:grid-cols-3">{athletes.map((athlete) => <button key={athlete.id} type="button" onClick={() => setSelectedAthlete(athlete)} className="group flex items-center gap-3 bg-neutral-950 p-4 text-left transition hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffbb00]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-800 bg-black font-mono text-xs text-neutral-400">{athlete.name.slice(-2)}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-xs font-medium text-white">{athlete.name}</p><StatusTag tone={athlete.status === "completed" ? "green" : athlete.status === "active" ? "blue" : "neutral"}>{athlete.status}</StatusTag></div><p className="mt-1 truncate text-[10px] text-neutral-500">{athlete.cohort} · {athlete.insights.length} problems · {athlete.engagementLevel} engagement</p></div><Eye className="h-4 w-4 text-neutral-700 transition group-hover:text-neutral-300"/></button>)}</div>
        </Surface>

        <Surface className="border-dashed">
          <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center"><div className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950"><BarChart3 className="h-5 w-5 text-neutral-600"/></div><div className="flex-1"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Future intelligence</p><h2 className="mt-1 text-sm font-medium text-neutral-200">Digital Presence Intelligence has not been scanned</h2><p className="mt-1 text-xs leading-5 text-neutral-500">Scores, verified and missing sources, media completeness, career completeness and scan timestamps remain intentionally empty until Phase 4 systems exist.</p></div><StatusTag>Not scanned</StatusTag></div>
        </Surface>
      </>}

      <Dialog open={selectedAthlete !== null} onOpenChange={(open) => !open && setSelectedAthlete(null)}>
        <AthleteDetail athlete={selectedAthlete}/>
      </Dialog>
    </div>
  );
}
