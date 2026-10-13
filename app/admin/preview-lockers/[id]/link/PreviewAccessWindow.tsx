"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type AccessWindow = {
  access_started_at: string | null;
  access_expires_at: string | null;
  access_extended_at: string | null;
};

function date(value: string | null) {
  return value ? new Date(value).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC" : "Not yet";
}

export function PreviewAccessWindow({ previewId, published, initialAccess, observedAt }: {
  previewId: string; published: boolean; initialAccess: AccessWindow; observedAt: string;
}) {
  const router = useRouter();
  const [access, setAccess] = useState(initialAccess);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [observation, setObservation] = useState(observedAt);
  const request = useRef<{ reason: string; requestId: string } | null>(null);
  const inFlight = useRef(false);
  const expired = Boolean(access.access_expires_at && Date.parse(access.access_expires_at) <= Date.parse(observation));
  const state = !published ? "Unpublished" : !access.access_started_at ? "Pending first open" : expired ? "Expired" : access.access_extended_at ? "Extended" : "Active";
  const canExtend = published && Boolean(access.access_started_at && access.access_expires_at);

  async function extend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !canExtend || !confirmed || reason.trim().length < 10) return;
    inFlight.current = true; setPending(true); setError(""); setMessage("");
    request.current ??= { reason: reason.trim(), requestId: crypto.randomUUID() };
    try {
      const response = await fetch(`/api/admin/preview-lockers/${previewId}/access-extension`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request.current),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          request.current = null; setUncertain(false);
          setError("Your Admin session is not authorized to extend access.");
          return;
        }
        if (response.status === 400 || response.status === 409 || response.status === 422) {
          request.current = null; setUncertain(false);
          setError("Access could not be extended. Review the reason and current published window, then reload its status.");
          return;
        }
        throw new Error("Unconfirmed extension");
      }
      if (result?.saved !== true || [result.access_started_at, result.access_expires_at, result.access_extended_at].some(value => typeof value !== "string" || !Number.isFinite(Date.parse(value)))) throw new Error("Unconfirmed extension");
      setAccess({ access_started_at: result.access_started_at, access_expires_at: result.access_expires_at, access_extended_at: result.access_extended_at });
      setObservation(new Date().toISOString());
      setMessage(result.duplicate ? "This extension request was already applied. The deadline below is unchanged by this retry." : "Access extended by 48 hours. The personal request and deadline change were audited.");
      request.current = null; setUncertain(false); setReason(""); setConfirmed(false);
      router.refresh();
    } catch {
      setUncertain(true);
      setError("Could not confirm whether access was extended. Check this same request to recover its result, or reload the access status before requesting another extension.");
    } finally { inFlight.current = false; setPending(false); }
  }

  return <section className="space-y-4 rounded-lg border border-white/20 p-4" aria-labelledby="preview-access-window-heading">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="preview-access-window-heading" className="text-xl font-semibold">48-hour viewing window</h2><p className={`text-sm font-semibold ${expired ? "text-amber-300" : "text-[#ffbb00]"}`} role="status">{state}</p></div>
    <p className="text-sm leading-6 text-slate-300">The first eligible visible visitor open starts one shared 48-hour window. Admin inspection does not start it. Anyone with the published URL can open it; forwarding the link may start the window.</p>
    <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-400">Started</dt><dd className="mt-1">{date(access.access_started_at)}</dd></div><div><dt className="text-slate-400">Expires</dt><dd className="mt-1">{date(access.access_expires_at)}</dd></div>{access.access_extended_at && <div><dt className="text-slate-400">Last extended</dt><dd className="mt-1">{date(access.access_extended_at)}</dd></div>}</dl>
    <p className="text-xs text-slate-400">Status checked {date(observation)}. Reload to check the latest window.</p>
    {expired && published && <p className="text-sm text-amber-300">Visitor access has expired. An Admin can extend it after a personal request.</p>}
    {!canExtend ? <p className="text-sm text-slate-400">{published ? "Extensions become available after the first eligible visitor open." : "Publish the reviewed link to enable visitor access. Publishing does not reset an existing window."}</p> : <form onSubmit={extend} className="space-y-3 border-t border-white/10 pt-4">
      <label className="block space-y-2 text-sm font-semibold"><span>Personal extension request reason</span><textarea name="reason" required minLength={10} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} disabled={pending || uncertain} className="min-h-24 w-full rounded-md border border-white/20 bg-background p-3 font-normal focus-visible:outline focus-visible:outline-[#ffbb00]" /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={pending || uncertain} className="mt-1" /><span>I received a personal request to extend this viewing window.</span></label>
      <p className="text-xs leading-5 text-slate-400">Adds 48 hours from the later of the current deadline or server time. The original start is preserved, including for an expired window.</p>
      <button type="submit" disabled={pending || !confirmed || reason.trim().length < 10} className="min-h-11 rounded-md bg-[#ffbb00] px-5 font-semibold text-black focus-visible:outline focus-visible:outline-white disabled:opacity-50">{pending ? "Checking request…" : uncertain ? "Check this extension request" : "Extend access by 48 hours"}</button>
    </form>}
    {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    <a href={`/admin/preview-lockers/${previewId}/link`} className="inline-block text-sm underline focus-visible:outline focus-visible:outline-[#ffbb00]">Reload access status</a>
  </section>;
}
