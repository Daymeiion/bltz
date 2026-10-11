"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { invitationEmailLabels, invitationEmailStates, type InvitationEmailContact, type InvitationEmailState } from "@/lib/preview-lockers/invitation-email";

const control = "min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:border-slate-700 dark:bg-[#101c2e]";
export function PreviewInvitationEmailForm({ previewId, previewName, contacts, enabled, privateInvitation }: {
  previewId: string; previewName: string; contacts: InvitationEmailContact[]; enabled: boolean; privateInvitation: boolean;
}) {
  const router = useRouter();
  const [contactId, setContactId] = useState(contacts.length === 1 ? contacts[0].id : "");
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  const [state, setState] = useState<InvitationEmailState | null>(null), [feedback, setFeedback] = useState<string | null>(null);
  const inFlight = useRef(false);
  const selected = contacts.find(contact => contact.id === contactId);
  const storageKey = `bltz-preview-invitation-request-v1:${previewId}:${contactId}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || !selected || !confirmed || inFlight.current) return;
    inFlight.current = true; setBusy(true); setFeedback(null);
    try {
      // Keep only identifiers in this tab so a refresh/error cannot silently create a second send.
      let requestId = sessionStorage.getItem(storageKey);
      if (!requestId) { requestId = crypto.randomUUID(); sessionStorage.setItem(storageKey, requestId); }
      const response = await fetch(`/api/admin/preview-lockers/${previewId}/invitation-email`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ contactId, requestId, confirmed: true }),
      });
      const result: unknown = await response.json();
      const outcome = result && typeof result === "object" && "state" in result ? result.state : null;
      if (typeof outcome === "string" && (invitationEmailStates as readonly string[]).includes(outcome)) {
        const next = outcome as InvitationEmailState;
        setState(next);
        setFeedback(next === "send_uncertain" || next === "sending"
          ? "The outcome is uncertain. Check the mailbox and attempt history before preparing another invitation. This request reference will not automatically resend."
          : next === "smtp_accepted" ? "IONOS accepted this invitation for sending. This is not proof of recipient delivery."
          : next === "send_failed" ? "This invitation failed before acceptance. Review the configuration and recipient before explicitly preparing a separate attempt."
          : `Existing invitation: ${invitationEmailLabels[next]}. Reusing this request does not create a separate invitation.`);
        router.refresh();
      } else {
        setFeedback(response.status === 503 ? "Sending is unavailable. Check configuration and attempt history before trying again; this request reference is retained."
          : "The invitation could not be confirmed. Review the recipient and current preview access. This request reference is retained.");
      }
    } catch {
      setFeedback("The request outcome is unavailable. Check the attempt history before trying again. A retry will reuse the same reference; no separate attempt is prepared automatically.");
    } finally { inFlight.current = false; setBusy(false); }
  }
  function prepareAgain() {
    // Only a definitive failure may be explicitly replaced here; accepted/uncertain sends remain protected.
    if (state !== "send_failed") return;
    try { sessionStorage.removeItem(storageKey); setState(null); setConfirmed(false); setFeedback("Review and confirm this separate invitation before sending."); }
    catch { setFeedback("This tab cannot retain the request reference. Do not send until browser storage is available."); }
  }
  return <form onSubmit={submit} className="space-y-3" aria-label={`Send reviewed invitation for ${previewName}`}>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="min-w-0 text-xs font-medium">Existing GTM contact<select className={`${control} mt-1 w-full`} value={contactId} disabled={busy || !enabled}
        onChange={event => { setContactId(event.target.value); setConfirmed(false); setState(null); setFeedback(null); }}>
        <option value="">Choose the reviewed recipient</option>{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.label}</option>)}
      </select></label>
      <div className="min-w-0 text-xs"><p className="font-medium">Recipient to review</p><p className="mt-3 break-all">{selected?.email ?? "Choose a contact to review their address."}</p></div>
    </div>
    {privateInvitation && <p className="text-xs leading-5 text-neutral-500 dark:text-slate-400">Private invitations require the contact email to match the assigned player. The server checks the current 48-hour grant before sending; this action cannot renew or create access.</p>}
    {!contacts.length && <p role="status" className="text-sm text-neutral-500 dark:text-slate-400">No contact with an email is available. Review the existing GTM contact and preview association before sending.</p>}
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#ffbb00] focus-visible:outline focus-visible:outline-[#ffbb00]"
      checked={confirmed} disabled={busy || !enabled || !selected} onChange={event => setConfirmed(event.target.checked)} />
      <span>I reviewed this recipient and authorize one invitation to {previewName}. No bulk email will be sent.</span></label>
    <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy || !enabled || !selected || !confirmed}
      className={`${control} font-semibold disabled:cursor-not-allowed disabled:opacity-50`}>{busy ? "Checking invitation…" : state ? "Check existing attempt" : "Send reviewed invitation"}</button>
      {state === "send_failed" && <button type="button" onClick={prepareAgain} disabled={busy} className={control}>Prepare a separate attempt</button>}</div>
    {feedback && <p role="status" className="text-sm leading-6 text-neutral-600 dark:text-slate-300">{feedback}</p>}
    <p className="text-xs leading-5 text-neutral-500 dark:text-slate-400">The same request reference is retained in this tab after errors. Do not use another tab to retry an uncertain send. Staff “Mark invitation sent” remains a manual record, not email delivery evidence.</p>
  </form>;
}
