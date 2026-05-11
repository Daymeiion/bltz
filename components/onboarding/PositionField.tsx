"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Position selector with Offense / Defense tabs.
 *
 * 17 positions split into two tabs so the user only sees ~9-10
 * bubbles at a time instead of all 17 at once. Special teams
 * (K / P / LS) live under Offense by convention — the kicking
 * unit is positioned by the offensive coordinator and shares the
 * line of scrimmage with the offense on most plays.
 *
 * The tab defaults to whichever side the currently-selected
 * position belongs to. Switching tabs preserves the selection
 * (state lives on the parent form, not in the tab) — switching
 * back and forth doesn't lose what the athlete picked.
 *
 * Bubble visual + hover-raise animation kept from the previous
 * flat-grid revision.
 */

const OFFENSE_POSITIONS: string[] = [
  // Backfield + line
  "QB",
  "RB",
  "FB",
  "C",
  "T",
  "G",
  // Special teams (kicking unit lines up with offense)
  "K",
  "P",
  "LS",
  // Generic catch-all for multi-position athletes
  "ATH",
];

const DEFENSE_POSITIONS: string[] = [
  // Line
  "DT",
  "DE",
  // Linebackers
  "MLB",
  "OLB",
  // Secondary
  "CB",
  "SS",
  "FS",
];

type Tab = "offense" | "defense";

function tabForPosition(code: string): Tab {
  return DEFENSE_POSITIONS.includes(code) ? "defense" : "offense";
}

interface Props {
  value: string;
  onChange: (code: string) => void;
}

export function PositionField({ value, onChange }: Props) {
  // Default the active tab to the side the current value sits on.
  // If the athlete revisits the form (or claim flow pre-fills the
  // position), the right bubble is already visible.
  const [tab, setTab] = React.useState<Tab>(() =>
    value ? tabForPosition(value) : "offense",
  );

  // Keep the tab in sync when the parent value changes externally
  // (e.g. a claim-link flow setting the position after mount).
  React.useEffect(() => {
    if (value) setTab(tabForPosition(value));
  }, [value]);

  const positions = tab === "offense" ? OFFENSE_POSITIONS : DEFENSE_POSITIONS;

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div
        role="tablist"
        aria-label="Position group"
        className="grid grid-cols-2 overflow-hidden rounded-md border border-white/12 bg-white/[0.02]"
      >
        <TabButton label="Offense" active={tab === "offense"} onClick={() => setTab("offense")} />
        <TabButton label="Defense" active={tab === "defense"} onClick={() => setTab("defense")} />
      </div>

      {/* Bubble grid for the active side */}
      <div
        role="tabpanel"
        aria-label={`${tab} positions`}
        // Responsive column count: 4 phones / 5 tablet / 6 desktop.
        // With 7-10 positions per tab the grid stays full but never
        // overflows to a third row at any width.
        className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 md:gap-3"
      >
        {positions.map((code) => {
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
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative px-4 py-2.5 font-oswald text-sm font-bold uppercase tracking-wider transition-colors duration-200",
        active ? "text-white" : "text-white/45 hover:text-white/75",
      )}
    >
      {label}
      {/* Underline indicator — gold for active, transparent otherwise.
          Always rendered so the transition runs both ways smoothly. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-all duration-200",
          active ? "bg-bltz-gold shadow-[0_0_8px_rgba(245,166,35,0.6)]" : "bg-transparent",
        )}
      />
    </button>
  );
}
