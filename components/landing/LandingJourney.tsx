"use client";

import Image from "next/image";
import {
  AtSign,
  ChartNoAxesColumnIncreasing,
  Film,
  Mic2,
  Music2,
  Newspaper,
  Podcast,
  Share2,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { WaitlistForm } from "./WaitlistForm";
import { HeroDepthPortrait } from "./HeroDepthPortrait";
import { HeroWaitlistForm } from "./HeroWaitlistForm";
import LockerView, { type LockerData } from "@/app/player/[slug]/LockerView";
import styles from "@/app/homepage-structure.module.css";

const sections = [
  {
    id: "ownership",
    title: "Share the value your story creates.",
    body: "Build transparent revenue with teammates, universities, organizations, and rights holders.",
  },
  {
    id: "media",
    title: "Connect every channel.",
    body: "Grow your legacy by connecting your music playlist and social media content to your player locker.",
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

const integrationChannels = [
  {
    name: "Instagram",
    image: "/images/icons/instagram.png",
  },
  {
    name: "YouTube",
    image: "/images/integrations/youtube.svg",
    dimensional: true,
  },
  {
    name: "TikTok",
    icon: Music2,
    color: "#f7f8fb",
  },
  {
    name: "X",
    image: "/images/icons/twitter-X.png",
  },
  {
    name: "Facebook",
    image: "/images/icons/facebook.png",
  },
  {
    name: "LinkedIn",
    image: "/images/icons/LinkedIn.png",
  },
  {
    name: "Spotify",
    image: "/images/integrations/spotify.svg",
    dimensional: true,
  },
  {
    name: "Apple Podcasts",
    icon: Podcast,
    color: "#b67cff",
  },
  {
    name: "Threads",
    icon: AtSign,
    color: "#f7f8fb",
  },
  {
    name: "Apple Music",
    image: "/images/integrations/apple-music.svg",
    dimensional: true,
  },
  {
    name: "Wikipedia",
    image: "/images/integrations/wikipedia.svg",
    dimensional: true,
  },
] as const;

const revenuePartners = [
  {
    title: "Athletes",
    body: "Turn the attention around your career into durable, trackable value.",
    image: "/images/landing/cal-generated.png",
    position: "center 28%",
  },
  {
    title: "Teammates",
    body: "Recognize the players who helped create the moment and share its reach.",
    image: "/images/media-9.jpg",
    position: "56% center",
  },
  {
    title: "Universities",
    body: "Create new value from the history, audience, and media of the program.",
    image: "/images/media-6.jpg",
    position: "68% center",
  },
  {
    title: "Organizations",
    body: "Connect approved content, measurable performance, and participation in one system.",
    image: "/images/media-5.jpg",
    position: "54% center",
  },
  {
    title: "Rights holders",
    body: "Preserve ownership context while creating transparent paths to participation.",
    image: "/images/Headshot.png",
    position: "center 18%",
  },
] as const;

const athleteAudiences = [
  {
    title: "Current Athletes",
    image: "/images/landing/cal-generated.png",
    position: "center 24%",
  },
  {
    title: "Former Athletes",
    image: "/images/media-9.jpg",
    position: "55% center",
  },
  {
    title: "High School",
    image: "/images/Media-4.avif",
    position: "center",
  },
  {
    title: "College",
    image: "/images/media-6.jpg",
    position: "68% center",
  },
  {
    title: "PRO",
    image: "/images/media-5.jpg",
    position: "52% center",
  },
  {
    title: "Hometown Heroes",
    image: "/images/Headshot.png",
    position: "center 16%",
  },
  {
    title: "Coaches",
    image: "/images/media-9.jpg",
    position: "28% center",
  },
] as const;

const landingLockerData: LockerData = {
  athleteId: null,
  slug: "landing-preview",
  fullName: "Jordan Carter",
  hometown: "Los Angeles, CA",
  position: "DB",
  jersey: "#1",
  levelLabel: "Pro",
  headshotUrl: "/images/Headshot.png",
  heroVideoUrl: "/videos/demo-reel.mp4",
  logoSrc: "/bltz-white-logo.svg",
  bio: "Jordan Carter built a career around preparation, leadership, and making the biggest plays when the moment demanded it.",
  athleteQuote: "The work becomes the legacy when every chapter has a home.",
  athleteQuoteAuthor: "Jordan Carter",
  heightDisplay: "6'1\"",
  weightLbs: 205,
  dobDisplay: "08-07-2001",
  age: 24,
  gamesPlayed: 39,
  highSchool: "Crenshaw High School",
  classOf: "2020",
  school: {
    name: "California",
    abbr: "CAL",
    primaryColor: "#003262",
    logoUrl: "/images/bltz-mark.svg",
  },
  nfl: {
    latestTeam: "Los Angeles Chargers",
    draftYear: 2025,
    draftRound: 2,
    draftPick: 44,
    draftTeam: "Los Angeles Chargers",
  },
  schools: [
    { label: "CAL", color: "#003262", logo: "/images/bltz-mark.svg" },
  ],
  proTeams: [
    { label: "LAC", color: "#0080C6", logo: "/images/bltz-mark.svg" },
  ],
  awards: [
    { year: "2024", label: "First-Team All-Conference" },
    { year: "2023", label: "Team Defensive MVP" },
  ],
  videos: [
    { id: "landing-film-1", title: "Season Highlights", thumb: "/images/media-9.jpg" },
    { id: "landing-film-2", title: "Game Day Cut", thumb: "/images/media-6.jpg" },
    { id: "landing-film-3", title: "Top Plays", thumb: "/images/media-5.jpg" },
  ],
  photos: [
    { id: "landing-photo-1", url: "/images/media-9.jpg", title: "Game Day", credits: "BLTZ Archive", sourceUrl: null, provenance: "founder_archive", licenseLabel: "BLTZ CLEARED" },
    { id: "landing-photo-2", url: "/images/media-6.jpg", title: "Under the Lights", credits: "Team Archive", sourceUrl: null, provenance: "cal_archive", licenseLabel: "TEAM ARCHIVE" },
    { id: "landing-photo-3", url: "/images/media-5.jpg", title: "Built for the Moment", credits: "Athlete Upload", sourceUrl: null, provenance: "athlete_uploaded", licenseLabel: "ATHLETE UPLOAD" },
  ],
};

function RevenueAccordion() {
  const [activePanel, setActivePanel] = useState(0);

  return (
    <div className={styles.revenueAccordion} aria-label="Revenue sharing participants">
      {revenuePartners.map((partner, index) => {
        const isActive = index === activePanel;

        return (
          <button
            className={`${styles.revenuePanel} ${isActive ? styles.revenuePanelActive : ""}`}
            key={partner.title}
            type="button"
            aria-expanded={isActive}
            onClick={() => setActivePanel(index)}
            onFocus={() => setActivePanel(index)}
            onMouseEnter={() => setActivePanel(index)}
          >
            <Image
              className={styles.revenuePanelImage}
              src={partner.image}
              alt=""
              fill
              sizes="(min-width: 1025px) 38vw, (min-width: 761px) 70vw, 92vw"
              style={{ objectPosition: partner.position }}
            />
            <span className={styles.revenuePanelShade} aria-hidden="true" />
            <span className={styles.revenuePanelCopy}>
              <strong>{partner.title}</strong>
              <span>{partner.body}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AthleteAudienceGrid() {
  return (
    <section className={styles.audienceSection} aria-label="Athletes BLTZ is built for">
      <div className={styles.audienceBento}>
        {athleteAudiences.map((audience) => (
          <article className={styles.audienceCard} key={audience.title}>
            <Image
              className={styles.audienceCardImage}
              src={audience.image}
              alt=""
              fill
              sizes="(min-width: 1025px) 42vw, (min-width: 761px) 50vw, 92vw"
              style={{ objectPosition: audience.position }}
            />
            <span className={styles.audienceCardShade} aria-hidden="true" />
            <h3>{audience.title}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}

function LockerProductScreen() {
  return (
    <div
      className={styles.realLockerPreview}
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest("a")) event.preventDefault();
      }}
    >
      <div className={styles.realLockerShell}>
        <div className={styles.realLockerViewport}>
          <LockerView data={landingLockerData} presentation="embedded" />
        </div>
      </div>
    </div>
  );
}

function IntegrationRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const firstGroupRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    const rail = railRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!rail || reduceMotion.matches) return;

    let animationFrame = 0;
    let previousTime = performance.now();

    const moveRail = (time: number) => {
      const elapsed = Math.min(time - previousTime, 32);
      previousTime = time;

      if (!isPausedRef.current && document.visibilityState === "visible") {
        rail.scrollLeft += elapsed * 0.035;

        const loopPoint = firstGroupRef.current?.offsetWidth ?? 0;
        if (loopPoint > 0 && rail.scrollLeft >= loopPoint) {
          rail.scrollLeft -= loopPoint;
        }
      }

      animationFrame = window.requestAnimationFrame(moveRail);
    };

    animationFrame = window.requestAnimationFrame(moveRail);

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  const setPaused = (isPaused: boolean) => {
    isPausedRef.current = isPaused;
  };

  return (
    <div className={styles.integrationStage}>
      <div
        aria-label="Media and social integrations"
        className={styles.integrationRail}
        onBlur={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onPointerCancel={() => setPaused(false)}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onTouchEnd={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        ref={railRef}
        role="region"
        tabIndex={0}
      >
        <div className={styles.integrationTrack}>
          {[0, 1].map((setIndex) => (
            <div
              aria-hidden={setIndex === 1}
              className={styles.integrationGroup}
              key={setIndex}
              ref={setIndex === 0 ? firstGroupRef : undefined}
            >
              {integrationChannels.map((channel) => {
                const ChannelIcon = "icon" in channel ? channel.icon : null;

                return (
                  <div
                    aria-label={setIndex === 0 ? channel.name : undefined}
                    className={styles.integrationItem}
                    key={`${setIndex}-${channel.name}`}
                    role={setIndex === 0 ? "img" : undefined}
                  >
                    <div
                      className={`${styles.integrationLogo} ${
                        "dimensional" in channel && channel.dimensional
                          ? styles.integrationLogo3d
                          : ""
                      }`}
                    >
                      {"image" in channel ? (
                        <Image
                          alt=""
                          height={64}
                          src={channel.image}
                          width={64}
                        />
                      ) : ChannelIcon ? (
                        <ChannelIcon
                          aria-hidden="true"
                          color={channel.color}
                          size={56}
                          strokeWidth={1.7}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingJourney() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const magnetJourneyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let animationFrame = 0;
    let previousScrollY = window.scrollY;
    let previousJourneyProgress = 0;
    let previousCollectProgress = 0;
    let journeyDirection: "down" | "up" = "down";
    let returnStartProgress = 1;
    let returnStartCollect = 1;

    const updateHeader = () => {
      setHasScrolled(window.scrollY > 40);

      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        const journey = magnetJourneyRef.current;

        if (journey) {
          const rect = journey.getBoundingClientRect();
          const distance = Math.max(journey.offsetHeight - window.innerHeight, 1);
          const progress = Math.min(Math.max(-rect.top / distance, 0), 1);
          const downwardCollectProgress = Math.min(
            Math.max((progress - 0.205) / 0.695, 0),
            1,
          );
          const scrollingUp = window.scrollY < previousScrollY - 0.5;
          const scrollingDown = window.scrollY > previousScrollY + 0.5;

          if (scrollingUp && journeyDirection !== "up") {
            journeyDirection = "up";
            returnStartProgress = Math.max(previousJourneyProgress, 0.0001);
            returnStartCollect = previousCollectProgress;
          } else if (scrollingDown && journeyDirection !== "down") {
            journeyDirection = "down";
          }

          const collectProgress = journeyDirection === "up"
            ? returnStartCollect * Math.min(Math.max(progress / returnStartProgress, 0), 1)
            : downwardCollectProgress;
          const headlineExit = 1 - Math.min(Math.max(collectProgress / 0.28, 0), 1);
          const headlineOpacity = headlineExit;
          const linearLockerProgress = Math.min(
            Math.max((progress - 0.23) / 0.65, 0),
            1,
          );
          const lockerProgress =
            linearLockerProgress *
            linearLockerProgress *
            (3 - 2 * linearLockerProgress);
          const lockerTitleProgress = Math.min(
            Math.max((linearLockerProgress - 0.72) / 0.28, 0),
            1,
          );

          journey.style.setProperty("--journey-progress", progress.toFixed(4));
          journey.style.setProperty("--collect-progress", collectProgress.toFixed(4));
          journey.style.setProperty("--story-headline-opacity", headlineOpacity.toFixed(4));
          journey.style.setProperty("--locker-progress", lockerProgress.toFixed(4));
          journey.style.setProperty("--locker-title-progress", lockerTitleProgress.toFixed(4));

          previousScrollY = window.scrollY;
          previousJourneyProgress = progress;
          previousCollectProgress = collectProgress;
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

  useEffect(() => {
    const journey = magnetJourneyRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!journey || reduceMotion.matches) return;

    let targetScroll = window.scrollY;
    let animationFrame = 0;
    let wheelEndTimer = 0;

    const animateScroll = () => {
      const distance = targetScroll - window.scrollY;

      // Stop at the current rendered position instead of forcing a final
      // correction that reads as a subtle recoil on large preview elements.
      if (Math.abs(distance) < 1) {
        targetScroll = window.scrollY;
        animationFrame = 0;
        return;
      }

      window.scrollTo({ top: window.scrollY + distance * 0.22 });
      animationFrame = window.requestAnimationFrame(animateScroll);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;

      if (event.deltaY < 0) {
        window.clearTimeout(wheelEndTimer);
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        targetScroll = window.scrollY;
        return;
      }

      const journeyTop = journey.getBoundingClientRect().top + window.scrollY;
      const journeyEnd = journeyTop + journey.offsetHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      const lineMultiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : 1;
      const projectedScroll = currentScroll + event.deltaY * lineMultiplier;
      const isInsideJourney = currentScroll >= journeyTop && currentScroll <= journeyEnd;
      const enteringFromAbove =
        currentScroll < journeyTop && event.deltaY > 0 && projectedScroll >= journeyTop;
      const leavingAtEnd = currentScroll >= journeyEnd - 6 && event.deltaY > 0;

      if (leavingAtEnd) {
        window.clearTimeout(wheelEndTimer);
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        targetScroll = currentScroll;
        return;
      }

      if (
        !isInsideJourney &&
        !enteringFromAbove
      ) return;

      event.preventDefault();

      const normalizedDelta = Math.max(
        -110,
        Math.min(110, event.deltaY * lineMultiplier),
      );
      if (enteringFromAbove) {
        targetScroll = Math.min(journeyEnd, journeyTop + 24);
      } else {
        const baseScroll = animationFrame ? targetScroll : currentScroll;
        targetScroll = Math.max(
          journeyTop,
          Math.min(journeyEnd, baseScroll + normalizedDelta * 0.82),
        );
      }

      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(animateScroll);
      }

      window.clearTimeout(wheelEndTimer);
      wheelEndTimer = window.setTimeout(() => {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        targetScroll = window.scrollY;
      }, 110);
    };

    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.clearTimeout(wheelEndTimer);
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
        <div className={styles.heroContent}>
          <h1>Build your legacy now</h1>
          <p>
            BLTZ creates a digital locker that brings together your highlights,
            achievements, stats and career story.
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
        ref={magnetJourneyRef}
        style={{
          "--journey-progress": 0,
          "--collect-progress": 0,
          "--story-headline-opacity": 0,
          "--locker-progress": 0,
          "--locker-title-progress": 0,
        } as CSSProperties}
      >
        <div className={styles.magnetPhase}>
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

            <div className={styles.storyHeadline}>
              <h2>
                Everything You Built
                <br />
                Finally Together
              </h2>
              <p>
                Don&apos;t let your career story get lost online.
              </p>
            </div>

            <div className={styles.lockerRevealSection} id="locker">
              <div className={styles.lockerScrollCard}>
                <LockerProductScreen />
              </div>
              <div className={styles.lockerRevealTitle}>
                <h2>
                  AI Enhanced to Build
                  <br />
                  Real NIL Value
                </h2>
                <p>
                  Easily secure your athlete identity into one page you control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AthleteAudienceGrid />

      {sections.map((section) => (
        <section className={styles.contentSection} id={section.id} key={section.id}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionCopy}>
              <h2>
                {section.id === "ownership" ? (
                  <>
                    Share the Value
                    <br />
                    Your Story Creates
                  </>
                ) : section.title}
              </h2>
              <p>{section.body}</p>
            </div>
            {section.id === "media" ? (
              <IntegrationRail />
            ) : section.id === "ownership" ? (
              <RevenueAccordion />
            ) : (
              <div className={styles.sectionStage} aria-hidden="true" />
            )}
          </div>
        </section>
      ))}

      <section className={styles.waitlistSection} id="waitlist" data-section="waitlist">
        <div className={styles.waitlistFrame}>
          <div className={styles.waitlistCopy}>
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
