"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { IconFileUpload, IconSearch, IconUserPlus, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  createGtmContact,
  searchGtmPlayers,
  type GtmPlayerOption,
} from "@/app/admin/gtm/actions";
import { GTM_INVESTOR_RELATIONSHIP_STAGES, GTM_INVESTOR_TYPES } from "@/lib/gtm/types";

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:border-neutral-700 dark:bg-neutral-950";
const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950";
const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] disabled:opacity-50 dark:bg-white dark:text-black";

function ModalShell({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35" />
      <Dialog.Content className="fixed inset-x-3 top-1/2 z-50 max-h-[calc(100vh-2rem)] -translate-y-1/2 overflow-y-auto rounded-2xl border border-neutral-200 bg-neutral-50 p-5 shadow-xl focus:outline-none sm:left-1/2 sm:right-auto sm:w-[min(44rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="pr-12">
          <Dialog.Title className="text-2xl font-semibold tracking-[-0.03em]">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{description}</Dialog.Description>
        </div>
        <Dialog.Close className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]" aria-label="Close dialog"><IconX className="h-5 w-5" /></Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function AddContactDialog({ onComplete }: { onComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [contactType, setContactType] = useState("unclassified");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [playerQuery, setPlayerQuery] = useState("");
  const [players, setPlayers] = useState<GtmPlayerOption[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<GtmPlayerOption | null>(null);

  const findPlayers = () => {
    setNotice(null);
    startTransition(async () => {
      const result = await searchGtmPlayers(playerQuery);
      if (result.ok) setPlayers(result.value);
      else setNotice(result.message);
    });
  };

  const submit = (formData: FormData) => {
    setPending(true);
    setNotice(null);
    startTransition(async () => {
      const result = await createGtmContact({
        displayName: String(formData.get("displayName") ?? ""),
        firstName: String(formData.get("firstName") ?? "").trim() || null,
        lastName: String(formData.get("lastName") ?? "").trim() || null,
        email: String(formData.get("email") ?? "").trim() || null,
        linkedinUrl: String(formData.get("linkedinUrl") ?? "").trim() || null,
        currentCompany: String(formData.get("currentCompany") ?? "").trim() || null,
        currentTitle: String(formData.get("currentTitle") ?? "").trim() || null,
        contactType,
        sport: String(formData.get("sport") ?? "").trim() || null,
        leagueLevel: String(formData.get("leagueLevel") ?? "").trim() || null,
        doNotAutomate: formData.get("doNotAutomate") === "on",
        playerId: selectedPlayer?.id ?? null,
        investorType: String(formData.get("investorType") ?? "").trim() || null,
        investorRelationshipStage: String(formData.get("investorRelationshipStage") ?? "").trim() || null,
        whatTheyNeedToSee: String(formData.get("whatTheyNeedToSee") ?? "").trim() || null,
        investorThesisFeedback: String(formData.get("investorThesisFeedback") ?? "").trim() || null,
        historicalSignal: String(formData.get("historicalSignal") ?? "").trim() || null,
        futureTrigger: String(formData.get("futureTrigger") ?? "").trim() || null,
        priorOutcome: String(formData.get("priorOutcome") ?? "").trim() || null,
        relationshipSource: String(formData.get("relationshipSource") ?? "").trim() || null,
        nextTrigger: String(formData.get("nextTrigger") ?? "").trim() || null,
      });
      setPending(false);
      if (!result.ok) { setNotice(result.message); return; }
      setOpen(false);
      setSelectedPlayer(null);
      setPlayers([]);
      onComplete();
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={primaryButton}><IconUserPlus className="h-4 w-4" />Add contact / player</Dialog.Trigger>
      <ModalShell title="Add contact or player" description="Create one GTM contact. Athlete contacts can be linked to an existing canonical Player record without duplicating Player data.">
        <form action={submit} className="mt-6 space-y-5">
          {notice && <p role="alert" className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">{notice}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Display name<input name="displayName" required maxLength={240} className={inputClass} /></label>
            <label className="text-sm font-medium">Contact type<select value={contactType} onChange={(event) => { setContactType(event.target.value); if (event.target.value !== "athlete") setSelectedPlayer(null); }} className={inputClass}><option value="unclassified">Unclassified</option><option value="enterprise">Enterprise</option><option value="athlete">Athlete / player</option><option value="multiplier">Multiplier</option><option value="investor">Investor</option></select></label>
            <label className="text-sm font-medium">First name<input name="firstName" maxLength={120} className={inputClass} /></label>
            <label className="text-sm font-medium">Last name<input name="lastName" maxLength={120} className={inputClass} /></label>
            <label className="text-sm font-medium">Email<input name="email" type="email" maxLength={320} className={inputClass} /></label>
            <label className="text-sm font-medium">LinkedIn URL<input name="linkedinUrl" type="url" maxLength={500} placeholder="https://www.linkedin.com/in/..." className={inputClass} /></label>
            <label className="text-sm font-medium">Company<input name="currentCompany" maxLength={200} className={inputClass} /></label>
            <label className="text-sm font-medium">Title / role<input name="currentTitle" maxLength={200} className={inputClass} /></label>
            <label className="text-sm font-medium">Sport<input name="sport" maxLength={80} className={inputClass} /></label>
            <label className="text-sm font-medium">League / level<input name="leagueLevel" maxLength={80} className={inputClass} /></label>
          </div>

          {contactType === "investor" && (
            <fieldset className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <legend className="px-1 text-sm font-semibold">Investor context <span className="font-normal text-neutral-500">(optional)</span></legend>
              <p className="mt-1 text-xs text-neutral-500">These fields stay private and are valid only for investor contacts.</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">Investor type<select name="investorType" className={inputClass}><option value="">Not classified</option>{GTM_INVESTOR_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
                <label className="text-sm font-medium">Relationship stage<select name="investorRelationshipStage" className={inputClass}><option value="">Not classified</option>{GTM_INVESTOR_RELATIONSHIP_STAGES.map((stage) => <option key={stage} value={stage}>{stage.replaceAll("_", " ")}</option>)}</select></label>
                <label className="text-sm font-medium sm:col-span-2">What they need to see<textarea name="whatTheyNeedToSee" maxLength={10000} rows={3} className={inputClass} /></label>
                <label className="text-sm font-medium sm:col-span-2">Investor thesis feedback<textarea name="investorThesisFeedback" maxLength={10000} rows={3} className={inputClass} /></label>
                <label className="text-sm font-medium">Historical signal<textarea name="historicalSignal" maxLength={5000} rows={3} className={inputClass} /></label>
                <label className="text-sm font-medium">Future trigger<textarea name="futureTrigger" maxLength={2000} rows={3} className={inputClass} /></label>
                <label className="text-sm font-medium">Prior outcome<textarea name="priorOutcome" maxLength={5000} rows={3} className={inputClass} /></label>
                <label className="text-sm font-medium">Relationship source<input name="relationshipSource" maxLength={1000} className={inputClass} /></label>
              </div>
            </fieldset>
          )}

          {contactType === "athlete" && (
            <fieldset className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <legend className="px-1 text-sm font-semibold">Canonical Player link <span className="font-normal text-neutral-500">(optional)</span></legend>
              <div className="mt-2 flex flex-col items-end gap-2 sm:flex-row"><label className="w-full flex-1 text-sm font-medium"><span>Player name</span><input value={playerQuery} onChange={(event) => setPlayerQuery(event.target.value)} placeholder="Search player name" className={inputClass} /></label><button type="button" onClick={findPlayers} disabled={playerQuery.trim().length < 2} className={secondaryButton}><IconSearch className="h-4 w-4" />Search</button></div>
              {selectedPlayer && <p className="mt-3 rounded-xl bg-neutral-100 p-3 text-sm dark:bg-neutral-800"><span className="font-semibold">Linked:</span> {selectedPlayer.name}{selectedPlayer.team ? ` · ${selectedPlayer.team}` : ""} <button type="button" onClick={() => setSelectedPlayer(null)} className="ml-2 underline">Remove</button></p>}
              {!selectedPlayer && players.length > 0 && <div className="mt-3 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">{players.map((player) => <button key={player.id} type="button" onClick={() => setSelectedPlayer(player)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffbb00] dark:hover:bg-neutral-800"><span><span className="font-semibold">{player.name}</span><span className="block text-xs text-neutral-500">{[player.position, player.team, player.level].filter(Boolean).join(" · ") || "Player record"}</span></span><span className="font-semibold">Link</span></button>)}</div>}
            </fieldset>
          )}

          <label className="block text-sm font-medium">Next trigger <span className="font-normal text-neutral-500">(optional)</span><textarea name="nextTrigger" maxLength={2000} rows={2} placeholder="Re-engage after the next meaningful milestone" className={inputClass} /></label>

          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"><input name="doNotAutomate" type="checkbox" className="h-4 w-4" /><span><span className="font-semibold">Do not automate</span><span className="block text-xs text-neutral-500">Preserve this contact for manual outreach only.</span></span></label>
          <div className="flex justify-end gap-2"><Dialog.Close type="button" className={secondaryButton}>Cancel</Dialog.Close><button disabled={pending} className={primaryButton}>{pending ? "Creating…" : "Create contact"}</button></div>
        </form>
      </ModalShell>
    </Dialog.Root>
  );
}

export function GtmContactIntake() {
  const router = useRouter();
  const onComplete = () => router.refresh();
  return <div className="flex flex-wrap gap-2"><Link href="/admin/gtm/imports" className={secondaryButton}><IconFileUpload className="h-4 w-4" />Import CSV</Link><AddContactDialog onComplete={onComplete} /></div>;
}
