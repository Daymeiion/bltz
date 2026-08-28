"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  IconArchive,
  IconExternalLink,
  IconFlag,
  IconLink,
  IconMessageCirclePlus,
  IconNotes,
  IconPencil,
  IconSearch,
  IconSparkles,
  IconUserCheck,
  IconX,
} from "@tabler/icons-react";
import { startTransition, useEffect, useState } from "react";
import {
  addGtmDiscoveryInsight,
  addGtmNote,
  archiveGtmContact,
  editGtmContact,
  editGtmNote,
  logGtmInteraction,
  matchGtmContactPlayer,
  searchGtmPlayers,
  setGtmNextAction,
  setGtmPipelineStage,
  setGtmPriority,
  setGtmRelationshipIntelligence,
  type GtmPlayerOption,
} from "@/app/admin/gtm/actions";
import type { GtmContactRow } from "@/lib/gtm/server";
import {
  GTM_CONTACT_TYPES,
  GTM_CONVERSATION_OUTCOMES,
  GTM_INTERACTION_DIRECTIONS,
  GTM_INTERACTION_TYPES,
  GTM_INVESTOR_RELATIONSHIP_STAGES,
  GTM_INVESTOR_TYPES,
  GTM_NOTE_TYPES,
  GTM_POTENTIAL_ROLES,
  GTM_PIPELINE_STAGES,
  GTM_RELATIONSHIP_OBJECTIVES,
  GTM_RELATIONSHIP_PRIORITIES,
} from "@/lib/gtm/types";
import { cn } from "@/lib/utils";

type DrawerMode = "note" | "interaction" | "discovery" | "edit" | "relationship" | "next_action" | "stage" | "player" | "archive" | null;

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:border-neutral-700 dark:bg-neutral-950";
const textareaClass = `${inputClass} py-3`;
const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] disabled:opacity-50 dark:bg-white dark:text-black";
const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900";

function nullableText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim() || null;
}
function nullableScore(formData: FormData, name: string) {
  const value = nullableText(formData, name);
  return value === null ? null : Number(value);
}

function nullableBoolean(formData: FormData, name: string) {
  const value = nullableText(formData, name);
  return value === null ? null : value === "true";
}

function label(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", includeTime
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function badgeClass(value: string | null) {
  switch (value) {
    case "A": case "converted": case "active_pilot": return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "B": case "engaged": case "discovery": return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
    case "demo_candidate": case "pilot_candidate": case "nurture": return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
    default: return "border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  }
}

function StatusBadge({ value, fallback }: { value: string | null; fallback?: string }) {
  return <span className={cn("inline-flex rounded-lg border px-2 py-1 text-[11px] font-semibold", badgeClass(value))}>{label(value, fallback)}</span>;
}

function FormActions({ pending, submitLabel, onCancel }: { pending: boolean; submitLabel: string; onCancel: () => void }) {
  return <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="min-h-11 rounded-xl px-4 text-sm font-semibold">Cancel</button><button disabled={pending} className={primaryButton}>{pending ? "Saving…" : submitLabel}</button></div>;
}

function RelationshipIntelligenceFields({ contact, contactType }: { contact: GtmContactRow; contactType: string }) {
  return (
    <fieldset className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
      <legend className="px-1 text-sm font-semibold">Relationship Intelligence <span className="font-normal text-neutral-500">(optional)</span></legend>
      <p className="mt-1 text-xs text-neutral-500">Potential roles are multi-select. The objective is the one current goal.</p>
      {contactType === "other" && <label className="mt-3 block text-sm font-medium">Contact type clarification<input name="contactTypeOther" defaultValue={contact.contactTypeOther ?? ""} maxLength={240} className={inputClass} /></label>}
      <div className="mt-3">
        <p className="text-sm font-medium">Potential roles</p>
        <div className="mt-2 flex flex-wrap gap-2">{GTM_POTENTIAL_ROLES.map((role) => <label key={role} className="cursor-pointer"><input name="potentialRoles" value={role} type="checkbox" defaultChecked={contact.potentialRoles.includes(role)} className="peer sr-only" /><span className="inline-flex min-h-10 items-center rounded-lg border border-neutral-300 px-3 text-xs font-semibold peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-focus-visible:ring-2 peer-focus-visible:ring-[#ffbb00] dark:border-neutral-700 dark:peer-checked:bg-amber-950/30">{label(role)}</span></label>)}</div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Relationship objective<select name="relationshipObjective" defaultValue={contact.relationshipObjective ?? ""} className={inputClass}><option value="">Not set</option>{GTM_RELATIONSHIP_OBJECTIVES.map((objective) => <option key={objective} value={objective}>{label(objective)}</option>)}</select></label>
        <label className="text-sm font-medium">Relationship priority<select name="relationshipPriority" defaultValue={contact.relationshipPriority ?? ""} className={inputClass}><option value="">Not set</option>{GTM_RELATIONSHIP_PRIORITIES.map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}</select></label>
        <label className="text-sm font-medium sm:col-span-2">Relationship context<textarea name="relationshipContext" defaultValue={contact.relationshipContext ?? ""} rows={3} maxLength={5000} className={textareaClass} /></label>
      </div>
    </fieldset>
  );
}

function TriState({ name, labelText }: { name: string; labelText: string }) {
  return <label className="text-sm font-medium">{labelText}<select name={name} defaultValue="" className={inputClass}><option value="">Unknown / not discussed</option><option value="true">Yes</option><option value="false">No</option></select></label>;
}

export function GtmContactDrawer({
  contact,
  open,
  onOpenChange,
  onContactUpdate,
  onArchive,
}: {
  contact: GtmContactRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactUpdate: (contact: GtmContactRow) => void;
  onArchive: (contactId: string) => void;
}) {
  if (!contact) return null;
  return <ActiveGtmContactDrawer contact={contact} open={open} onOpenChange={onOpenChange} onContactUpdate={onContactUpdate} onArchive={onArchive} />;
}

function ActiveGtmContactDrawer({
  contact,
  open,
  onOpenChange,
  onContactUpdate,
  onArchive,
}: {
  contact: GtmContactRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactUpdate: (contact: GtmContactRow) => void;
  onArchive: (contactId: string) => void;
}) {
  const [mode, setMode] = useState<DrawerMode>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editContactType, setEditContactType] = useState(contact.contactType ?? "unclassified");
  const [playerQuery, setPlayerQuery] = useState("");
  const [playerResults, setPlayerResults] = useState<GtmPlayerOption[]>([]);
  const [discoveryInteractionId, setDiscoveryInteractionId] = useState<string | null>(null);
  const [lastLoggedInteractionId, setLastLoggedInteractionId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  useEffect(() => {
    setMode(null);
    setNotice(null);
    setPending(false);
    setEditContactType(contact.contactType ?? "unclassified");
    setPlayerQuery("");
    setPlayerResults([]);
    setDiscoveryInteractionId(null);
    setLastLoggedInteractionId(null);
    setEditingNoteId(null);
  }, [contact.id, contact.contactType]);

  const openMode = (nextMode: DrawerMode, interactionId: string | null = null) => {
    setNotice(null);
    setDiscoveryInteractionId(interactionId);
    setMode(nextMode);
  };

  function submitNote(formData: FormData) {
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await addGtmNote({ contactId: contact.id, noteType: formData.get("noteType"), body: formData.get("body") });
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onContactUpdate({ ...contact, notes: [result.value, ...contact.notes] });
      setMode(null); setNotice("Note saved.");
    });
  }

  function submitNoteEdit(formData: FormData) {
    if (!editingNoteId) return;
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await editGtmNote({ noteId: editingNoteId, contactId: contact.id, noteType: formData.get("noteType"), body: formData.get("body") });
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onContactUpdate({ ...contact, notes: contact.notes.map((note) => note.id === editingNoteId ? result.value : note) });
      setEditingNoteId(null); setNotice("Note updated.");
    });
  }

  function submitInteraction(formData: FormData) {
    const interactionAtInput = String(formData.get("interactionAt") ?? "");
    const nextActionAtInput = nullableText(formData, "nextActionAt");
    const interactionType = String(formData.get("interactionType") ?? "other");
    const direction = String(formData.get("direction") ?? "outbound");
    const subject = nullableText(formData, "subject");
    const summary = nullableText(formData, "summary");
    const nextAction = nullableText(formData, "nextAction");
    const followUpRequired = formData.get("followUpRequired") === "on";
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await logGtmInteraction({
        contactId: contact.id,
        interactionType,
        direction,
        interactionAt: interactionAtInput ? new Date(interactionAtInput).toISOString() : "",
        subject,
        summary,
        nextAction,
        nextActionAt: nextActionAtInput ? new Date(nextActionAtInput).toISOString() : null,
        outcomes: formData.getAll("outcomes").map(String),
        nextTrigger: nullableText(formData, "nextTrigger"),
        followUpRequired,
      });
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onContactUpdate({
        ...contact,
        lastInteractionAt: result.value.interactionAt,
        nextAction: nextAction ?? contact.nextAction,
        nextActionAt: nextAction ? (nextActionAtInput ? new Date(nextActionAtInput).toISOString() : null) : contact.nextActionAt,
        nextTrigger: result.value.nextTrigger ?? contact.nextTrigger,
        interactions: [{ id: result.value.id, interactionType, direction, subject, summary, interactionAt: result.value.interactionAt, outcomes: result.value.outcomes, nextTrigger: result.value.nextTrigger, followUpRequired: result.value.followUpRequired }, ...contact.interactions],
      });
      setLastLoggedInteractionId(result.value.id);
      setMode(null); setNotice("Interaction logged. Add a discovery insight while the conversation is fresh.");
    });
  }

  function submitDiscovery(formData: FormData) {
    const input = {
      contactId: contact.id,
      interactionId: discoveryInteractionId,
      problemDiscussed: nullableText(formData, "problemDiscussed"),
      currentSolution: nullableText(formData, "currentSolution"),
      painLevel: nullableScore(formData, "painLevel"),
      primaryBltzUseCase: nullableText(formData, "primaryBltzUseCase"),
      featureRequested: nullableText(formData, "featureRequested"),
      wouldUse: nullableBoolean(formData, "wouldUse"),
      wouldPilot: nullableBoolean(formData, "wouldPilot"),
      wouldPay: nullableBoolean(formData, "wouldPay"),
      expectedBuyer: nullableText(formData, "expectedBuyer"),
      expectedBudgetRange: nullableText(formData, "expectedBudgetRange"),
      primaryObjection: nullableText(formData, "primaryObjection"),
      introductionOffered: nullableBoolean(formData, "introductionOffered"),
      introductionTarget: nullableText(formData, "introductionTarget"),
      additionalContext: nullableText(formData, "additionalContext"),
    };
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await addGtmDiscoveryInsight(input);
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onContactUpdate({ ...contact, discoveries: [{ ...result.value, organizationId: null }, ...contact.discoveries] });
      setMode(null); setDiscoveryInteractionId(null); setNotice("Discovery insight saved.");
    });
  }

  function submitEdit(formData: FormData) {
    const contactType = editContactType;
    const input = {
      contactId: contact.id,
      displayName: String(formData.get("displayName") ?? ""),
      firstName: nullableText(formData, "firstName"), lastName: nullableText(formData, "lastName"),
      email: nullableText(formData, "email"), phone: nullableText(formData, "phone"),
      linkedinUrl: nullableText(formData, "linkedinUrl"), currentCompany: nullableText(formData, "currentCompany"),
      currentTitle: nullableText(formData, "currentTitle"), contactType,
      contactTypeOther: contactType === "other" ? contact.contactTypeOther : null,
      potentialRoles: contact.potentialRoles.length ? contact.potentialRoles : null,
      relationshipObjective: contact.relationshipObjective,
      relationshipPriority: contact.relationshipPriority,
      relationshipContext: contact.relationshipContext,
      segment: nullableText(formData, "segment"), sport: nullableText(formData, "sport"),
      leagueLevel: nullableText(formData, "leagueLevel"), geography: nullableText(formData, "geography"),
      relationshipStrength: contactType === "enterprise" ? nullableScore(formData, "relationshipStrength") : null,
      bltzRelevance: contactType === "enterprise" ? nullableScore(formData, "bltzRelevance") : null,
      buyingAuthority: contactType === "enterprise" ? nullableScore(formData, "buyingAuthority") : null,
      networkLeverage: contactType === "enterprise" ? nullableScore(formData, "networkLeverage") : null,
      timingScore: contactType === "enterprise" ? nullableScore(formData, "timingScore") : null,
      doNotAutomate: formData.get("doNotAutomate") === "on",
      investorType: contactType === "investor" ? nullableText(formData, "investorType") : null,
      investorRelationshipStage: contactType === "investor" ? nullableText(formData, "investorRelationshipStage") : null,
      whatTheyNeedToSee: contactType === "investor" ? nullableText(formData, "whatTheyNeedToSee") : null,
      investorThesisFeedback: contactType === "investor" ? nullableText(formData, "investorThesisFeedback") : null,
      historicalSignal: contactType === "investor" ? nullableText(formData, "historicalSignal") : null,
      futureTrigger: contactType === "investor" ? nullableText(formData, "futureTrigger") : null,
      priorOutcome: contactType === "investor" ? nullableText(formData, "priorOutcome") : null,
      relationshipSource: contactType === "investor" ? nullableText(formData, "relationshipSource") : null,
    };
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await editGtmContact(input);
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onContactUpdate({
        ...contact, ...input,
        id: contact.id,
        potentialRoles: input.potentialRoles ?? [],
        priorityScore: result.value.priorityScore,
        priorityTier: result.value.priorityTier,
        playerMatch: contactType === "athlete" ? contact.playerMatch : null,
      });
      setMode(null); setNotice("Contact updated.");
    });
  }

  function submitRelationshipIntelligence(formData: FormData) {
    const potentialRoles = formData.getAll("potentialRoles").map(String).filter(Boolean);
    const input = {
      contactId: contact.id,
      contactTypeOther: contact.contactType === "other" ? nullableText(formData, "contactTypeOther") : null,
      potentialRoles: potentialRoles.length ? potentialRoles : null,
      relationshipObjective: nullableText(formData, "relationshipObjective"),
      relationshipPriority: nullableText(formData, "relationshipPriority"),
      relationshipContext: nullableText(formData, "relationshipContext"),
    };
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await setGtmRelationshipIntelligence(input);
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onContactUpdate({ ...contact, ...input, potentialRoles });
      setMode(null); setNotice("Relationship intelligence updated.");
    });
  }

  function submitNextAction(formData: FormData) {
    const nextAction = nullableText(formData, "nextAction");
    const nextActionAtInput = nullableText(formData, "nextActionAt");
    const nextTrigger = nullableText(formData, "nextTrigger");
    const nextActionAt = nextActionAtInput ? new Date(nextActionAtInput).toISOString() : null;
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await setGtmNextAction({ contactId: contact.id, nextAction, nextActionAt, nextTrigger });
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onContactUpdate({ ...contact, nextAction, nextActionAt, nextTrigger });
      setMode(null); setNotice("Next action updated.");
    });
  }

  function submitStage(formData: FormData) {
    const pipelineStage = String(formData.get("pipelineStage") ?? "identified");
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await setGtmPipelineStage({ contactId: contact.id, pipelineStage });
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onContactUpdate({ ...contact, pipelineStage });
      setMode(null); setNotice("Pipeline stage updated.");
    });
  }

  function togglePriority() {
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await setGtmPriority({ contactId: contact.id, isPriority: !contact.isPriority });
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onContactUpdate({ ...contact, isPriority: !contact.isPriority });
      setNotice(contact.isPriority ? "Priority marker removed." : "Contact marked as priority.");
    });
  }

  function findPlayers() {
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await searchGtmPlayers(playerQuery);
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      setPlayerResults(result.value);
    });
  }

  function matchPlayer(player: GtmPlayerOption) {
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await matchGtmContactPlayer({ contactId: contact.id, playerId: player.id });
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onContactUpdate({ ...contact, playerMatch: { playerId: result.value.id, playerName: result.value.name, team: result.value.team, position: result.value.position, level: result.value.level, verified: true } });
      setMode(null); setNotice("Canonical Player match verified.");
    });
  }

  function confirmArchive() {
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await archiveGtmContact({ contactId: contact.id, confirmed: true });
      setPending(false);
      if (!result.ok) return setNotice(result.message);
      onArchive(contact.id);
      onOpenChange(false);
    });
  }

  const formShell = "mt-4 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) setMode(null); onOpenChange(next); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/35" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[70] w-full overflow-y-auto border-l border-neutral-200 bg-[#f7f6f3] p-5 text-neutral-950 shadow-2xl focus:outline-none sm:max-w-[42rem] sm:p-7 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Contact intelligence</p><Dialog.Title className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{contact.displayName}</Dialog.Title><Dialog.Description className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{contact.currentTitle ?? "Role not recorded"}{contact.currentCompany ? ` at ${contact.currentCompany}` : ""}</Dialog.Description></div>
            <Dialog.Close className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-300 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:border-neutral-700 dark:bg-neutral-900" aria-label="Close contact details"><IconX className="h-5 w-5" /></Dialog.Close>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => openMode("note")} className={primaryButton}><IconNotes className="h-4 w-4" />Add Note</button>
            <button type="button" onClick={() => openMode("interaction")} className={secondaryButton}><IconMessageCirclePlus className="h-4 w-4" />Log Interaction</button>
            <button type="button" onClick={() => openMode("discovery")} className={secondaryButton}><IconSparkles className="h-4 w-4" />Add Discovery Insight</button>
            <button type="button" onClick={() => openMode("next_action")} className={secondaryButton}>Set Next Action</button>
            <button type="button" onClick={() => openMode("stage")} className={secondaryButton}>Change Stage</button>
            <button type="button" onClick={() => openMode("edit")} className={secondaryButton}><IconPencil className="h-4 w-4" />Edit Contact</button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 border-b border-neutral-200 pb-5 dark:border-neutral-800">
            {contact.contactType === "athlete" && <button type="button" onClick={() => openMode("player")} className="min-h-11 rounded-xl px-3 text-sm font-semibold underline-offset-4 hover:underline"><IconLink className="mr-1 inline h-4 w-4" />Match Player</button>}
            <button type="button" onClick={togglePriority} disabled={pending} className="min-h-11 rounded-xl px-3 text-sm font-semibold underline-offset-4 hover:underline"><IconFlag className="mr-1 inline h-4 w-4" />{contact.isPriority ? "Remove Priority" : "Mark Priority"}</button>
            {contact.linkedinUrl && <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-blue-700 underline-offset-4 hover:underline dark:text-blue-300">Open LinkedIn<IconExternalLink className="h-4 w-4" /></a>}
            <button type="button" onClick={() => openMode("archive")} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-red-700 underline-offset-4 hover:underline dark:text-red-300"><IconArchive className="mr-1 inline h-4 w-4" />Archive</button>
          </div>

          {notice && <p className="mt-4 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900" role="status">{notice}{notice.startsWith("Interaction logged") && <button type="button" onClick={() => openMode("discovery", lastLoggedInteractionId)} className="ml-1 font-semibold underline">Add discovery insight</button>}</p>}

          {mode === "note" && <form action={submitNote} className={formShell}><h3 className="font-semibold">Add a timestamped note</h3><label className="block text-sm font-medium">Note type<select name="noteType" className={inputClass}>{GTM_NOTE_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label><label className="block text-sm font-medium">Note<textarea name="body" required maxLength={5000} rows={5} className={textareaClass} /></label><FormActions pending={pending} submitLabel="Save note" onCancel={() => setMode(null)} /></form>}

          {mode === "interaction" && <form action={submitInteraction} className={formShell}><h3 className="font-semibold">Log an interaction</h3><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Type<select name="interactionType" className={inputClass}>{GTM_INTERACTION_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label><label className="text-sm font-medium">Direction<select name="direction" className={inputClass}>{GTM_INTERACTION_DIRECTIONS.map((direction) => <option key={direction} value={direction}>{label(direction)}</option>)}</select></label></div><label className="block text-sm font-medium">Date and time<input required name="interactionAt" type="datetime-local" defaultValue={localDateTime(new Date().toISOString())} className={inputClass} /></label><label className="block text-sm font-medium">Subject<input name="subject" maxLength={200} className={inputClass} /></label><label className="block text-sm font-medium">Summary<textarea name="summary" maxLength={5000} rows={4} className={textareaClass} /></label><fieldset><legend className="text-sm font-medium">Conversation outcomes <span className="font-normal text-neutral-500">(choose any)</span></legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{GTM_CONVERSATION_OUTCOMES.map((outcome) => <label key={outcome} className="flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm dark:border-neutral-700"><input type="checkbox" name="outcomes" value={outcome} />{label(outcome)}</label>)}</div></fieldset><label className="flex min-h-11 items-center gap-3 rounded-xl border border-neutral-200 px-3 text-sm dark:border-neutral-700"><input name="followUpRequired" type="checkbox" /><span className="font-medium">Follow-up required</span></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Next action<input name="nextAction" maxLength={1000} className={inputClass} /></label><label className="text-sm font-medium">Follow-up date<input name="nextActionAt" type="datetime-local" className={inputClass} /></label></div><label className="block text-sm font-medium">Next trigger<textarea name="nextTrigger" maxLength={2000} rows={2} className={textareaClass} /></label><FormActions pending={pending} submitLabel="Log interaction" onCancel={() => setMode(null)} /></form>}

          {mode === "discovery" && <form action={submitDiscovery} className={formShell}><div><h3 className="font-semibold">Add Discovery Insight</h3><p className="mt-1 text-xs text-neutral-500">Capture only what you learned. Every answer is optional and unknown stays unknown.{discoveryInteractionId ? " This insight will be linked to the selected interaction." : ""}</p></div><label className="block text-sm font-medium">Problem Discussed<textarea name="problemDiscussed" rows={3} maxLength={10000} className={textareaClass} /></label><label className="block text-sm font-medium">Current Solution / Workaround<textarea name="currentSolution" rows={3} maxLength={10000} className={textareaClass} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Pain Level<select name="painLevel" defaultValue="" className={inputClass}><option value="">Unknown</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label><label className="text-sm font-medium">Expected Budget<input name="expectedBudgetRange" maxLength={500} className={inputClass} /></label></div><label className="block text-sm font-medium">Most Relevant BLTZ Use Case<textarea name="primaryBltzUseCase" rows={2} maxLength={5000} className={textareaClass} /></label><label className="block text-sm font-medium">Feature Requested<textarea name="featureRequested" rows={2} maxLength={10000} className={textareaClass} /></label><div className="grid gap-3 sm:grid-cols-3"><TriState name="wouldUse" labelText="Would Use?" /><TriState name="wouldPilot" labelText="Would Pilot?" /><TriState name="wouldPay" labelText="Would Pay?" /></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Expected Buyer<input name="expectedBuyer" maxLength={1000} className={inputClass} /></label><TriState name="introductionOffered" labelText="Introduction Offered?" /></div><label className="block text-sm font-medium">Main Objection<textarea name="primaryObjection" rows={2} maxLength={10000} className={textareaClass} /></label><label className="block text-sm font-medium">Introduction Target<input name="introductionTarget" maxLength={2000} className={inputClass} /></label><label className="block text-sm font-medium">Additional Context<textarea name="additionalContext" rows={3} maxLength={20000} className={textareaClass} /></label><FormActions pending={pending} submitLabel="Save discovery insight" onCancel={() => setMode(null)} /></form>}

          {mode === "next_action" && <form action={submitNextAction} className={formShell}><h3 className="font-semibold">Set Next Action</h3><label className="block text-sm font-medium">Next action<input name="nextAction" defaultValue={contact.nextAction ?? ""} maxLength={1000} className={inputClass} /></label><label className="block text-sm font-medium">Next-action date<input name="nextActionAt" type="datetime-local" defaultValue={localDateTime(contact.nextActionAt)} className={inputClass} /></label><label className="block text-sm font-medium">Next trigger<textarea name="nextTrigger" defaultValue={contact.nextTrigger ?? ""} maxLength={2000} rows={2} className={textareaClass} /></label><FormActions pending={pending} submitLabel="Save next action" onCancel={() => setMode(null)} /></form>}

          {mode === "stage" && <form action={submitStage} className={formShell}><h3 className="font-semibold">Change Pipeline Stage</h3><label className="block text-sm font-medium">Stage<select name="pipelineStage" defaultValue={contact.pipelineStage ?? "identified"} className={inputClass}>{GTM_PIPELINE_STAGES.map((stage) => <option key={stage} value={stage}>{label(stage)}</option>)}</select></label><FormActions pending={pending} submitLabel="Save stage" onCancel={() => setMode(null)} /></form>}

          {mode === "player" && <div className={formShell}><h3 className="font-semibold">Match Canonical Player</h3><p className="text-xs text-neutral-500">Searches existing Player Master records and stores only the verified join.</p><div className="flex items-end gap-2"><label className="flex-1 text-sm font-medium">Player name<input value={playerQuery} onChange={(event) => setPlayerQuery(event.target.value)} className={inputClass} /></label><button type="button" onClick={findPlayers} disabled={pending || playerQuery.trim().length < 2} className={secondaryButton}><IconSearch className="h-4 w-4" />Search</button></div>{playerResults.length > 0 && <div className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">{playerResults.map((player) => <button key={player.id} type="button" onClick={() => matchPlayer(player)} className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"><span><span className="font-semibold">{player.name}</span><span className="block text-xs text-neutral-500">{[player.position, player.team, player.level].filter(Boolean).join(" · ") || "Player record"}</span></span><span className="text-sm font-semibold">Verify match</span></button>)}</div>}<button type="button" onClick={() => setMode(null)} className="min-h-11 rounded-xl px-4 text-sm font-semibold">Cancel</button></div>}

          {mode === "archive" && <div className={formShell}><h3 className="font-semibold text-red-700 dark:text-red-300">Archive contact?</h3><p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">This removes the contact from active GTM views while preserving notes, interactions, discovery findings, Player linkage, and audit history.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setMode(null)} className={secondaryButton}>Cancel</button><button type="button" onClick={confirmArchive} disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Archiving…" : "Archive contact"}</button></div></div>}

          {mode === "relationship" && <form action={submitRelationshipIntelligence} className={formShell}><RelationshipIntelligenceFields contact={contact} contactType={contact.contactType} /><FormActions pending={pending} submitLabel="Save relationship intelligence" onCancel={() => setMode(null)} /></form>}

          {mode === "edit" && <form action={submitEdit} className={formShell}><h3 className="font-semibold">Edit Contact</h3><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Display name<input name="displayName" required defaultValue={contact.displayName} maxLength={240} className={inputClass} /></label><label className="text-sm font-medium">Contact type<select value={editContactType} onChange={(event) => setEditContactType(event.target.value)} className={inputClass}>{GTM_CONTACT_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label><label className="text-sm font-medium">First name<input name="firstName" defaultValue={contact.firstName ?? ""} maxLength={120} className={inputClass} /></label><label className="text-sm font-medium">Last name<input name="lastName" defaultValue={contact.lastName ?? ""} maxLength={120} className={inputClass} /></label><label className="text-sm font-medium">Email<input name="email" type="email" defaultValue={contact.email ?? ""} maxLength={320} className={inputClass} /></label><label className="text-sm font-medium">Phone<input name="phone" defaultValue={contact.phone ?? ""} maxLength={40} className={inputClass} /></label><label className="text-sm font-medium">Company / organization<input name="currentCompany" defaultValue={contact.currentCompany ?? ""} maxLength={200} className={inputClass} /></label><label className="text-sm font-medium">Title<input name="currentTitle" defaultValue={contact.currentTitle ?? ""} maxLength={200} className={inputClass} /></label><label className="text-sm font-medium">Segment<input name="segment" defaultValue={contact.segment ?? ""} maxLength={120} className={inputClass} /></label><label className="text-sm font-medium">Geography<input name="geography" defaultValue={contact.geography ?? ""} maxLength={160} className={inputClass} /></label><label className="text-sm font-medium">Sport<input name="sport" defaultValue={contact.sport ?? ""} maxLength={80} className={inputClass} /></label><label className="text-sm font-medium">League / level<input name="leagueLevel" defaultValue={contact.leagueLevel ?? ""} maxLength={80} className={inputClass} /></label><label className="text-sm font-medium sm:col-span-2">LinkedIn URL<input name="linkedinUrl" type="url" defaultValue={contact.linkedinUrl ?? ""} maxLength={500} className={inputClass} /></label></div>{editContactType === "enterprise" && <fieldset className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700"><legend className="px-1 text-sm font-semibold">Enterprise priority scoring <span className="font-normal text-neutral-500">(0–5 each)</span></legend><div className="grid gap-3 sm:grid-cols-2">{[["Relationship Strength", "relationshipStrength", contact.relationshipStrength], ["BLTZ Relevance", "bltzRelevance", contact.bltzRelevance], ["Buying Authority", "buyingAuthority", contact.buyingAuthority], ["Network Leverage", "networkLeverage", contact.networkLeverage], ["Timing", "timingScore", contact.timingScore]].map(([text, name, value]) => <label key={String(name)} className="text-sm font-medium">{text}<select name={String(name)} defaultValue={value == null ? "" : String(value)} className={inputClass}><option value="">Not scored</option>{[0, 1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}</select></label>)}</div></fieldset>}{editContactType === "investor" && <fieldset className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700"><legend className="px-1 text-sm font-semibold">Investor context</legend><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Investor type<select name="investorType" defaultValue={contact.investorType ?? ""} className={inputClass}><option value="">Not classified</option>{GTM_INVESTOR_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label><label className="text-sm font-medium">Relationship stage<select name="investorRelationshipStage" defaultValue={contact.investorRelationshipStage ?? ""} className={inputClass}><option value="">Not classified</option>{GTM_INVESTOR_RELATIONSHIP_STAGES.map((stage) => <option key={stage} value={stage}>{label(stage)}</option>)}</select></label><label className="text-sm font-medium sm:col-span-2">What they need to see<textarea name="whatTheyNeedToSee" defaultValue={contact.whatTheyNeedToSee ?? ""} rows={2} maxLength={10000} className={textareaClass} /></label><label className="text-sm font-medium sm:col-span-2">Investor thesis feedback<textarea name="investorThesisFeedback" defaultValue={contact.investorThesisFeedback ?? ""} rows={2} maxLength={10000} className={textareaClass} /></label><label className="text-sm font-medium">Historical signal<textarea name="historicalSignal" defaultValue={contact.historicalSignal ?? ""} rows={2} maxLength={5000} className={textareaClass} /></label><label className="text-sm font-medium">Future trigger<textarea name="futureTrigger" defaultValue={contact.futureTrigger ?? ""} rows={2} maxLength={2000} className={textareaClass} /></label><label className="text-sm font-medium">Prior outcome<textarea name="priorOutcome" defaultValue={contact.priorOutcome ?? ""} rows={2} maxLength={5000} className={textareaClass} /></label><label className="text-sm font-medium">Relationship source<input name="relationshipSource" defaultValue={contact.relationshipSource ?? ""} maxLength={1000} className={inputClass} /></label></div></fieldset>}<label className="flex min-h-11 items-center gap-3 rounded-xl border border-neutral-200 px-3 text-sm dark:border-neutral-700"><input name="doNotAutomate" type="checkbox" defaultChecked={contact.doNotAutomate} /><span><span className="font-semibold">Do not automate</span><span className="block text-xs text-neutral-500">Manual outreach only.</span></span></label><FormActions pending={pending} submitLabel="Save contact" onCancel={() => setMode(null)} /></form>}

          <section className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800" aria-label="Contact summary">{[["Contact type", label(contact.contactType)], ["Segment", contact.segment ?? "Not classified"], ["Priority", contact.priorityScore == null ? (contact.isPriority ? "Marked priority" : "Not scored") : `${contact.priorityScore} · Tier ${contact.priorityTier ?? "?"}`], ["Pipeline stage", label(contact.pipelineStage)], ["Last interaction", formatDate(contact.lastInteractionAt)], ["Next action", contact.nextAction ?? "Not assigned"], ["Due", formatDate(contact.nextActionAt)], ["Next trigger", contact.nextTrigger ?? "Not assigned"], ["Automation", contact.doNotAutomate ? "Protected: do not automate" : "Manual outreach eligible"], ["Geography", contact.geography ?? "Not recorded"]].map(([term, value]) => <div key={term} className="bg-white p-4 dark:bg-neutral-900"><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">{term}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>)}</section>

          <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="relationship-intelligence-heading"><div className="flex items-center justify-between gap-3"><div><h3 id="relationship-intelligence-heading" className="text-lg font-semibold">Relationship Intelligence</h3><p className="mt-1 text-xs text-neutral-500">Why this relationship matters to BLTZ right now.</p></div><button type="button" onClick={() => openMode("relationship")} className="min-h-11 rounded-xl px-3 text-sm font-semibold underline-offset-4 hover:underline">Edit</button></div><dl className="mt-4 grid gap-3 sm:grid-cols-3"><div><dt className="text-xs text-neutral-500">Contact type</dt><dd className="mt-1 text-sm font-semibold">{contact.contactType === "other" && contact.contactTypeOther ? contact.contactTypeOther : label(contact.contactType)}</dd></div><div><dt className="text-xs text-neutral-500">Current objective</dt><dd className="mt-1 text-sm font-semibold">{label(contact.relationshipObjective)}</dd></div><div><dt className="text-xs text-neutral-500">Relationship priority</dt><dd className="mt-1 text-sm font-semibold">{label(contact.relationshipPriority)}</dd></div></dl><div className="mt-4"><p className="text-xs text-neutral-500">Potential roles</p>{contact.potentialRoles.length ? <div className="mt-2 flex flex-wrap gap-2">{contact.potentialRoles.map((role) => <StatusBadge key={role} value={role} />)}</div> : <p className="mt-1 text-sm font-medium">Not recorded</p>}</div><div className="mt-4"><p className="text-xs text-neutral-500">Relationship context</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{contact.relationshipContext ?? "Not recorded"}</p></div></section>

          {contact.contactType === "investor" && <section className="mt-8"><h3 className="text-lg font-semibold">Investor context</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2">{[["Investor type", label(contact.investorType)], ["Relationship stage", label(contact.investorRelationshipStage)], ["What they need to see", contact.whatTheyNeedToSee], ["Thesis feedback", contact.investorThesisFeedback], ["Historical signal", contact.historicalSignal], ["Future trigger", contact.futureTrigger], ["Prior outcome", contact.priorOutcome], ["Relationship source", contact.relationshipSource]].map(([term, value]) => <div key={term} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"><dt className="text-xs text-neutral-500">{term}</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-medium">{value || "Not recorded"}</dd></div>)}</dl></section>}

          <section className="mt-8"><h3 className="text-lg font-semibold">Relationship scoring</h3><div className="mt-3 grid grid-cols-2 gap-3">{[["Relationship", contact.relationshipStrength], ["BLTZ relevance", contact.bltzRelevance], ["Buying authority", contact.buyingAuthority], ["Network leverage", contact.networkLeverage], ["Timing", contact.timingScore]].map(([term, value]) => <div key={String(term)} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"><p className="text-xs text-neutral-500">{term}</p><p className="mt-1 font-mono text-lg font-semibold">{value == null ? "–" : String(value)}</p></div>)}</div></section>

          <section className="mt-8"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Matched Player</h3>{contact.contactType === "athlete" && <button type="button" onClick={() => openMode("player")} className="min-h-11 text-sm font-semibold underline">Match Player</button>}</div><div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">{contact.playerMatch ? <div className="flex items-start gap-3"><IconUserCheck className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">{contact.playerMatch.playerName}</p><p className="mt-1 text-xs text-neutral-500">{[contact.playerMatch.position, contact.playerMatch.team, contact.playerMatch.level].filter(Boolean).join(" · ") || "Canonical Player record"}</p><p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{contact.playerMatch.verified ? "Verified match" : "Potential match"}</p></div></div> : "No Player match"}</div></section>

          <section className="mt-8"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Notes</h3><span className="font-mono text-xs text-neutral-500">{contact.notes.length}</span></div><div className="mt-3 space-y-3">{contact.notes.length ? contact.notes.map((note) => <article key={note.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">{editingNoteId === note.id ? <form action={submitNoteEdit} className="space-y-3"><label className="block text-sm font-medium">Note type<select name="noteType" defaultValue={note.noteType} className={inputClass}>{GTM_NOTE_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label><label className="block text-sm font-medium">Note<textarea name="body" required defaultValue={note.body} maxLength={5000} rows={4} className={textareaClass} /></label><FormActions pending={pending} submitLabel="Update note" onCancel={() => setEditingNoteId(null)} /></form> : <><div className="flex items-start justify-between gap-3 text-xs text-neutral-500"><span>{label(note.noteType)}</span><div className="flex items-center gap-3"><time>{formatDate(note.createdAt, true)}</time><button type="button" onClick={() => setEditingNoteId(note.id)} className="min-h-10 rounded-lg px-2 font-semibold text-neutral-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:text-neutral-200">Edit</button></div></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{note.body}</p></>}</article>) : <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">No notes recorded yet.</p>}</div></section>

          <section className="mt-8"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Interactions</h3><span className="font-mono text-xs text-neutral-500">{contact.interactions.length}</span></div><div className="mt-3 space-y-3">{contact.interactions.length ? contact.interactions.map((item) => <article key={item.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"><div className="flex justify-between gap-3 text-xs text-neutral-500"><span>{label(item.interactionType)} · {label(item.direction)}</span><time>{formatDate(item.interactionAt, true)}</time></div><p className="mt-2 text-sm font-medium">{item.subject ?? "Interaction"}</p>{item.summary && <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{item.summary}</p>}{item.followUpRequired && <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300">Follow-up required</p>}{item.outcomes.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{item.outcomes.map((outcome) => <StatusBadge key={outcome} value={outcome} />)}</div>}{item.nextTrigger && <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-800"><span className="font-semibold">Next trigger:</span> {item.nextTrigger}</p>}<button type="button" onClick={() => openMode("discovery", item.id)} className="mt-3 min-h-11 text-sm font-semibold underline">Add Discovery Insight</button></article>) : <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">No interactions recorded yet.</p>}</div></section>

          <section className="mt-8"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Customer Discovery</h3><span className="font-mono text-xs text-neutral-500">{contact.discoveries.length}</span></div><div className="mt-3 space-y-3">{contact.discoveries.length ? contact.discoveries.map((insight) => <article key={insight.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">{insight.interactionId ? "Linked conversation insight" : "Contact insight"}</p><time className="text-xs text-neutral-500">{formatDate(insight.createdAt)}</time></div><dl className="mt-3 space-y-3 text-sm">{[["Problem discussed", insight.problemDiscussed], ["Current solution", insight.currentSolution], ["BLTZ use case", insight.primaryBltzUseCase], ["Feature requested", insight.featureRequested], ["Expected buyer", insight.expectedBuyer], ["Expected budget", insight.expectedBudgetRange], ["Main objection", insight.primaryObjection], ["Introduction target", insight.introductionTarget], ["Additional context", insight.additionalContext]].filter(([, value]) => value).map(([term, value]) => <div key={String(term)}><dt className="text-xs text-neutral-500">{term}</dt><dd className="mt-1 whitespace-pre-wrap">{value}</dd></div>)}</dl><div className="mt-3 flex flex-wrap gap-2">{insight.painLevel && <StatusBadge value={`Pain ${insight.painLevel}/5`} />}{[["Would use", insight.wouldUse], ["Would pilot", insight.wouldPilot], ["Would pay", insight.wouldPay], ["Introduction offered", insight.introductionOffered]].filter(([, value]) => value !== null).map(([term, value]) => <StatusBadge key={String(term)} value={`${term}: ${value ? "Yes" : "No"}`} />)}</div></article>) : <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">No structured discovery insights yet.</p>}</div></section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
