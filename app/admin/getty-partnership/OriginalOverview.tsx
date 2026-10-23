import Image from "next/image";
import {
  ArrowDown, ArrowDownRight, ArrowDownLeft, ArrowUpRight,
  Building2, Camera, ChartNoAxesCombined, CircleDollarSign,
  Gem, Megaphone, Newspaper, Printer, Shirt, UsersRound,
  UserRound, BookOpenText, BadgeCheck,
} from "lucide-react";

const athleteChannels = [
  { icon: Camera, label: "Image licensing" },
  { icon: Gem, label: "Collectibles" },
  { icon: Printer, label: "Print-on-demand" },
  { icon: Shirt, label: "Merchandise" },
  { icon: UsersRound, label: "Deeper fan connection" },
];

const organizationChannels = [
  { icon: Newspaper, label: "Media publishing" },
  { icon: BookOpenText, label: "Content & editorial" },
  { icon: Megaphone, label: "Brand activations" },
  { icon: Building2, label: "Year-round sponsorship value" },
];

export default function OriginalOverview() {
  return (
    <div className="min-h-screen bg-[#090b10] px-4 py-7 text-white sm:px-8 lg:px-12 lg:py-9">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.26em] text-[#ffbb00]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffbb00]" />
              Partnership opportunity / Concept
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl lg:text-5xl">From media assets <span className="text-[#ffbb00]">to commercial value.</span></h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400 sm:text-base">Make existing content work harder—across channels, audiences, and an athlete’s lifetime.</p>
          </div>
          <div className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Getty × BLTZ</div>
        </div>

        <section aria-label="Getty and BLTZ partnership distribution workflow" className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#10141c] p-4 shadow-[0_24px_90px_rgba(0,0,0,.35)] sm:p-7 lg:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-44 h-96 w-96 rounded-full bg-[#ffbb00]/[0.06] blur-3xl" />
          <div className="relative mx-auto max-w-3xl rounded-2xl border border-white/15 bg-white px-6 py-5 text-center shadow-lg sm:px-10">
            <div className="flex items-center justify-center gap-4">
              <Image src="/images/getty-images-logo.svg" alt="Getty Images" width={207} height={38} className="h-9 w-auto max-w-full" />
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Authentic visual content · Licensing · Rights management</div>
          </div>

          <div className="flex h-12 items-center justify-center text-[#ffbb00]" aria-hidden="true"><ArrowDown className="h-7 w-7" strokeWidth={1.5} /></div>

          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#ffbb00]/60 bg-gradient-to-br from-[#26200f] via-[#191b20] to-[#14181e] px-6 py-6 text-center shadow-[0_0_45px_rgba(255,187,0,.11)] sm:px-10">
            <div className="flex items-center justify-center gap-4">
              <Image src="/bltz-white-logo.svg" alt="BLTZ" width={155} height={54} className="h-12 w-auto max-w-[150px] object-contain" />
              <span className="hidden h-9 w-px bg-white/20 sm:block" />
              <span className="hidden text-left text-xs font-bold uppercase tracking-[0.19em] text-[#ffbb00] sm:block">The connection<br />layer</span>
            </div>
            <p className="mt-3 text-sm font-medium text-white">Athlete identity <span className="mx-1 text-[#ffbb00]">·</span> Media intelligence <span className="mx-1 text-[#ffbb00]">·</span> Attribution</p>
            <p className="mt-1 text-xs text-zinc-400">Connecting media assets to athletes, moments, and audiences</p>
          </div>

          <div className="flex h-12 items-center justify-center text-[#ffbb00] xl:hidden" aria-hidden="true"><ArrowDown className="h-7 w-7" strokeWidth={1.5} /></div>
          <div className="hidden h-14 grid-cols-2 items-center text-[#ffbb00] xl:grid" aria-hidden="true">
            <div className="flex justify-center"><ArrowDownLeft className="h-7 w-7 lg:h-8 lg:w-8" strokeWidth={1.4}/></div>
            <div className="flex justify-center"><ArrowDownRight className="h-7 w-7 lg:h-8 lg:w-8" strokeWidth={1.4}/></div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
            <div className="rounded-2xl border border-white/10 bg-[#1a2029] p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3"><div className="rounded-xl bg-[#ffbb00]/10 p-2.5 text-[#ffbb00]"><UserRound className="h-6 w-6" /></div><div><h2 className="text-lg font-bold">Athlete distribution</h2><p className="text-xs text-zinc-400">Lifetime Player Lockers</p></div></div>
                <span className="rounded-full bg-[#ffbb00]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#ffbb00]">Player</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {athleteChannels.map(({ icon: Icon, label }) => <div key={label} className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.035] px-3 py-3 text-sm text-zinc-200"><Icon className="h-4 w-4 shrink-0 text-[#ffbb00]" strokeWidth={1.7} />{label}</div>)}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#1a2029] p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3"><div className="rounded-xl bg-sky-400/10 p-2.5 text-sky-300"><Building2 className="h-6 w-6" /></div><div><h2 className="text-lg font-bold">Enterprise distribution</h2><p className="text-xs text-zinc-400">Schools · Leagues · Organizations</p></div></div>
                <span className="rounded-full bg-sky-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">Organization</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {organizationChannels.map(({ icon: Icon, label }) => <div key={label} className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.035] px-3 py-3 text-sm text-zinc-200"><Icon className="h-4 w-4 shrink-0 text-sky-300" strokeWidth={1.7} />{label}</div>)}
              </div>
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#ffbb00]/25 bg-gradient-to-r from-[#2c2616] to-[#171c24] px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3"><ChartNoAxesCombined className="h-6 w-6 text-[#ffbb00]" /><div><h3 className="text-sm font-bold uppercase tracking-[0.12em] sm:text-base">Fan connection · Attribution · Commercial value</h3><p className="mt-1 text-xs text-zinc-400">Measure content discovery, usage, audience actions, and commercial outcomes</p></div></div>
            <div className="flex gap-2 text-[#ffbb00]"><BadgeCheck className="h-5 w-5" /><CircleDollarSign className="h-5 w-5" /><ArrowUpRight className="h-5 w-5" /></div>
          </div>
        </section>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-3 text-xs text-zinc-500">
          <p className="max-w-3xl">Proposed distribution model. Licensing, image use, merchandise, and collectibles depend on Getty approvals and applicable third-party rights.</p>
          <span className="font-semibold uppercase tracking-wider text-zinc-400">BLTZ × Getty Images · Discussion concept</span>
        </div>
      </div>
    </div>
  );
}
