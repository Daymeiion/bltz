"use client";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { readAttribution, type ConversionAction, type ConversionData } from "@/lib/preview-lockers/conversion";
import ReferralEditor from "./ReferralEditor";
import CalendlyBooking from "./CalendlyBooking";

const control = "min-h-11 rounded-xl border border-white/15 px-4 py-3 transition-colors hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00] disabled:opacity-50";
export default function ConversionJourney({ previewId, room = "view", referralToken }: { previewId: string | null; room?: "view" | "photos_view" | "film_view"; referralToken?: string; bookingUrl?: string | null }) {
  const [open, setOpen] = useState(Boolean(referralToken));
  const [scrolling, setScrolling] = useState(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) setScrolling(false);
    return () => { if (scrollTimer.current) clearTimeout(scrollTimer.current); };
  }, [open]);
  function revealScrollbar() {
    setScrolling(true);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => setScrolling(false), 900);
  }
  const [editingReferral, setEditingReferral] = useState(false);
  const [features, setFeatures] = useState("");
  const [referrals, setReferrals] = useState<{full_name:string;email:string;phone:string}[]>([]);
  const [form, setForm] = useState<"claim" | "decline" | null>(referralToken ? "claim" : null);
  const [state, setState] = useState<string | null>(null);
  const [email,setEmail] = useState(""); const [name,setName] = useState("");
  const [consent,setConsent] = useState(false);
  const [reason,setReason] = useState(""); const [error,setError] = useState("");
  const [busy,setBusy] = useState(false); const [,setExcluded] = useState(false);
  const [unavailable,setUnavailable] = useState(false);
  const [referralLink,setReferralLink] = useState(""); const [notice,setNotice] = useState("");
  const requests = useRef<Record<string,string>>({}); const session = useRef<string | null>(null);
  async function send(action: ConversionAction, data: ConversionData = {}) {
    if (!session.current) {
      try { session.current = sessionStorage.getItem("bltz-preview-session"); if (!session.current) {session.current=crypto.randomUUID();sessionStorage.setItem("bltz-preview-session",session.current);} } catch {session.current=crypto.randomUUID();}
    }
    requests.current[action] ??= crypto.randomUUID();
    const response = await fetch("/api/preview-conversion", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({preview_id:previewId,action,request_id:requests.current[action],session_id:session.current,data})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error === "invalid_or_conflicting_response" ? "Check your details. Referral email must match your confirmed account. A previously saved response cannot be replaced here." : "Could not save. Your entries are retained; please try again.");
    if (result.excluded) {setExcluded(true); return result;}
    if (result.available === false) setUnavailable(true);
    return result;
  }
  useEffect(() => {
    if (referralToken) return;
    let active = true;
    void send("state").then(result => {if (active && result.state) setState(result.state);}).catch(() => {if(active)setError("Response status unavailable. You may retry; duplicate submissions are protected.");});
    const track = () => {if(document.visibilityState === "visible") void send(room,{utm:readAttribution(location.search)}).catch(() => {});};
    track(); document.addEventListener("visibilitychange",track);
    return () => {active=false;document.removeEventListener("visibilitychange",track);};
    // Requests carry a stable session and action id; visible mounts may safely retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewId, room, referralToken]);
  async function action(task: () => Promise<void>) {setBusy(true);setError("");try{await task();}catch(e){setError(e instanceof Error?e.message:"Could not save. Please retry.");}finally{setBusy(false);}}


  return <section className="relative my-6 px-6 py-12 text-center text-white [container-type:inline-size]" aria-label="Claim your locker now">
    <h2 className="whitespace-nowrap text-[clamp(0.75rem,7cqw,3rem)] font-bold uppercase text-[#ffbb00]">CLAIM YOUR LOCKER NOW</h2>
    <p className="mx-auto mb-6 mt-3 max-w-md text-sm text-white/60">Your career deserves a permanent home. Help us tell the complete story.</p>
    <Dialog open={open} onOpenChange={next => { setOpen(next); if (!next) setEditingReferral(false); }}>
      <DialogTrigger asChild><button id="preview-locker-claim-trigger" className={control + " bg-[#ffbb00] text-black"} onClick={() => {setForm("claim"); void send("claim_click").catch(() => {});}}>Claim the locker <span aria-hidden="true">↗</span></button></DialogTrigger>
      <DialogContent showCloseButton={false} className="max-h-[85dvh] overflow-hidden rounded-[28px] border-white/10 bg-[#0B0E1A] p-2 pr-5 pt-12 text-left text-white shadow-2xl sm:max-w-xl">
      <DialogClose aria-label="Close" className="absolute right-2 top-4 grid size-8 place-items-center rounded text-white/60 hover:text-white focus-visible:outline focus-visible:outline-[#ffbb00]"><X size={28} strokeWidth={2.5} aria-hidden="true" /></DialogClose>
      <div onScroll={revealScrollbar} data-scrolling={scrolling} className="preview-claim-scroll grid max-h-[calc(85dvh-58px)] min-h-0 gap-4 overflow-y-auto rounded-[20px] p-4 pt-1 sm:p-6 sm:pt-2">
      <DialogTitle className={referralToken ? "text-center text-2xl font-bold uppercase tracking-tight text-[#ffbb00]" : "whitespace-nowrap text-center text-[clamp(0.875rem,4.8vw,1.875rem)] font-bold uppercase tracking-tight text-[#ffbb00]"}>{referralToken ? "Reconnect with your athletic history" : "CLAIM YOUR LOCKER"}</DialogTitle>
      <DialogDescription className="sr-only">Share your details and what would make this Locker feel complete. BLTZ will review your request.</DialogDescription>
      {unavailable && <p role="status">Requests are not available for this Locker yet. Please contact BLTZ.</p>}
      {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      {state ? <div role="status" className="space-y-3">{!referralToken && <CalendlyBooking onOpen={() => { if (state === "accepted") void send("booking_click").catch(() => {}); }} />}<p>{state === "declined"?"Your response is saved. Thank you for reviewing your preview.":"Your interest is saved. BLTZ will follow up with the next steps; ownership still requires verification."}</p>
        {state === "accepted" && !referralToken && <div className="flex flex-wrap gap-3">
          <button className={control} disabled={busy} onClick={()=>void action(async()=>{const r=await send("referral_created");if(r.token)setReferralLink(`${location.origin}/preview-referrals/${r.token}`);})}>Invite a teammate</button>
          {referralLink && <><label className="w-full">Teammate self-intake link<input readOnly className={`${control} block w-full bg-[#272A32] text-white placeholder:text-white/60`} value={referralLink}/></label><button className={control} disabled={busy} onClick={()=>void action(async()=>{await navigator.clipboard.writeText(referralLink);await send("referral_copied");setNotice("Referral link copied.");})}>Copy referral link</button></>}
        </div>}
      </div> : <>
        {form && <form className="grid gap-4" onSubmit={event=>{event.preventDefault();if (form === "claim" && editingReferral) { setError("Confirm or cancel the player entry before claiming."); return; }void action(async()=>{
          const result = await send(referralToken?"referral_intake":form === "claim"?"claim_submit":"declined", form === "decline" ? {reason} : {email,consent,...(!referralToken?{feature_requests:features,referrals:referrals.map(r=>({full_name:r.full_name,email:r.email,...(r.phone?{phone:r.phone}:{})}))}:{}),...(referralToken?{token:referralToken,full_name:name}:{})});
          if(result.excluded)setNotice("Admin and test submissions are not saved. The athlete form is ready for review.");
          if(result.saved)setState(form === "decline"?"declined":"accepted");
        });}}>
          {form === "claim" ? <>
            {referralToken && <label>Your name<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} className={`${control} block w-full bg-[#272A32] text-white placeholder:text-white/60`} autoComplete="name"/></label>}
            <label><span className="sr-only">Email (required)</span><input placeholder="Email *" required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className={`${control} block w-full bg-[#272A32] text-sm text-white placeholder:text-white/60`} autoComplete="email"/></label>
            {!referralToken && <label><span className="sr-only">What&apos;s missing, or what features would you love to see?</span><textarea placeholder="What's missing, or what features would you love to see?" maxLength={2000} rows={3} value={features} onChange={e=>setFeatures(e.target.value)} className={control + " block w-full bg-[#272A32] text-sm text-white placeholder:text-white/60"}/></label>}
            <label className="mx-auto flex min-h-11 max-w-md items-center justify-center gap-3 text-left text-xs leading-relaxed text-white/70"><input className="size-5 shrink-0 accent-[#ffbb00]" required type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I give BLTZ permission to contact me with updates and next steps.</span></label>
      {!referralToken && <CalendlyBooking onOpen={() => { if (state === "accepted") void send("booking_click").catch(() => {}); }} />}
            {!referralToken && <>
              <ReferralEditor value={referrals} onChange={setReferrals} onEditingChange={setEditingReferral} />
            </>}
          </> : <label>Reason (optional)<textarea maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} className={`${control} block w-full bg-[#272A32] text-white placeholder:text-white/60`}/></label>}
          <button disabled={busy || unavailable || (form === "claim" && editingReferral)} className={`${control} mt-3 justify-self-center w-44 max-w-full border-transparent bg-[#ffbb00] font-bold tracking-widest text-black hover:bg-[#ffd05a]`}>{busy?"Saving…":form === "decline"?"Save my response":"CLAIM NOW"}</button>
        </form>}
        {!referralToken && <button type="button" className="-mt-3 min-h-11 justify-self-center text-sm text-white/60 underline" onClick={()=>{setEditingReferral(false);setForm(form === "decline" ? "claim" : "decline");}}>{form === "decline" ? "Back to claim form" : "Not interested"}</button>}
      </>}
      <aside className="-mt-2 rounded-xl border border-[#ffbb00]/25 bg-[#ffbb00]/5 p-4 text-center text-sm leading-relaxed text-white/75"><strong>This is not a claim to rights.<br />This is a private demo.</strong><p className="mt-1 text-xs text-[#ffbb00]">Locker will only be available for 48 hours.</p></aside>
      </div>
      </DialogContent>
    </Dialog>
  </section>;
}
