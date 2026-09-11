"use client";
import { useEffect, useRef, useState } from "react";
import { readAttribution, type ConversionAction, type ConversionData } from "@/lib/preview-lockers/conversion";

const control = "min-h-11 rounded border border-current px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00] disabled:opacity-50";
export default function ConversionJourney({ previewId, room = "view", referralToken, bookingUrl }: { previewId: string | null; room?: "view" | "photos_view" | "film_view"; referralToken?: string; bookingUrl?: string | null }) {
  const [form, setForm] = useState<"claim" | "decline" | null>(referralToken ? "claim" : null);
  const [state, setState] = useState<string | null>(null);
  const [email,setEmail] = useState(""); const [name,setName] = useState("");
  const [consent,setConsent] = useState(false); const [interest,setInterest] = useState(false);
  const [reason,setReason] = useState(""); const [error,setError] = useState("");
  const [busy,setBusy] = useState(false); const [excluded,setExcluded] = useState(false);
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
  if (unavailable) return null;
  if (excluded) return <aside className="bg-black p-4 text-white">Admin or test activity excluded from conversion tracking.</aside>;
  return <section className="relative z-10 border-b border-white/20 bg-[#091321] p-4 text-white sm:p-6" aria-label={referralToken?"Teammate referral":"Your private Locker preview"}>
    <div className="mx-auto max-w-4xl space-y-4">
      <h2 className="text-xl font-semibold">{referralToken?"Reconnect with your athletic history":"Make this Locker part of your career"}</h2>
      <p>{referralToken?"Submit your own details using your confirmed account email. BLTZ will review your request and prepare a private preview.":"Request the next step toward your Locker. Submitting interest does not verify ownership or complete a canonical claim."}</p>
      {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      {state ? <div role="status" className="space-y-3"><p>{state === "declined"?"Your response is saved. Thank you for reviewing your preview.":"Your interest is saved. BLTZ will follow up with the next steps; ownership still requires verification."}</p>
        {state === "accepted" && !referralToken && <div className="flex flex-wrap gap-3">
          {bookingUrl ? <a className={control} href={bookingUrl} target="_blank" rel="noopener noreferrer" onClick={() => {void action(async()=>{await send("booking_click");setNotice("Walkthrough link opened. A click is not a confirmed booking.");});}}>Book a dashboard walkthrough</a> : <p>Interested in a walkthrough? BLTZ will coordinate the next step directly.</p>}
          <button className={control} disabled={busy} onClick={()=>void action(async()=>{const r=await send("referral_created");if(r.token)setReferralLink(`${location.origin}/preview-referrals/${r.token}`);})}>Invite a teammate</button>
          {referralLink && <><label className="w-full">Teammate self-intake link<input readOnly className={`${control} block w-full bg-transparent`} value={referralLink}/></label><button className={control} disabled={busy} onClick={()=>void action(async()=>{await navigator.clipboard.writeText(referralLink);await send("referral_copied");setNotice("Referral link copied.");})}>Copy referral link</button></>}
        </div>}
      </div> : <>
        {!referralToken && <div className="flex flex-wrap gap-3"><button disabled={busy} className={`${control} bg-[#ffbb00] text-black`} onClick={()=>{setForm("claim");void action(async()=>{await send("claim_click");});}}>Claim my Locker</button><button disabled={busy} className={control} onClick={()=>setForm("decline")}>Not interested</button></div>}
        {form && <form className="grid gap-4" onSubmit={event=>{event.preventDefault();void action(async()=>{
          const result = await send(referralToken?"referral_intake":form === "claim"?"claim_submit":"declined", form === "decline" ? {reason} : {email,consent,dashboard_interest:interest,...(referralToken?{token:referralToken,full_name:name}:{})});
          if(result.saved)setState(form === "decline"?"declined":"accepted");
        });}}>
          {form === "claim" ? <>
            {referralToken && <label>Your name<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} className={`${control} block w-full bg-transparent`} autoComplete="name"/></label>}
            <label>Email<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className={`${control} block w-full bg-transparent`} autoComplete="email"/></label>
            <label className="flex min-h-11 items-center gap-3"><input required type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I give BLTZ permission to contact me with updates and next steps.</label>
            {!referralToken && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={interest} onChange={e=>setInterest(e.target.checked)}/>I’m interested in an athlete-dashboard walkthrough.</label>}
          </> : <label>Reason (optional)<textarea maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} className={`${control} block w-full bg-transparent`}/></label>}
          <button disabled={busy} className={`${control} justify-self-start bg-[#ffbb00] text-black`}>{busy?"Saving…":form === "decline"?"Save my response":"Submit interest"}</button>
        </form>}
      </>}
    </div>
  </section>;
}
