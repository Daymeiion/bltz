"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Film,
  Link2,
  Minus,
  Plus,
  Rocket,
  Share2,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PREVIEW_CALENDLY_URL } from "@/components/preview-lockers/CalendlyBooking";
import { CrmScreen, type CrmView } from "./CrmScreen";
import { ROUTES, SiteFooter, SiteNav } from "./SiteChrome";
import { enterprisePhotos } from "./assets";
import base from "./redesign.module.css";
import s from "./ent.module.css";

// Layout mirrors sponsorcx.com section by section, rewritten for what the BLTZ
// organization workspace actually does: Lockers for former players, dated
// moments, tracked fan links and reach reporting.

const RosterWallScene = dynamic(
  () => import("./three/RosterWallScene").then((m) => m.RosterWallScene),
  { ssr: false, loading: () => <div className={base.canvasFallback} /> },
);

function PillCta({ href, children, onClick }: { href?: string; children: ReactNode; onClick?: () => void }) {
  const inner = (
    <>
      <span>{children}</span>
      <i aria-hidden="true"><ArrowUpRight size={18} strokeWidth={2.2} /></i>
    </>
  );
  return href ? (
    <a className={s.pillCta} href={href}>{inner}</a>
  ) : (
    <button className={s.pillCta} type="button" onClick={onClick}>{inner}</button>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={s.eyebrow}>{children}</p>;
}

/* 1. Hero ---------------------------------------------------------------- */

function Hero() {
  return (
    <section className={s.hero} aria-labelledby="e-hero-title">
      <RosterWallScene />
      <div className={s.heroShade} />
      <div className={s.heroGrid}>
        <div className={s.heroCopy}>
          <Eyebrow>Alumni engagement, simplified</Eyebrow>
          <h1 className={base.h1} id="e-hero-title">Every legend deserves an encore.</h1>
          <p className={base.lede}>
            BLTZ builds a Player Locker for every former player in your program, flags the dates that matter and gives your staff a tracked link to share, so fans show up.
          </p>
          <div className={s.heroActions}>
            <PillCta href="#demo">Book a demo</PillCta>
            <a className={s.textLink} href="#how">See how it works</a>
          </div>
        </div>
        <div className={s.heroCards} aria-hidden="true">
          <div className={`${s.floatCard} ${s.floatA}`}>
            <div className={s.floatHead}><strong>Act now</strong><span className={s.badge}><span className={base.num}>3</span></span></div>
            {[
              ["MH", "Marcus Hale", "10 years since his first career touchdown", "2"],
              ["DC", "Dre Coleman", "Turns 35", "5"],
              ["JB", "Jalen Brooks", "5 years since his pro debut", "6"],
            ].map(([i, n, d, days]) => (
              <div className={s.floatRow} key={n}>
                <span className={s.initials}>{i}</span>
                <div><strong>{n}</strong><small>{d}</small></div>
                <span className={s.dayChip}>In <span className={base.num}>{days}</span> days</span>
              </div>
            ))}
          </div>
          <div className={`${s.floatCard} ${s.floatB}`}>
            <div className={s.floatHead}><strong>Analytics</strong></div>
            <div className={s.floatStats}>
              {[["4,812", "Locker visits"], ["116K", "Followers"], ["1,906", "Post reach"], ["384", "Engagements"]].map(([v, l]) => (
                <div key={l}><strong className={base.num}>{v}</strong><small>{l}</small></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 2. Product demo screen (the real CRM) ---------------------------------- */

const demoViews: { view: CrmView; label: string }[] = [
  { view: "overview", label: "Overview" },
  { view: "intelligence", label: "Intelligence" },
  { view: "launch", label: "Launch a Locker" },
];

function ProductDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<CrmView>("overview");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight * 0.85)));
      el.style.setProperty("--tilt", (1 - p).toFixed(3));
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
    };
  }, []);

  return (
    <section className={s.demoScreen} aria-label="The BLTZ organization workspace">
      <div className={s.demoTabs} role="tablist" aria-label="Workspace screens">
        {demoViews.map((d) => (
          <button key={d.view} type="button" role="tab" aria-selected={view === d.view} onClick={() => setView(d.view)}>
            {d.label}
          </button>
        ))}
      </div>
      <div className={s.demoTilt} ref={ref}>
        <CrmScreen key={view} view={view} label={`BLTZ workspace: ${demoViews.find((d) => d.view === view)?.label}`} />
      </div>
    </section>
  );
}

/* 3. Trusted-by band ----------------------------------------------------- */

const sports = ["Football", "Basketball", "Baseball", "Softball", "Soccer", "Volleyball", "Track and field", "Wrestling", "Lacrosse", "Hockey", "Swimming", "Golf"];

function TrustBand() {
  return (
    <section className={s.trust} aria-label="Sports BLTZ supports">
      {/* Placeholder: swap the sports list for partner logos once you have permission to show them. */}
      <strong>Built for every sport:</strong>
      <div className={s.trustRail}>
        {[0, 1].map((copy) => (
          <div className={s.trustTrack} key={copy} aria-hidden={copy === 1}>
            {sports.map((sp) => <span key={sp}>{sp}</span>)}
          </div>
        ))}
      </div>
    </section>
  );
}

/* 4. Problem statement --------------------------------------------------- */

function Problem() {
  const tiles = [
    { Icon: Users, cls: s.tile1 },
    { Icon: Film, cls: s.tile2 },
    { Icon: CalendarDays, cls: s.tile3 },
    { Icon: Share2, cls: s.tile4 },
  ];
  return (
    <section className={s.problem}>
      {tiles.map(({ Icon, cls }, i) => (
        <span className={`${s.tile} ${cls}`} key={i} aria-hidden="true"><Icon size={30} strokeWidth={1.6} /></span>
      ))}
      <h2 className={s.problemTitle}>
        Your former players&apos; stories are scattered across old film, team archives and social feeds nobody checks.
      </h2>
    </section>
  );
}

/* 5. What BLTZ does ------------------------------------------------------ */

const pillars = [
  { key: "build", label: "Build", Icon: Rocket, title: "BLTZ builds the Lockers", lines: ["Every former player gets a fan Locker with their career, stats, photos and video.", "BLTZ clears every photo and video, so there's nothing for your staff to approve."] },
  { key: "flag", label: "Flag", Icon: CalendarDays, title: "We flag the dates that matter", lines: ["Anniversaries, milestones and birthdays show up before they happen.", "Act now covers the next 7 days. Coming up covers days 8 to 30."] },
  { key: "share", label: "Share", Icon: Link2, title: "You share, fans show up", lines: ["Post the tracked Locker link on the day.", "Every link is tied to the player and the moment, so nothing gets lost."] },
  { key: "measure", label: "Measure", Icon: BarChart3, title: "See the reach come back", lines: ["Post reach, engagements, Locker visits and followers for every activation.", "Know which players and moments your fans care about most."] },
];

function WhatWeDo() {
  const [active, setActive] = useState(0);
  const p = pillars[active];
  return (
    <section className={s.what} aria-labelledby="what-title">
      <div className={s.whatLeft}>
        <Eyebrow>What BLTZ does</Eyebrow>
        <h2 className={base.h2} id="what-title">Built to bring your former players home.</h2>
        <p className={base.lede}>
          For athletic departments and the collectives that support them, BLTZ turns a roster of former players into a calendar of moments fans want to celebrate.
        </p>
        <figure className={s.quote}>
          {/* Placeholder: replace with a real quote from a pilot program. */}
          <blockquote>&ldquo;A quote from your first pilot program goes here.&rdquo;</blockquote>
          <figcaption>Name, title, program</figcaption>
        </figure>
      </div>
      <div className={s.whatRight}>
        <div className={s.whatTabs} role="tablist" aria-label="What BLTZ does">
          {pillars.map((pl, i) => (
            <button key={pl.key} type="button" role="tab" aria-selected={i === active} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)}>
              <pl.Icon size={22} strokeWidth={1.7} aria-hidden="true" />
              {pl.label}
            </button>
          ))}
        </div>
        <div className={s.whatPanel} role="tabpanel" key={p.key}>
          <h3 className={base.h3}>{p.title}</h3>
          {p.lines.map((l) => <p key={l}>{withNumbers(l)}</p>)}
        </div>
      </div>
    </section>
  );
}

/** Wraps digits in JetBrains Mono. */
function withNumbers(text: string) {
  return text.split(/(\d[\d,.%+K]*)/).map((part, i) =>
    /^\d/.test(part) ? <span className={base.num} key={i}>{part}</span> : part,
  );
}

/* 6. Metrics band -------------------------------------------------------- */

function Metrics() {
  return (
    <section className={s.metrics} aria-label="BLTZ at a glance">
      {[
        ["1", "Locker", "for every former player"],
        ["0", "approvals", "BLTZ clears the media"],
        ["30", "days ahead", "of moments, flagged for you"],
      ].map(([n, unit, sub]) => (
        <div key={unit}>
          <strong><span className={base.num}>{n}</span> {unit}</strong>
          <span>{sub}</span>
        </div>
      ))}
    </section>
  );
}

/* 7. Two perspectives ---------------------------------------------------- */

function Perspectives() {
  const cards = [
    {
      title: "Athletic departments",
      strong: true,
      lead: "Reconnect letterwinners and fans with the players who built your program.",
      points: [
        "A fan Locker for every former player, in your school colors",
        "Anniversaries, milestones and birthdays flagged before they happen",
        "Tracked links for every post your staff shares",
        "Reach and Locker visits for every activation",
      ],
    },
    {
      title: "NIL collectives",
      strong: false,
      lead: "Show partners and donors the players you support, and the attention they bring.",
      points: [
        "One Locker per athlete to share with partners and donors",
        "Moments to plan partner activations around",
        "A tracked link for every activation",
        "Reporting you can bring to your next partner meeting",
      ],
    },
  ];
  return (
    <section className={s.perspectives} aria-labelledby="persp-title">
      <Eyebrow>Alumni engagement</Eyebrow>
      <h2 className={base.h2} id="persp-title">One system. Two perspectives.</h2>
      <div className={s.perspGrid}>
        {cards.map((c) => (
          <article className={`${s.perspCard} ${c.strong ? s.perspStrong : ""}`} key={c.title}>
            <header>{c.title}</header>
            <div>
              <p>{c.lead}</p>
              <ul>{c.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
              <PillCta href="#demo">Book a demo</PillCta>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* 8. Rotating headline --------------------------------------------------- */

const legends = ["legend", "captain", "walk-on", "champion", "letterwinner"];

function Rotator() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % legends.length), 2200);
    return () => window.clearInterval(t);
  }, []);
  return (
    <section className={s.rotator} aria-label="Every legend deserves an encore">
      <h2 className={base.h2}>
        Every <span className={s.rotWord} key={legends[i]}>{legends[i]}</span>
        <br />
        deserves an encore.
      </h2>
    </section>
  );
}

/* 9. Programs (stacked cards) ------------------------------------------- */

const programs = [
  { title: "Athletic departments", photo: enterprisePhotos.departments },
  { title: "NIL collectives", photo: enterprisePhotos.collectives },
  { title: "Letterwinner associations", photo: enterprisePhotos.letterwinners },
  { title: "Booster clubs", photo: enterprisePhotos.boosters },
  { title: "Athletic foundations", photo: enterprisePhotos.foundations },
  { title: "High school programs", photo: enterprisePhotos.highSchool },
];

function Programs() {
  return (
    <section className={s.programs} aria-labelledby="programs-title">
      <div className={`${s.programHeader} ${s.stack}`} style={{ "--i": 0 } as CSSProperties}>
        <h2 id="programs-title">Alumni engagement for your program</h2>
      </div>
      {programs.map((p, i) => (
        <a className={`${s.programCard} ${s.stack}`} href="#demo" key={p.title} style={{ "--i": i + 1 } as CSSProperties}>
          <Image src={p.photo.src} alt="" fill sizes="(min-width: 1300px) 1200px, 100vw" style={{ objectPosition: p.photo.position }} />
          <span className={s.programShade} />
          <span className={s.programLabel}>{p.title}</span>
          <span className={s.programIcon} aria-hidden="true"><ArrowUpRight size={22} /></span>
        </a>
      ))}
      <div className={s.programNote}>
        Whether you run a department or support its athletes, BLTZ keeps your staff focused on the players and fans instead of the process.
      </div>
    </section>
  );
}

/* 10. Reality check ------------------------------------------------------ */

function Reality() {
  const today = [
    "Former players' film, photos and press are spread across drives, archives and old sites",
    "Anniversaries and milestones go by without anyone noticing",
    "Posts go out with no way to see who clicked",
    "Staff spend hours clearing photos before they can share them",
  ];
  const bltz = [
    "Every former player has a Locker with their whole career",
    "The dates that matter are flagged weeks ahead",
    "Every post uses a tracked Locker link",
    "BLTZ clears the media, so there's nothing to approve",
  ];
  return (
    <section className={s.reality} aria-labelledby="reality-title">
      <p className={s.realityEyebrow}>Alumni engagement today</p>
      <h2 className={base.h2} id="reality-title">You&apos;re managing more history than ever.</h2>
      <p className={s.realitySub}>Here&apos;s what changes when your former players live in one clear system:</p>
      <div className={s.realityGrid}>
        <div className={s.realityCol}>
          <h3>Current tools</h3>
          <ul>{today.map((t) => <li key={t}><Minus size={18} aria-hidden="true" />{t}</li>)}</ul>
        </div>
        <div className={`${s.realityCol} ${s.realityUs}`}>
          <h3>BLTZ</h3>
          <ul>{bltz.map((t) => <li key={t}><Plus size={18} aria-hidden="true" />{t}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

/* 11. Statement card ----------------------------------------------------- */

function Statement() {
  return (
    <section className={s.statementCard}>
      <h2>Turning a list of former players into fans you can <em>reach</em>.</h2>
    </section>
  );
}

/* 12. How it works (accordion with real CRM screens) --------------------- */

const how: { key: string; label: string; view: CrmView; offset: number; title: string; body: string[] }[] = [
  {
    key: "launch",
    label: "Launch",
    view: "launch",
    offset: 0,
    title: "Bring a legend home",
    body: [
      "Add a former player with their position and years, then attach highlights, archive media and the businesses they run now. Add a date and BLTZ turns it into an anniversary signal.",
      "BLTZ builds the Locker, clears the media and sends the player an invite to claim it.",
    ],
  },
  {
    key: "flag",
    label: "Flag",
    view: "overview",
    offset: 0,
    title: "See this week's moments",
    body: [
      "Overview shows every former player with a live Locker, what to act on in the next 7 days, and what's coming up over the next 30.",
      "Each moment comes with the Locker link ready to post.",
    ],
  },
  {
    key: "plan",
    label: "Plan",
    view: "intelligence",
    offset: 0,
    title: "Know every player's story",
    body: [
      "Intelligence gives each player a file: contact details, socials and follower counts, and the dated reasons to feature them, ranked by priority and confidence.",
      "Turn a moment or a business opportunity into a planned activation in one step.",
    ],
  },
  {
    key: "measure",
    label: "Measure",
    view: "intelligence",
    offset: 380,
    title: "Show what it delivered",
    body: [
      "Every activation reports post reach, engagements, Locker visits and followers.",
      "Bring the numbers to leadership, donors and partners without building a spreadsheet.",
    ],
  },
];

function HowItWorks() {
  const [open, setOpen] = useState(0);
  return (
    <section className={s.how} id="how" aria-labelledby="how-title">
      <Eyebrow>How BLTZ works</Eyebrow>
      <h2 className={base.h2} id="how-title">An alumni workspace built for your day-to-day.</h2>
      <div className={s.accordion}>
        {how.map((h, i) => (
          <div className={s.accItem} data-open={i === open} key={h.key}>
            <button type="button" aria-expanded={i === open} onClick={() => setOpen(i)}>
              {h.label}
            </button>
            {i === open ? (
              <div className={s.accBody}>
                <div className={s.accShot}>
                  <CrmScreen view={h.view} offsetY={h.offset} label={`BLTZ workspace: ${h.title}`} />
                </div>
                <div className={s.accText}>
                  <h3>{h.title}</h3>
                  {h.body.map((b) => <p key={b}>{withNumbers(b)}</p>)}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/* 13. Testimonials (placeholders) --------------------------------------- */

function Testimonials() {
  const quotes = [
    { body: "A quote from a pilot athletic department about reconnecting with letterwinners goes here.", name: "Name", role: "Title", org: "Program" },
    { body: "A quote from a collective about showing partners the reach of the athletes they support goes here.", name: "Name", role: "Title", org: "Collective" },
  ];
  const [i, setI] = useState(0);
  const q = quotes[i];
  return (
    <section className={s.testimonials} aria-labelledby="testi-title">
      <div className={s.testiHeader}>
        <h2 id="testi-title">Trusted by programs like yours</h2>
      </div>
      <div className={s.testiBand}>
        <figure className={s.testiCard}>
          <span className={s.placeholderTag}>Placeholder</span>
          <blockquote>{q.body}</blockquote>
          <figcaption>
            <strong>{q.name}</strong>
            <span>{q.role}</span>
            <span>{q.org}</span>
          </figcaption>
          <div className={s.testiNav}>
            <button type="button" aria-label="Previous quote" onClick={() => setI((i + quotes.length - 1) % quotes.length)}><ChevronLeft size={20} /></button>
            <span className={base.num}>{i + 1} / {quotes.length}</span>
            <button type="button" aria-label="Next quote" onClick={() => setI((i + 1) % quotes.length)}><ChevronRight size={20} /></button>
          </div>
        </figure>
      </div>
    </section>
  );
}

/* 14. CTA band + booking ------------------------------------------------- */

type CalendlyWindow = Window & {
  Calendly?: { initInlineWidget: (o: { url: string; parentElement: HTMLElement }) => void };
};

function Booking() {
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
    <section className={s.cta} id="demo" aria-labelledby="cta-title">
      <div className={s.ctaRow}>
        <h2 id="cta-title">See what alumni engagement looks like in practice.</h2>
        {!open ? <PillCta onClick={() => setOpen(true)}>Book a demo</PillCta> : null}
      </div>
      {open ? (
        <>
          <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
          <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setFailed(true)} />
          {!ready ? (
            <p role="status" className={s.ctaStatus}>
              {failed ? "The calendar didn't load. Use the link below to book instead." : "Loading available times…"}
            </p>
          ) : null}
          <div ref={container} className={base.calendly} aria-label="Booking calendar" />
          <a className={s.ctaLink} href={PREVIEW_CALENDLY_URL} target="_blank" rel="noopener noreferrer">Open the calendar in a new tab</a>
        </>
      ) : null}
    </section>
  );
}

/* 15. Resources ---------------------------------------------------------- */

function Resources() {
  const guides = [
    { title: "The playbook for celebrating former players year-round", photo: enterprisePhotos.letterwinners },
    { title: "Turning anniversaries into your best-performing posts", photo: enterprisePhotos.highSchool },
    { title: "Building an alumni media archive from what you already have", photo: enterprisePhotos.foundations },
    { title: "Showing partners the reach of the athletes you support", photo: enterprisePhotos.collectives },
  ];
  return (
    <section className={s.resources} aria-labelledby="res-title">
      <h2 className={base.h2} id="res-title">Practical alumni engagement playbooks.</h2>
      <div className={s.resGrid}>
        {guides.map((g) => (
          <article key={g.title}>
            <span className={s.resThumb}><Image src={g.photo.src} alt="" fill sizes="160px" style={{ objectPosition: g.photo.position }} /></span>
            <div>
              <small>Guide</small>
              <h3>{g.title}</h3>
              <span className={s.soon}>Coming soon</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* Page ------------------------------------------------------------------- */

export function EnterpriseLanding() {
  return (
    <main className={`${base.page} ${s.page}`} data-audience="enterprise">
      <a className={base.skip} href="#demo">Skip to book a demo</a>
      <SiteNav
        audience="enterprise"
        announcement={
          <>
            <span>Pilot programs are open for athletic departments and NIL collectives.</span>
            <a href="#demo">Book a demo</a>
          </>
        }
      />
      <Hero />
      <ProductDemo />
      <TrustBand />
      <Problem />
      <WhatWeDo />
      <Metrics />
      <Perspectives />
      <Rotator />
      <Programs />
      <Reality />
      <Statement />
      <HowItWorks />
      <Testimonials />
      <Booking />
      <Resources />
      <section className={s.athleteLink}>
        <span>Are you an athlete?</span>
        <Link href={`${ROUTES.athletes}#claim`}>Claim your own Player Locker</Link>
      </section>
      <SiteFooter />
    </main>
  );
}
