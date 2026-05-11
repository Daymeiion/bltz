import { cn } from "@/lib/utils";

/**
 * Onboarding step indicator.
 *
 * Four equal-width progress segments with a label below each. Each
 * segment fills as the user advances; completed steps animate in a
 * check mark next to the label.
 *
 *   ━━━━━━━━━━━━━ ━━━━━━━━━━━━━ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
 *   ✓ Suit up    ✓ Career sweep   Sign off       Go live
 *
 * Color: brand gold (electric, on-brand accent). Active segment glows.
 * Voice on labels matches BLTZ broadcast vocabulary.
 */

const STEPS = [
  { n: 1, label: "Suit up" },
  { n: 2, label: "Career sweep" },
  { n: 3, label: "Sign off" },
  { n: 4, label: "Go live" },
] as const;

export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <nav
      aria-label="Onboarding progress"
      className="mx-auto mb-12 w-full max-w-3xl px-6 sm:px-10"
    >
      <ol className="grid grid-cols-4 gap-3 sm:gap-4">
        {STEPS.map((s) => {
          const completed = s.n < current;
          const active = s.n === current;
          const upcoming = s.n > current;
          return (
            <li
              key={s.n}
              className="flex flex-col items-stretch gap-3"
              aria-current={active ? "step" : undefined}
            >
              {/* The bar segment */}
              <span
                aria-hidden
                className={cn(
                  "h-2.5 w-full rounded-full transition-all duration-500 ease-out",
                  active && "bg-bltz-gold shadow-[0_0_18px_rgba(255,191,4,0.55)]",
                  completed && "bg-bltz-gold/85",
                  upcoming && "bg-white/12",
                )}
              />
              {/* Label row: animated check on completed steps, then name */}
              <div
                className={cn(
                  "flex items-center gap-2 transition-colors duration-300",
                  active && "text-white",
                  completed && "text-bltz-gold",
                  upcoming && "text-white/35",
                )}
              >
                {/* Check icon — always rendered so the scale-in transition
                    runs smoothly when state changes. Hidden visually
                    (scale 0, opacity 0) for active/upcoming steps. */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className={cn(
                    "h-3.5 w-3.5 flex-shrink-0 transition-all duration-300 ease-out",
                    completed
                      ? "scale-100 opacity-100"
                      : "scale-0 opacity-0",
                  )}
                  style={{ transformOrigin: "center" }}
                >
                  <path
                    d="M4 10.5 L8.2 14.5 L16 6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="truncate font-oswald text-sm font-semibold uppercase tracking-wider">
                  {s.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
