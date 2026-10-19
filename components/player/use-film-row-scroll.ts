"use client";

import { useEffect, useRef, useState } from "react";

/** Native scrolling keeps wheel, touch, scrollbar and keyboard navigation available. */
export function useFilmRowScroll() {
  const rowRef = useRef<HTMLDivElement>(null);
  const interaction = useRef({ hover: false, focus: false, pointer: false, modal: false, idleUntil: 0 });
  const expectedScroll = useRef(0);
  const [paused, setPaused] = useState(false);
  const pauseForInput = () => { interaction.current.idleUntil = performance.now() + 3000; };

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
      const max = row.scrollWidth - row.clientWidth;
      if (!reducedMotion.matches && !document.hidden && !state.hover && !state.focus && !state.pointer && !state.modal && now >= state.idleUntil && max > 0) {
        // Retain fractional progress even in browsers that round scrollLeft.
        if (Math.abs(row.scrollLeft - expectedScroll.current) > 1) position = row.scrollLeft;
        position += elapsed * 0.018;
        if (position >= max + 24) position = 0;
        row.scrollLeft = Math.min(position, max);
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
    rowRef, paused, togglePaused: () => setPaused(current => !current),
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
