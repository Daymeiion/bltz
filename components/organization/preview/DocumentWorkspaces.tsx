"use client";

import { useMemo, useState } from "react";
import {
  IconCalendar,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDownload,
  IconDots,
  IconFileDescription,
  IconFileInvoice,
  IconFilter,
  IconLock,
  IconSearch,
  IconSend,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useReferencePageTone } from "../OrganizationTheme";
import {
  FolderSurface,
  FolderTabs,
  PreviewBadge,
  PreviewLink,
  PreviewModal,
  PreviewNotice,
  WorkspaceHeader,
  previewButton,
} from "./PreviewPrimitives";

const invoiceTabs = ["Agreements", "Invoices", "Payments", "Documents"] as const;
const invoices = [
  { id: "INV-2026-012", athlete: "Maya Johnson", partner: "Gatorade", agreement: "Brand ambassador agreement", amount: "$250,000.00", due: "May 15, 2026", state: "Sent" },
  { id: "INV-2026-011", athlete: "Jalen Brooks", partner: "Nike, Inc.", agreement: "Endorsement agreement", amount: "$125,000.00", due: "May 10, 2026", state: "Paid" },
  { id: "INV-2026-010", athlete: "Ryan Patel", partner: "Adidas", agreement: "Endorsement agreement", amount: "$175,000.00", due: "May 20, 2026", state: "Overdue" },
  { id: "INV-2026-009", athlete: "Avery Stokes", partner: "Fanatics", agreement: "Social media agreement", amount: "$60,000.00", due: "May 25, 2026", state: "Draft" },
  { id: "INV-2026-008", athlete: "Liam Carter", partner: "Beats by Dre", agreement: "Audio campaign agreement", amount: "$45,000.00", due: "May 30, 2026", state: "Draft" },
];
type InvoiceRecord = (typeof invoices)[number];

const reports = [
  { name: "Digital presence summary", detail: "Verified sources, scoring context, and recommendations.", scope: "Organization", last: "Not generated" },
  { name: "Media coverage and gaps", detail: "Coverage by athlete, team, event, and media type.", scope: "Organization", last: "May 15, 2026" },
  { name: "Attribution performance", detail: "Measured value by content, athlete, and partner.", scope: "Organization", last: "May 14, 2026" },
  { name: "Rights readiness", detail: "Clearance status, restrictions, and activation readiness.", scope: "Organization", last: "May 13, 2026" },
  { name: "Athlete portfolio", detail: "Profiles, reach, content, and performance context.", scope: "All players", last: "May 12, 2026" },
];
const reportSectionOptions = ["Executive summary", "Performance overview", "By content", "By player", "By partner", "Methodology & definitions", "Data quality notes"];

function statusTone(state: string): "blue" | "green" | "red" | "neutral" {
  if (state === "Paid") return "green";
  if (state === "Overdue") return "red";
  if (state === "Sent") return "blue";
  return "neutral";
}

function PdfCover({ kind, reference }: { kind: string; reference: string }) {
  return (
    <div className="relative aspect-[3/4] w-full max-w-52 overflow-hidden rounded-[18px] border border-white/15 bg-[#071a35] p-5 shadow-2xl">
      <p className="text-2xl font-black italic text-[#ffbb00]">BLTZ</p>
      <div className="mt-10 h-px bg-white/20" />
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-white">{kind}</p>
      <p className="mt-3 font-mono text-[11px] text-[#bcc9db]">{reference}</p>
      <div className="absolute inset-x-0 bottom-0 h-16 origin-bottom-right skew-y-[-10deg] bg-[#ffbb00]" />
    </div>
  );
}

function CompanyLogo({ company, compact = false }: { company: string; compact?: boolean }) {
  const size = compact ? "size-9" : "size-14";
  if (company.includes("Nike")) return <span aria-label="Nike" role="img" className={cn("flex shrink-0 items-center justify-center rounded-full bg-white", size)}><svg viewBox="0 0 64 32" className="w-8" aria-hidden><path d="M5 20c11 5 20 4 27 0L58 7 35 25C23 34 12 29 5 20Z" fill="#111827" /></svg></span>;
  if (company.includes("Adidas")) return <span aria-label="Adidas" role="img" className={cn("flex shrink-0 items-end justify-center gap-0.5 rounded-full bg-white pb-3", size)}>{[16,22,28].map((height) => <i key={height} className="block w-2 -skew-x-[18deg] bg-[#111827]" style={{ height }} />)}</span>;
  if (company.includes("Fanatics")) return <span aria-label="Fanatics" role="img" className={cn("flex shrink-0 items-center justify-center rounded-full bg-white font-black italic text-[#e32636]", size)}>F</span>;
  if (company.includes("Beats")) return <span aria-label="Beats by Dre" role="img" className={cn("flex shrink-0 items-center justify-center rounded-full bg-[#e51b23] text-xl font-black text-white", size)}>b</span>;
  return <span aria-label="Gatorade" role="img" className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-2xl font-black italic text-[#111827]", size)}>G<span className="absolute -right-0.5 top-1 h-7 w-3 -skew-x-[24deg] bg-[#f26a21]" /></span>;
}

function AgreementDetailPreview({ onAction, dark }: { onAction: (action: string) => void; dark: boolean }) {
  const agreements = [
    ["Jalen Brooks", "Nike, Inc.", "Active", "$125,000"],
    ["Maya Johnson", "Gatorade", "Internal review", "$250,000"],
    ["Ryan Patel", "Adidas", "Active", "$175,000"],
    ["Liam Carter", "Fanatics", "Draft", "$60,000"],
    ["Avery Stokes", "Beats by Dre", "Terminated", "$45,000"],
  ];
  return (
    <div className={cn("space-y-5", dark ? "text-white" : "text-[#0d213f]")}>
      <div className={cn("grid overflow-hidden rounded-[22px] border xl:grid-cols-[0.95fr_1.05fr]", dark ? "border-[#29425f] bg-[#0b213d]" : "border-[#dddcd6] bg-white")}>
        <section className={cn("border-b p-4 xl:border-b-0 xl:border-r", dark ? "border-[#29425f]" : "border-[#dddcd6]")}>
          <div className={cn("divide-y", dark ? "divide-white/10" : "divide-[#ebe9e2]")}>{agreements.map(([player, partner, state, value], index) => <button key={player} type="button" onClick={() => index !== 1 && onAction(`${player} agreement`)} className={cn("grid min-h-[82px] w-full grid-cols-[1fr_0.9fr_auto] items-center gap-3 px-3 text-left outline-none focus:ring-2 focus:ring-[#ffbb00]", index === 1 && (dark ? "rounded-xl border border-[#ffbb00] bg-[#102944]" : "rounded-xl border border-[#ffbb00] bg-[#fff8df]"))}><span><span className="block font-semibold">{player}</span><span className="mt-1 block text-xs text-[#9fb0c5]">Brand agreement</span></span><span className="flex items-center gap-2"><CompanyLogo company={partner} compact /><span><span className="block text-sm">{partner}</span><span className="mt-1 block text-xs text-[#9fb0c5]">Counterparty</span></span></span><span className="text-right"><span className="block font-mono font-semibold">{value}</span><span className={cn("mt-1 block text-xs", state === 'Internal review' ? 'text-[#ffbb00]' : 'text-[#9fb0c5]')}>{state}</span></span></button>)}</div>
        </section>
        <section className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#ffbb00]">Selected agreement</p><h2 className="mt-2 text-2xl font-bold">Maya Johnson</h2><p className="mt-1 text-sm text-[#b5c2d3]">Brand Ambassador Agreement</p></div><div className="flex items-center gap-3 text-right"><CompanyLogo company="Gatorade" /><span><p className="text-sm font-bold">Gatorade</p><p className="mt-1 text-xs text-[#9fb0c5]">Counterparty</p></span></div></div>
          <dl className="mt-6 grid gap-4 border-y border-white/10 py-5 sm:grid-cols-3">{[["Term","May 15, 2026 – May 14, 2027"],["Total value","$250,000"],["Agreement type","Endorsement"]].map(([label,value]) => <div key={label}><dt className="text-xs text-[#8ca0ba]">{label}</dt><dd className="mt-2 text-sm font-semibold">{value}</dd></div>)}</dl>
          <div className={cn("mt-6 rounded-[20px] border p-5", dark ? "border-white/10 bg-[#102944]" : "border-[#dddcd6] bg-[#f8f7f3]")}><div className="grid grid-cols-4 gap-3">{[["Draft","Complete"],["Internal review","In progress"],["Athlete signature","Pending"],["Active","Pending"]].map(([step,state], index) => <div key={step} className="text-center"><span className={cn("mx-auto flex size-11 items-center justify-center rounded-full border text-sm font-bold", index === 1 ? "border-[#ffbb00] bg-[#ffbb00] text-[#0d213f]" : index === 0 ? "border-[#1675ff] bg-[#1675ff] text-white" : dark ? "border-white/20 text-[#8ca0ba]" : "border-[#cad0d8] text-[#66707d]")}>{index + 1}</span><p className="mt-3 text-xs font-semibold">{step}</p><p className={cn("mt-1 text-[10px]", index === 1 ? "text-[#ffbb00]" : "text-[#8ca0ba]")}>{state}</p></div>)}</div></div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="rounded-xl border border-[#ffbb00]/40 bg-[#ffbb00]/10 px-4 py-3 text-sm"><strong>Action needed</strong><span className="ml-2 text-[#b5c2d3]">Internal legal review is pending.</span></div><div className="flex gap-2"><button type="button" onClick={() => onAction("Request signature")} className="min-h-11 rounded-xl bg-[#1675ff] px-4 font-semibold">Request signature</button><button type="button" onClick={() => onAction("Open agreement details")} className="min-h-11 rounded-xl border border-white/20 px-4 font-semibold">Open details</button></div></div>
        </section>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <section className={cn("rounded-[22px] border p-6", dark ? "border-[#29425f] bg-[#0b213d]" : "border-[#dddcd6] bg-white")}><div className="flex gap-8 border-b border-white/10 text-sm"><span className="border-b-2 border-[#ffbb00] pb-3 font-semibold">Payment schedule</span><span className="pb-3 text-[#9fb0c5]">Attribution</span><span className="pb-3 text-[#9fb0c5]">Activity</span></div><div className="mt-8 grid grid-cols-3 gap-5">{[["May 15","$100,000","Paid"],["Aug 15","$100,000","Due in 45 days"],["Nov 15","$50,000","Upcoming"]].map(([date,value,state], index) => <div key={date}><span className={cn("flex size-9 items-center justify-center rounded-full border-2", index < 2 ? "border-[#ffbb00] text-[#ffbb00]" : "border-[#72839a]")}>{index === 0 ? <IconCheck className="size-5" aria-hidden /> : index + 1}</span><p className="mt-4 text-sm text-[#8ca0ba]">{date}, 2026</p><p className="mt-2 text-xl font-semibold">{value}</p><p className={cn("mt-2 text-xs", index < 2 ? "text-[#ffbb00]" : "text-[#8ca0ba]")}>{state}</p></div>)}</div></section>
        <section className={cn("rounded-[22px] border p-6", dark ? "border-[#29425f] bg-[#0b213d]" : "border-[#dddcd6] bg-white")}><h3 className="text-lg font-bold">Invoice summary</h3><div className="mx-auto mt-5 flex size-32 items-center justify-center rounded-full border-[14px] border-[#ffbb00]"><div className="text-center"><strong className="text-2xl">60%</strong><span className="block text-xs text-[#8ca0ba]">Paid</span></div></div><button type="button" onClick={() => onAction("Open invoice")} className="mt-5 min-h-11 w-full rounded-xl bg-[#1675ff] font-semibold text-white">Open invoice</button></section>
      </div>
    </div>
  );
}

function InvoiceWorkspacePreview({
  invoices: visibleInvoices,
  selected,
  selectedId,
  query,
  status,
  dark,
  onQueryChange,
  onStatusChange,
  onSelect,
  onPdf,
  onAction,
}: {
  invoices: InvoiceRecord[];
  selected: InvoiceRecord;
  selectedId: string;
  query: string;
  status: string;
  dark: boolean;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSelect: (id: string) => void;
  onPdf: () => void;
  onAction: (action: string) => void;
}) {
  const border = dark ? "border-[#29425f]" : "border-[#dedcd4]";
  const surface = dark ? "bg-[#0b213d] text-white" : "bg-white text-[#0d213f]";
  const soft = dark ? "bg-[#102944]" : "bg-[#f7f6f2]";
  const muted = dark ? "text-[#9fb0c5]" : "text-[#777d87]";
  const lineItems = [
    ["Campaign activation", "Spring sports launch", "$75,000.00"],
    ["Licensed usage", "Digital, social, and venue media", "$145,000.00"],
    ["Content deliverables", "Six approved player features", "$30,000.00"],
  ];
  const filters = ["All", "Draft", "Sent", "Overdue", "Paid"];

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(22rem,0.8fr)_minmax(0,1.45fr)]">
      <section className={cn("min-w-0 overflow-hidden rounded-[24px] border shadow-[0_18px_55px_rgba(13,33,63,0.06)]", border, surface)}>
        <div className={cn("border-b p-5", border)}>
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a7400]">Invoice register</p><h2 className="mt-1 text-xl font-bold">Invoices</h2></div>
            <button type="button" onClick={() => onAction("Open invoice filters")} className={cn(previewButton, "border", border, surface)}><IconFilter className="size-4" aria-hidden /> Filters</button>
          </div>
          <div className={cn("mt-5 flex gap-1 overflow-x-auto border-b", border)} role="tablist" aria-label="Invoice status filters">
            {filters.map((filter, index) => <button key={filter} type="button" role="tab" aria-selected={status === filter} tabIndex={status === filter ? 0 : -1} onClick={() => onStatusChange(filter)} onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? filters.length - 1 : event.key === "ArrowRight" ? (index + 1) % filters.length : (index - 1 + filters.length) % filters.length;
              onStatusChange(filters[nextIndex]);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role='tab']")[nextIndex]?.focus();
            }} className={cn("min-h-11 shrink-0 border-b-2 px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]", status === filter ? "border-[#ffbb00] text-[#9a7400]" : cn("border-transparent", muted))}>{filter}</button>)}
          </div>
          <label className="relative mt-4 block"><span className="sr-only">Search preview invoices</span><IconSearch className={cn("pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2", muted)} aria-hidden /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search invoices" className={cn("min-h-12 w-full rounded-2xl border pl-11 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]", border, dark ? "bg-[#071a35] text-white placeholder:text-[#71849e]" : "bg-white text-[#0d213f]")} /></label>
        </div>
        <div className={cn("divide-y", dark ? "divide-white/10" : "divide-[#ebe9e2]")}>
          {visibleInvoices.length ? visibleInvoices.map((invoice) => (
            <button key={invoice.id} type="button" onClick={() => onSelect(invoice.id)} className={cn("grid min-h-[108px] w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffbb00]", selectedId === invoice.id ? dark ? "bg-[#102944] shadow-[inset_4px_0_0_#ffbb00]" : "bg-[#fff9e7] shadow-[inset_4px_0_0_#ffbb00]" : dark ? "hover:bg-white/[0.04]" : "hover:bg-[#faf9f5]")}>
              <CompanyLogo company={invoice.partner} compact />
              <span className="min-w-0"><span className="block font-mono text-xs font-bold">{invoice.id}</span><span className="mt-1 block truncate text-sm font-semibold">{invoice.partner}</span><span className={cn("mt-1 block truncate text-xs", muted)}>{invoice.athlete} · Due {invoice.due}</span></span>
              <span className="text-right"><span className="block font-mono text-sm font-bold">{invoice.amount}</span><span className="mt-2 block"><PreviewBadge tone={statusTone(invoice.state)}>{invoice.state}</PreviewBadge></span></span>
            </button>
          )) : <div className="px-5 py-16 text-center"><IconFileInvoice className={cn("mx-auto size-8", muted)} aria-hidden /><p className="mt-3 font-semibold">No invoices match this view</p><p className={cn("mt-1 text-sm", muted)}>Change the status filter or search phrase.</p></div>}
        </div>
        <footer className={cn("flex items-center justify-between border-t px-5 py-4", border, muted)}><span className="text-xs">1–5 of 12 invoices</span><span className="flex gap-2"><button type="button" onClick={() => onAction("Previous invoice page")} aria-label="Previous invoice page" className={cn("flex size-10 items-center justify-center rounded-xl border", border)}><IconChevronLeft className="size-4" aria-hidden /></button><button type="button" onClick={() => onAction("Next invoice page")} aria-label="Next invoice page" className={cn("flex size-10 items-center justify-center rounded-xl border", border)}><IconChevronRight className="size-4" aria-hidden /></button></span></footer>
      </section>

      <div className="min-w-0 space-y-6">
        <section className={cn("min-w-0 overflow-hidden rounded-[26px] border shadow-[0_20px_65px_rgba(13,33,63,0.08)]", border, surface)}>
          <header className={cn("flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-start sm:justify-between", border)}>
            <div><div className="flex flex-wrap items-center gap-3"><PreviewBadge tone={statusTone(selected.state)}>{selected.state}</PreviewBadge><span className={cn("font-mono text-xs", muted)}>{selected.id}</span></div><h2 className="mt-3 text-2xl font-bold">Invoice details</h2><p className={cn("mt-1 text-sm", muted)}>Issued May 1, 2026 · Due {selected.due}</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={onPdf} className={cn(previewButton, "bg-[#ffbb00] text-[#0d213f] hover:bg-[#ffc933]")}><IconDownload className="size-4" aria-hidden /> Download PDF</button><button type="button" onClick={() => onAction("Send invoice")} className={cn(previewButton, "border", border, surface)}><IconSend className="size-4" aria-hidden /> Send</button><button type="button" onClick={() => onAction("Invoice actions")} aria-label="More invoice actions" className={cn("flex size-11 items-center justify-center rounded-xl border", border)}><IconDots className="size-5" aria-hidden /></button></div>
          </header>

          <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1fr)_15rem]">
            <div className={cn("min-w-0 overflow-hidden p-6 xl:border-r", border)}>
              <div className={cn("grid gap-5 rounded-[20px] border p-5 sm:grid-cols-[1fr_1fr_1.15fr]", border, soft)}>
                <div className="flex items-center gap-3"><CompanyLogo company={selected.partner} /><div><p className={cn("text-xs", muted)}>Partner</p><p className="mt-1 font-bold">{selected.partner}</p></div></div>
                <div><p className={cn("text-xs", muted)}>Player</p><p className="mt-2 font-bold">{selected.athlete}</p><p className={cn("mt-1 text-xs", muted)}>Women&apos;s Basketball</p></div>
                <div><p className={cn("text-xs", muted)}>Agreement</p><p className="mt-2 font-bold">{selected.agreement}</p><button type="button" onClick={() => onAction("Open linked agreement")} className="mt-2 text-xs font-semibold text-[#1675ff]">View linked record</button></div>
              </div>

              <div className="mt-7 max-w-full overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-sm"><thead><tr className={cn("border-b text-xs uppercase tracking-[0.08em]", border, muted)}><th className="pb-3 font-semibold">Line item</th><th className="pb-3 font-semibold">Description</th><th className="pb-3 text-right font-semibold">Amount</th></tr></thead><tbody className={cn("divide-y", dark ? "divide-white/10" : "divide-[#ebe9e2]")}>{lineItems.map(([item, description, amount]) => <tr key={item}><td className="py-4 font-semibold">{item}</td><td className={cn("py-4", muted)}>{description}</td><td className="py-4 text-right font-mono font-semibold">{amount}</td></tr>)}</tbody></table>
              </div>

              <div className="ml-auto mt-6 max-w-sm space-y-3 text-sm"><div className="flex justify-between"><span className={muted}>Subtotal</span><span className="font-mono">$250,000.00</span></div><div className="flex justify-between"><span className={muted}>Tax</span><span className="font-mono">$0.00</span></div><div className={cn("flex justify-between border-t-2 pt-4 text-lg font-bold", dark ? "border-white" : "border-[#0d213f]")}><span>Total</span><span className="font-mono">{selected.amount}</span></div></div>
              <div className={cn("mt-7 grid gap-4 rounded-[20px] border p-5 sm:grid-cols-3", border, dark ? "bg-[#071a35]" : "bg-[#0d213f] text-white")}><div><p className="text-xs text-[#9fb0c5]">Paid</p><p className="mt-2 font-mono text-xl font-bold">$100,000.00</p></div><div><p className="text-xs text-[#9fb0c5]">Balance due</p><p className="mt-2 font-mono text-xl font-bold text-[#ffbb00]">$150,000.00</p></div><div><p className="text-xs text-[#9fb0c5]">Next action</p><p className="mt-2 text-sm font-semibold">Payment due {selected.due}</p></div></div>
            </div>

            <aside className={cn("p-5", dark ? "bg-[#071a35]" : "bg-[#f7f6f2]")}>
              <div className="mx-auto max-w-[11rem]"><PdfCover kind="Invoice" reference={selected.id} /></div>
              <div className={cn("mt-5 rounded-[18px] border p-4", border, surface)}><p className="text-sm font-bold">Generated invoice</p><dl className={cn("mt-4 space-y-3 text-xs", muted)}><div className="flex justify-between gap-3"><dt>Version</dt><dd className="font-mono">v1.0</dd></div><div className="flex justify-between gap-3"><dt>Created</dt><dd>May 1, 2026</dd></div><div className="flex justify-between gap-3"><dt>Format</dt><dd>PDF · 2 pages</dd></div><div className="flex justify-between gap-3"><dt>Access</dt><dd className="flex items-center gap-1"><IconLock className="size-3" aria-hidden /> Private</dd></div></dl></div>
              <button type="button" onClick={onPdf} className={cn(previewButton, "mt-4 w-full border", border, surface)}><IconFileDescription className="size-4" aria-hidden /> Preview document</button>
            </aside>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className={cn("rounded-[24px] border p-6", border, surface)}><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Payment timeline</h3><button type="button" onClick={() => onAction("Open payment history")} className="text-sm font-semibold text-[#1675ff]">View history</button></div><div className="mt-6 grid gap-6 sm:grid-cols-3">{[["May 1","Invoice issued","Complete"],["May 5","First payment","$100,000 paid"],["May 15","Balance due","$150,000 due"]].map(([date,label,value], index) => <div key={label} className="relative"><span className={cn("flex size-10 items-center justify-center rounded-full border-2", index < 2 ? "border-[#ffbb00] bg-[#ffbb00] text-[#0d213f]" : cn(border, muted))}>{index < 2 ? <IconCheck className="size-5" aria-hidden /> : <IconClock className="size-5" aria-hidden />}</span><p className={cn("mt-4 text-xs", muted)}>{date}, 2026</p><p className="mt-1 font-semibold">{label}</p><p className={cn("mt-1 text-xs", index === 2 ? "text-[#c86b24]" : muted)}>{value}</p></div>)}</div></section>
          <section className={cn("rounded-[24px] border p-6", border, surface)}><div className="flex gap-6 border-b text-sm" role="tablist" aria-label="Invoice context"><button type="button" role="tab" aria-selected className="border-b-2 border-[#ffbb00] pb-3 font-semibold">Notes</button><button type="button" role="tab" aria-selected={false} onClick={() => onAction("Open invoice approvals")} className={cn("pb-3", muted)}>Approvals</button><button type="button" role="tab" aria-selected={false} onClick={() => onAction("Open invoice audit history")} className={cn("pb-3", muted)}>Audit history</button></div><p className={cn("mt-5 text-sm leading-6", muted)}>Initial campaign payment received. Remaining balance is scheduled after delivery approval and rights confirmation.</p><button type="button" onClick={() => onAction("Add invoice note")} className={cn(previewButton, "mt-5 border", border, surface)}>Add note</button></section>
        </div>
        <PreviewNotice>Amounts are fictional preview data. Production totals, payment state, PDF versions, and audit history will be derived server-side from authorized financial records.</PreviewNotice>
      </div>
    </div>
  );
}

export function AgreementsWorkspace() {
  const [activeTab, setActiveTab] = useState<(typeof invoiceTabs)[number]>("Agreements");
  const [selectedId, setSelectedId] = useState(invoices[0].id);
  const [query, setQuery] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("All");
  const [pdfOpen, setPdfOpen] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const selected = invoices.find((invoice) => invoice.id === selectedId) ?? invoices[0];
  const filtered = useMemo(() => invoices.filter((invoice) => {
    const matchesQuery = `${invoice.id} ${invoice.athlete} ${invoice.partner}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (invoiceStatus === "All" || invoice.state === invoiceStatus);
  }), [invoiceStatus, query]);
  const tone = useReferencePageTone(activeTab === "Agreements" ? "dark" : "light");
  const dark = tone === "dark" || tone === "team";

  return (
    <>
      <WorkspaceHeader eyebrow="Commercial records" title="Agreements & invoices" description="Create, manage, and track player agreements and associated invoices." action={<button type="button" onClick={() => setAction(activeTab === "Agreements" ? "Create agreement" : "Create invoice")} className={cn(previewButton, dark ? "bg-[#1675ff] text-white" : "bg-[#ffbb00] text-[#0d213f] hover:bg-[#ffc933]")}><IconFileInvoice className="size-4" aria-hidden /> {activeTab === "Agreements" ? "Create agreement" : "Create invoice"}</button>} />
      <FolderTabs tabs={invoiceTabs} active={activeTab} onChange={(tab) => setActiveTab(tab as (typeof invoiceTabs)[number])} label="Agreement document views" />
      <FolderSurface className={cn("rounded-tl-none", activeTab === "Agreements" && dark && "border-[#29425f] bg-[#071a35] p-4 shadow-[0_24px_70px_rgba(3,20,42,0.18)] sm:p-5")}>
        {activeTab === "Agreements" ? <AgreementDetailPreview onAction={setAction} dark={dark} /> : activeTab !== "Invoices" ? (
          <div className="grid min-h-[28rem] place-items-center rounded-[22px] border border-dashed border-[#d7d5cc] bg-white px-6 text-center">
            <div className="max-w-md"><IconFileDescription className="mx-auto size-9 text-[#9a7400]" aria-hidden /><h2 className="mt-4 text-xl font-bold text-[#0d213f]">{activeTab} workspace</h2><p className="mt-2 text-sm leading-6 text-[#737984]">This folder reserves the navigation and list hierarchy. The owning financial and document contracts are not implemented in this shell.</p><button type="button" onClick={() => setAction(`Open ${activeTab.toLowerCase()} list`)} className={cn(previewButton, "mt-5 border border-[#d5d5ce] bg-white text-[#0d213f] hover:border-[#ffbb00]")}>Preview simple list</button></div>
          </div>
        ) : <InvoiceWorkspacePreview invoices={filtered} selected={selected} selectedId={selectedId} query={query} status={invoiceStatus} dark={dark} onQueryChange={setQuery} onStatusChange={setInvoiceStatus} onSelect={setSelectedId} onPdf={() => setPdfOpen(true)} onAction={setAction} />}
      </FolderSurface>

      <PreviewModal open={pdfOpen} onOpenChange={setPdfOpen} title={`${selected.id} PDF preview`} description="Document hierarchy for a future server-generated, immutable invoice version.">
        <div className="grid gap-6 sm:grid-cols-[13rem_1fr]"><PdfCover kind="Invoice" reference={selected.id} /><div><div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm"><div className="flex items-center gap-3 text-emerald-300"><IconCheck className="size-4" aria-hidden /> Authoritative-record generation planned</div><div className="flex items-center gap-3 text-neutral-300"><IconLock className="size-4" aria-hidden /> Private signed download</div><p className="leading-6 text-neutral-400">Reference ID, version, creator, snapshot time, storage policy, and audit event will appear here after the financial contract is approved.</p></div><button type="button" onClick={() => setPdfOpen(false)} className={cn(previewButton, "mt-5 w-full bg-[#ffbb00] text-[#0d213f]")}>Close PDF preview</button></div></div>
      </PreviewModal>
      <PreviewModal open={action !== null} onOpenChange={(open) => { if (!open) setAction(null); }} title={action ?? "Invoice action"} description="This control is connected to a preview explanation rather than a fake financial mutation."><p className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm leading-6 text-neutral-300">The action becomes available after the approved financial schema, server authorization, validation, audit, and retention behavior are implemented.</p></PreviewModal>
    </>
  );
}

const reportTabs = ["Report library", "Scheduled", "Export history"] as const;

export function ReportsWorkspace() {
  useReferencePageTone("light");
  const [activeTab, setActiveTab] = useState<(typeof reportTabs)[number]>("Report library");
  const [configure, setConfigure] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [includedSections, setIncludedSections] = useState<string[]>(reportSectionOptions);

  return (
    <>
      <WorkspaceHeader eyebrow="Reporting" title="Reports & exports" description="Create clear, auditable documents for teams, players, and finance." action={<button type="button" onClick={() => setConfigure("Report date range")} className={cn(previewButton, "border border-[#d7d5cc] bg-white text-[#0d213f]")}><IconCalendar className="size-4" aria-hidden /> May 1 – May 17, 2026</button>} />
      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="min-w-0">
          <FolderTabs tabs={reportTabs} active={activeTab} onChange={(tab) => setActiveTab(tab as (typeof reportTabs)[number])} label="Report views" />
          <FolderSurface className="rounded-tl-none">
        {activeTab === "Report library" ? <div className="divide-y divide-[#ebe9e2]">{reports.map((report, index) => <article key={report.name} className="grid min-h-[100px] gap-4 py-3 sm:grid-cols-[4.25rem_minmax(0,1fr)_6.5rem_8.5rem_auto] sm:items-center"><span className="flex size-14 items-center justify-center rounded-[14px] bg-[#0d213f] text-white">{index === 1 ? <span className="flex h-7 items-end gap-1" aria-hidden>{[12,20,27].map((height) => <i key={height} className="block w-1.5 rounded-sm bg-white" style={{ height }} />)}</span> : <IconFileDescription className="size-6" aria-hidden />}</span><div><h2 className="font-bold text-[#0d213f]">{report.name}</h2><p className="mt-1 text-xs leading-5 text-[#737984]">{report.detail}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9297a0]">Scope</p><p className="mt-2 text-xs font-semibold text-[#0d213f]">{report.scope}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9297a0]">Last generated</p><p className="mt-2 text-xs font-semibold text-[#0d213f]">{report.last}</p></div><button type="button" onClick={() => { setGenerated(false); setConfigure(report.name); }} className={cn(previewButton, "border border-[#79aaff] bg-white text-[#176fe8] hover:border-[#ffbb00]")}>Configure <IconChevronRight className="size-4" aria-hidden /></button></article>)}</div> : null}
        {activeTab === "Scheduled" ? <EmptyReportState icon={IconCalendar} title="No preview schedules" description="Scheduled reports will show delivery cadence, recipients, authorization scope, and the next run." action={() => setConfigure("Scheduled report")} actionLabel="Configure schedule" /> : null}
        {activeTab === "Export history" ? <div className="space-y-3">{[["Media coverage and gaps", "Ready", "RPT-2026-0516-0048"], ["Rights readiness", "Generating", "Reference pending"], ["Attribution performance", "Expired", "RPT-2026-0514-0012"]].map(([name, state, reference]) => <div key={name} className="grid gap-3 rounded-[18px] border border-[#e0ded6] bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-semibold text-[#0d213f]">{name}</p><p className="mt-1 font-mono text-xs text-[#777d87]">{reference}</p></div><PreviewBadge tone={state === "Ready" ? "green" : state === "Generating" ? "gold" : "neutral"}>{state}</PreviewBadge><button type="button" onClick={() => setConfigure(name)} className={cn(previewButton, "border border-[#d5d5ce] bg-white text-[#0d213f]")}>{state === "Ready" ? "Open export" : "View status"}</button></div>)}</div> : null}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><PreviewNotice>Every production percentage will name its denominator and selected time window. Private downloads re-check authorization.</PreviewNotice><PreviewLink href="/organization/preview/agreements">Invoice PDFs</PreviewLink></div>
          </FolderSurface>
        </div>

        <aside className="rounded-[26px] border border-[#d7d5cc] bg-white p-6 shadow-[0_18px_55px_rgba(13,33,63,0.07)]">
          <div className="flex items-center gap-3"><IconFileDescription className="size-6 text-[#0d213f]" aria-hidden /><h2 className="text-xl font-bold text-[#0d213f]">Create PDF report</h2></div>
          <label className="mt-6 block"><span className="mb-2 block text-xs font-bold text-[#69717d]">Report type</span><select className="min-h-12 w-full rounded-xl border border-[#d8d7d0] bg-white px-3 text-sm text-[#0d213f] outline-none focus:ring-2 focus:ring-[#ffbb00]"><option>Attribution performance</option><option>Digital presence summary</option><option>Media coverage and gaps</option><option>Rights readiness</option></select></label>
          <fieldset className="mt-5"><legend className="text-xs font-bold text-[#69717d]">Scope</legend><div className="mt-2 grid grid-cols-4 overflow-hidden rounded-xl border border-[#d8d7d0]">{['Organization','Team','Player','Media asset'].map((scope, index) => <label key={scope} className={cn("cursor-pointer px-2 py-3 text-center text-xs", index === 0 ? "bg-[#fff4c7] text-[#6f5200]" : "border-l border-[#e4e2dc] text-[#5e6672]")}><input type="radio" name="inline-report-scope" defaultChecked={index === 0} className="sr-only" />{scope}</label>)}</div></fieldset>
          <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <div><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-bold text-[#69717d]">Season</span><select className="min-h-11 w-full rounded-xl border border-[#d8d7d0] bg-white px-3 text-sm text-[#0d213f]"><option>2026 season</option></select></label><label><span className="mb-2 block text-xs font-bold text-[#69717d]">Date range</span><button type="button" onClick={() => setConfigure("Report date range")} className="min-h-11 w-full rounded-xl border border-[#d8d7d0] bg-white px-3 text-left text-sm text-[#0d213f]">May 1 – May 17</button></label></div><fieldset className="mt-6"><legend className="flex w-full items-center justify-between text-xs font-bold text-[#69717d]"><span>Include sections</span><button type="button" onClick={() => setIncludedSections(reportSectionOptions)} className="font-semibold text-[#176fe8]">Select all</button></legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{reportSectionOptions.map((item) => <label key={item} className="flex items-center gap-2 text-xs text-[#4f5865]"><input type="checkbox" checked={includedSections.includes(item)} onChange={(event) => setIncludedSections((current) => event.target.checked ? [...current, item] : current.filter((section) => section !== item))} className="size-4 accent-[#ffbb00]" />{item}</label>)}</div></fieldset></div>
            <PdfCover kind="Attribution performance report" reference="May 1 – May 17" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="rounded-xl border border-[#ffbb00] bg-[#fff8df] p-4 text-xs text-[#0d213f]"><input type="radio" name="inline-report-data" defaultChecked className="mr-2 accent-[#ffbb00]" /><strong>Measured data</strong><span className="mt-1 block pl-5 text-[#737984]">Authoritative records from connected sources.</span></label><label className="rounded-xl border border-[#d8d7d0] p-4 text-xs text-[#4f5865]"><input type="radio" name="inline-report-data" className="mr-2 accent-[#ffbb00]" /><strong>Measured data + recommendations</strong><span className="mt-1 block pl-5 text-[#737984]">Includes clearly labeled modeled estimates.</span></label></div>
          <div className="mt-5 rounded-xl border border-[#d8d7d0] p-3 text-xs leading-5 text-[#5e6672]"><IconLock className="mr-2 inline size-4" aria-hidden /> Reports are generated from authoritative records as of the snapshot date.</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => { setGenerated(false); setConfigure("Attribution performance"); }} className={cn(previewButton, "bg-[#ffbb00] text-[#0d213f]")}><IconFileDescription className="size-4" aria-hidden /> Generate PDF</button><button type="button" onClick={() => setConfigure("Signed report download")} className={cn(previewButton, "border border-[#d8d7d0] bg-white text-[#0d213f]")}><IconLock className="size-4" aria-hidden /> Signed download</button></div>
        </aside>
      </div>

      <section className="mt-6 rounded-[24px] border border-[#d7d5cc] bg-white p-5 shadow-[0_14px_42px_rgba(13,33,63,0.05)]">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-[#0d213f]">Recent exports</h2><button type="button" onClick={() => setActiveTab("Export history")} className="text-sm font-semibold text-[#176fe8]">View all export history</button></div>
        <div className="mt-4 divide-y divide-[#ebe9e2]">{[["Attribution performance","Ready","RPT-2026-0517-0012"],["Media coverage and gaps","Ready","RPT-2026-0516-0048"],["Rights readiness","Generating","Reference pending"]].map(([name,state,reference]) => <button key={name} type="button" onClick={() => setConfigure(name)} className="grid min-h-14 w-full grid-cols-[1fr_auto] items-center gap-3 text-left sm:grid-cols-[1fr_8rem_12rem_auto]"><span className="font-semibold text-[#0d213f]">{name}</span><PreviewBadge tone={state === 'Ready' ? 'green' : 'gold'}>{state}</PreviewBadge><span className="font-mono text-xs text-[#737984]">{reference}</span><span className="text-sm font-semibold text-[#176fe8]">{state === 'Ready' ? 'Download PDF' : 'View status'}</span></button>)}</div>
      </section>

      <PreviewModal open={configure !== null} onOpenChange={(open) => { if (!open) { setConfigure(null); setGenerated(false); } }} title={generated ? "PDF preview ready" : `Configure ${configure ?? "report"}`} description={generated ? "No file was created. This is the completed state the production server workflow will return." : "Choose scope and sections for this fictional preview report."}>
        {generated ? <div className="grid gap-6 sm:grid-cols-[13rem_1fr]"><PdfCover kind="Performance report" reference="RPT-PREVIEW-001" /><div><PreviewBadge tone="green">Preview ready</PreviewBadge><h3 className="mt-4 text-lg font-bold">Westlake University Athletics</h3><p className="mt-2 text-sm leading-6 text-neutral-400">Organization · 2026 season · May 1–17, 2026</p><button type="button" onClick={() => { setConfigure(null); setGenerated(false); }} className={cn(previewButton, "mt-6 w-full bg-[#ffbb00] text-[#0d213f]")}>Close preview</button></div></div> : <div className="space-y-6"><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">Scope</span><select className="min-h-11 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#ffbb00]"><option className="text-black">Organization</option><option className="text-black">Team</option><option className="text-black">Player</option><option className="text-black">Media asset</option></select></label><fieldset><legend className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">Include sections</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{["Executive summary", "Performance overview", "By player", "By content", "Methodology and definitions", "Data quality notes"].map((section) => <label key={section} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm"><input type="checkbox" defaultChecked className="accent-[#ffbb00]" /> {section}</label>)}</div></fieldset><div className="grid gap-3 sm:grid-cols-2"><label className="rounded-xl border border-[#ffbb00] bg-[#ffbb00]/10 p-4 text-sm"><input type="radio" name="report-data" defaultChecked className="mr-2 accent-[#ffbb00]" /> Measured data only</label><label className="rounded-xl border border-white/10 bg-white/[0.05] p-4 text-sm"><input type="radio" name="report-data" className="mr-2 accent-[#ffbb00]" /> Include recommendations</label></div><button type="button" onClick={() => setGenerated(true)} className={cn(previewButton, "w-full bg-[#ffbb00] text-[#0d213f]")}><IconFileDescription className="size-4" aria-hidden /> Generate PDF preview</button></div>}
      </PreviewModal>
    </>
  );
}

function EmptyReportState({ icon: Icon, title, description, action, actionLabel }: { icon: typeof IconCalendar; title: string; description: string; action: () => void; actionLabel: string }) {
  return <div className="grid min-h-[25rem] place-items-center rounded-[22px] border border-dashed border-[#d7d5cc] bg-white px-6 text-center"><div className="max-w-md"><Icon className="mx-auto size-9 text-[#9a7400]" aria-hidden /><h2 className="mt-4 text-xl font-bold text-[#0d213f]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#737984]">{description}</p><button type="button" onClick={action} className={cn(previewButton, "mt-5 border border-[#d5d5ce] bg-white text-[#0d213f] hover:border-[#ffbb00]")}>{actionLabel}</button></div></div>;
}
