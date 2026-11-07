"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { storyPhotos } from "./assets";
import styles from "./redesign.module.css";

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Scroll progress of an element through the viewport, written to a ref + callback. */
function useScrollProgress<T extends HTMLElement>(
  onProgress: (p: number, el: T) => void,
  mode: "pinned" | "through" = "pinned",
) {
  const ref = useRef<T>(null);
  const cb = useRef(onProgress);
  useEffect(() => {
    cb.current = onProgress;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = mode === "pinned"
        ? clamp01(-r.top / Math.max(el.offsetHeight - vh, 1))
        : clamp01((vh - r.top) / (vh + r.height * 0.4));
      cb.current(p, el);
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
  }, [mode]);
  return ref;
}

const chapters = [
  { year: "2016", title: "Friday nights", body: "The high school film that only lives on an old hard drive.", photo: storyPhotos.broadcast },
  { year: "2019", title: "Saturdays", body: "Every college season, organized game by game.", photo: storyPhotos.college },
  { year: "2021", title: "The trophy", body: "Awards with the photo, the date and the story behind them.", photo: storyPhotos.trophy },
  { year: "2022", title: "Draft day", body: "The card, the call and the first jersey with your name on it.", photo: storyPhotos.rookieCard },
  { year: "2024", title: "Sundays", body: "Pro highlights and press, connected the day they happen.", photo: storyPhotos.pro },
  { year: "2026", title: "What's next", body: "Training, coaching, business. Your locker keeps going.", photo: storyPhotos.training },
];

/** A pinned section that scrolls a row of career chapters sideways. */
export function CareerChapters() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const sectionRef = useScrollProgress<HTMLElement>((p, el) => {
    const track = trackRef.current;
    if (!track) return;
    const distance = Math.max(track.scrollWidth - window.innerWidth, 0);
    track.style.transform = `translate3d(${-distance * p}px, 0, 0)`;
    el.style.setProperty("--chapters-p", p.toFixed(4));
    const next = Math.min(chapters.length - 1, Math.round(p * (chapters.length - 1)));
    setActive((prev) => (prev === next ? prev : next));
  });

  return (
    <section className={styles.chapters} ref={sectionRef} aria-labelledby="chapters-title">
      <div className={styles.chaptersStage}>
        <div className={styles.sectionHead} style={{ marginBottom: 0 }}>
          <h2 className={styles.h2} id="chapters-title">Every chapter, kept in one place.</h2>
          <p className={styles.lede}>Your locker holds the whole career, from the first varsity snap to whatever comes after the last one.</p>
        </div>
        <div className={styles.chaptersTrack} ref={trackRef}>
          {chapters.map((c, i) => (
            <article className={styles.chapter} data-active={i === active} key={c.title}>
              <div className={styles.chapterPhoto}>
                <Image src={c.photo.src} alt="" fill sizes="(min-width: 900px) 520px, 80vw" style={{ objectPosition: c.photo.position }} />
              </div>
              <div className={styles.chapterCopy}>
                <span className={styles.num}>{c.year}</span>
                <h3 className={styles.h3}>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.timeline} aria-hidden="true">
          <div className={styles.timelineFill} />
          {chapters.map((c, i) => (
            <span className={`${styles.num} ${i <= active ? styles.timelineOn : ""}`} key={c.year}>{c.year}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** A play diagram whose routes draw in as the section scrolls into view. */
export function PlayDiagram() {
  const ref = useScrollProgress<HTMLDivElement>((p, el) => {
    el.style.setProperty("--draw", clamp01((p - 0.15) / 0.55).toFixed(4));
  }, "through");

  return (
    <div className={styles.playDiagram} ref={ref} aria-hidden="true">
      <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="rd-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
          </marker>
        </defs>
        {/* line of scrimmage */}
        <line x1="40" y1="170" x2="1160" y2="170" className={styles.scrimmage} />
        {/* defenders */}
        {[[320, 70], [520, 110], [760, 60], [930, 120], [430, 40]].map(([x, y]) => (
          <g key={`${x}-${y}`} className={styles.defender} transform={`translate(${x} ${y})`}>
            <line x1="-10" y1="-10" x2="10" y2="10" />
            <line x1="10" y1="-10" x2="-10" y2="10" />
          </g>
        ))}
        {/* routes */}
        <path className={styles.route} pathLength={1} d="M200 170 C 220 90, 330 60, 470 92 S 560 180, 600 170" markerEnd="url(#rd-arrow)" />
        <path className={styles.route} data-second pathLength={1} d="M600 170 C 640 80, 760 150, 840 90 S 960 70, 1000 170" markerEnd="url(#rd-arrow)" />
        {/* the three steps as players */}
        {[200, 600, 1000].map((x, i) => (
          <g key={x} transform={`translate(${x} 170)`}>
            <circle r="26" className={styles.player} />
            <text className={styles.playerNum} textAnchor="middle" dominantBaseline="central">{String(i + 1).padStart(2, "0")}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const wallRows = [
  [storyPhotos.college, storyPhotos.trophy, storyPhotos.broadcast, storyPhotos.pro, storyPhotos.headshot, storyPhotos.training],
  [storyPhotos.rookieCard, storyPhotos.action, storyPhotos.broadcast2, storyPhotos.autograph, storyPhotos.helmet, storyPhotos.program],
];

/** Two rows of media drifting in opposite directions. */
export function PhotoWall() {
  return (
    <div className={styles.photoWall} aria-hidden="true">
      {wallRows.map((row, r) => (
        <div className={styles.photoRow} data-reverse={r === 1} key={r}>
          {[0, 1].map((copy) => (
            <div className={styles.photoTrack} key={copy}>
              {row.map((ph, i) => (
                <div className={styles.photoTile} key={`${copy}-${i}`}>
                  <Image src={ph.src} alt="" fill sizes="320px" style={{ objectPosition: ph.position }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
