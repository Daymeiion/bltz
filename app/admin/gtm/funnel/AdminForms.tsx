"use client";
import { startTransition, useActionState, useState } from "react";
import { conversionAdminAction } from "./actions";
import { outreachChannels, outreachChannelLabels } from "@/lib/preview-lockers/conversion";
const field="block min-h-11 w-full rounded border border-neutral-500 bg-transparent p-2";
const button="min-h-11 rounded border border-neutral-500 px-3 py-2 focus-visible:outline focus-visible:outline-[#ffbb00] disabled:opacity-50";
export function StatusForm({preview,action,label,referral,contacts}:{preview:string;action:string;label:string;referral?:string;contacts?:{id:string;label:string}[]}) {
  const [state,submit,pending]=useActionState(conversionAdminAction,{message:""});
  return <form action={submit} className="space-y-2"><input type="hidden" name="preview" value={preview}/><input type="hidden" name="action" value={action}/>{referral&&<input type="hidden" name="referral" value={referral}/>}{contacts&&<label>Reviewed GTM match<select name="contact" required className={field}><option value="">Select reviewed contact</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}<button className={button} disabled={pending}>{pending?"Saving…":label}</button>{state.message&&<p role={state.error?"alert":"status"}>{state.message}</p>}</form>;
}
export function ManualSentForm({ preview, enrolledChannel }: { preview: string; enrolledChannel: string }) {
  const [state, submit, pending] = useActionState(conversionAdminAction, { message: "" });
  const [channel, setChannel] = useState("");
  const [sentLocal, setSentLocal] = useState("");
  const parsed = sentLocal ? new Date(sentLocal) : null;
  const sentAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : "";
  const saved = Boolean(state.message && !state.error);
  return <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(() => submit(data)); }} className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-slate-700">
    <h3 className="font-semibold">Record a manually sent link</h3>
    <input type="hidden" name="preview" value={preview}/><input type="hidden" name="action" value="sent"/><input type="hidden" name="sent_at" value={sentAt}/>
    <p className="text-xs leading-5 text-neutral-500">Record the link you already sent. This does not send a message or email. Enrollment channel: {enrolledChannel}. Its attribution stays unchanged.</p>
    <label className="block text-sm">Actual sent channel<select name="channel" required value={channel} onChange={event => setChannel(event.target.value)} disabled={pending || saved} className={field}><option value="">Choose actual channel</option>{outreachChannels.map(value => <option key={value} value={value}>{outreachChannelLabels[value]}</option>)}</select></label>
    <label className="block text-sm">Time sent (your local time)<input name="sent_at_local" type="datetime-local" required value={sentLocal} onChange={event => setSentLocal(event.target.value)} disabled={pending || saved} className={field}/></label>
    <p className="text-xs leading-5 text-neutral-500">The selected time is saved in UTC. Use a past time. A reviewed published link or an eligible restricted viewer grant is required. The first sent record cannot be replaced.</p>
    <button className={button} disabled={pending || saved || !channel || !sentAt}>{pending ? "Saving…" : "Record manually sent link"}</button>
    {state.message && <p className="text-sm" role={state.error ? "alert" : "status"}>{state.message}</p>}
  </form>;
}
export function ReviewedInquiryEmailForm({ preview, inquiry, contact, submittedEmail }: { preview: string; inquiry: string; contact: string; submittedEmail: string }) {
  const [state, submit, pending] = useActionState(conversionAdminAction, { message: "" });
  const [reason, setReason] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const saved = Boolean(state.message && !state.error);
  return <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(() => submit(data)); }} className="mt-4 space-y-3 border-t border-neutral-200 pt-4 dark:border-slate-700">
    <input type="hidden" name="preview" value={preview}/><input type="hidden" name="action" value="review_inquiry_email"/><input type="hidden" name="inquiry" value={inquiry}/><input type="hidden" name="contact" value={contact}/>
    <h4 className="font-semibold">Review submitted email for the enrolled contact</h4>
    <p className="text-xs leading-5 text-neutral-500">This copies {submittedEmail} to the currently empty contact email. It does not verify identity or ownership, assign viewer access, or send email.</p>
    <label className="block text-sm">Email review reason<textarea name="reason" required minLength={10} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} disabled={pending || saved} className={field}/></label>
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="reviewed" required checked={reviewed} onChange={event => setReviewed(event.target.checked)} disabled={pending || saved} className="mt-1"/><span>I reviewed this submission and its match to the enrolled contact.</span></label>
    <button className={button} disabled={pending || saved || !reviewed || reason.trim().length < 10}>{pending ? "Saving…" : "Copy reviewed email to empty contact"}</button>
    {state.message && <p className="text-sm" role={state.error ? "alert" : "status"}>{state.message}</p>}
  </form>;
}
export function EnrollmentForm({previews,contacts}:{previews:{id:string;label:string}[];contacts:{id:string;label:string}[]}) {
  const [state,submit,pending]=useActionState(conversionAdminAction,{message:""});
  return <details className="rounded-xl border border-neutral-200 bg-white dark:border-slate-800 dark:bg-[#0c1524] lg:max-w-xl"><summary className="min-h-12 cursor-pointer px-4 py-3 text-sm font-semibold">Enroll an existing preview</summary><form action={submit} className="grid gap-4 border-t border-neutral-200 p-4 sm:grid-cols-2 dark:border-slate-800">
    <input type="hidden" name="action" value="enroll"/>
    <label>Preview Locker<select name="preview" required className={field}><option value="">Select preview</option>{previews.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
    <label>Intended athlete / GTM contact<select name="contact" required className={field}><option value="">Select contact</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
    <label>Campaign / batch<input name="campaign" pattern="[a-zA-Z0-9_-]{1,80}" maxLength={80} required className={field}/></label><label>Source code<input name="source" pattern="[a-zA-Z0-9_-]{1,80}" maxLength={80} required className={field}/></label>
    <label>Enrollment channel<select name="channel" className={field} defaultValue="instagram">{outreachChannels.map(v=><option key={v} value={v}>{outreachChannelLabels[v]}</option>)}</select></label><label>Relationship<select name="relationship" className={field}><option>warm</option><option>cold</option></select></label>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="is_test"/>Test preview (exclude all conversion activity)</label><p>One preview per GTM contact. Contact email is optional. Attribution is first-touch and immutable. Enrollment does not send outreach or grant viewer access.</p>
    <button disabled={pending} className={button}>{pending?"Saving…":"Enroll preview"}</button>{state.message&&<p role={state.error?"alert":"status"}>{state.message}</p>}
  </form></details>;
}
