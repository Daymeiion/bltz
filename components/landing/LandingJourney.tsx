"use client";

import Image from "next/image";
import {
  ChartNoAxesColumnIncreasing,
  Film,
  Mic2,
  Newspaper,
  Share2,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { WaitlistForm } from "./WaitlistForm";
import { HeroDepthPortrait } from "./HeroDepthPortrait";
import { HeroWaitlistForm } from "./HeroWaitlistForm";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import styles from "@/app/homepage-structure.module.css";

const sections = [
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

const scatteredCards = [
  {
    type: "film",
    title: "Game film",
    meta: "HIGHLIGHTS",
    icon: Film,
  },
  {
    type: "social",
    title: "Social",
    meta: "POSTS + MOMENTS",
    icon: Share2,
  },
  {
    type: "stats",
    title: "Stats",
    meta: "CAREER DATA",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    type: "podcast",
    title: "Podcast",
    meta: "INTERVIEWS",
    icon: Mic2,
  },
  {
    type: "articles",
    title: "Articles",
    meta: "PRESS + FEATURES",
    icon: Newspaper,
  },
] as const;

function LockerProductScreen() {
  return (
    <div className={styles.lockerDevice}>
      <div className={styles.lockerDesktop}>
        <div className={styles.lockerDeviceHeader}>
          <Image src="/images/bltz-mark.svg" alt="" width={28} height={29} />
          <span>PLAYER LOCKER</span>
          <span className={styles.lockerDeviceLive}>LIVE</span>
        </div>

        <div className={styles.lockerDesktopBody}>
          <div className={styles.lockerDesktopIdentity}>
            <div className={styles.lockerDeviceNumber}>01</div>
            <Image
              className={styles.lockerDeviceHeadshot}
              src="/images/Headshot.png"
              alt=""
              width={420}
              height={280}
            />
            <div className={styles.lockerDeviceIdentityCopy}>
              <span>ATHLETE PROFILE</span>
              <strong>JORDAN CARTER</strong>
              <small>WR / LOS ANGELES, CA</small>
            </div>
          </div>

          <div className={styles.lockerDesktopMedia}>
            <div className={styles.lockerDeviceSectionTitle}>
              <strong>FILM ROOM</strong>
              <span>VIEW ALL</span>
            </div>
            <div className={styles.lockerDeviceRail}>
              <div><span>SEASON HIGHLIGHTS</span></div>
              <div><span>GAME DAY</span></div>
              <div><span>OFF THE FIELD</span></div>
            </div>
            <div className={styles.lockerDeviceStats}>
              <span><strong>39</strong> GAMES</span>
              <span><strong>187</strong> TACKLES</span>
              <span><strong>12</strong> TFL</span>
            </div>
          </div>
        </div>

        <div className={styles.lockerDeviceTabs}>
          <span>BIO</span>
          <span>MEDIA</span>
          <span>CAREER</span>
        </div>
      </div>

      <div className={styles.lockerPhone}>
        <div className={styles.lockerPhoneNotch} />
        <div className={styles.lockerPhoneScreen}>
          <div className={styles.lockerPhoneHeader}>
            <Image src="/images/bltz-mark.svg" alt="" width={20} height={21} />
            <span>LOCKER</span>
            <span>•••</span>
          </div>
          <div className={styles.lockerPhoneIdentity}>
            <div className={styles.lockerDeviceNumber}>01</div>
            <Image
              className={styles.lockerDeviceHeadshot}
              src="/images/Headshot.png"
              alt=""
              width={250}
              height={170}
            />
            <div className={styles.lockerDeviceIdentityCopy}>
              <span>ATHLETE PROFILE</span>
              <strong>JORDAN CARTER</strong>
              <small>WR / LOS ANGELES, CA</small>
            </div>
          </div>
          <div className={styles.lockerDeviceTabs}>
            <span>BIO</span>
            <span>MEDIA</span>
            <span>CAREER</span>
          </div>
          <div className={styles.lockerPhoneContent}>
            <div className={styles.lockerDeviceSectionTitle}>
              <strong>FILM ROOM</strong>
              <span>›</span>
            </div>
            <div className={styles.lockerPhoneRail}>
              <div />
              <div />
            </div>
            <div className={styles.lockerDeviceStats}>
              <span><strong>39</strong> GAMES</span>
              <span><strong>187</strong> TACKLES</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingJourney() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const magnetPhaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrame = 0;

    const updateHeader = () => {
      setHasScrolled(window.scrollY > 40);

      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        const journey = magnetPhaseRef.current;

        if (journey) {
          const rect = journey.getBoundingClientRect();
          const distance = Math.max(journey.offsetHeight - window.innerHeight, 1);
          const progress = Math.min(Math.max(-rect.top / distance, 0), 1);
          const collectProgress = Math.min(Math.max(progress / 0.78, 0), 1);

          journey.style.setProperty("--journey-progress", progress.toFixed(4));
          journey.style.setProperty("--collect-progress", collectProgress.toFixed(4));
        }

        animationFrame = 0;
      });
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);

    return () => {
      window.removeEventListener("scroll", updateHeader);
      window.removeEventListener("resize", updateHeader);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <main className={styles.page}>
      <header className={`${styles.header} ${hasScrolled ? styles.headerScrolled : ""}`}>
        <a href="#hero" className={styles.brandMark} aria-label="BLTZ home">
          <Image src="/images/bltz-mark.svg" alt="" width={59} height={60} priority />
        </a>
        <nav className={styles.audienceNav} aria-label="BLTZ audiences">
          <a href="#ownership">Enterprise</a>
          <a href="#hero" aria-current="page">Athletes</a>
        </nav>
        <div className={styles.headerActions}>
          <a className={styles.secondaryAction} href="#waitlist">
            <span className={styles.buttonLabel}>Join the team</span>
            <span className={styles.buttonLabelHover} aria-hidden="true">Partner up</span>
          </a>
          <a className={styles.headerClaim} href="#hero-email">
            <span className={styles.buttonLabel}>Claim</span>
            <span className={styles.buttonLabelHover} aria-hidden="true">Lets go</span>
          </a>
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
        <a className={styles.scrollCue} href="#story">
          <span>Scroll to locker</span>
        </a>
      </section>

      <section
        className={styles.magnetJourney}
        id="story"
        style={{
          "--journey-progress": 0,
          "--collect-progress": 0,
        } as CSSProperties}
      >
        <div className={styles.magnetPhase} ref={magnetPhaseRef}>
          <div className={styles.magnetSticky}>
            <div className={styles.magnetStage} aria-hidden="true">
              {scatteredCards.map((card, index) => {
                const Icon = card.icon;

                return (
                  <div
                    className={`${styles.cardFlight} ${styles[`cardFlight${index + 1}`]}`}
                    key={card.type}
                  >
                    <article className={styles.storyCard}>
                      <div className={`${styles.appIconTile} ${styles[`appIcon${card.type}`]}`}>
                        <div className={styles.appIconFace}>
                          <div className={styles.appIconSymbol}>
                            <Icon size={44} strokeWidth={1.8} />
                          </div>
                          <span className={styles.appIconMark}>B</span>
                        </div>
                      </div>

                      <div className={styles.cardFooter}>
                        <strong>{card.title}</strong>
                        <span>{card.meta}</span>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.lockerRevealSection} id="locker">
          <ContainerScroll
            cardClassName={styles.lockerScrollCard}
            className={styles.lockerScrollContainer}
            footerComponent={
              <div className={styles.lockerRevealTitle}>
                <div className={styles.sectionMarker}>03 / THE PLAYER LOCKER</div>
                <h2>Everything you built, finally together.</h2>
                <p>
                  Your Player Locker pulls every chapter home into one public
                  identity and media destination.
                </p>
              </div>
            }
          >
            <LockerProductScreen />
          </ContainerScroll>
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
