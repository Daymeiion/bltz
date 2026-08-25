"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconCalendarEvent,
  IconChevronRight,
  IconExternalLink,
  IconFilter,
  IconLink,
  IconMessageCirclePlus,
  IconNotes,
  IconSearch,
  IconShieldLock,
  IconUserCheck,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";
import { startTransition, useMemo, useState } from "react";
import { addGtmNote, logGtmInteraction } from "@/app/admin/gtm/actions";
import type { GtmContactRow, GtmContactsReadModel } from "@/lib/gtm/server";
import { cn } from "@/lib/utils";

type SortKey = "displayName" | "currentCompany" | "contactType" | "priorityScore" | "priorityTier" | "pipelineStage" | "lastInteractionAt" | "nextActionAt";
type SortDirection = "asc" | "desc";

export interface GtmContactFilters {
  search: string;
  contactType: string;
  priorityTier: string;
  pipelineStage: string;
  savedView: string;
}

const builtInViews = [
  "All contacts", "My Top 50", "Needs Follow-Up", "New LinkedIn Connections",
  "Enterprise Prospects", "Athletic Directors", "NIL / Athlete Development",
  "NFL Players", "Former Players", "High Network Leverage", "Potential Introductions",
  "No Contact Yet", "Locker Candidates",
] as const;

const noteTypes = ["general", "call", "meeting", "linkedin", "email", "introduction", "research", "personal_context", "opportunity"] as const;
const interactionTypes = ["linkedin", "email", "phone", "video_call", "meeting", "event", "introduction", "other"] as const;

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
    const searchable = [contact.displayName, contact.currentCompany, contact.currentTitle, contact.segment, contact.sport, contact.leagueLevel].map(normalize).join(" ");
    if (search && !searchable.includes(search)) return false;
    if (filters.contactType !== "all" && contact.contactType !== filters.contactType) return false;
    if (filters.priorityTier !== "all" && contact.priorityTier !== filters.priorityTier) return false;
    if (filters.pipelineStage !== "all" && contact.pipelineStage !== filters.pipelineStage) return false;

    switch (filters.savedView) {
      case "My Top 50": return contact.isPriority || (contact.priorityScore ?? -1) >= 80;
      case "Needs Follow-Up": return Boolean(contact.nextActionAt && new Date(contact.nextActionAt) <= now);
      case "New LinkedIn Connections": return contact.source === "linkedin_csv" && !contact.lastInteractionAt;
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
  return new Intl.DateTimeFormat("en-US", includeTime ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function badgeClass(value: string | null) {
  switch (normalize(value)) {
    case "a": case "won": return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "b": case "qualified": case "discovery": return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
    case "identified": case "demo": case "pilot": case "proposal": return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
    default: return "border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  }
}

function StatusBadge({ value, fallback }: { value: string | null; fallback?: string }) {
  return <span className={cn("inline-flex rounded-lg border px-2 py-1 text-[11px] font-semibold", badgeClass(value))}>{label(value, fallback)}</span>;
}

function SortButton({ title, sortKey, currentKey, direction, onSort }: { title: string; sortKey: SortKey; currentKey: SortKey; direction: SortDirection; onSort: (key: SortKey) => void }) {
  const active = currentKey === sortKey;
  const Icon = !active ? IconArrowsSort : direction === "asc" ? IconArrowUp : IconArrowDown;
  return (
    <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 rounded-md text-left font-semibold hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:hover:text-white">
      {title}<Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

function EmptySurface({ configured, filtered, onReset }: { configured: boolean; filtered: boolean; onReset: () => void }) {
  return (
    <div className="flex min-h-[25rem] items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
          {configured ? <IconUsersGroup className="h-6 w-6" aria-hidden="true" /> : <IconShieldLock className="h-6 w-6" aria-hidden="true" />}
        </div>
        <h2 className="mt-5 text-xl font-semibold">{!configured ? "GTM data is not configured" : filtered ? "No contacts match this view" : "No relationship contacts yet"}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          {!configured ? "Deploy the approved GTM migration before importing or recording private relationship intelligence." : filtered ? "Adjust the search, saved view, or filters to widen the result set." : "Contacts will appear here after an approved import or authorized contact creation workflow."}
        </p>
        {filtered && <button type="button" onClick={onReset} className="mt-5 min-h-11 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:border-neutral-700 dark:bg-neutral-900">Reset filters</button>}
      </div>
    </div>
  );
}

function ContactDrawer({ contact, open, onOpenChange, onContactUpdate }: { contact: GtmContactRow | null; open: boolean; onOpenChange: (open: boolean) => void; onContactUpdate: (contact: GtmContactRow) => void }) {
  const [mode, setMode] = useState<"note" | "interaction" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!contact) return null;

  function submitNote(formData: FormData) {
    if (!contact) return;
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await addGtmNote({ contactId: contact.id, noteType: formData.get("noteType"), body: formData.get("body") });
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onContactUpdate({ ...contact, notes: [result.value, ...contact.notes] });
      setMode(null); setNotice("Note saved.");
    });
  }

  function submitInteraction(formData: FormData) {
    if (!contact) return;
    const localDate = String(formData.get("interactionAt") ?? "");
    const followUp = String(formData.get("nextActionAt") ?? "");
    const interactionType = String(formData.get("interactionType") ?? "other");
    const direction = String(formData.get("direction") ?? "outbound");
    const subject = String(formData.get("subject") ?? "") || null;
    const summary = String(formData.get("summary") ?? "") || null;
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await logGtmInteraction({
        contactId: contact.id,
        interactionType,
        direction,
        interactionAt: localDate ? new Date(localDate).toISOString() : "",
        subject,
        summary,
        nextAction: String(formData.get("nextAction") ?? "") || null,
        nextActionAt: followUp ? new Date(followUp).toISOString() : null,
      });
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onContactUpdate({
        ...contact,
        lastInteractionAt: result.value.interactionAt,
        nextAction: String(formData.get("nextAction") ?? "") || contact.nextAction,
        nextActionAt: followUp ? new Date(followUp).toISOString() : contact.nextActionAt,
        interactions: [{ id: result.value.id, interactionType, direction, subject, summary, interactionAt: result.value.interactionAt }, ...contact.interactions],
      });
      setMode(null); setNotice("Interaction logged.");
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { setMode(null); setNotice(null); onOpenChange(next); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/35 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[70] w-full overflow-y-auto border-l border-neutral-200 bg-[#f7f6f3] p-5 text-neutral-950 shadow-2xl focus:outline-none sm:max-w-[34rem] sm:p-7 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Contact intelligence</p>
              <Dialog.Title className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{contact.displayName}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{contact.currentTitle ?? "Role not recorded"}{contact.currentCompany ? ` at ${contact.currentCompany}` : ""}</Dialog.Description>
            </div>
            <Dialog.Close className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-300 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:border-neutral-700 dark:bg-neutral-900" aria-label="Close contact details"><IconX className="h-5 w-5" /></Dialog.Close>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setMode("note")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:bg-white dark:text-black"><IconNotes className="h-4 w-4" />Add Note</button>
            <button type="button" onClick={() => setMode("interaction")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:border-neutral-700 dark:bg-neutral-900"><IconMessageCirclePlus className="h-4 w-4" />Log Interaction</button>
          </div>

          {notice && <p className="mt-4 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm" role="status">{notice}</p>}
          {mode === "note" && (
            <form action={submitNote} className="mt-4 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="font-semibold">Add a timestamped note</h3>
              <label className="block text-sm font-medium">Note type<select name="noteType" className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950">{noteTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label>
              <label className="block text-sm font-medium">Note<textarea name="body" required maxLength={5000} rows={5} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-950" /></label>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setMode(null)} className="min-h-11 rounded-xl px-4 text-sm font-semibold">Cancel</button><button disabled={pending} className="min-h-11 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black">{pending ? "Saving…" : "Save note"}</button></div>
            </form>
          )}
          {mode === "interaction" && (
            <form action={submitInteraction} className="mt-4 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="font-semibold">Log an interaction</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">Type<select name="interactionType" className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950">{interactionTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label>
                <label className="text-sm font-medium">Direction<select name="direction" className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950"><option value="outbound">Outbound</option><option value="inbound">Inbound</option><option value="mutual">Mutual</option></select></label>
              </div>
              <label className="block text-sm font-medium">Date and time<input required name="interactionAt" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950" /></label>
              <label className="block text-sm font-medium">Subject<input name="subject" maxLength={200} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950" /></label>
              <label className="block text-sm font-medium">Summary<textarea name="summary" maxLength={5000} rows={4} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-950" /></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Next action<input name="nextAction" maxLength={500} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950" /></label><label className="text-sm font-medium">Follow-up date<input name="nextActionAt" type="datetime-local" className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950" /></label></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setMode(null)} className="min-h-11 rounded-xl px-4 text-sm font-semibold">Cancel</button><button disabled={pending} className="min-h-11 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black">{pending ? "Logging…" : "Log interaction"}</button></div>
            </form>
          )}

          <section className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800" aria-label="Contact summary">
            {[["Contact type", label(contact.contactType)], ["Priority", contact.priorityScore == null ? "Not scored" : `${contact.priorityScore} · Tier ${contact.priorityTier ?? "?"}`], ["Pipeline stage", label(contact.pipelineStage)], ["Last interaction", formatDate(contact.lastInteractionAt)], ["Next action", contact.nextAction ?? "Not assigned"], ["Due", formatDate(contact.nextActionAt)], ["Automation", contact.doNotAutomate ? "Protected: do not automate" : "Manual outreach eligible"]].map(([term, value]) => <div key={term} className="bg-white p-4 dark:bg-neutral-900"><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">{term}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>)}
          </section>

          <section className="mt-8" aria-labelledby="relationship-scoring"><h3 id="relationship-scoring" className="text-lg font-semibold">Relationship scoring</h3><div className="mt-3 grid grid-cols-2 gap-3">{[["Relationship", contact.relationshipStrength], ["BLTZ relevance", contact.bltzRelevance], ["Buying authority", contact.buyingAuthority], ["Network leverage", contact.networkLeverage], ["Timing", contact.timingScore]].map(([term, value]) => <div key={String(term)} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"><p className="text-xs text-neutral-500">{term}</p><p className="mt-1 font-mono text-lg font-semibold">{value == null ? "–" : String(value)}</p></div>)}</div></section>

          <section className="mt-8"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Notes</h3><span className="font-mono text-xs text-neutral-500">{contact.notes.length}</span></div><div className="mt-3 space-y-3">{contact.notes.length ? contact.notes.map((note) => <article key={note.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"><div className="flex justify-between gap-3 text-xs text-neutral-500"><span>{label(note.noteType)}</span><time>{formatDate(note.createdAt, true)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{note.body}</p></article>) : <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">No notes recorded yet.</p>}</div></section>
          <section className="mt-8"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Interactions</h3><span className="font-mono text-xs text-neutral-500">{contact.interactions.length}</span></div><div className="mt-3 space-y-3">{contact.interactions.length ? contact.interactions.map((item) => <article key={item.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"><div className="flex justify-between gap-3 text-xs text-neutral-500"><span>{label(item.interactionType)} · {label(item.direction)}</span><time>{formatDate(item.interactionAt, true)}</time></div><p className="mt-2 text-sm font-medium">{item.subject ?? "Interaction"}</p>{item.summary && <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{item.summary}</p>}</article>) : <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">No interactions recorded yet.</p>}</div></section>

          <section className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-800"><h3 className="text-lg font-semibold">Connected records</h3><div className="mt-3 space-y-2"><div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"><span className="inline-flex items-center gap-2"><IconUserCheck className="h-4 w-4" />Player record</span><span>{contact.playerMatch ? (contact.playerMatch.verified ? "Verified match" : "Potential match") : "No match"}</span></div><div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"><span className="inline-flex items-center gap-2"><IconLink className="h-4 w-4" />Relationships</span><span>Not linked</span></div></div></section>
          {contact.linkedinUrl && <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:text-blue-300">Open LinkedIn<IconExternalLink className="h-4 w-4" /></a>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function GtmContactsWorkspace({ data }: { data: GtmContactsReadModel }) {
  const [contacts, setContacts] = useState<GtmContactRow[]>(data.contacts);
  const [filters, setFilters] = useState<GtmContactFilters>({ search: "", contactType: "all", priorityTier: "all", pipelineStage: "all", savedView: "All contacts" });
  const [sortKey, setSortKey] = useState<SortKey>("priorityScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = useMemo(() => sortGtmContacts(filterGtmContacts(contacts, filters), sortKey, sortDirection), [contacts, filters, sortKey, sortDirection]);
  const selectedContact = contacts.find((contact) => contact.id === selectedId) ?? null;
  const hasFilters = filters.search !== "" || filters.contactType !== "all" || filters.priorityTier !== "all" || filters.pipelineStage !== "all" || filters.savedView !== "All contacts";
  const resetFilters = () => setFilters({ search: "", contactType: "all", priorityTier: "all", pipelineStage: "all", savedView: "All contacts" });
  const updateFilter = (key: keyof GtmContactFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const handleSort = (key: SortKey) => { if (key === sortKey) setSortDirection((current) => current === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDirection("asc"); } };
  const updateContact = (next: GtmContactRow) => setContacts((current) => current.map((contact) => contact.id === next.id ? next : contact));

  if (data.state === "restricted") {
    return <div className="mx-auto flex min-h-[65vh] max-w-[1600px] items-center justify-center px-6"><div className="max-w-lg rounded-2xl border border-neutral-300 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900"><IconShieldLock className="mx-auto h-7 w-7" /><h1 className="mt-4 text-2xl font-semibold">GTM access is restricted</h1><p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">Your session cannot read private relationship intelligence. Contact a platform administrator if your role has changed.</p></div></div>;
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
      <header className="flex flex-col justify-between gap-4 border-b border-neutral-300 pb-6 sm:flex-row sm:items-end dark:border-neutral-800">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">GTM relationship management</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Contacts</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">Prioritize trusted relationships, preserve context, and keep the next action visible.</p></div>
        <div className="text-left sm:text-right"><p className="font-mono text-2xl font-semibold">{data.state === "ready" ? contacts.length : "–"}</p><p className="text-xs text-neutral-500">authorized contacts</p></div>
      </header>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid gap-3 border-b border-neutral-200 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(14rem,1fr)_12rem_repeat(3,minmax(8rem,10rem))] dark:border-neutral-800">
          <label className="relative block"><span className="sr-only">Search contacts</span><IconSearch className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" /><input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Search name, company, role, sport…" className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:border-neutral-700 dark:bg-neutral-950" /></label>
          <label><span className="sr-only">Saved view</span><select value={filters.savedView} onChange={(event) => updateFilter("savedView", event.target.value)} className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950">{builtInViews.map((view) => <option key={view}>{view}</option>)}</select></label>
          <label><span className="sr-only">Contact type</span><select value={filters.contactType} onChange={(event) => updateFilter("contactType", event.target.value)} className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"><option value="all">All contact types</option><option value="enterprise">Enterprise</option><option value="athlete">Athlete</option><option value="multiplier">Multiplier</option><option value="unclassified">Unclassified</option></select></label>
          <label><span className="sr-only">Priority tier</span><select value={filters.priorityTier} onChange={(event) => updateFilter("priorityTier", event.target.value)} className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"><option value="all">All tiers</option>{["A", "B", "C", "D"].map((tier) => <option key={tier}>{tier}</option>)}</select></label>
          <label><span className="sr-only">Pipeline stage</span><select value={filters.pipelineStage} onChange={(event) => updateFilter("pipelineStage", event.target.value)} className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"><option value="all">All stages</option>{["identified", "qualified", "discovery", "demo", "pilot", "proposal", "negotiation", "won", "lost"].map((stage) => <option key={stage} value={stage}>{label(stage)}</option>)}</select></label>
        </div>

        {hasFilters && <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-4 py-3 text-xs text-neutral-500 dark:border-neutral-800"><span className="inline-flex items-center gap-2"><IconFilter className="h-4 w-4" />{filtered.length} of {contacts.length} contacts</span><button type="button" onClick={resetFilters} className="min-h-11 rounded-xl px-3 font-semibold text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:text-neutral-200">Reset filters</button></div>}

        {data.state === "not_configured" || filtered.length === 0 ? <EmptySurface configured={data.state === "ready"} filtered={data.state === "ready" && hasFilters} onReset={resetFilters} /> : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1220px] border-collapse text-left text-sm">
                <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500 dark:bg-neutral-950"><tr>{[["Contact", "displayName"], ["Organization", "currentCompany"], ["Type", "contactType"], ["Role", null], ["Score", "priorityScore"], ["Tier", "priorityTier"], ["Stage", "pipelineStage"], ["Last interaction", "lastInteractionAt"], ["Next action", null], ["Due", "nextActionAt"]].map(([title, key]) => <th key={title} className="whitespace-nowrap px-4 py-3">{key ? <SortButton title={title!} sortKey={key as SortKey} currentKey={sortKey} direction={sortDirection} onSort={handleSort} /> : title}</th>)}</tr></thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">{filtered.map((contact) => <tr key={contact.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"><td className="px-4 py-3"><button type="button" onClick={() => setSelectedId(contact.id)} className="group flex min-h-11 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-950 text-xs font-semibold text-white dark:bg-white dark:text-black">{contact.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><span><span className="flex items-center gap-1.5 font-semibold group-hover:underline">{contact.displayName}{contact.doNotAutomate && <IconShieldLock className="h-3.5 w-3.5 text-amber-700" aria-label="Do not automate" />}</span><span className="block text-xs text-neutral-500">{contact.segment ?? contact.source ?? "No segment"}</span></span></button></td><td className="max-w-44 px-4 py-3"><span className="line-clamp-2">{contact.currentCompany ?? "Not linked"}</span></td><td className="px-4 py-3"><StatusBadge value={contact.contactType} /></td><td className="max-w-48 px-4 py-3 text-neutral-600 dark:text-neutral-300">{contact.currentTitle ?? "Not recorded"}</td><td className="px-4 py-3 font-mono font-semibold">{contact.priorityScore ?? "–"}</td><td className="px-4 py-3"><StatusBadge value={contact.priorityTier} fallback="–" /></td><td className="px-4 py-3"><StatusBadge value={contact.pipelineStage} /></td><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-neutral-500">{formatDate(contact.lastInteractionAt)}</td><td className="max-w-52 px-4 py-3">{contact.nextAction ?? "No action"}</td><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-neutral-500">{formatDate(contact.nextActionAt)}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="divide-y divide-neutral-200 lg:hidden dark:divide-neutral-800">{filtered.map((contact) => <button key={contact.id} type="button" onClick={() => setSelectedId(contact.id)} className="flex min-h-24 w-full items-center gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffbb00]"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-xs font-semibold text-white dark:bg-white dark:text-black">{contact.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><span className="min-w-0 flex-1"><span className="block font-semibold">{contact.displayName}</span><span className="mt-1 block truncate text-sm text-neutral-500">{contact.currentTitle ?? "Role not recorded"}{contact.currentCompany ? ` · ${contact.currentCompany}` : ""}</span><span className="mt-2 flex flex-wrap gap-2"><StatusBadge value={contact.contactType} /><StatusBadge value={contact.pipelineStage} /></span></span><IconChevronRight className="h-5 w-5 shrink-0 text-neutral-400" /></button>)}</div>
          </>
        )}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-neutral-500"><IconCalendarEvent className="h-4 w-4" />Updated {formatDate(data.generatedAt, true)}. Private data remains within the authenticated Admin boundary.</p>
      <ContactDrawer contact={selectedContact} open={selectedContact !== null} onOpenChange={(open) => !open && setSelectedId(null)} onContactUpdate={updateContact} />
    </div>
  );
}
