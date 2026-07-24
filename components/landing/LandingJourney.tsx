import Image from "next/image";
import { WaitlistForm } from "./WaitlistForm";
import { HeroDepthPortrait } from "./HeroDepthPortrait";
import { HeroWaitlistForm } from "./HeroWaitlistForm";
import styles from "@/app/homepage-structure.module.css";

const sections = [
  {
    id: "story",
    index: "02",
    label: "THE SCATTERED STORY",
    title: "Everything you built, finally together.",
    body: "Highlights, interviews, articles, podcasts, photos, and posts organized around your career instead of scattered across the web.",
  },
  {
    id: "locker",
    index: "03",
    label: "THE PLAYER LOCKER",
    title: "One career. One permanent home.",
    body: "A public identity and media destination built around the athlete, from the first season to the next chapter.",
  },
  {
    id: "media",
    index: "04",
    label: "MEDIA + INTEGRATIONS",
    title: "Connect every channel.",
    body: "Bring social accounts, Spotify appearances, team media, and independent coverage into one verified experience.",
  },
  {
    id: "ownership",
    index: "05",
    label: "REVENUE + OWNERSHIP",
    title: "Share the value your story creates.",
    body: "Build transparent revenue participation with teammates, universities, organizations, and rights holders.",
  },
] as const;

export function LandingJourney() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a href="#hero" className={styles.brandMark} aria-label="BLTZ home">
          <Image src="/images/bltz-mark.svg" alt="" width={59} height={60} priority />
        </a>
        <nav className={styles.audienceNav} aria-label="BLTZ audiences">
          <a href="#ownership">Enterprise</a>
          <a href="#hero" aria-current="page">Athletes</a>
        </nav>
        <div className={styles.headerActions}>
          <a className={styles.secondaryAction} href="#waitlist">Join the team</a>
          <a className={styles.headerClaim} href="#hero-email">Claim</a>
        </div>
      </header>

      <section className={styles.hero} id="hero" data-section="hero">
        <HeroDepthPortrait />
        <div className={styles.heroEyebrow}>digital locker room</div>
        <div className={styles.heroContent}>
          <h1>Build your legacy now</h1>
          <p>
            Create a digital locker that brings together your highlights,
            achievements, stats, and career story.
          </p>
          <HeroWaitlistForm />
        </div>
      </section>

      {sections.map((section) => (
        <section className={styles.contentSection} id={section.id} key={section.id}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionMarker}>{section.index} / {section.label}</div>
            <div className={styles.sectionCopy}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </div>
            <div className={styles.sectionStage} aria-hidden="true" />
          </div>
        </section>
      ))}

      <section className={styles.waitlistSection} id="waitlist" data-section="waitlist">
        <div className={styles.waitlistFrame}>
          <div className={styles.waitlistCopy}>
            <div className={styles.sectionMarker}>06 / EARLY ACCESS</div>
            <h2>Claim access</h2>
            <p>Join the athlete waitlist for product updates and early Player Locker access.</p>
          </div>
          <WaitlistForm />
        </div>
      </section>

      <footer className={styles.footer}>
        <span>BLTZ</span>
        <span>ATHLETE MEDIA INFRASTRUCTURE</span>
      </footer>
    </main>
  );
}
