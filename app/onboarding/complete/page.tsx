import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { BroadcastPanel, SourceChip } from "@/components/onboarding/BroadcastShell";

export default async function OnboardingCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  if (!slug) redirect("/dashboard");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <StepIndicator current={4} />

      {/* Header matches the other onboarding steps: centered oswald
          title with an animate-in fade, a one-line mono subline, and
          NO eyebrow / NO paragraph. */}
      <header className="space-y-3 text-center">
        <h1 className="font-oswald text-4xl font-bold uppercase leading-[1.05] text-white animate-in fade-in-0 slide-in-from-bottom-1 duration-300 md:text-5xl">
          Locker setup complete
        </h1>
        <p className="mx-auto max-w-xl font-mono text-xs uppercase tracking-[0.18em] text-white/55 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 delay-100 fill-mode-backwards">
          Your locker is live. Share it or keep editing from the dashboard.
        </p>
      </header>

      <BroadcastPanel className="overflow-hidden p-5 md:p-6">
        <div className="mx-auto max-w-2xl border border-white/10 bg-black/32 p-5">
          <div className="flex items-center justify-between gap-3">
            <SourceChip tone="success">Complete</SourceChip>
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-white/40">
              /player/{slug}
            </span>
          </div>
          <div className="mt-8 grid place-items-center py-12 text-center">
            <div className="relative">
              <span className="absolute inset-0 animate-ping border border-emerald-300/30" />
              <span className="relative flex h-20 w-20 items-center justify-center border border-emerald-300/45 bg-emerald-400/10 text-emerald-200">
                <CheckCircle2 className="h-10 w-10" />
              </span>
            </div>
            <h2 className="mt-6 font-oswald text-5xl font-bold uppercase text-[#F5A623]">
              {slug.replace(/-/g, " ")}
            </h2>
            <p className="mt-3 font-mono text-sm uppercase tracking-[0.16em] text-white/50">
              Locker ready
            </p>
          </div>
        </div>
      </BroadcastPanel>

      {/* CTA pair. Primary = gold pill matching every other onboarding
          step (caps, text-black, hover-raise). Secondary = ghost
          outline, also all-caps for typographic consistency. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`/player/${encodeURIComponent(slug)}`}
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-bltz-gold px-6 text-base font-bold uppercase tracking-wide text-black shadow-[0_8px_24px_rgba(245,166,35,0.25)] transition-all duration-200 hover:-translate-y-1 hover:bg-bltz-gold/90 hover:shadow-[0_12px_32px_rgba(245,166,35,0.35)]"
        >
          Go to my locker
        </Link>
        <Link
          href={`/dashboard?welcome=1&slug=${encodeURIComponent(slug)}`}
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/20 px-6 text-base font-bold uppercase tracking-wide text-white/78 transition-colors hover:border-white/40 hover:text-white"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
