import { Check, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Claimed",
  "Draft reviewed",
  "Identity verified",
  "Ready to publish",
];

export function VerificationRail({
  requiresVerification,
  verified = false,
  reviewed = false,
}: {
  requiresVerification: boolean;
  verified?: boolean;
  reviewed?: boolean;
}) {
  const activeIndex = requiresVerification ? (verified ? 3 : reviewed ? 1 : 0) : 3;

  return (
    <div className="border border-white/10 bg-[#14182B]/72 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#F5A623]/35 text-[#F5A623]">
          {requiresVerification ? <Lock className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        </span>
        <div>
          <p className="font-oswald text-lg font-bold uppercase text-white">
            {requiresVerification ? "Verification required" : "Ready to publish"}
          </p>
          <p className="text-sm leading-6 text-white/58">
            {requiresVerification
              ? "Claimed lockers stay private until a third-party identity check succeeds."
              : "Self-serve drafts can publish through the current locker handoff."}
          </p>
        </div>
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-4">
        {STEPS.map((step, index) => {
          const complete = index <= activeIndex;
          const blocked = requiresVerification && index >= 2 && !verified;
          return (
            <li
              key={step}
              className={cn(
                "min-h-16 border p-3",
                complete
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                  : blocked
                    ? "border-white/10 bg-black/22 text-white/42"
                    : "border-white/10 bg-black/22 text-white/64",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center border text-[10px]",
                    complete ? "border-emerald-300/40" : "border-white/16",
                  )}
                >
                  {complete ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                  {step}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
