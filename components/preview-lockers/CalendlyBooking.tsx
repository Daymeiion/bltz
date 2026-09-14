"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

export const PREVIEW_CALENDLY_URL = "https://calendly.com/godchoseme20/15min";

type CalendlyWindow = Window & {
  Calendly?: { initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void };
};

export default function CalendlyBooking({ onOpen }: { onOpen?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = container.current;
    const calendly = (window as CalendlyWindow).Calendly;
    if (!expanded || !ready || !parent || !calendly) return;
    calendly.initInlineWidget({ url: PREVIEW_CALENDLY_URL, parentElement: parent });
    return () => parent.replaceChildren();
  }, [expanded, ready]);

  return <section aria-label="Schedule a dashboard review" className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center [container-type:inline-size]">
    <p className="whitespace-nowrap text-[clamp(0.5rem,5.2cqw,0.875rem)] text-[#ffbb00]">There’s more inside. Book a call to see.</p>
    <button type="button" aria-expanded={expanded} onClick={() => { setExpanded(value => !value); if (!expanded) onOpen?.(); }} className="min-h-11 rounded-full bg-[#0069ff] px-6 py-3 text-sm font-semibold text-white shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
      {expanded ? "Hide scheduling calendar" : "Schedule time with me"}
    </button>
    <p className="text-xs text-white/60">Powered by Calendly</p>
    {expanded && <>
      <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
      <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setFailed(true)} />
      {!ready && <p role="status" className="text-sm">{failed ? "The scheduling calendar could not load. Use the link below." : "Loading available times…"}</p>}
      <div ref={container} className="h-[700px] w-full overflow-hidden rounded-lg bg-white" aria-label="Calendly booking calendar" />
      <a href={PREVIEW_CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-white underline">Open Calendly in a new tab</a>
    </>}
  </section>;
}
