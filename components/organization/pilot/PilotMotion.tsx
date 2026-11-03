"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconX } from "@tabler/icons-react";
import { useOrganizationTheme, type OrganizationCanvas } from "../OrganizationTheme";

const EASE = [0.32, 0.72, 0, 1] as const;

/** The page's one orchestrated moment: the headline rises word by word. */
export function HeroTitle({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <h1 className="pilot-hero__title" aria-label={text}>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span className="pilot-hero__word" aria-hidden>
            <motion.span
              initial={reduce ? false : { y: "105%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.08 + index * 0.06 }}
            >
              {word}
            </motion.span>
          </span>
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h1>
  );
}

/** School logo, or a line-drawn stadium when there is none, fading into the corner. */
export function SchoolArt({ logoUrl }: { logoUrl: string | null }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="pilot-art"
      aria-hidden
      initial={reduce ? false : { opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- directory logos come from arbitrary HTTPS hosts
        <img src={logoUrl} alt="" className="pilot-art__logo" />
      ) : (
        <svg viewBox="0 0 640 420" className="pilot-art__stadium" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M40 330 C 140 250, 500 250, 600 330" />
          <path d="M70 360 C 170 285, 470 285, 570 360" />
          <path d="M20 300 C 130 205, 510 205, 620 300" />
          <path d="M60 300 L 60 390 M580 300 L 580 390 M20 300 L 20 395 M620 300 L 620 395" />
          <path d="M110 268 L 110 340 M530 268 L 530 340 M190 248 L 190 318 M450 248 L 450 318 M320 240 L 320 305" opacity="0.6" />
          <ellipse cx="320" cy="355" rx="190" ry="34" opacity="0.7" />
          <path d="M240 355 L 400 355 M320 330 L 320 380" opacity="0.5" />
          <path d="M120 70 L 120 230 M520 70 L 520 230" />
          <rect x="92" y="40" width="56" height="30" rx="4" />
          <rect x="492" y="40" width="56" height="30" rx="4" />
          <path d="M100 50 h40 M100 60 h40 M500 50 h40 M500 60 h40" opacity="0.6" />
          <path d="M148 55 L 300 300 M92 55 L 40 300 M492 55 L 340 300 M548 55 L 600 300" opacity="0.18" />
        </svg>
      )}
    </motion.div>
  );
}

/** Switch between the school-colored canvas and a white one. */
export function CanvasToggle() {
  const { canvas, setCanvas } = useOrganizationTheme();
  const options: Array<{ value: OrganizationCanvas; label: string }> = [{ value: "school", label: "School" }, { value: "white", label: "White" }];
  return (
    <div className="pilot-canvas-toggle" role="radiogroup" aria-label="Page background">
      {options.map((option) => (
        <button key={option.value} type="button" role="radio" aria-checked={canvas === option.value} onClick={() => setCanvas(option.value)}>
          {canvas === option.value ? <motion.span layoutId="pilot-canvas-thumb" className="pilot-canvas-toggle__thumb" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
          <span className="pilot-canvas-toggle__swatch" data-swatch={option.value} />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

/** A notice the member can close for good; the choice is remembered in this browser. */
export function DismissibleNotice({ storageKey, label, children }: { storageKey: string; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let dismissed = false;
    try { dismissed = window.localStorage.getItem(storageKey) === "dismissed"; } catch { /* storage blocked: show it */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved choice exists only in the browser
    setOpen(!dismissed);
  }, [storageKey]);
  function close() {
    setOpen(false);
    try { window.localStorage.setItem(storageKey, "dismissed"); } catch { /* keep closed for this visit */ }
  }
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.aside
          className="pilot-notice"
          aria-label={label}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <div className="pilot-notice__inner">
            {children}
            <button type="button" className="pilot-notice__close" aria-label={`Dismiss ${label.toLowerCase()}`} onClick={close}><IconX stroke={1.5} aria-hidden /></button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

/** Lets new list items arrive and leave with a little weight instead of popping in. */
export function MotionItem({ children, className, as = "li" }: { children: ReactNode; className?: string; as?: "li" | "div" }) {
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag layout className={className} initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.45, ease: EASE }}>
      {children}
    </Tag>
  );
}

export { AnimatePresence };
