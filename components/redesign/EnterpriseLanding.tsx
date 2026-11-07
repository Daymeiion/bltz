"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { Check, Minus } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PREVIEW_CALENDLY_URL } from "@/components/preview-lockers/CalendlyBooking";
import { ActivatePanel, ApprovePanel, DashboardShot, LaunchPanel, ReportPanel } from "./EnterpriseUI";
import { Faq, ROUTES, SiteFooter, SiteNav } from "./SiteChrome";
import { storyPhotos } from "./assets";
import { PhotoWall } from "./StoryMotion";
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
      <ul className={styles.ticks}>
        {["A live walkthrough of a Player Locker", "How approvals and reporting work for your staff", "A pilot plan for the sports you choose"].map((t) => (
          <li key={t}><Check size={18} strokeWidth={2.4} aria-hidden="true" /><span>{t}</span></li>
        ))}
      </ul>
      <p className={styles.muted} style={{ margin: 0 }}>
        <span className={styles.num}>15</span> minutes with the BLTZ team.
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

const pillars = [
  {
    key: "launch",
    title: "Launch",
    lead: "A locker for every athlete, built from your roster.",
    points: ["Upload a roster and lockers are created for each athlete", "Program colors and marks on every locker", "New signees and transfers added as they arrive"],
    Panel: LaunchPanel,
  },
  {
    key: "approve",
    title: "Approve",
    lead: "Nothing goes live until your staff signs off.",
    points: ["Choose who reviews photos, video and posts", "Usage rights checked before an image is shown", "Approve or decline from one queue"],
    Panel: ApprovePanel,
  },
  {
    key: "activate",
    title: "Activate",
    lead: "Plan partner activations with the right athletes.",
    points: ["Build an activation and attach athletes", "See which lockers are ready to share", "Suggestions based on who's getting attention"],
    Panel: ActivatePanel,
  },
  {
    key: "report",
    title: "Report",
    lead: "Show partners and leadership what happened.",
    points: ["Views, shares and follows per athlete", "Roll up by team, sport or the whole program", "Season reports ready for partner recaps"],
    Panel: ReportPanel,
  },
];

const PILLAR_MS = 7000;

function Pillars() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % pillars.length), PILLAR_MS);
    return () => window.clearTimeout(t);
  }, [active, paused]);

  const { Panel, lead, points } = pillars[active];

  return (
    <section className={styles.section} aria-labelledby="pillars-title">
      <div className={styles.inner}>
        <div className={styles.sectionHead}>
          <h2 className={styles.h2} id="pillars-title">What BLTZ does for your program.</h2>
          <p className={styles.lede}>One system for the work behind athlete media: launching lockers, approving content, planning activations and reporting results.</p>
        </div>
        <div
          className={styles.pillars}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className={styles.pillarTabs} role="tablist" aria-label="What BLTZ does">
            {pillars.map((p, i) => (
              <button
                key={p.key}
                role="tab"
                type="button"
                id={`pillar-tab-${p.key}`}
                aria-selected={i === active}
                aria-controls="pillar-panel"
                className={styles.pillarTab}
                onClick={() => setActive(i)}
              >
                <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
                {p.title}
                <i style={{ animationDuration: `${PILLAR_MS}ms`, animationPlayState: paused ? "paused" : "running" } as CSSProperties} key={`${active}-${i}`} />
              </button>
            ))}
          </div>
          <div className={styles.pillarBody} id="pillar-panel" role="tabpanel" aria-labelledby={`pillar-tab-${pillars[active].key}`}>
            <div className={styles.pillarCopy}>
              <h3 className={styles.h3}>{lead}</h3>
              <ul className={styles.ticks}>
                {points.map((pt) => (
                  <li key={pt}><Check size={18} strokeWidth={2.4} aria-hidden="true" /><span>{pt}</span></li>
                ))}
              </ul>
            </div>
            <div className={styles.pillarVisual} key={pillars[active].key}>
              <Panel />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const audiences = [
  {
    title: "Athletic departments",
    body: "Run every sport's roster from one place, in your program's colors.",
    photo: storyPhotos.college,
    points: [
      "A Player Locker for every athlete, created from your roster",
      "Compliance and communications staff approve media before it goes live",
      "Alumni keep their lockers, so your program's history stays in one place",
    ],
  },
  {
    title: "NIL collectives",
    body: "Present the athletes you support the way partners and donors want to see them.",
    photo: storyPhotos.pro,
    points: [
      "One link per athlete, ready to send to partners and donors",
      "Every locker shows the same verified stats, film and press",
      "See which athletes are getting attention, and where it comes from",
    ],
  },
];

const comparison = [
  ["Athlete media lives in", "Team drives, phones and social accounts", "One locker per athlete"],
  ["Approvals happen", "Over text and email threads", "In one review queue"],
  ["Usage rights are", "Checked by hand, if at all", "Checked before an image is shown"],
  ["Partner recaps take", "Days of screenshots", "A report you can send"],
  ["When an athlete graduates", "Their story leaves with them", "Their locker stays with the program"],
];

const steps = [
  { title: "Book a demo", body: "We walk through a live locker and learn how your staff works today." },
  { title: "Send your roster", body: "We set up lockers for the sports you choose, in your colors." },
  { title: "Athletes claim their lockers", body: "Each athlete gets an invite, adds their story and connects their channels." },
  { title: "Approve, activate, report", body: "Your staff reviews content, plans activations and tracks results." },
];

const sports = ["Football", "Basketball", "Baseball", "Softball", "Soccer", "Volleyball", "Track and field", "Swimming", "Wrestling", "Lacrosse", "Hockey", "Golf", "Tennis", "Gymnastics"];

export function EnterpriseLanding() {
  return (
    <main className={styles.page} data-audience="enterprise">
      <a className={styles.skip} href="#demo">Skip to book a demo</a>
      <SiteNav audience="enterprise" />

      <section className={styles.eHero} aria-labelledby="e-hero-title">
        <RosterWallScene />
        <div className={styles.heroShade} />
        <div className={styles.eHeroCopy}>
          <h1 className={styles.h1} id="e-hero-title">A locker for every player on your roster.</h1>
          <p className={styles.lede}>
            BLTZ gives athletic departments and NIL collectives one place to launch, approve and report on athlete media, for current players and alumni.
          </p>
          <div className={styles.actions}>
            <a className={styles.button} href="#demo">Book a demo</a>
            <Link className={styles.ghostButton} href={`${ROUTES.athletes}#locker`}>See a sample locker</Link>
          </div>
        </div>
      </section>

      <DashboardShot />

      <section className={styles.sportsStrip} aria-label="Sports BLTZ supports">
        <p className={styles.muted}>Built for every sport in your department</p>
        <div className={styles.channelRail}>
          {[0, 1].map((copy) => (
            <div className={styles.sportsTrack} key={copy} aria-hidden={copy === 1}>
              {sports.map((s) => <span key={s}>{s}</span>)}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} style={{ paddingBottom: 0 }}>
        <p className={styles.statement}>
          Your athletes&apos; stories live in a dozen places. <em>Your staff shouldn&apos;t have to chase them.</em>
        </p>
      </section>

      <Pillars />

      <section className={styles.factsBand} aria-label="BLTZ at a glance">
        {[
          ["1", "locker for every athlete, current and former"],
          ["1", "review queue for photos, video and posts"],
          ["0", "spreadsheets to chase at the end of the season"],
        ].map(([n, t]) => (
          <div key={t}>
            <strong className={styles.num}>{n}</strong>
            <span>{t}</span>
          </div>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="who-title">
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <h2 className={styles.h2} id="who-title">One system, two kinds of teams.</h2>
            <p className={styles.lede}>Whether you run the program or support its athletes, everyone works from the same lockers.</p>
          </div>
          <div className={styles.audienceCards}>
            {audiences.map((a) => (
              <article key={a.title} className={styles.audienceCard}>
                <div className={styles.audienceCardPhoto}>
                  <Image src={a.photo.src} alt="" fill sizes="(min-width: 900px) 600px, 100vw" style={{ objectPosition: a.photo.position }} />
                </div>
                <div className={styles.audienceCardBody}>
                  <h3 className={styles.h3}>{a.title}</h3>
                  <p className={styles.lede}>{a.body}</p>
                  <ul className={styles.ticks}>
                    {a.points.map((pt) => (
                      <li key={pt}><Check size={18} strokeWidth={2.4} aria-hidden="true" /><span>{pt}</span></li>
                    ))}
                  </ul>
                  <a className={styles.ghostButton} href="#demo" style={{ justifySelf: "start" }}>Book a demo</a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="compare-title">
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <h2 className={styles.h2} id="compare-title">What changes with BLTZ.</h2>
          </div>
          <div className={styles.compare} role="table" aria-label="Today compared with BLTZ">
            <div className={styles.compareRow} role="row">
              <span role="columnheader" />
              <span role="columnheader" className={styles.muted}>Today</span>
              <span role="columnheader" className={styles.compareUs}>With BLTZ</span>
            </div>
            {comparison.map(([label, before, after]) => (
              <div className={styles.compareRow} role="row" key={label}>
                <span role="rowheader">{label}</span>
                <span role="cell" className={styles.muted}><Minus size={16} aria-hidden="true" /> {before}</span>
                <span role="cell" className={styles.compareUs}><Check size={16} aria-hidden="true" /> {after}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="how-title">
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <h2 className={styles.h2} id="how-title">How a pilot works.</h2>
            <p className={styles.lede}>Start with one or two teams, then roll out to the rest of the department.</p>
          </div>
          <ol className={`${styles.steps} ${styles.steps4}`}>
            {steps.map((s) => (
              <li key={s.title}>
                <h3 className={styles.h3}>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.section} style={{ paddingTop: 0 }} aria-labelledby="wall-title">
        <div className={styles.inner}>
          <div className={styles.sectionHead} style={{ marginBottom: 0 }}>
            <h2 className={styles.h2} id="wall-title">Your athletes, presented the way they deserve.</h2>
          </div>
        </div>
        <PhotoWall />
      </section>

      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className={`${styles.inner} ${styles.ctaBand}`}>
          <h2 className={styles.h2}>See it with your roster.</h2>
          <p className={styles.lede}>We&apos;ll show a live locker, walk through approvals and reporting, and scope a pilot for your program.</p>
          <a className={styles.button} href="#demo">Book a demo</a>
        </div>
      </section>

      <section className={styles.section} id="demo" aria-labelledby="demo-title">
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <h2 className={styles.h2} id="demo-title">Book a demo.</h2>
            <p className={styles.lede}>
              Bring your roster size and the sports you want to start with. We&apos;ll tailor the walkthrough to your program.
            </p>
          </div>
          <div style={{ width: "min(760px, 100%)", margin: "0 auto" }}>
            <DemoBooking />
          </div>
        </div>
      </section>

      <Faq
        title="Questions from programs."
        items={[
          { q: "Do athletes own their lockers?", a: "Athletes control their own lockers. Your program adds its branding and approval rules on top." },
          { q: "Which sports does BLTZ support?", a: "Lockers work for any sport. Most programs start with one or two teams in the pilot." },
          { q: "How do approvals work?", a: "You choose which staff members review content. Nothing they're responsible for goes live until it's approved." },
          { q: "What happens when an athlete graduates?", a: "Their locker stays live as an alumni locker, so the program keeps its history and stays connected to former players." },
          { q: "How long does setup take?", a: "Send your roster and we set up the lockers. We'll give you a timeline for your program on the demo call." },
          { q: "What does it cost?", a: "Pricing depends on roster size and the sports you include. We'll cover it on the demo call." },
        ]}
      />

      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className={`${styles.inner} ${styles.band}`}>
          <div style={{ display: "grid", gap: 16, justifyItems: "center" }}>
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
