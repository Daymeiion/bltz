"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  IconLayoutGrid,
  IconList,
  IconPhotoPlus,
  IconSearch,
  IconShieldCheck,
  IconUsers,
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

const mediaTabs = ["All media", "Needs review", "Rights blocked", "Published"] as const;
const assets = [
  { id: "asset-1", title: "Jalen Brooks top plays vs. State U", context: "State U · Feb 24, 2026", image: "/images/media-9.jpg", type: "Video · 02:34", athletes: "Jalen Brooks +2", rights: "Cleared", publication: "Published", updated: "May 16" },
  { id: "asset-2", title: "Maya Johnson media day portrait", context: "Women's Basketball · Feb 20, 2026", image: "/images/media-6.jpg", type: "Photo", athletes: "Maya Johnson", rights: "Needs review", publication: "Not published", updated: "May 15" },
  { id: "asset-3", title: "Home opener team huddle", context: "Central Tech · Feb 18, 2026", image: "/images/media-5.jpg", type: "Video · 00:45", athletes: "Team association", rights: "Cleared", publication: "Published", updated: "May 14" },
  { id: "asset-4", title: "Postgame interview — Ryan Patel", context: "Track Invitational · Feb 16, 2026", image: "/images/Media-4.avif", type: "Video · 03:12", athletes: "Ryan Patel", rights: "Blocked", publication: "Not published", updated: "May 13" },
  { id: "asset-5", title: "Sack: chase-down block", context: "Lakeside · Feb 13, 2026", image: "/images/media-6.jpg", type: "Video · 00:28", athletes: "Avery Stokes", rights: "Blocked", publication: "Not published", updated: "May 13" },
  { id: "asset-6", title: "Team huddle — timeout energy", context: "Ridgeview · Feb 10, 2026", image: "/images/media-5.jpg", type: "Video · 01:05", athletes: "Maya Caldwell +4", rights: "Cleared", publication: "Published", updated: "May 12" },
];

type Asset = (typeof assets)[number];

function toneForStatus(value: string): "green" | "gold" | "red" | "neutral" {
  if (value === "Cleared" || value === "Published") return "green";
  if (value === "Blocked") return "red";
  if (value === "Needs review") return "gold";
  return "neutral";
}

export function MediaWorkspace() {
  const tone = useReferencePageTone("light");
  const dark = tone === "dark" || tone === "team";
  const [activeTab, setActiveTab] = useState<(typeof mediaTabs)[number]>("All media");
  const [view, setView] = useState<"gallery" | "list">("list");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Asset>(assets[0]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => assets.filter((asset) => {
    const matchesQuery = `${asset.title} ${asset.context} ${asset.athletes}`.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;
    if (activeTab === "Needs review") return asset.rights === "Needs review";
    if (activeTab === "Rights blocked") return asset.rights === "Blocked";
    if (activeTab === "Published") return asset.publication === "Published";
    return true;
  }), [activeTab, query]);

  return (
    <>
      <WorkspaceHeader
        eyebrow="Media operations"
        title="Media library"
        description="Search, review, and associate media without loading an organization’s raw media corpus into the browser."
        action={<button type="button" onClick={() => setAddOpen(true)} className={cn(previewButton, "bg-[#ffbb00] text-[#0d213f] hover:bg-[#ffc933]")}><IconPhotoPlus className="size-4" aria-hidden /> Add media</button>}
      />

      <FolderTabs tabs={mediaTabs} active={activeTab} onChange={(tab) => setActiveTab(tab as (typeof mediaTabs)[number])} label="Media status views" />
      <FolderSurface className="rounded-tl-none">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_10rem_10rem_11rem_auto]">
          <label className="relative block">
            <span className="sr-only">Search preview media</span>
            <IconSearch className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#848a94]" aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, athletes, events, or sources" className={cn("min-h-12 w-full rounded-2xl border pl-12 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]", dark ? "border-white/10 bg-[#0b213d] text-white" : "border-[#d9d7cf] bg-white text-[#0d213f]")} />
          </label>
          <label>
            <span className="sr-only">Filter media by team</span>
            <select className={cn("min-h-12 w-full rounded-2xl border px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]", dark ? "border-white/10 bg-[#0b213d] text-white" : "border-[#d9d7cf] bg-white text-[#0d213f]")} defaultValue="all"><option value="all">All teams</option><option value="basketball">Basketball</option><option value="football">Football</option><option value="soccer">Soccer</option></select>
          </label>
          <label>
            <span className="sr-only">Filter media by season</span>
            <select className={cn("min-h-12 w-full rounded-2xl border px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]", dark ? "border-white/10 bg-[#0b213d] text-white" : "border-[#d9d7cf] bg-white text-[#0d213f]")} defaultValue="2026"><option value="2026">2026 season</option><option value="2025">2025 season</option></select>
          </label>
          <label>
            <span className="sr-only">Filter by media type</span>
            <select className={cn("min-h-12 w-full rounded-2xl border px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]", dark ? "border-white/10 bg-[#0b213d] text-white" : "border-[#d9d7cf] bg-white text-[#0d213f]")} defaultValue="all"><option value="all">All media types</option><option value="video">Video</option><option value="photo">Photo</option></select>
          </label>
          <div className={cn("flex rounded-2xl border p-1", dark ? "border-white/10 bg-[#0b213d]" : "border-[#d9d7cf] bg-white")} aria-label="Media view">
            <button type="button" aria-pressed={view === "gallery"} onClick={() => setView("gallery")} className={cn(previewButton, "min-h-10 px-3", view === "gallery" ? "bg-[#0d213f] text-white" : "text-[#6b7280]")}><IconLayoutGrid className="size-4" aria-hidden /> Gallery</button>
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={cn(previewButton, "min-h-10 px-3", view === "list" ? "bg-[#0d213f] text-white" : "text-[#6b7280]")}><IconList className="size-4" aria-hidden /> List</button>
          </div>
        </div>

        <div className={cn("my-7 grid gap-3 rounded-[22px] border p-4 shadow-[0_10px_30px_rgba(13,33,63,0.05)] sm:grid-cols-4 sm:p-5", dark ? "border-white/10 bg-[#0b213d] text-white" : "border-[#e0ded6] bg-white text-[#0d213f]")}>
          {[["1,248", "Total assets"], ["86", "Needs review"], ["23", "Rights blocked"], ["1,139", "Published"]].map(([value, label]) => <div key={label} className="border-[#ebe9e2] px-3 py-2 sm:border-r sm:last:border-r-0"><p className="text-xl font-bold">{value}</p><p className="mt-1 text-xs text-[#737984]">{label} · fictional</p></div>)}
        </div>

        {view === "list" ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="space-y-3">
              <div className="hidden grid-cols-[minmax(15rem,1.3fr)_0.7fr_0.7fr_0.7fr_auto] gap-3 px-4 text-[10px] font-bold uppercase tracking-[0.13em] text-[#8a8f98] lg:grid"><span>Media</span><span>Athletes</span><span>Rights</span><span>Publication</span><span>Updated</span></div>
              {filtered.map((asset) => (
                <button key={asset.id} type="button" onClick={() => setSelected(asset)} className={cn("grid w-full gap-3 rounded-[18px] border p-3 text-left outline-none transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#ffbb00] lg:grid-cols-[minmax(15rem,1.3fr)_0.7fr_0.7fr_0.7fr_auto] lg:items-center", dark ? "bg-[#0b213d]" : "bg-white", selected.id === asset.id ? "border-[#ffbb00]" : dark ? "border-white/10 hover:border-white/20" : "border-[#e0ded6] hover:border-[#c9c7bf]")}> 
                  <span className="flex min-w-0 items-center gap-4"><span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-[#d9d8d2]"><Image src={asset.image} alt="" fill className="object-cover" sizes="96px" /></span><span className="min-w-0"><span className={cn("block truncate text-sm font-bold", dark ? "text-white" : "text-[#0d213f]")}>{asset.title}</span><span className="mt-1 block text-xs text-[#777d87]">{asset.context}</span><span className={cn("mt-1 block text-[11px] font-semibold", dark ? "text-[#9eb0c6]" : "text-[#4b5c74]")}>{asset.type}</span></span></span>
                  <span className="flex items-center gap-2"><span className="flex -space-x-2">{asset.athletes.split(" ").slice(0, 2).map((part, index) => <span key={`${part}-${index}`} className={cn("flex size-8 items-center justify-center rounded-full border-2 text-[10px] font-bold", dark ? "border-[#0b213d] bg-[#29425f] text-white" : "border-white bg-[#e9e5dc] text-[#0d213f]")}>{part[0]}</span>)}</span><span className={cn("text-xs", dark ? "text-[#b5c2d3]" : "text-[#4f5865]")}>{asset.athletes}</span></span>
                  <span><PreviewBadge tone={toneForStatus(asset.rights)}>{asset.rights}</PreviewBadge><span className="mt-1 block text-[10px] text-[#8a8f98]">{asset.rights === "Cleared" ? "All rights confirmed" : asset.rights === "Blocked" ? "License missing" : "Review required"}</span></span>
                  <span><PreviewBadge tone={toneForStatus(asset.publication)}>{asset.publication}</PreviewBadge><span className="mt-1 block text-[10px] text-[#8a8f98]">{asset.publication === "Published" ? "Public to web" : "Private to organization"}</span></span>
                  <span className="text-xs text-[#777d87]">{asset.updated}<span className="mt-1 block text-[10px]">by {asset.id === "asset-1" ? "Emma Carter" : "Media Ops"}</span></span>
                </button>
              ))}
            </div>
            <aside className={cn("self-start rounded-[22px] border p-4 shadow-[0_16px_45px_rgba(13,33,63,0.08)] xl:sticky xl:top-40", dark ? "border-white/10 bg-[#0b213d]" : "border-[#e0ded6] bg-white")}>
              <div className="relative aspect-video overflow-hidden rounded-[16px] bg-[#d9d8d2]"><Image src={selected.image} alt="Fictional selected media preview" fill className="object-cover" sizes="272px" /></div>
              <h3 className={cn("mt-4 text-sm font-bold leading-5", dark ? "text-white" : "text-[#0d213f]")}>{selected.title}</h3><p className="mt-1 text-xs text-[#777d87]">{selected.type} · {selected.updated}</p>
              <button type="button" onClick={() => setDetailOpen(true)} className={cn(previewButton, "mt-5 w-full bg-[#ffbb00] text-[#0d213f]")}>Open detail</button>
              <div className="mt-2 grid gap-2"><PreviewLink href="/organization/preview/players"><IconUsers className="size-4" aria-hidden /> Associate athletes</PreviewLink><PreviewLink href="/organization/preview/rights"><IconShieldCheck className="size-4" aria-hidden /> Review rights</PreviewLink><button type="button" onClick={() => setDetailOpen(true)} className={cn(previewButton, "w-full justify-between border", dark ? "border-white/10 text-white" : "border-[#d9d7cf] text-[#0d213f]")}>More actions <span aria-hidden>→</span></button></div>
            </aside>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((asset) => (
              <button key={asset.id} type="button" onClick={() => setSelected(asset)} className="overflow-hidden rounded-[22px] border border-[#e0ded6] bg-white text-left outline-none transition hover:-translate-y-1 hover:border-[#ffbb00] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#ffbb00]">
                <span className="relative block aspect-[16/9] bg-[#d9d8d2]"><Image src={asset.image} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" /></span>
                <span className="block p-5"><span className="block text-sm font-bold text-[#0d213f]">{asset.title}</span><span className="mt-2 block text-xs text-[#777d87]">{asset.context}</span><span className="mt-4 flex flex-wrap gap-2"><PreviewBadge tone={toneForStatus(asset.rights)}>{asset.rights}</PreviewBadge><PreviewBadge tone={toneForStatus(asset.publication)}>{asset.publication}</PreviewBadge></span></span>
              </button>
            ))}
          </div>
        )}
        {filtered.length === 0 ? <div className="py-16 text-center"><p className="font-semibold text-[#0d213f]">No preview media found</p><p className="mt-2 text-sm text-[#777d87]">Try another search or status folder.</p></div> : null}
        <div className="mt-7"><PreviewNotice>Production search will run server-side, stay organization-scoped, and return an authorized paginated result contract.</PreviewNotice></div>
      </FolderSurface>

      <PreviewModal open={detailOpen} onOpenChange={setDetailOpen} title={selected.title} description="Selected media summary with safe links into the workflows that own each action.">
        <div className="space-y-5"><div className="relative aspect-video overflow-hidden rounded-[22px] bg-neutral-800"><Image src={selected.image} alt="Fictional preview media asset" fill className="object-cover" sizes="640px" /></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><p className="text-xs text-neutral-400">Associated athletes</p><p className="mt-2 font-semibold">{selected.athletes}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><p className="text-xs text-neutral-400">Rights summary</p><p className="mt-2 font-semibold">{selected.rights}</p></div></div><div className="flex flex-wrap gap-2"><PreviewLink href="/organization/preview/players"><IconUsers className="size-4" aria-hidden /> Review players</PreviewLink><PreviewLink href="/organization/preview/rights"><IconShieldCheck className="size-4" aria-hidden /> Review rights</PreviewLink></div></div>
      </PreviewModal>

      <PreviewModal open={addOpen} onOpenChange={setAddOpen} title="Add media" description="A production upload will validate the file, create an authorized media record, and collect context before publication.">
        <div className="rounded-[22px] border border-dashed border-white/25 bg-white/[0.04] px-6 py-12 text-center"><IconPhotoPlus className="mx-auto size-8 text-[#ffbb00]" aria-hidden /><p className="mt-4 font-semibold">Upload surface reserved</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-400">No file is accepted in this preview. Phase 5 will connect storage, validation, associations, and audit behavior.</p></div>
      </PreviewModal>
    </>
  );
}
