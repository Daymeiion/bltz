"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Script from "next/script";
import { BarChart3, Check, Palette, ShieldCheck, Upload, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PREVIEW_CALENDLY_URL } from "@/components/preview-lockers/CalendlyBooking";
import { Faq, ROUTES, SiteFooter, SiteNav } from "./SiteChrome";
import styles from "./redesign.module.css";

const RosterWallScene = dynamic(
  () => import("./three/RosterWallScene").then((m) => m.RosterWallScene),
  { ssr: false, loading: () => <div className={styles.canvasFallback} /> },
);

type CalendlyWindow = Window & {
  Calendly?: { initInlineWidget: (o: { url: string; parentElement: HTMLElement }) => void };
};

function DemoBooking() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = container.current;
    const calendly = (window as CalendlyWindow).Calendly;
    if (!open || !ready || !parent || !calendly) return;
    calendly.initInlineWidget({ url: PREVIEW_CALENDLY_URL, parentElement: parent });
    return () => parent.replaceChildren();
  }, [open, ready]);

  return (
    <div className={styles.demoPanel}>
      <h3 className={styles.h3}>Pick a time</h3>
      <p className={styles.muted} style={{ margin: 0 }}>
        A 15-minute call with the BLTZ team. Bring your roster size and the sports you want to start with.
      </p>
      {!open ? (
        <button className={styles.button} type="button" onClick={() => setOpen(true)} style={{ justifySelf: "start" }}>
          Book a demo
        </button>
      ) : (
        <>
          <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
          <Script
            src="https://assets.calendly.com/assets/external/widget.js"
            strategy="afterInteractive"
            onReady={() => setReady(true)}
            onError={() => setFailed(true)}
          />
          {!ready ? (
            <p role="status" className={styles.muted} style={{ margin: 0 }}>
              {failed ? "The calendar didn't load. Use the link below to book instead." : "Loading available times…"}
            </p>
          ) : null}
          <div ref={container} className={styles.calendly} aria-label="Booking calendar" />
        </>
      )}
      <a href={PREVIEW_CALENDLY_URL} target="_blank" rel="noopener noreferrer" className={styles.muted} style={{ fontSize: 15 }}>
        Open the calendar in a new tab
      </a>
    </div>
  );
}

const audiences = [
  {
    title: "Athletic departments",
    body: "Run every sport's roster from one place, in your program's colors.",
    points: [
      "A Player Locker for every athlete, created from your roster",
      "Staff approve media before it goes live",
      "Alumni keep their lockers, so your program's history stays in one place",
    ],
  },
  {
    title: "NIL collectives",
    body: "Present the athletes you support the way partners and donors want to see them.",
    points: [
      "One link per athlete, ready to send to partners and donors",
      "Every locker shows the same verified stats, film and press",
      "See which athletes are getting attention, and where it comes from",
    ],
  },
];

const capabilities = [
  { Icon: Upload, title: "Roster import", body: "Send us your roster and we build the lockers. New signees and transfers are added as they arrive." },
  { Icon: Palette, title: "Your program's look", body: "Lockers carry your colors and marks, so every athlete page reads as part of your program." },
  { Icon: ShieldCheck, title: "Approvals and media rights", body: "Choose who signs off on what goes live. Photos are checked for usage rights before they're shown." },
  { Icon: BarChart3, title: "Engagement reporting", body: "Views, shares and follows for each athlete and the roster as a whole." },
  { Icon: Users, title: "Alumni lockers", body: "Former players keep their lockers after they leave, keeping alumni connected to the program." },
];

const pilot = [
  { title: "Book a demo", body: "We walk through a live locker and learn how your staff works today." },
  { title: "Send your roster", body: "We set up lockers for the sports you choose, in your colors." },
  { title: "Go live with your athletes", body: "Athletes claim their lockers and your staff starts approving content." },
];

export function EnterpriseLanding() {
  return (
    <main className={styles.page} data-audience="enterprise">
      <a className={styles.skip} href="#demo">Skip to book a demo</a>
      <SiteNav audience="enterprise" />

      <section className={styles.eHero} aria-labelledby="e-hero-title">
        <RosterWallScene />
        <div className={styles.heroShade} />
        <div className={styles.eHeroCopy}>
          <h1 className={styles.h1} id="e-hero-title" style={{ fontSize: "clamp(56px, 8.4vw, 136px)" }}>
            A locker for every player on your roster.
          </h1>
          <p className={styles.lede}>
            BLTZ gives athletic departments and NIL collectives one place to publish, approve and track athlete media, for current players and alumni.
          </p>
          <div className={styles.actions}>
            <a className={styles.button} href="#demo">Book a demo</a>
            <Link className={styles.ghostButton} href={`${ROUTES.athletes}#locker`}>See a sample locker</Link>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="who-title">
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <h2 className={styles.h2} id="who-title">Built for the teams behind the athletes.</h2>
          </div>
          <div className={styles.split}>
            {audiences.map((a) => (
              <div key={a.title}>
                <h3 className={styles.h3}>{a.title}</h3>
                <p className={styles.lede}>{a.body}</p>
                <ul className={styles.ticks}>
                  {a.points.map((pt) => (
                    <li key={pt}>
                      <Check size={18} strokeWidth={2.4} aria-hidden="true" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="cap-title">
        <div className={`${styles.inner} ${styles.capabilities}`}>
          <div className={styles.capabilitiesHead}>
            <h2 className={styles.h2} id="cap-title">What your staff gets.</h2>
            <p className={styles.lede}>Everything athletes see in their lockers, plus the controls your compliance and communications staff need.</p>
          </div>
          <ul className={styles.capabilityList}>
            {capabilities.map(({ Icon, title, body }) => (
              <li key={title}>
                <Icon size={30} strokeWidth={1.6} aria-hidden="true" />
                <div>
                  <h3 className={styles.h3}>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="pilot-title">
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <h2 className={styles.h2} id="pilot-title">How a pilot works.</h2>
          </div>
          <ol className={styles.steps}>
            {pilot.map((s) => (
              <li key={s.title}>
                <h3 className={styles.h3}>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.section} id="demo" aria-labelledby="demo-title">
        <div className={`${styles.inner} ${styles.demo}`}>
          <div style={{ display: "grid", gap: 22 }}>
            <h2 className={styles.h2} id="demo-title">See it with your roster.</h2>
            <p className={styles.lede}>
              On the call we&apos;ll show a live locker, walk through approvals and reporting, and scope a pilot for your program.
            </p>
          </div>
          <DemoBooking />
        </div>
      </section>

      <Faq
        title="Questions from programs."
        items={[
          { q: "Do athletes own their lockers?", a: "Athletes control their own lockers. Your program adds its branding and approval rules on top." },
          { q: "Which sports does BLTZ support?", a: "Lockers work for any sport. Most programs start with one or two teams in the pilot." },
          { q: "How do approvals work?", a: "You choose which staff members review content. Nothing they're responsible for goes live until it's approved." },
          { q: "What does it cost?", a: "Pricing depends on roster size and the sports you include. We'll cover it on the demo call." },
        ]}
      />

      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className={`${styles.inner} ${styles.band}`}>
          <div style={{ display: "grid", gap: 16 }}>
            <h2 className={styles.h3} style={{ fontSize: "clamp(34px, 4vw, 56px)" }}>Are you an athlete?</h2>
            <p className={styles.lede}>Claim your own Player Locker, whether or not your program is on BLTZ.</p>
          </div>
          <Link className={styles.button} href={`${ROUTES.athletes}#claim`}>Claim my locker</Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
