import { invitationEmailLabels, invitationEmailStates, type InvitationEmailContact, type InvitationEmailReport, type InvitationEmailState } from "@/lib/preview-lockers/invitation-email";
import { PreviewInvitationEmailForm } from "./PreviewInvitationEmailForm";

const muted = "text-neutral-500 dark:text-slate-400";
function date(value: string | null) {
  if (!value) return "Not yet";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Unavailable" : parsed.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC",
  }) + " UTC";
}
function color(state: InvitationEmailState) {
  return ["bounced", "send_failed"].includes(state) ? "text-rose-700 dark:text-rose-300"
    : ["send_uncertain", "delivery_delayed"].includes(state) ? "text-amber-700 dark:text-amber-300"
    : state === "delivery_reported" ? "text-emerald-700 dark:text-emerald-300" : muted;
}
/** Operational email evidence remains separate from analytics transport and manual cohort marks. */
export function PreviewInvitationEmailPanel({ report, previewName, contacts, privateInvitation }: {
  report: InvitationEmailReport; previewName: string | null; contacts: InvitationEmailContact[]; privateInvitation: boolean;
}) {
  const available = report.status === "available" && report.counts !== null;
  return <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-slate-800 dark:bg-[#0c1524]" aria-labelledby="preview-email-heading">
    <div className="border-b border-neutral-200 p-5 dark:border-slate-800"><p className={`text-xs uppercase tracking-widest ${muted}`}>Invitation workflow</p>
      <h2 id="preview-email-heading" className="mt-1 text-xl font-semibold">Invitation email and bounce status</h2>
      <p className={`mt-2 max-w-2xl text-sm leading-6 ${muted}`}>One reviewed invitation at a time through IONOS. SMTP acceptance and mailbox delivery reports are different from player engagement.</p></div>
    <div className="space-y-5 p-5">
      {!report.readiness.enabled && <p role="status" className="rounded-lg border border-amber-500 p-4 text-sm leading-6 text-amber-700 dark:text-amber-300">Sending is disabled. Configure the approved sender and server-only mailbox password, then enable sending after a controlled verification. No email is sent by viewing this page.</p>}
      <p className={`text-xs leading-5 ${muted}`}>Sender: {report.readiness.sender ?? "Not configured"} · Sending: {report.readiness.enabled ? "Enabled" : "Disabled"} · Read-only bounce checks: {report.readiness.bounceSyncEnabled ? "Enabled" : "Disabled"}. Bounce checks leave mailbox messages untouched.</p>
      {report.status === "unselected" ? <p className={`text-sm ${muted}`}>Choose a shared player preview above to review its email attempts.</p> : !available ? <p role="alert" className="rounded-lg border border-amber-500 p-4 text-sm text-amber-700 dark:text-amber-300">Invitation email history is unavailable. Missing data is not counted as zero, and sending is withheld until the report is available.</p> : <>
        <div><h3 className="text-lg font-semibold">{previewName ?? "Selected player preview"}</h3><p className={`mt-1 text-xs ${muted}`}>{report.totalAttempts?.toLocaleString("en-US")} invitation attempts in this environment. Each attempt appears in one current state.</p></div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">{invitationEmailStates.map(state => <div key={state} className="border-l-2 border-neutral-200 pl-3 dark:border-slate-700"><dt className={`text-xs ${color(state)}`}>{invitationEmailLabels[state]}</dt><dd className={`mt-1 font-mono text-xl font-semibold ${color(state)}`}>{report.counts![state].toLocaleString("en-US")}</dd></div>)}</dl>
        <p className={`text-xs leading-5 ${muted}`}>“Delivery reported” means a matched delivery-status reply, not a read or inbox guarantee. Absence of a bounce does not prove delivery. An uncertain SMTP result must be checked before any separate attempt.</p>
        <section className="border-t border-neutral-200 pt-4 dark:border-slate-800" aria-labelledby="preview-email-history-heading"><h4 id="preview-email-history-heading" className="font-semibold">Recent email attempts</h4>
          {report.limited && <p className={`mt-2 text-xs ${muted}`}>Only the latest 20 attempts are listed. State totals above include all attempts.</p>}
          {report.attempts.length ? <ul className="mt-3 divide-y divide-neutral-100 dark:divide-slate-800">{report.attempts.map(attempt => <li key={attempt.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_1fr_1fr]">
            <div className="min-w-0"><p className="break-all font-mono text-xs">{attempt.recipient_masked}</p><p className={`mt-1 text-xs ${muted}`}>Prepared {date(attempt.created_at)}</p></div>
            <p className={`font-medium ${color(attempt.state)}`}>{invitationEmailLabels[attempt.state]}{attempt.state === "send_uncertain" ? " — check before retrying" : ""}</p>
            <p className={`text-xs leading-5 ${muted}`}>Updated {date(attempt.updated_at)}{attempt.report_at ? <><br/>Mailbox report {date(attempt.report_at)}</> : attempt.smtp_accepted_at ? <><br/>SMTP acceptance {date(attempt.smtp_accepted_at)}</> : null}</p>
          </li>)}</ul> : <p role="status" className={`mt-3 text-sm ${muted}`}>No tracked email attempts yet. Existing manual invitation marks are preserved and are not imported as confirmed email delivery.</p>}
        </section>
        {report.previewId && <section className="border-t border-neutral-200 pt-4 dark:border-slate-800" aria-labelledby="preview-email-send-heading"><h4 id="preview-email-send-heading" className="mb-3 font-semibold">Review one invitation</h4>
          <PreviewInvitationEmailForm key={report.previewId} previewId={report.previewId} previewName={previewName ?? "this player preview"} contacts={contacts} enabled={report.readiness.enabled} privateInvitation={privateInvitation}/>
        </section>}
      </>}
    </div>
  </section>;
}
