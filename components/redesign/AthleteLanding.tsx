"use client";

import Image from "next/image";
import Link from "next/link";
import { AtSign, Music2, Podcast } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { redesignPhotos, type RedesignPhotoKey } from "./assets";
import { Faq, SiteFooter, SiteNav, useDisplayFontFamily, useRoutes } from "./SiteChrome";
import { LockerJourney } from "./LockerJourney";
import { CareerChapters, PhotoWall, PlayDiagram } from "./StoryMotion";
import styles from "./redesign.module.css";

const LockerRoomScene = dynamic(
  () => import("./three/LockerRoomScene").then((m) => m.LockerRoomScene),
  { ssr: false, loading: () => <div className={styles.canvasFallback} /> },
);

type Status = { tone: "idle" | "error" | "success"; message: string };

function ClaimForm({
  id,
  name,
  onNameChange,
}: {
  id: string;
  name: string;
  onNameChange: (value: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>({
    tone: "idle",
    message: "Joining the list is free. We'll email you when your locker opens.",
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName: name, website, newsletterOptIn: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "We couldn't save your spot. Check your email address and try again.");
      const first = name.trim().split(/\s+/)[0];
      setStatus({
        tone: "success",
        message: `You're on the list${first ? `, ${first}` : ""}. We'll email ${email} when your locker opens.`,
      });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Something went wrong. Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <form className={styles.claimForm} onSubmit={submit} aria-describedby={`${id}-note`}>
        <label className={styles.visuallyHidden} htmlFor={`${id}-name`}>Your name</label>
        <input
          id={`${id}-name`}
          autoComplete="name"
          placeholder="Your name"
          value={name}
          maxLength={40}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <label className={styles.visuallyHidden} htmlFor={`${id}-email`}>Email address</label>
        <input
          id={`${id}-email`}
          type="email"
          required
          autoComplete="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={styles.honeypot}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? "Claiming…" : "Claim my locker"}
        </button>
      </form>
      <p className={styles.formNote} id={`${id}-note`} data-tone={status.tone} role="status">
        {status.message}
      </p>
    </div>
  );
}

function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const [name, setName] = useState("");
  const fontFamily = useDisplayFontFamily();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const distance = Math.max(section.offsetHeight - window.innerHeight, 1);
      const p = Math.min(1, Math.max(0, -rect.top / distance));
      progressRef.current = p;
      section.style.setProperty("--hero-copy", Math.max(0, 1 - p * 3.2).toFixed(3));
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
    <section className={styles.hero} ref={sectionRef} aria-labelledby="hero-title">
      <div className={styles.heroStage}>
        {fontFamily ? <LockerRoomScene name={name} progressRef={progressRef} fontFamily={fontFamily} /> : <div className={styles.canvasFallback} />}
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <h1 className={styles.h1} id="hero-title">Put your name on it.</h1>
          <p className={styles.lede}>
            BLTZ gives you a Player Locker: one page for your film, stats, photos, interviews and press, with your name on the door.
          </p>
          <ClaimForm id="hero-claim" name={name} onNameChange={setName} />
        </div>
      </div>
    </section>
  );
}

const steps = [
  { title: "Claim your locker", body: "Reserve your name and tell us where you played." },
  { title: "Bring your career in", body: "Add film, stats, photos and press, and connect your channels. We help find what's already out there about you." },
  { title: "Share one link", body: "Send it to coaches, scouts, sponsors and family. It stays current as your career moves." },
];

const audiences: { key: RedesignPhotoKey; title: string; body: string }[] = [
  { key: "highSchool", title: "High school", body: "Start your record early, long before signing day." },
  { key: "college", title: "College", body: "Keep every season in one place while you're living it." },
  { key: "pro", title: "Pro", body: "Give fans, partners and press one official home." },
  { key: "former", title: "Former players", body: "You stopped playing. Your record shouldn't disappear with the jersey." },
  { key: "coaches", title: "Coaches", body: "Show the players you developed and the programs you built." },
];

function Audiences() {
  const [active, setActive] = useState(0);
  return (
    <section className={styles.section} aria-labelledby="audience-title">
      <div className={styles.inner}>
        <div className={styles.sectionHead}>
          <h2 className={styles.h2} id="audience-title">Built for every chapter.</h2>
        </div>
        <div className={styles.audienceWrap}>
          <ul className={styles.audienceList}>
            {audiences.map((a, i) => (
              <li key={a.key}>
                <button
                  type="button"
                  aria-pressed={i === active}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                >
                  {a.title}
                  <span>{a.body}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.audiencePhoto} aria-hidden="true">
            {audiences.map((a, i) => (
              <Image
                key={a.key}
                src={redesignPhotos[a.key].src}
                alt=""
                fill
                sizes="(min-width: 900px) 40vw, 1px"
                style={{
                  objectPosition: redesignPhotos[a.key].position,
                  opacity: i === active ? 1 : 0,
                  transform: i === active ? "scale(1)" : "scale(1.06)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const channels: { name: string; image?: string; Icon?: typeof Music2 }[] = [
  { name: "Instagram", image: "/images/icons/instagram.png" },
  { name: "YouTube", image: "/images/integrations/youtube.svg" },
  { name: "TikTok", Icon: Music2 },
  { name: "X", image: "/images/icons/twitter-X.png" },
  { name: "Facebook", image: "/images/icons/facebook.png" },
  { name: "Spotify", image: "/images/integrations/spotify.svg" },
  { name: "Apple Music", image: "/images/integrations/apple-music.svg" },
  { name: "Podcasts", Icon: Podcast },
  { name: "Threads", Icon: AtSign },
  { name: "Wikipedia", image: "/images/integrations/wikipedia.svg" },
];

function Channels() {
  return (
    <section className={styles.section} aria-labelledby="channels-title">
      <div className={styles.inner}>
        <div className={styles.sectionHead}>
          <h2 className={styles.h2} id="channels-title">Connect the places you already post.</h2>
          <p className={styles.lede}>Your locker pulls from your social accounts, video, music and podcasts, so it stays up to date without extra work.</p>
        </div>
      </div>
      <div className={styles.channelRail} aria-label="Supported channels" role="list">
        {[0, 1].map((copy) => (
          <div className={styles.channelTrack} key={copy} aria-hidden={copy === 1}>
            {channels.map((c) => (
              <div className={styles.channel} key={c.name} role={copy === 0 ? "listitem" : undefined}>
                <div className={styles.channelMark}>
                  {c.image ? <Image src={c.image} alt="" width={44} height={44} /> : c.Icon ? <c.Icon size={38} strokeWidth={1.7} color="#eeece6" /> : null}
                </div>
                {c.name}
              </div>
            ))}
          </div>
        ))}
      </div>
      <PhotoWall />
    </section>
  );
}

function FinalClaim() {
  const [name, setName] = useState("");
  return (
    <section className={styles.section} id="claim" aria-labelledby="final-title">
      <div className={`${styles.inner} ${styles.finale}`}>
        <h2 className={styles.h1} id="final-title">Your name goes here.</h2>
        <div style={{ width: "min(720px, 100%)" }}>
          <ClaimForm id="final-claim" name={name} onNameChange={setName} />
        </div>
      </div>
    </section>
  );
}

function ProgramsBand() {
  const ROUTES = useRoutes();
  return (
    <section className={styles.section} style={{ paddingTop: 0 }}>
      <div className={`${styles.inner} ${styles.band}`}>
        <div style={{ display: "grid", gap: 16, justifyItems: "center" }}>
          <h2 className={styles.h3} style={{ fontSize: "clamp(34px, 4vw, 56px)" }}>Run a program or a collective?</h2>
          <p className={styles.lede}>Give your former players a Locker, and see which moments are worth celebrating next.</p>
        </div>
        <Link className={styles.button} href={ROUTES.enterprise}>See BLTZ for programs</Link>
      </div>
    </section>
  );
}

/** Live homepage: the hero, then a short path to programs. The rest is still in design at /redesign. */
export function AthleteHeroPage() {
  return (
    <main className={styles.page} data-audience="athletes">
      <a className={styles.skip} href="#claim">Skip to claim your locker</a>
      <SiteNav audience="athletes" />
      <Hero />
      <FinalClaim />
      <ProgramsBand />
      <SiteFooter />
    </main>
  );
}

export function AthleteLanding() {
  return (
    <main className={styles.page} data-audience="athletes">
      <a className={styles.skip} href="#claim">Skip to claim your locker</a>
      <SiteNav audience="athletes" />
      <Hero />
      <LockerJourney />
      <CareerChapters />

      <section className={styles.section} aria-labelledby="steps-title">
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <h2 className={styles.h2} id="steps-title">Three steps to your locker.</h2>
          </div>
          <PlayDiagram />
          <ol className={`${styles.steps} ${styles.stepsCentered}`}>
            {steps.map((s) => (
              <li key={s.title}>
                <h3 className={styles.h3}>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Audiences />
      <Channels />

      <ProgramsBand />

      <Faq
        title="Questions, answered."
        items={[
          { q: "What goes in a Player Locker?", a: "Film and highlights, stats, photos, interviews, podcasts, press and the social posts and music you choose to connect." },
          { q: "Who can claim one?", a: "High school, college, pro and former athletes, and coaches." },
          { q: "Who controls what's on it?", a: "You do. You choose what appears on your locker, and photos are checked for usage rights before they're shown." },
          { q: "When do I get access?", a: "We're opening lockers in waves. Join the list and we'll email you when yours is ready." },
        ]}
      />

      <FinalClaim />

      <SiteFooter />
    </main>
  );
}
