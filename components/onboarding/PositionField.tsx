"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Position selector with Offense / Defense switch.
 *
 * Animated segmented-control switch at the top: a gold "thumb"
 * slides between Offense and Defense; the half it sits under
 * inverts to dark text on gold, the other half dims.
 *
 * Bubble grid flex-wraps and centers within the panel so any row
 * count looks balanced (10 positions on offense wrap to two rows
 * on phones, 7 on defense fit on one).
 *
 * Bubbles: fixed-width pill, monospace bold at text-base for the
 * "broadcast scoreboard / jersey patch" feel. Hover raises 4px
 * with a deeper shadow.
 */

const OFFENSE_POSITIONS: string[] = [
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
  "DT",
  "DE",
  "MLB",
  "OLB",
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
  const [tab, setTab] = React.useState<Tab>(() =>
    value ? tabForPosition(value) : "offense",
  );

  React.useEffect(() => {
    if (value) setTab(tabForPosition(value));
  }, [value]);

  const positions = tab === "offense" ? OFFENSE_POSITIONS : DEFENSE_POSITIONS;

  return (
    <div className="space-y-4">
      {/* Animated switch: two halves, gold "thumb" slides between
          them. The thumb is absolutely positioned and translates on
          tab change for the segmented-control feel. */}
      <div
        role="tablist"
        aria-label="Position group"
        className="relative mx-auto flex w-full max-w-xs rounded-full border border-white/15 bg-black/30 p-1"
      >
        {/* Sliding thumb. Always rendered; translateX flips when the
            active tab flips. Sits under the two buttons via z-index. */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-1 left-1 z-0 rounded-full bg-bltz-gold shadow-[0_4px_14px_rgba(245,166,35,0.55)]",
            "transition-transform duration-300 ease-out",
          )}
          style={{
            width: "calc(50% - 0.25rem)",
            transform: tab === "defense" ? "translateX(100%)" : "translateX(0)",
          }}
        />
        <SwitchButton
          label="Offense"
          active={tab === "offense"}
          onClick={() => setTab("offense")}
        />
        <SwitchButton
          label="Defense"
          active={tab === "defense"}
          onClick={() => setTab("defense")}
        />
      </div>

      {/* Bubble grid for the active side. Flex-wrap + justify-center
          so any number of bubbles balances visually inside the panel. */}
      <div
        role="tabpanel"
        aria-label={`${tab} positions`}
        className="flex flex-wrap justify-center gap-3"
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
                "flex h-14 w-[72px] items-center justify-center rounded-full border-2",
                "font-mono text-base font-bold uppercase tracking-tight",
                "transition-all duration-200 ease-out",
                active
                  ? "-translate-y-0.5 border-bltz-gold bg-bltz-gold text-black shadow-[0_8px_22px_rgba(245,166,35,0.55),0_0_0_4px_rgba(245,166,35,0.12)]"
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

function SwitchButton({
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
      // z-10 so the button text sits above the sliding thumb. Both
      // halves are width 1/2 so the layout is stable regardless of
      // which tab is active.
      className={cn(
        "relative z-10 flex-1 rounded-full px-4 py-2.5",
        "font-oswald text-sm font-bold uppercase tracking-wider",
        "transition-colors duration-200",
        active ? "text-black" : "text-white/55 hover:text-white/85",
      )}
    >
      {label}
    </button>
  );
}
