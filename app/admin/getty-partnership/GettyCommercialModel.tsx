"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, Building2, Camera, CircleDollarSign, ShieldCheck, Users } from "lucide-react";

const money = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
}).format(value);

function Range({ label, value, min, max, step = 1, suffix = "", onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  suffix?: string; onChange: (value: number) => void;
}) {
  return <label className="block space-y-2">
    <span className="flex items-center justify-between gap-3 text-sm text-zinc-300">
      <span>{label}</span><strong className="tabular-nums text-white">{value.toLocaleString()}{suffix}</strong>
    </span>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full cursor-pointer accent-[#ffbb00]" />
  </label>;
}

function Stat({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return <div className={`rounded-xl border p-4 ${emphasized ? "border-[#ffbb00]/50 bg-[#ffbb00]/10" : "border-white/10 bg-[#101720]"}`}>
    <p className="text-xs text-zinc-400">{label}</p>
    <p className={`mt-2 text-2xl font-bold tabular-nums ${emphasized ? "text-[#ffbb00]" : "text-white"}`}>{value}</p>
  </div>;
}

function Path({ title, subtitle, highlighted, steps }: { title: string; subtitle: string; highlighted?: boolean; steps: string[] }) {
  return <section className={`rounded-2xl border p-5 sm:p-7 ${highlighted ? "border-[#ffbb00]/60 bg-[#ffbb00]/[0.06]" : "border-white/15 bg-[#141b25]"}`}>
    <div className="mb-5 flex items-center justify-between gap-3">
      <div><h3 className="text-xl font-bold text-white">{title}</h3><p className="mt-1 text-xs text-zinc-400">{subtitle}</p></div>
      {highlighted ? <Users className="shrink-0 text-[#ffbb00]" aria-hidden="true" /> : <Building2 className="shrink-0 text-sky-300" aria-hidden="true" />}
    </div>
    <ol className="space-y-2">
      {steps.map((step, index) => <li key={step} className="flex flex-col items-center">
        <div className="w-full rounded-lg border border-white/10 bg-[#222c39] px-4 py-3 text-center text-sm font-semibold text-zinc-100">{step}</div>
        {index !== steps.length - 1 && <ArrowDown aria-hidden="true" size={18} className="my-1 text-[#ffbb00]" />}
      </li>)}
    </ol>
  </section>;
}

export default function GettyCommercialModel() {
  const [orders, setOrders] = useState(100);
  const [printPrice, setPrintPrice] = useState(80);
  const [fulfillment, setFulfillment] = useState(30);
  const [qualifiedRequests, setQualifiedRequests] = useState(20);
  const [conversionRate, setConversionRate] = useState(15);
  const [licenseQuote, setLicenseQuote] = useState(250);

  const grossPrintSales = orders * printPrice;
  const printProduction = orders * fulfillment;
  const preRightsRemainder = grossPrintSales - printProduction;
  const estimatedLicenses = qualifiedRequests * conversionRate / 100;
  const estimatedLicenseRevenue = estimatedLicenses * licenseQuote;
  const printCostPct = grossPrintSales ? Math.min(100, printProduction / grossPrintSales * 100) : 0;

  return <main className="min-h-screen bg-[#090b10] px-4 py-8 text-white sm:px-8 lg:px-12">
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-[#ffbb00]">BLTZ × Getty Images / Commercial discussion</p>
        <h1 className="text-3xl font-black uppercase tracking-tight sm:text-5xl">Two discovery paths. <span className="text-[#ffbb00]">One licensing partner.</span></h1>
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-300 sm:text-base">An athlete-led channel could complement Getty’s existing professional buyer model. The examples below explore demand and transaction economics—not agreed Getty pricing or a revenue forecast.</p>
      </header>

      <section aria-labelledby="paths-heading" className="space-y-4">
        <h2 id="paths-heading" className="text-xs font-bold uppercase tracking-[.17em] text-zinc-400">01 / Discovery comparison</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Path title="Buyer-led discovery" subtitle="Getty’s existing licensing channel" steps={["Publisher or producer needs imagery", "Searches or accesses Getty collection", "Getty supplies an approved license"]} />
          <Path title="Athlete-led discovery" subtitle="Proposed complementary BLTZ channel" highlighted steps={["Athlete shares a verified career moment", "Fan, brand, or producer discovers imagery", "Getty handles an approved purchase or license"]} />
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#ffbb00]/30 bg-[#1a1d20] p-4 text-sm">
          <Camera className="text-[#ffbb00]" size={20} aria-hidden="true" />
          <p className="flex-1 text-zinc-200">Getty imagery + licensing expertise <ArrowRight size={14} className="mx-1 inline text-[#ffbb00]" aria-hidden="true" /> BLTZ athlete identity + distribution signals <ArrowRight size={14} className="mx-1 inline text-[#ffbb00]" aria-hidden="true" /> qualified demand, attribution, and measurable commercial outcomes</p>
        </div>
      </section>

      <section aria-labelledby="scenarios-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="scenarios-heading" className="text-xs font-bold uppercase tracking-[.17em] text-zinc-400">02 / Adjustable commercial scenarios</h2>
          <span className="rounded border border-[#ffbb00]/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#ffbb00]">Illustrative inputs only</span>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <section aria-labelledby="print-heading" className="space-y-5 rounded-2xl border border-white/15 bg-[#151b24] p-5 sm:p-7">
            <div><h3 id="print-heading" className="text-2xl font-bold">A / Licensed print orders</h3><p className="mt-2 text-sm text-zinc-400">An approved fan print offer through an authorized seller, where eligible.</p></div>
            <Range label="Print orders" value={orders} min={10} max={1000} step={10} onChange={setOrders} />
            <Range label="Retail price per print ($)" value={printPrice} min={30} max={200} step={5} onChange={setPrintPrice} />
            <Range label="Production + fulfillment per print ($)" value={fulfillment} min={10} max={75} step={5} onChange={setFulfillment} />
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Gross merchandise sales" value={money(grossPrintSales)} />
              <Stat label="Before rights + other costs" value={money(preRightsRemainder)} emphasized />
            </div>
            <div aria-label="Print gross sales allocated between production cost and remainder before other costs" className="space-y-2">
              <div className="flex h-4 overflow-hidden rounded-full bg-[#303945]">
                <div className="bg-sky-400" style={{ width: `${printCostPct}%` }} />
                <div className="bg-[#ffbb00]" style={{ width: `${100 - printCostPct}%` }} />
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-xs text-zinc-400"><span>■ Production + fulfillment: {money(printProduction)}</span><span className="text-[#ffbb00]">■ Pre-rights remainder</span></div>
            </div>
            <p className="border-t border-white/10 pt-4 text-xs leading-relaxed text-zinc-400">The remainder is <strong className="text-zinc-200">not Getty revenue or profit</strong>. It must also cover image licensing, contributor payments, any contracted athlete/BLTZ participation, clearances, taxes, transaction fees, returns, and operating margin. Editorial imagery may not qualify for consumer prints.</p>
          </section>

          <section aria-labelledby="license-heading" className="space-y-5 rounded-2xl border border-white/15 bg-[#151b24] p-5 sm:p-7">
            <div><h3 id="license-heading" className="text-2xl font-bold">B / Producer licensing requests</h3><p className="mt-2 text-sm text-zinc-400">A producer discovers an athlete’s career image and requests a use-specific Getty quote.</p></div>
            <Range label="Qualified buyer requests" value={qualifiedRequests} min={0} max={100} step={5} onChange={setQualifiedRequests} />
            <Range label="Illustrative close rate" value={conversionRate} min={0} max={100} step={5} suffix="%" onChange={setConversionRate} />
            <Range label="Illustrative average license quote ($)" value={licenseQuote} min={50} max={1500} step={50} onChange={setLicenseQuote} />
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Expected paid licenses" value={estimatedLicenses.toLocaleString("en-US", { maximumFractionDigits: 1 })} />
              <Stat label="Modeled gross license receipts" value={money(estimatedLicenseRevenue)} emphasized />
            </div>
            <div className="space-y-2" aria-label="Share of qualified licensing requests modeled to convert">
              <div className="flex h-4 overflow-hidden rounded-full bg-[#303945]"><div className="bg-[#ffbb00]" style={{ width: `${conversionRate}%` }} /></div>
              <div className="flex justify-between text-xs text-zinc-400"><span>Modeled conversion</span><span>{conversionRate}%</span></div>
            </div>
            <p className="border-t border-white/10 pt-4 text-xs leading-relaxed text-zinc-400">Actual license price varies by image and intended use. This models gross receipts—not net margin, verified demand, or contractual distributions. Getty must quote and approve every applicable use.</p>
          </section>
        </div>
      </section>

      <footer className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#101720] p-5 text-sm text-zinc-300">
        <ShieldCheck size={22} className="shrink-0 text-[#ffbb00]" aria-hidden="true" />
        <div><p className="font-bold text-white">What a pilot would actually test</p>
          <p className="mt-1">Approved imagery → attributable discovery → qualified requests or orders → paid transactions → incremental contribution after servicing and rights costs. No image use, print offer, referral fee, royalty, or player share is assumed authorized.</p>
        </div>
        <CircleDollarSign className="hidden shrink-0 text-[#ffbb00] sm:block" aria-hidden="true" />
      </footer>
    </div>
  </main>;
}
