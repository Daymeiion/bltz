"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { IconFileUpload, IconSearch, IconUserPlus, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  commitGtmCsv,
  createGtmContact,
  previewGtmCsv,
  searchGtmPlayers,
  type GtmCsvPreview,
  type GtmPlayerOption,
} from "@/app/admin/gtm/actions";
import { GTM_CSV_MAX_BYTES, GTM_IMPORT_FIELDS, type GtmFieldMapping, type GtmImportField } from "@/lib/gtm/import-contract";

const fieldLabels: Record<GtmImportField, string> = {
  displayName: "Display name",
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  linkedinUrl: "LinkedIn URL",
  currentCompany: "Company",
  currentTitle: "Title",
  contactType: "Contact type",
  sport: "Sport",
  leagueLevel: "League / level",
  doNotAutomate: "Do not automate",
  sourceRecordId: "Source record ID",
};

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
            <label className="text-sm font-medium">Contact type<select value={contactType} onChange={(event) => { setContactType(event.target.value); if (event.target.value !== "athlete") setSelectedPlayer(null); }} className={inputClass}><option value="unclassified">Unclassified</option><option value="enterprise">Enterprise</option><option value="athlete">Athlete / player</option><option value="multiplier">Multiplier</option></select></label>
            <label className="text-sm font-medium">First name<input name="firstName" maxLength={120} className={inputClass} /></label>
            <label className="text-sm font-medium">Last name<input name="lastName" maxLength={120} className={inputClass} /></label>
            <label className="text-sm font-medium">Email<input name="email" type="email" maxLength={320} className={inputClass} /></label>
            <label className="text-sm font-medium">LinkedIn URL<input name="linkedinUrl" type="url" maxLength={500} placeholder="https://www.linkedin.com/in/..." className={inputClass} /></label>
            <label className="text-sm font-medium">Company<input name="currentCompany" maxLength={200} className={inputClass} /></label>
            <label className="text-sm font-medium">Title / role<input name="currentTitle" maxLength={200} className={inputClass} /></label>
            <label className="text-sm font-medium">Sport<input name="sport" maxLength={80} className={inputClass} /></label>
            <label className="text-sm font-medium">League / level<input name="leagueLevel" maxLength={80} className={inputClass} /></label>
          </div>

          {contactType === "athlete" && (
            <fieldset className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <legend className="px-1 text-sm font-semibold">Canonical Player link <span className="font-normal text-neutral-500">(optional)</span></legend>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row"><input value={playerQuery} onChange={(event) => setPlayerQuery(event.target.value)} placeholder="Search player name" className={`${inputClass} mt-0 flex-1`} /><button type="button" onClick={findPlayers} disabled={playerQuery.trim().length < 2} className={secondaryButton}><IconSearch className="h-4 w-4" />Search</button></div>
              {selectedPlayer && <p className="mt-3 rounded-xl bg-neutral-100 p-3 text-sm dark:bg-neutral-800"><span className="font-semibold">Linked:</span> {selectedPlayer.name}{selectedPlayer.team ? ` · ${selectedPlayer.team}` : ""} <button type="button" onClick={() => setSelectedPlayer(null)} className="ml-2 underline">Remove</button></p>}
              {!selectedPlayer && players.length > 0 && <div className="mt-3 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">{players.map((player) => <button key={player.id} type="button" onClick={() => setSelectedPlayer(player)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffbb00] dark:hover:bg-neutral-800"><span><span className="font-semibold">{player.name}</span><span className="block text-xs text-neutral-500">{[player.position, player.team, player.level].filter(Boolean).join(" · ") || "Player record"}</span></span><span className="font-semibold">Link</span></button>)}</div>}
            </fieldset>
          )}

          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"><input name="doNotAutomate" type="checkbox" className="h-4 w-4" /><span><span className="font-semibold">Do not automate</span><span className="block text-xs text-neutral-500">Preserve this contact for manual outreach only.</span></span></label>
          <div className="flex justify-end gap-2"><Dialog.Close type="button" className={secondaryButton}>Cancel</Dialog.Close><button disabled={pending} className={primaryButton}>{pending ? "Creating…" : "Create contact"}</button></div>
        </form>
      </ModalShell>
    </Dialog.Root>
  );
}

function ImportCsvDialog({ onComplete }: { onComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<GtmFieldMapping>({});
  const [preview, setPreview] = useState<GtmCsvPreview | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [complete, setComplete] = useState<string | null>(null);

  const formDataFor = () => {
    const formData = new FormData();
    if (file) formData.set("file", file);
    formData.set("mapping", JSON.stringify(mapping));
    if (preview) formData.set("idempotencyKey", preview.idempotencyKey);
    return formData;
  };

  const review = () => {
    if (!file) { setNotice("Choose a CSV file first."); return; }
    setPending(true); setNotice(null); setComplete(null);
    startTransition(async () => {
      const result = await previewGtmCsv(formDataFor());
      setPending(false);
      if (!result.ok) { setNotice(result.message); return; }
      setPreview(result.value);
      setMapping(result.value.mapping);
    });
  };

  const commit = () => {
    if (!file || !preview) return;
    setPending(true); setNotice(null);
    startTransition(async () => {
      const result = await commitGtmCsv(formDataFor());
      setPending(false);
      if (!result.ok) { setNotice(result.message); return; }
      setComplete(`${result.value.created} created, ${result.value.updated} updated, ${result.value.skipped} skipped, ${result.value.failed} failed.`);
      onComplete();
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setNotice(null); setComplete(null); } }}>
      <Dialog.Trigger className={secondaryButton}><IconFileUpload className="h-4 w-4" />Import CSV</Dialog.Trigger>
      <ModalShell title="Import contacts from CSV" description="Upload, map, and preview before committing. Existing imported contacts are updated; duplicate identities and invalid rows are skipped. Raw CSV rows are never retained.">
        <div className="mt-6 space-y-5">
          {notice && <p role="alert" className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">{notice}</p>}
          {complete && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"><span className="font-semibold">Import complete.</span> {complete}</p>}
          <label className="block rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-sm dark:border-neutral-700 dark:bg-neutral-900"><span className="font-semibold">CSV file</span><input type="file" accept=".csv,text/csv" className="mt-3 block w-full text-sm file:mr-4 file:min-h-11 file:rounded-xl file:border-0 file:bg-neutral-950 file:px-4 file:text-sm file:font-semibold file:text-white dark:file:bg-white dark:file:text-black" onChange={(event) => { const next = event.target.files?.[0] ?? null; setFile(next); setPreview(null); setMapping({}); setComplete(null); }} /><span className="mt-2 block text-xs text-neutral-500">Maximum {(GTM_CSV_MAX_BYTES / 1000).toFixed(0)} KB and 2,000 rows.</span></label>

          {preview && (
            <>
              <section aria-labelledby="field-mapping"><div className="flex items-end justify-between"><div><h3 id="field-mapping" className="font-semibold">Field mapping</h3><p className="mt-1 text-xs text-neutral-500">Confirm the detected headers, then refresh the preview if you change them.</p></div></div><div className="mt-3 grid gap-3 sm:grid-cols-2">{GTM_IMPORT_FIELDS.map((field) => <label key={field} className="text-sm font-medium">{fieldLabels[field]}<select value={mapping[field] ?? ""} onChange={(event) => { setMapping((current) => ({ ...current, [field]: event.target.value || undefined })); }} className={inputClass}><option value="">Not mapped</option>{preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div></section>
              <section aria-labelledby="import-preview"><h3 id="import-preview" className="font-semibold">Preview</h3><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{[["Rows", preview.counts.found], ["Create", preview.counts.create], ["Update", preview.counts.update], ["Skip", preview.counts.duplicate], ["Invalid", preview.counts.invalid]].map(([name, value]) => <div key={String(name)} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"><p className="text-xs text-neutral-500">{name}</p><p className="mt-1 font-mono text-xl font-semibold">{value}</p></div>)}</div>
                <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800"><table className="w-full min-w-[36rem] text-left text-sm"><thead className="bg-neutral-100 text-xs text-neutral-500 dark:bg-neutral-900"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Company</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Outcome</th></tr></thead><tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">{preview.sample.map((row) => <tr key={row.rowNumber}><td className="px-3 py-2 font-mono">{row.rowNumber}</td><td className="px-3 py-2"><span className="font-semibold">{row.displayName}</span>{row.email && <span className="block text-xs text-neutral-500">{row.email}</span>}</td><td className="px-3 py-2">{row.currentCompany || "—"}</td><td className="px-3 py-2 capitalize">{row.contactType}</td><td className="px-3 py-2 capitalize">{row.outcome}</td></tr>)}</tbody></table></div>
                {preview.issues.length > 0 && <details className="mt-3 rounded-xl border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"><summary className="cursor-pointer font-semibold">Review invalid rows ({preview.counts.invalid})</summary><ul className="mt-2 space-y-1 text-neutral-600 dark:text-neutral-300">{preview.issues.map((issue) => <li key={`${issue.rowNumber}-${issue.message}`}>Row {issue.rowNumber}: {issue.message}</li>)}</ul></details>}
              </section>
            </>
          )}

          <div className="flex flex-wrap justify-end gap-2"><Dialog.Close type="button" className={secondaryButton}>{complete ? "Close" : "Cancel"}</Dialog.Close>{!complete && <button type="button" onClick={review} disabled={pending || !file} className={secondaryButton}>{pending ? "Reading…" : preview ? "Refresh preview" : "Review import"}</button>}{preview && !complete && <button type="button" onClick={commit} disabled={pending || preview.counts.create + preview.counts.update === 0} className={primaryButton}>{pending ? "Importing…" : `Import ${preview.counts.create + preview.counts.update} contacts`}</button>}</div>
        </div>
      </ModalShell>
    </Dialog.Root>
  );
}

export function GtmContactIntake() {
  const router = useRouter();
  const onComplete = () => router.refresh();
  return <div className="flex flex-wrap gap-2"><ImportCsvDialog onComplete={onComplete} /><AddContactDialog onComplete={onComplete} /></div>;
}
