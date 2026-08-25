"use client";

import {
  IconArrowDown, IconArrowUp, IconArrowsSort, IconCalendarEvent,
  IconChevronRight, IconFilter, IconSearch, IconShieldLock, IconUsersGroup,
} from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { GtmContactIntake } from "@/components/admin/gtm/GtmContactIntake";
import type { GtmContactRow, GtmContactsReadModel, GtmMetrics } from "@/lib/gtm/server";
import { GTM_CONVERSATION_OUTCOMES, GTM_PIPELINE_STAGES } from "@/lib/gtm/types";
import { cn } from "@/lib/utils";

const GtmContactDrawer = dynamic(
  () => import("@/components/admin/gtm/GtmContactDrawer").then((module) => module.GtmContactDrawer),
  { ssr: false },
);

type SortKey = "displayName" | "currentCompany" | "contactType" | "priorityScore" | "priorityTier" | "pipelineStage" | "lastInteractionAt" | "nextActionAt";
type SortDirection = "asc" | "desc";

export interface GtmContactFilters {
  search: string;
  contactType: string;
  priorityTier: string;
  pipelineStage: string;
  conversationOutcome: string;
  savedView: string;
}

const builtInViews = [
  "All contacts", "My Top 50", "Needs Follow-Up", "New LinkedIn Connections",
  "Enterprise Prospects", "Athletic Directors", "NIL / Athlete Development",
  "NFL Players", "Former Players", "High Network Leverage", "Potential Introductions",
  "No Contact Yet", "Locker Candidates",
] as const;

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function label(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function filterGtmContacts(contacts: GtmContactRow[], filters: GtmContactFilters, now = new Date()) {
  const search = normalize(filters.search);
  return contacts.filter((contact) => {
    const searchable = [
      contact.displayName, contact.email, contact.phone, contact.geography,
      contact.currentCompany, contact.currentTitle, contact.segment, contact.sport,
      contact.leagueLevel, contact.investorType, contact.investorRelationshipStage,
      contact.whatTheyNeedToSee, contact.investorThesisFeedback, contact.historicalSignal,
      contact.futureTrigger, contact.priorOutcome, contact.relationshipSource,
      contact.nextTrigger, contact.playerMatch?.playerName,
    ].map(normalize).join(" ");
    if (search && !searchable.includes(search)) return false;
    if (filters.contactType !== "all" && contact.contactType !== filters.contactType) return false;
    if (filters.priorityTier !== "all" && contact.priorityTier !== filters.priorityTier) return false;
    if (filters.pipelineStage !== "all" && contact.pipelineStage !== filters.pipelineStage) return false;
    if (filters.conversationOutcome !== "all" && !contact.interactions.some((interaction) => interaction.outcomes.includes(filters.conversationOutcome))) return false;
    switch (filters.savedView) {
      case "My Top 50": return contact.isPriority || (contact.priorityScore ?? -1) >= 80;
      case "Needs Follow-Up": return Boolean(contact.nextActionAt && new Date(contact.nextActionAt) <= now);
      case "New LinkedIn Connections": return contact.source === "linkedin_connections" && !contact.lastInteractionAt;
      case "Enterprise Prospects": return contact.contactType === "enterprise";
      case "Athletic Directors": return normalize(contact.currentTitle).includes("athletic director");
      case "NIL / Athlete Development": return [contact.segment, contact.currentTitle].some((value) => /nil|athlete development/i.test(value ?? ""));
      case "NFL Players": return contact.contactType === "athlete" && normalize(contact.leagueLevel).includes("nfl");
      case "Former Players": return contact.contactType === "athlete" && normalize(contact.segment).includes("former");
      case "High Network Leverage": return (contact.networkLeverage ?? -1) >= 4;
      case "Potential Introductions": return (contact.networkLeverage ?? -1) >= 4 && (contact.relationshipStrength ?? -1) >= 3;
      case "No Contact Yet": return !contact.lastInteractionAt;
      case "Locker Candidates": return normalize(contact.segment).includes("locker");
      default: return true;
    }
  });
}

export function sortGtmContacts(contacts: GtmContactRow[], key: SortKey, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...contacts].sort((left, right) => {
    const leftValue = left[key];
    const rightValue = right[key];
    if (leftValue == null && rightValue == null) return 0;
    if (leftValue == null) return 1;
    if (rightValue == null) return -1;
    if (typeof leftValue === "number" && typeof rightValue === "number") return (leftValue - rightValue) * multiplier;
    return String(leftValue).localeCompare(String(rightValue)) * multiplier;
  });
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", includeTime
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function badgeClass(value: string | null) {
  switch (normalize(value)) {
    case "a": case "converted": case "active_pilot": return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "b": case "engaged": case "discovery": return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
    case "identified": case "connected": case "demo_candidate": case "pilot_candidate": case "nurture": return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
    default: return "border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  }
}

function StatusBadge({ value, fallback }: { value: string | null; fallback?: string }) {
  return <span className={cn("inline-flex rounded-lg border px-2 py-1 text-[11px] font-semibold", badgeClass(value))}>{label(value, fallback)}</span>;
}

function SortButton({ title, sortKey, currentKey, direction, onSort }: {
  title: string; sortKey: SortKey; currentKey: SortKey;
  direction: SortDirection; onSort: (key: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  const Icon = !active ? IconArrowsSort : direction === "asc" ? IconArrowUp : IconArrowDown;
  return <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 rounded-md text-left font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]">{title}<Icon className="h-3.5 w-3.5" /></button>;
}

function EmptySurface({ configured, filtered, onReset }: { configured: boolean; filtered: boolean; onReset: () => void }) {
  return (
    <div className="flex min-h-[25rem] items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">{configured ? <IconUsersGroup className="h-6 w-6" /> : <IconShieldLock className="h-6 w-6" />}</div>
        <h2 className="mt-5 text-xl font-semibold">{!configured ? "GTM data is not configured" : filtered ? "No contacts match this view" : "No relationship contacts yet"}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{!configured ? "Deploy the approved GTM migration before importing or recording private relationship intelligence." : filtered ? "Adjust the search, saved view, or filters to widen the result set." : "Contacts will appear here after an approved import or authorized contact creation workflow."}</p>
        {filtered && <button type="button" onClick={onReset} className="mt-5 min-h-11 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold">Reset filters</button>}
      </div>
    </div>
  );
}

function MetricsSummary({ metrics }: { metrics: GtmMetrics | null }) {
  if (!metrics) return <section className="mt-6 rounded-2xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-500 dark:border-neutral-700">Deploy the Prompt 3 metrics function to enable reliable GTM instrumentation.</section>;
  const cards = [
    ["Total contacts", metrics.totalContacts], ["Tier A", metrics.tierAContacts], ["Tier B", metrics.tierBContacts],
    ["Priority", metrics.priorityContacts], ["Active conversations", metrics.activeConversations], ["Needs follow-up", metrics.contactsNeedingFollowUp],
    ["Discovery conversations", metrics.discoveryConversations], ["Player-linked", metrics.playerLinkedContacts], ["Demo candidates", metrics.demoCandidates],
    ["Pilot candidates", metrics.pilotCandidates], ["Active pilots", metrics.activePilots], ["Conversions", metrics.conversions],
  ] as const;
  const lists = [
    ["Reported problems", metrics.discoveryAnalysis.problems],
    ["BLTZ use cases", metrics.discoveryAnalysis.useCases],
    ["Requested features", metrics.discoveryAnalysis.features],
    ["Objections", metrics.discoveryAnalysis.objections],
  ] as const;
  return (
    <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="gtm-metrics">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Last 30 days</p><h2 id="gtm-metrics" className="mt-1 text-xl font-semibold">GTM metrics</h2></div><p className="text-xs text-neutral-500">Generated {formatDate(metrics.generatedAt, true)}</p></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{cards.map(([name, value]) => <div key={name} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950"><p className="font-mono text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-neutral-500">{name}</p></div>)}</div>
      <details className="mt-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <summary className="cursor-pointer text-sm font-semibold">Contact mix and discovery signals</summary>
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          <div><h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">Contact types</h3><dl className="mt-2 space-y-2 text-sm">{Object.entries(metrics.contactTypeCounts).sort().map(([name, count]) => <div key={name} className="flex justify-between gap-3"><dt>{label(name)}</dt><dd className="font-mono font-semibold">{count}</dd></div>)}</dl><p className="mt-3 text-xs text-neutral-500">Enterprise {metrics.enterpriseContacts} · Athletes {metrics.athleteContacts} · Multipliers {metrics.multiplierContacts}</p></div>
          <div><h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">Segments</h3><dl className="mt-2 space-y-2 text-sm">{Object.entries(metrics.segmentCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => <div key={name} className="flex justify-between gap-3"><dt>{label(name)}</dt><dd className="font-mono font-semibold">{count}</dd></div>)}{Object.keys(metrics.segmentCounts).length === 0 && <p className="text-sm text-neutral-500">No segments classified.</p>}</dl></div>
          <div><h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">Intent signals</h3><dl className="mt-2 space-y-2 text-sm"><div className="flex justify-between"><dt>Would pilot · Yes</dt><dd className="font-mono font-semibold">{metrics.discoveryAnalysis.pilotIntent.yes}</dd></div><div className="flex justify-between"><dt>Would pay · Yes</dt><dd className="font-mono font-semibold">{metrics.discoveryAnalysis.willingnessToPay.yes}</dd></div><div className="flex justify-between"><dt>Pilot unknown</dt><dd className="font-mono font-semibold">{metrics.discoveryAnalysis.pilotIntent.unknown}</dd></div><div className="flex justify-between"><dt>Pay unknown</dt><dd className="font-mono font-semibold">{metrics.discoveryAnalysis.willingnessToPay.unknown}</dd></div></dl></div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{lists.map(([title, items]) => <div key={title}><h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">{title}</h3><ol className="mt-2 space-y-2 text-sm">{items.map((item) => <li key={item.value} className="flex justify-between gap-3"><span className="line-clamp-2">{item.value}</span><span className="font-mono font-semibold">{item.count}</span></li>)}{items.length === 0 && <li className="text-neutral-500">No findings yet.</li>}</ol></div>)}</div>
      </details>
    </section>
  );
}

export function GtmContactsWorkspace({ data, metrics = null }: { data: GtmContactsReadModel; metrics?: GtmMetrics | null }) {
  const [contacts, setContacts] = useState<GtmContactRow[]>(data.contacts);
  const [filters, setFilters] = useState<GtmContactFilters>({ search: "", contactType: "all", priorityTier: "all", pipelineStage: "all", conversationOutcome: "all", savedView: "All contacts" });
  const [sortKey, setSortKey] = useState<SortKey>("priorityScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = useMemo(() => sortGtmContacts(filterGtmContacts(contacts, filters), sortKey, sortDirection), [contacts, filters, sortKey, sortDirection]);
  const selectedContact = contacts.find((contact) => contact.id === selectedId) ?? null;
  const hasFilters = filters.search !== "" || filters.contactType !== "all" || filters.priorityTier !== "all" || filters.pipelineStage !== "all" || filters.conversationOutcome !== "all" || filters.savedView !== "All contacts";
  const resetFilters = () => setFilters({ search: "", contactType: "all", priorityTier: "all", pipelineStage: "all", conversationOutcome: "all", savedView: "All contacts" });
  const updateFilter = (key: keyof GtmContactFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const handleSort = (key: SortKey) => { if (key === sortKey) setSortDirection((current) => current === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDirection("asc"); } };
  const updateContact = (next: GtmContactRow) => setContacts((current) => current.map((contact) => contact.id === next.id ? next : contact));
  const removeContact = (contactId: string) => { setContacts((current) => current.filter((contact) => contact.id !== contactId)); setSelectedId(null); };
  useEffect(() => setContacts(data.contacts), [data.contacts]);

  if (data.state === "restricted") return <div className="mx-auto flex min-h-[65vh] max-w-[1600px] items-center justify-center px-6"><div className="max-w-lg rounded-2xl border border-neutral-300 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900"><IconShieldLock className="mx-auto h-7 w-7" /><h1 className="mt-4 text-2xl font-semibold">GTM access is restricted</h1><p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">Your session cannot read private relationship intelligence. Contact a platform administrator if your role has changed.</p></div></div>;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
      <header className="flex flex-col justify-between gap-4 border-b border-neutral-300 pb-6 sm:flex-row sm:items-end dark:border-neutral-800"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">GTM relationship management</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Contacts</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">Prioritize trusted relationships, preserve discovery intelligence, and keep the next action visible.</p></div><div className="flex flex-col items-start gap-3 sm:items-end"><div className="text-left sm:text-right"><p className="font-mono text-2xl font-semibold">{data.state === "ready" ? contacts.length : "–"}</p><p className="text-xs text-neutral-500">authorized contacts</p></div><GtmContactIntake /></div></header>
      {data.state === "ready" && <MetricsSummary metrics={metrics} />}
      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid gap-3 border-b border-neutral-200 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(14rem,1fr)_12rem_repeat(4,minmax(8rem,10rem))] dark:border-neutral-800">
          <label className="relative block"><span className="sr-only">Search contacts</span><IconSearch className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" /><input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Search name, company, role, sport…" className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-950" /></label>
          <label><span className="sr-only">Saved view</span><select value={filters.savedView} onChange={(event) => updateFilter("savedView", event.target.value)} className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950">{builtInViews.map((view) => <option key={view}>{view}</option>)}</select></label>
          <label><span className="sr-only">Contact type</span><select value={filters.contactType} onChange={(event) => updateFilter("contactType", event.target.value)} className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"><option value="all">All contact types</option>{["enterprise", "athlete", "multiplier", "investor", "unclassified"].map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label>
          <label><span className="sr-only">Priority tier</span><select value={filters.priorityTier} onChange={(event) => updateFilter("priorityTier", event.target.value)} className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"><option value="all">All tiers</option>{["A", "B", "C", "D"].map((tier) => <option key={tier}>{tier}</option>)}</select></label>
          <label><span className="sr-only">Pipeline stage</span><select value={filters.pipelineStage} onChange={(event) => updateFilter("pipelineStage", event.target.value)} className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"><option value="all">All stages</option>{GTM_PIPELINE_STAGES.map((stage) => <option key={stage} value={stage}>{label(stage)}</option>)}</select></label>
          <label><span className="sr-only">Conversation outcome</span><select value={filters.conversationOutcome} onChange={(event) => updateFilter("conversationOutcome", event.target.value)} className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"><option value="all">All outcomes</option>{GTM_CONVERSATION_OUTCOMES.map((outcome) => <option key={outcome} value={outcome}>{label(outcome)}</option>)}</select></label>
        </div>
        {hasFilters && <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-4 py-3 text-xs text-neutral-500 dark:border-neutral-800"><span className="inline-flex items-center gap-2"><IconFilter className="h-4 w-4" />{filtered.length} of {contacts.length} contacts</span><button type="button" onClick={resetFilters} className="min-h-11 rounded-xl px-3 font-semibold">Reset filters</button></div>}
        {data.state === "not_configured" || filtered.length === 0 ? <EmptySurface configured={data.state === "ready"} filtered={data.state === "ready" && hasFilters} onReset={resetFilters} /> : <ContactResults contacts={filtered} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} onSelect={setSelectedId} />}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-neutral-500"><IconCalendarEvent className="h-4 w-4" />Updated {formatDate(data.generatedAt, true)}. Private data remains within the authenticated Admin boundary.</p>
      <GtmContactDrawer contact={selectedContact} open={selectedContact !== null} onOpenChange={(next) => !next && setSelectedId(null)} onContactUpdate={updateContact} onArchive={removeContact} />
    </div>
  );
}

function ContactResults({ contacts, sortKey, sortDirection, onSort, onSelect }: {
  contacts: GtmContactRow[]; sortKey: SortKey; sortDirection: SortDirection;
  onSort: (key: SortKey) => void; onSelect: (id: string) => void;
}) {
  const headings: Array<[string, SortKey | null]> = [["Contact", "displayName"], ["Organization", "currentCompany"], ["Type", "contactType"], ["Role", null], ["Score", "priorityScore"], ["Tier", "priorityTier"], ["Stage", "pipelineStage"], ["Last interaction", "lastInteractionAt"], ["Next action", null], ["Due", "nextActionAt"]];
  return <><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1220px] border-collapse text-left text-sm"><thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500 dark:bg-neutral-950"><tr>{headings.map(([title, key]) => <th key={title} className="whitespace-nowrap px-4 py-3">{key ? <SortButton title={title} sortKey={key} currentKey={sortKey} direction={sortDirection} onSort={onSort} /> : title}</th>)}</tr></thead><tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">{contacts.map((contact) => <tr key={contact.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"><td className="px-4 py-3"><button type="button" onClick={() => onSelect(contact.id)} className="group flex min-h-11 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-950 text-xs font-semibold text-white dark:bg-white dark:text-black">{contact.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><span><span className="flex items-center gap-1.5 font-semibold group-hover:underline">{contact.displayName}{contact.doNotAutomate && <IconShieldLock className="h-3.5 w-3.5 text-amber-700" aria-label="Do not automate" />}</span><span className="block text-xs text-neutral-500">{contact.segment ?? contact.source ?? "No segment"}</span></span></button></td><td className="max-w-44 px-4 py-3"><span className="line-clamp-2">{contact.currentCompany ?? "Not linked"}</span></td><td className="px-4 py-3"><StatusBadge value={contact.contactType} /></td><td className="max-w-48 px-4 py-3 text-neutral-600 dark:text-neutral-300">{contact.currentTitle ?? "Not recorded"}</td><td className="px-4 py-3 font-mono font-semibold">{contact.priorityScore ?? "–"}</td><td className="px-4 py-3"><StatusBadge value={contact.priorityTier} fallback="–" /></td><td className="px-4 py-3"><StatusBadge value={contact.pipelineStage} /></td><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-neutral-500">{formatDate(contact.lastInteractionAt)}</td><td className="max-w-52 px-4 py-3">{contact.nextAction ?? "No action"}</td><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-neutral-500">{formatDate(contact.nextActionAt)}</td></tr>)}</tbody></table></div><div className="divide-y divide-neutral-200 lg:hidden dark:divide-neutral-800">{contacts.map((contact) => <button key={contact.id} type="button" onClick={() => onSelect(contact.id)} className="flex min-h-24 w-full items-center gap-3 p-4 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-xs font-semibold text-white dark:bg-white dark:text-black">{contact.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><span className="min-w-0 flex-1"><span className="block font-semibold">{contact.displayName}</span><span className="mt-1 block truncate text-sm text-neutral-500">{contact.currentTitle ?? "Role not recorded"}{contact.currentCompany ? ` · ${contact.currentCompany}` : ""}</span><span className="mt-2 flex flex-wrap gap-2"><StatusBadge value={contact.contactType} /><StatusBadge value={contact.pipelineStage} /></span></span><IconChevronRight className="h-5 w-5 shrink-0 text-neutral-400" /></button>)}</div></>;
}
