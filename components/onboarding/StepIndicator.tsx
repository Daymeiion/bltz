import { cn } from "@/lib/utils";

/**
 * Onboarding step indicator.
 *
 * Renders four equal-width progress segments with the step name below
 * each. Each segment fills as the user advances:
 *
 *   ━━━━━━━ ─ ─ ─ ─ ─   ─ ─ ─   ─ ─ ─
 *   01 Suit up   02 Sweep   03 Sign off   04 Go live
 *
 * Segment color reflects state: brand blue for current/completed,
 * dimmed white for upcoming. The label below mirrors the same gradient
 * so the user's eye lands on the active step.
 *
 * Voice: athletic, action-first. The earlier labels ("Verify" / "Found
 * data" / "Review" / "Complete") were accurate but flat; these read
 * on-brand for BLTZ (locker, claim, broadcast vocabulary).
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
      className="mx-auto mb-10 w-full max-w-3xl px-1"
    >
      <ol className="grid grid-cols-4 gap-2 sm:gap-3">
        {STEPS.map((s) => {
          const completed = s.n < current;
          const active = s.n === current;
          const upcoming = s.n > current;
          return (
            <li
              key={s.n}
              className="flex flex-col items-stretch gap-2"
              aria-current={active ? "step" : undefined}
            >
              {/* The bar segment */}
              <span
                aria-hidden
                className={cn(
                  "h-1 w-full rounded-full transition-colors duration-300",
                  active && "bg-[#2952FF] shadow-[0_0_12px_rgba(41,82,255,0.55)]",
                  completed && "bg-[#2952FF]/70",
                  upcoming && "bg-white/12",
                )}
              />
              {/* Label row: small step number + name */}
              <div
                className={cn(
                  "flex items-baseline gap-1.5 transition-colors duration-300",
                  active && "text-white",
                  completed && "text-white/65",
                  upcoming && "text-white/30",
                )}
              >
                <span className="font-mono text-[10px] tabular-nums tracking-[0.18em]">
                  {String(s.n).padStart(2, "0")}
                </span>
                <span className="truncate font-oswald text-xs font-semibold uppercase tracking-wider">
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
