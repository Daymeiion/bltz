"use client";

import { useEffect, useRef, useState } from "react";

/** Native scrolling keeps wheel, touch, scrollbar and keyboard navigation available. */
export function useFilmRowScroll() {
  const rowRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const period = useRef(0);
  const [looping, setLooping] = useState(false);
  const interaction = useRef({ hover: false, focus: false, pointer: false, modal: false, idleUntil: 0 });
  const expectedScroll = useRef(0);
  const [paused, setPaused] = useState(false);
  const pauseForInput = () => { interaction.current.idleUntil = performance.now() + 3000; };

  useEffect(() => {
    const row = rowRef.current;
    const group = groupRef.current;
    if (!row || !group) return;
    const measure = () => {
      const width = group.getBoundingClientRect().width;
      const overflows = width > row.clientWidth;
      period.current = overflows ? width + (parseFloat(getComputedStyle(row).columnGap) || 0) : 0;
      setLooping(overflows);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(group);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row || paused) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    let position = row.scrollLeft;
    const releasePointer = () => {
      if (interaction.current.pointer) {
        interaction.current.pointer = false;
        interaction.current.idleUntil = performance.now() + 3000;
      }
    };
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    const tick = (now: number) => {
      const elapsed = previous ? Math.min(now - previous, 64) : 0;
      previous = now;
      const state = interaction.current;
      const cycle = period.current;
      if (!reducedMotion.matches && !document.hidden && !state.hover && !state.focus && !state.pointer && !state.modal && now >= state.idleUntil && cycle > 0) {
        // Retain fractional progress even in browsers that round scrollLeft.
        if (Math.abs(row.scrollLeft - expectedScroll.current) > 1) position = row.scrollLeft;
        position += elapsed * 0.045;
        // Both sequences have identical geometry. Preserve the fractional
        // overshoot when switching to the equivalent point in the first copy.
        if (position >= cycle) position %= cycle;
        row.scrollLeft = position;
        expectedScroll.current = row.scrollLeft;
      } else {
        position = row.scrollLeft;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
    };
  }, [paused]);

  return {
    rowRef, groupRef, looping, paused, togglePaused: () => setPaused(current => !current),
    setModalOpen: (open: boolean) => { interaction.current.modal = open; },
    rowEvents: {
      onMouseEnter: () => { interaction.current.hover = true; },
      onMouseLeave: () => { interaction.current.hover = false; },
      onPointerDown: () => { interaction.current.pointer = true; pauseForInput(); },
      onPointerUp: () => { interaction.current.pointer = false; pauseForInput(); },
      onPointerCancel: () => { interaction.current.pointer = false; pauseForInput(); },
      onWheel: pauseForInput,
      onTouchMove: pauseForInput,
      onKeyDown: pauseForInput,
      onFocus: () => { interaction.current.focus = true; },
      onBlur: (event: React.FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) interaction.current.focus = false;
      },
      onScroll: () => {
        const row = rowRef.current;
        if (row && Math.abs(row.scrollLeft - expectedScroll.current) > 1) {
          expectedScroll.current = row.scrollLeft;
          pauseForInput();
        }
      },
    },
  };
}
