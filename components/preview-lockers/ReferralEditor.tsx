"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { referralCandidate } from "@/lib/preview-lockers/conversion";

export type ReferralEntry = { full_name: string; email: string; phone: string };
const field = "h-10 w-full rounded-lg border border-white/10 bg-[#272A32] px-3 text-left text-sm text-white placeholder:text-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]";

export default function ReferralEditor({ value, onChange, onEditingChange }: {
  value: ReferralEntry[]; onChange: (rows: ReferralEntry[]) => void; onEditingChange: (editing: boolean) => void;
}) {
  const [draft, setDraft] = useState<ReferralEntry | null>(null);
  const [error, setError] = useState("");
  function close() { setDraft(null); setError(""); onEditingChange(false); }
  function confirm() {
    if (!draft || value.length >= 10) return;
    const row = { full_name: draft.full_name.trim(), email: draft.email.trim(), phone: draft.phone.trim() };
    const result = referralCandidate.safeParse({ full_name: row.full_name, ...(row.email ? {email:row.email} : {}), ...(row.phone ? {phone:row.phone} : {}) });
    if (!result.success) { setError("Enter the player’s name and a valid email. Phone is optional; if provided, use a valid phone number."); return; }
    onChange([...value, row]); close();
  }
  return <fieldset className="mt-2 space-y-2 text-center">
    <legend className="mx-auto mb-0 font-semibold text-[#ffbb00]">Refer other players (optional)</legend>
    {value.length > 0 && <ul aria-label="Players to refer" className="space-y-2 text-left">
      {value.map((row, index) => <li key={index} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] py-1 pl-3 pr-1">
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{row.full_name}</p><p className="break-words text-xs text-white/60">{[row.email,row.phone].filter(Boolean).join(" · ")}</p></div>
        <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={`Remove ${row.full_name}`} className="grid size-11 shrink-0 place-items-center rounded-lg text-white/60 hover:text-white focus-visible:outline focus-visible:outline-[#ffbb00]"><X size={16} aria-hidden="true" /></button>
      </li>)}
    </ul>}
    {draft && <div className="space-y-2 rounded-xl border border-white/10 p-2 text-left [container-type:inline-size]" aria-label="New referred player">
      <p className="text-center leading-relaxed text-white/60"><span className="block whitespace-nowrap text-[clamp(0.5rem,3.7cqw,0.75rem)]">Share only contact details you have permission to provide.</span><span className="block text-[clamp(0.5rem,3.7cqw,0.75rem)]">Players on this list are submitted with CLAIM NOW.</span></p>
      <input aria-label="Player name" placeholder="Player name *" required minLength={2} maxLength={120} value={draft.full_name} onChange={e => setDraft({...draft,full_name:e.target.value})} className={field} />
      <div className="grid gap-2 sm:grid-cols-2">
        <input aria-label="Player email" placeholder="Email *" required type="email" maxLength={254} value={draft.email} onChange={e => setDraft({...draft,email:e.target.value})} className={field} />
        <input aria-label="Player phone (optional)" placeholder="Phone (optional)" type="tel" maxLength={30} value={draft.phone} onChange={e => setDraft({...draft,phone:e.target.value})} className={field} />
      </div>
      {error && <p role="alert" className="text-xs text-[#ffbb00]">{error}</p>}
      <div className="flex justify-end gap-1">
        <button type="button" onClick={close} aria-label="Cancel player entry" className="grid size-11 place-items-center rounded-lg text-white/60 focus-visible:outline focus-visible:outline-[#ffbb00]"><X size={16} aria-hidden="true" /></button>
        <button type="button" onClick={confirm} aria-label="Add player to referral list" className="grid size-11 place-items-center rounded-lg bg-[#ffbb00] text-black focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-white"><Check size={18} aria-hidden="true" /></button>
      </div>
    </div>}
    {!draft && <button type="button" disabled={value.length >= 10} onClick={() => {setDraft({full_name:"",email:"",phone:""});onEditingChange(true);}} className="min-h-11 w-44 max-w-full rounded-lg border border-white/15 px-3 py-2 text-xs disabled:opacity-50 focus-visible:outline focus-visible:outline-[#ffbb00]">Add a player ({value.length}/10)</button>}
  </fieldset>;
}
