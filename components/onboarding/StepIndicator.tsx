import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Verify" },
  { n: 2, label: "Found data" },
  { n: 3, label: "Review" },
  { n: 4, label: "Complete" },
];

export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="mb-8 flex flex-wrap items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.16em]">
      {STEPS.map((s, i) => (
        <li key={s.n} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center border text-[11px] font-bold",
                s.n <= current
                  ? "border-[#2952FF] bg-[#2952FF] text-white"
                  : "border-white/20 bg-transparent text-white/50",
              )}
            >
              {s.n}
            </span>
            <span
              className={cn(
                s.n === current ? "text-white" : "text-white/40",
              )}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 ? (
            <span className="h-px w-8 bg-white/20" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
