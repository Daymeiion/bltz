"use client";

import { ChartNoAxesColumnIncreasing, Film, Mic2, Newspaper, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import LockerView from "@/app/player/[slug]/LockerView";
import { sampleLocker } from "./sampleLocker";
import styles from "./redesign.module.css";

// The five icons rise in from each side of the screen over the open locker (on
// desktop in an arc along the bottom, around the title), then get pulled into
// one phone. Both moves play through on their own once triggered, so they never
// stop halfway when the visitor stops scrolling. The phone holds a real Player
// Locker that scrolls itself as the page scrolls.
const icons = [
  { type: "film", label: "Game film", Icon: Film, from: ["-75vw", "70vh", "-75vw", "60vh"], to: ["-40vw", "36vh", "-34vw", "-6vh"], rot: -8 },
  { type: "social", label: "Social", Icon: Share2, from: ["-70vw", "85vh", "-75vw", "80vh"], to: ["-24vw", "30vh", "34vw", "-6vh"], rot: 6 },
  { type: "stats", label: "Stats", Icon: ChartNoAxesColumnIncreasing, from: ["70vw", "85vh", "75vw", "70vh"], to: ["24vw", "31vh", "-33vw", "10vh"], rot: -5 },
  { type: "podcast", label: "Podcasts", Icon: Mic2, from: ["75vw", "70vh", "75vw", "85vh"], to: ["40vw", "37vh", "33vw", "10vh"], rot: 7 },
  { type: "articles", label: "Press", Icon: Newspaper, from: ["0vw", "110vh", "0vw", "110vh"], to: ["0vw", "38vh", "0vw", "39vh"], rot: -4 },
] as const;

const stages = [
  { title: "Your Legacy Starts Here", body: "Your hero reel, position, school and the quote you want people to remember." },
  { title: "Film room", body: "Highlights and full games in one place, newest first." },
  { title: "Photos", body: "Only photos you choose. Each one is checked for usage rights before it's shown." },
  { title: "Bio and career", body: "Measurables, hometown, schools and your story in your own words." },
] as const;

const sectionSelectors = [".locker-hero-section", ".locker-film-section", ".locker-photos-section", ".locker-tabs-section"];

const noopSubscribe = () => () => {};
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => t * t * (3 - 2 * t);
// Overshoots and settles, so the icons jump into place.
const jump = (t: number) => {
  const c = 1.2;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

export function LockerJourney({ outro = false }: { outro?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  // LockerView only shows photos with absolute URLs, so resolve them on the client.
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const locker = useMemo(
    () => ({ ...sampleLocker, photos: sampleLocker.photos.map((ph) => ({ ...ph, url: origin + ph.url })) }),
    [origin],
  );

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let frame = 0;
    let lastStage = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Time-based moves, triggered by scroll position.
    type Tween = { v: number; from: number; to: number; t0: number; dur: number };
    const tweens: Record<"enter" | "collect", Tween> = {
      enter: { v: 0, from: 0, to: 0, t0: 0, dur: 1100 },
      collect: { v: 0, from: 0, to: 0, t0: 0, dur: 900 },
    };
    const aim = (tw: Tween, to: number, now: number) => {
      if (tw.to === to) return;
      tw.from = tw.v;
      tw.to = to;
      tw.t0 = now;
    };
    const step = (tw: Tween, now: number) => {
      if (tw.v === tw.to) return false;
      const k = reduceMotion ? 1 : clamp01((now - tw.t0) / (tw.dur * Math.abs(tw.to - tw.from)));
      tw.v = k >= 1 ? tw.to : tw.from + (tw.to - tw.from) * k;
      return tw.v !== tw.to;
    };

    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const distance = Math.max(section.offsetHeight - window.innerHeight, 1);
      const p = clamp01(-rect.top / distance);

      // This section overlaps the last screen of the hero (see CSS). While it
      // rises into view its stage is held in place and see-through, so the
      // icons float in over the open locker, then converge into the phone on
      // the next scroll.
      const pre = clamp01(1 - rect.top / window.innerHeight);
      const shift = rect.top < window.innerHeight ? Math.max(0, rect.top) : 0;
      section.style.setProperty("--pre-shift", `${shift.toFixed(1)}px`);
      section.style.setProperty("--intro", range(pre, 0.35, 0.7).toFixed(4));
      section.style.setProperty("--cover", range(p, 0, 0.06).toFixed(4));
      const now = performance.now();
      aim(tweens.enter, pre >= 0.55 ? 1 : 0, now);
      aim(tweens.collect, p >= 0.04 ? 1 : 0, now);
      const moving = [step(tweens.enter, now), step(tweens.collect, now)].some(Boolean);
      const enter = tweens.enter.v;
      const collect = tweens.collect.v;
      const deviceIn = range(p, 0.12, 0.18);
      const scroll = range(p, 0.18, 0.97);
      const exit = 0;
      const outro = range(p, 0.93, 1);

      const vars: Record<string, number> = {
        "--enter": enter,
        "--enter-e": jump(enter),
        "--collect": collect,
        "--collect-e": ease(collect),
        "--device": deviceIn,
        "--device-e": ease(deviceIn),
        "--device-in": deviceIn,
        "--exit": ease(exit),
        "--outro": outro,
      };
      for (const [k, v] of Object.entries(vars)) section.style.setProperty(k, v.toFixed(4));

      // The locker is laid out at a fixed design width (390px on phones, a bit
      // wider on desktop, see --design-w); scale it to fit the phone.
      const screen = screenRef.current;
      if (screen) {
        const designW = parseFloat(getComputedStyle(screen).getPropertyValue("--design-w")) || 390;
        screen.style.setProperty("--screen-scale", (screen.clientWidth / designW).toFixed(4));
      }

      // Drive the real locker's own scroll container.
      const scr = screenRef.current?.querySelector<HTMLElement>(".scr");
      if (scr) {
        const max = scr.scrollHeight - scr.clientHeight;
        scr.scrollTop = max * ease(scroll);
        const anchor = scr.scrollTop + scr.clientHeight * 0.45;
        let next = 0;
        sectionSelectors.forEach((sel, i) => {
          const el = scr.querySelector<HTMLElement>(sel);
          if (el && el.offsetTop <= anchor) next = i;
        });
        if (next !== lastStage) {
          lastStage = next;
          setStage(next);
        }
      }
      if (moving) request();
    };

    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, []);

  return (
    <section className={styles.journey} id="locker" ref={sectionRef} aria-labelledby="journey-title">
      <div className={styles.journeyStage}>
        <div className={styles.journeyIntro}>
          <h2 className={styles.h2} id="journey-title">Your career is all over the internet.</h2>
          <p className={styles.lede}>
            Film on one app, stats on another, and the feature story on a site that might not be there next year.
          </p>
        </div>

        <div className={styles.iconField} aria-hidden="true">
          {icons.map(({ type, label, Icon, from, to, rot }) => (
            <div
              className={styles.iconFlight}
              key={type}
              style={{
                "--fx-d": from[0], "--fy-d": from[1], "--fx-m": from[2], "--fy-m": from[3],
                "--tx-d": to[0], "--ty-d": to[1], "--tx-m": to[2], "--ty-m": to[3],
                "--rot": `${rot}deg`,
              } as CSSProperties}
            >
              <div className={`${styles.iconTile} ${styles[`icon${type}`]}`}>
                <Icon strokeWidth={1.8} />
              </div>
              <div className={styles.iconLabel}>{label}</div>
            </div>
          ))}
        </div>

        <div className={styles.annotations} aria-live="polite">
          {stages.map((s, i) => (
            <div
              className={`${styles.annotation} ${i === stage ? styles.annotationActive : ""}`}
              key={s.title}
              aria-hidden={i !== stage}
            >
              <span className={styles.annotationIndex}>{i + 1} of {stages.length}</span>
              <h3 className={styles.h3}>{s.title}</h3>
              <p className={styles.lede}>{s.body}</p>
            </div>
          ))}
        </div>

        <div className={styles.progressRail} aria-hidden="true">
          {stages.map((s, i) => (
            <span data-active={i === stage} key={s.title} />
          ))}
        </div>

        <div className={styles.device}>
          <div
            className={styles.deviceScreen}
            ref={screenRef}
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest("a")) e.preventDefault();
            }}
          >
            <div className={styles.deviceCanvas}>
              <LockerView data={locker} presentation="embedded" />
            </div>
          </div>
        </div>

        {outro ? (
          <div className={styles.journeyOutro}>
            <h2 className={styles.h2}>Everything you built, finally together.</h2>
          </div>
        ) : null}
      </div>
    </section>
  );
}
