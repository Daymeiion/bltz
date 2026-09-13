"use client";
import { useActionState } from "react";
import { conversionAdminAction } from "./actions";
const field="block min-h-11 w-full rounded border border-neutral-500 bg-transparent p-2";
const button="min-h-11 rounded border border-neutral-500 px-3 py-2 focus-visible:outline focus-visible:outline-[#ffbb00] disabled:opacity-50";
export function StatusForm({preview,action,label,referral,contacts}:{preview:string;action:string;label:string;referral?:string;contacts?:{id:string;label:string}[]}) {
  const [state,submit,pending]=useActionState(conversionAdminAction,{message:""});
  return <form action={submit} className="space-y-2"><input type="hidden" name="preview" value={preview}/><input type="hidden" name="action" value={action}/>{referral&&<input type="hidden" name="referral" value={referral}/>}{contacts&&<label>Reviewed GTM match<select name="contact" required className={field}><option value="">Select reviewed contact</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}<button className={button} disabled={pending}>{pending?"Saving…":label}</button>{state.message&&<p role="status">{state.message}</p>}</form>;
}
export function EnrollmentForm({previews,contacts}:{previews:{id:string;label:string}[];contacts:{id:string;label:string}[]}) {
  const [state,submit,pending]=useActionState(conversionAdminAction,{message:""});
  return <details className="rounded-xl border border-neutral-200 bg-white dark:border-slate-800 dark:bg-[#0c1524] lg:max-w-xl"><summary className="min-h-12 cursor-pointer px-4 py-3 text-sm font-semibold">Enroll an existing private preview</summary><form action={submit} className="grid gap-4 border-t border-neutral-200 p-4 sm:grid-cols-2 dark:border-slate-800">
    <input type="hidden" name="action" value="enroll"/>
    <label>Private preview<select name="preview" required className={field}><option value="">Select preview</option>{previews.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
    <label>Intended athlete / GTM contact<select name="contact" required className={field}><option value="">Select contact</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
    <label>Campaign / batch<input name="campaign" pattern="[a-zA-Z0-9_-]{1,80}" maxLength={80} required className={field}/></label><label>Source code<input name="source" pattern="[a-zA-Z0-9_-]{1,80}" maxLength={80} required className={field}/></label>
    <label>Outreach channel<select name="channel" className={field}>{["email","linkedin","sms","in_person","referral","other"].map(v=><option key={v}>{v}</option>)}</select></label><label>Relationship<select name="relationship" className={field}><option>warm</option><option>cold</option></select></label>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="is_test"/>Test preview (exclude all conversion activity)</label><p>One preview per GTM contact. Attribution is first-touch and immutable. Enrollment does not send outreach or grant viewer access.</p>
    <button disabled={pending} className={button}>{pending?"Saving…":"Enroll preview"}</button>{state.message&&<p role="status">{state.message}</p>}
  </form></details>;
}
