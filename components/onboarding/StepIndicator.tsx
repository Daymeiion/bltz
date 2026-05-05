import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Identity" },
  { n: 2, label: "Career sweep" },
  { n: 3, label: "Review" },
];

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mb-10 flex items-center justify-center gap-3 text-xs uppercase tracking-widest font-oswald">
      {STEPS.map((s, i) => (
        <li key={s.n} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold",
                s.n <= current
                  ? "border-bltz-gold bg-bltz-gold text-black"
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
