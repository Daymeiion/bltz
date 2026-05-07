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

      <header className="space-y-3 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">Locker setup</p>
        <h1 className="font-oswald text-4xl font-bold uppercase text-white md:text-5xl">
          Locker setup complete
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-7 text-white/65">
          Your locker is built. Head straight to the public locker or go to the dashboard
          to keep editing.
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

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`/player/${encodeURIComponent(slug)}`}
          className="inline-flex min-h-12 items-center justify-center rounded bg-[#2952FF] px-6 font-bold text-white hover:bg-[#1f43d8]"
        >
          Go to locker
        </Link>
        <Link
          href={`/dashboard?welcome=1&slug=${encodeURIComponent(slug)}`}
          className="inline-flex min-h-12 items-center justify-center rounded border border-white/20 px-6 font-bold text-white/78 hover:border-white/40"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
