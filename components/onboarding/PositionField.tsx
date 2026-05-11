"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Position selector — circular bubbles in a responsive grid.
 *
 * Replaces the original flat 4×3 grid of square buttons with rounded
 * position dots. Hover raises each dot by 4px with a deeper shadow,
 * the same "lift off" feel we'd use anywhere else in the broadcast UI.
 * Active state mirrors the gold-fill pattern used by the rest of the
 * identity form (level buttons, primary CTA).
 *
 * The position list covers the standard set used by football
 * roster systems: offensive line (C/T/G), backs (QB/RB/FB), defensive
 * line (DT/DE), linebackers (MLB/OLB), secondary (CB/SS/FS), special
 * teams (K/P/LS), plus a generic ATH fallback for multi-position
 * athletes.
 */

const POSITIONS: string[] = [
  // Offense
  "QB",
  "RB",
  "FB",
  "C",
  "T",
  "G",
  // Defense
  "DT",
  "DE",
  "MLB",
  "OLB",
  "CB",
  "SS",
  "FS",
  // Special teams
  "K",
  "P",
  "LS",
  // Generic
  "ATH",
];

interface Props {
  value: string;
  onChange: (code: string) => void;
}

export function PositionField({ value, onChange }: Props) {
  return (
    <div
      // Responsive flat grid. 4 cols on phones, 6 on tablet, 9 on
      // desktop — fits 17 positions cleanly without too many empty
      // cells at any breakpoint.
      className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-9 md:gap-3"
    >
      {POSITIONS.map((code) => {
        const active = value === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-pressed={active}
            className={cn(
              "flex h-12 w-full items-center justify-center rounded-full border-2 font-mono text-xs font-bold uppercase",
              "transition-all duration-200 ease-out",
              active
                ? "-translate-y-0.5 border-bltz-gold bg-bltz-gold text-black shadow-[0_8px_22px_rgba(245,166,35,0.5),0_0_0_4px_rgba(245,166,35,0.12)]"
                : "border-white/20 bg-white/[0.04] text-white/85 shadow-[0_3px_8px_rgba(0,0,0,0.4)] hover:-translate-y-1 hover:border-white/60 hover:bg-white/[0.08] hover:shadow-[0_10px_22px_rgba(0,0,0,0.55)]",
            )}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
