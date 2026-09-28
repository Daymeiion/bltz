"use client";

import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function PublicPreviewClaim({ previewId }: { previewId: string }) {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/preview-link-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId, email, featureRequests: feedback, consent }),
      });
      if (!response.ok) throw new Error("We could not save your request. Please try again.");
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="my-6 px-6 py-12 text-center text-white" aria-label="Claim your locker">
    <h2 className="text-3xl font-bold uppercase text-[#ffbb00]">CLAIM YOUR LOCKER</h2>
    <p className="mx-auto mb-6 mt-3 max-w-md text-sm text-white/70">Your career deserves a permanent home. Tell BLTZ where to reach you.</p>
    <Dialog>
      <DialogTrigger asChild><button id="preview-locker-claim-trigger" className="min-h-11 rounded-xl bg-[#ffbb00] px-5 font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Claim the locker ↗</button></DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-[28px] border-white/10 bg-[#0B0E1A] text-left text-white sm:max-w-xl">
        <DialogTitle className="text-2xl font-bold uppercase text-[#ffbb00]">Claim your Locker</DialogTitle>
        <DialogDescription className="text-white/70">Share your email and optional feedback. BLTZ will review your request; Locker ownership requires verification.</DialogDescription>
        {saved ? <p role="status" className="rounded-lg border border-[#ffbb00]/40 p-4">Your request is saved. BLTZ will follow up by email.</p> :
          <form onSubmit={submit} className="grid gap-4">
            <label className="grid gap-2 text-sm">Email
              <input type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="min-h-11 rounded-lg border border-white/25 bg-white/10 px-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]" />
            </label>
            <label className="grid gap-2 text-sm">What would make this Locker feel complete? (optional)
              <textarea maxLength={2000} rows={3} value={feedback} onChange={event => setFeedback(event.target.value)} className="rounded-lg border border-white/25 bg-white/10 p-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]" />
            </label>
            <label className="flex items-start gap-3 text-sm text-white/80">
              <input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 size-5 accent-[#ffbb00]" />
              <span>I give BLTZ permission to contact me about this Locker.</span>
            </label>
            {error && <p role="alert" className="text-red-300">{error}</p>}
            <button disabled={busy} className="min-h-11 rounded-lg bg-[#ffbb00] px-5 font-semibold text-black disabled:opacity-50">{busy ? "Saving…" : "Send request"}</button>
          </form>}
      </DialogContent>
    </Dialog>
  </section>;
}
