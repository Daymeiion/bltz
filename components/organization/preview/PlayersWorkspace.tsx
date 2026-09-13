"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandX,
  IconBrandYoutube,
  IconChevronRight,
  IconExternalLink,
  IconFolder,
  IconId,
  IconMail,
  IconMessageCircle,
  IconPaperclip,
  IconPhone,
  IconSearch,
  IconSend,
  IconShirt,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useReferencePageTone, type OrganizationThemeTone } from "../OrganizationTheme";
import {
  FolderTabs,
  PreviewBadge,
  PreviewModal,
  WorkspaceHeader,
  previewButton,
} from "./PreviewPrimitives";

const roster = [
  { id: "maya", name: "Maya Caldwell", number: "24", role: "Forward", team: "Women’s Soccer", locker: "Active" },
  { id: "jade", name: "Jade Morgan", number: "7", role: "Guard", team: "Women’s Basketball", locker: "Active" },
  { id: "avery", name: "Avery Scott", number: "11", role: "Midfielder", team: "Women’s Soccer", locker: "Review" },
  { id: "riley", name: "Riley Nguyen", number: "33", role: "Defender", team: "Women’s Soccer", locker: "Unclaimed" },
  { id: "sophie", name: "Sophie Ramirez", number: "5", role: "Goalkeeper", team: "Women’s Soccer", locker: "Active" },
];

const playerPageTabs = ["Roster", "Staff", "Invites"] as const;
const playerDetailTabs = ["Overview", "Career", "Agreements"] as const;
const intelligenceTabs = ["Digital Presence Score", "Social Presence", "Recommendations"] as const;
type PlayerDetailTab = (typeof playerDetailTabs)[number];
type IntelligenceTab = (typeof intelligenceTabs)[number];
type ModalState = { title: string; description: string } | null;

function RosterWorkspace({
  selectedId,
  setSelectedId,
  query,
  setQuery,
  openAction,
  tone,
  activeDetailTab,
  setActiveDetailTab,
}: {
  selectedId: string;
  setSelectedId: (id: string) => void;
  query: string;
  setQuery: (query: string) => void;
  openAction: (title: string, description: string) => void;
  tone: OrganizationThemeTone;
  activeDetailTab: PlayerDetailTab;
  setActiveDetailTab: (tab: PlayerDetailTab) => void;
}) {
  const dark = tone === "dark" || tone === "team";
  const selected = roster.find((player) => player.id === selectedId) ?? roster[0];
  const filtered = useMemo(
    () => roster.filter((player) => `${player.name} ${player.team} ${player.role}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <div className={cn("grid items-stretch gap-4 rounded-[28px] p-4 shadow-[0_28px_80px_rgba(2,15,32,0.22)] sm:p-5 xl:grid-cols-[19rem_minmax(0,1fr)_20rem]", dark ? "bg-[#06182f] text-white" : "bg-[#f8f7f3] text-[#0d213f]")}>
        <section className={cn("flex min-w-0 flex-col rounded-[24px] border p-4 xl:min-h-[calc(100dvh-17rem)]", dark ? "border-[#29425f] bg-[#0b213d]" : "border-[#e2e0da] bg-white")}>
          <div className="flex items-center justify-between px-1"><div><p className={cn("text-xs font-bold uppercase tracking-[0.14em]", dark ? "text-[#ffbb00]" : "text-[#8d6900]")}>All players</p><p className={cn("mt-1 text-xs", dark ? "text-[#8ca0ba]" : "text-[#737984]")}>Women’s Soccer · 2026</p></div><PreviewBadge tone="gold">24 rostered</PreviewBadge></div>
          <label className="relative mt-5 block">
            <span className="sr-only">Search roster</span>
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8ca0ba]" aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roster" className={cn("min-h-11 w-full rounded-xl border pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#ffbb00]", dark ? "border-white/10 bg-[#071a32] text-white placeholder:text-[#6f829a]" : "border-[#dddcd6] bg-[#f8f7f3] text-[#0d213f] placeholder:text-[#8c9199]")} />
          </label>
          <div className="mt-3 flex-1 space-y-1.5">
            {filtered.map((player) => (
              <button key={player.id} type="button" onClick={() => setSelectedId(player.id)} className={cn("flex min-h-[68px] w-full items-center gap-3 rounded-xl border px-3 text-left outline-none focus:ring-2 focus:ring-[#ffbb00]", selected.id === player.id ? (dark ? "border-[#ffbb00] bg-[#122a46]" : "border-[#ffbb00] bg-[#fff8df]") : (dark ? "border-white/10 bg-[#0a1d36] hover:bg-[#102742]" : "border-[#e2e0da] bg-white hover:bg-[#f7f6f2]"))}> 
                <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-[#263b54]"><Image src="/images/Headshot.png" alt="" fill className="object-cover object-top" sizes="44px" /></span>
                <span className="font-mono text-base font-black text-[#ffbb00]">{player.number}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{player.name}</span><span className="mt-0.5 block truncate text-xs text-[#9eb0c6]">{player.role}</span></span>
                <IconChevronRight className="size-4 text-[#8395ab]" aria-hidden />
              </button>
            ))}
            {filtered.length === 0 ? <p className="py-10 text-center text-sm text-[#8ca0ba]">No preview players match that search.</p> : null}
          </div>
        </section>

        <section className={cn("min-w-0 overflow-hidden rounded-[24px] border", dark ? "border-[#29425f] bg-[#0b213d]" : "border-[#dddcd6] bg-white")}>
          <div className="grid lg:grid-cols-[minmax(14rem,0.8fr)_1.2fr]">
            <div className={cn("relative min-h-[300px] overflow-hidden", dark ? "bg-[#203a59]" : "bg-[#e6e7e2]")}>
              <Image src="/images/Headshot.png" alt="Fictional preview player portrait" fill className="object-cover object-top" sizes="420px" priority />
              <div className="absolute inset-x-4 bottom-4 flex justify-center gap-2">
                {[IconPhone, IconMessageCircle, IconMail, IconFolder].map((ActionIcon, index) => <button key={index} type="button" onClick={() => openAction(["Call player", "Message player", "Email player", "Open player files"][index], `This preview opens the selected player’s ${["phone", "message", "email", "file"][index]} workflow.`)} className="flex size-11 items-center justify-center rounded-xl border border-white/15 bg-[#071a32]/90 text-white backdrop-blur outline-none hover:border-[#ffbb00] focus-visible:ring-2 focus-visible:ring-[#ffbb00]"><ActionIcon className="size-5" aria-hidden /></button>)}
              </div>
            </div>

            <div className="min-w-0 p-5 lg:p-7">
              <h2 className="text-4xl font-black tracking-[-0.04em]">{selected.name}</h2>
              <p className={cn("mt-2 text-sm", dark ? "text-[#b7c5d8]" : "text-[#596273]")}>{selected.team} · #{selected.number} · Class of 2026</p>
              <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-5">
                {[[IconPhone, "Phone number", "(555) 123-4567"], [IconMail, "Email", "maya@bltz.com"], [IconId, "Eligibility", "Eligible"], [IconUsers, "Position", selected.role]].map(([DetailIcon, label, value]) => {
                  const PlayerDetailIcon = DetailIcon as typeof IconPhone;
                  return <div key={label as string} className="flex min-w-0 items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-[#9eb0c6]"><PlayerDetailIcon className="size-4" aria-hidden /></span><span className="min-w-0"><span className="block text-[10px] uppercase tracking-[0.1em] text-[#7f93ab]">{label as string}</span><span className="mt-1 block truncate text-sm font-semibold">{value as string}</span></span></div>;
                })}
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <button type="button" onClick={() => openAction("Edit player", "The production form will validate organization access and the canonical player record before saving.")} className={cn("min-h-11 rounded-xl border px-4 font-semibold", dark ? "border-white/20 hover:bg-white/5" : "border-[#d5d5ce] bg-white hover:border-[#ffbb00]")}>Edit player</button>
                <button type="button" onClick={() => openAction("Open Locker", "The public Locker will open without exposing private CRM notes or rights terms.")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1675ff] px-4 font-semibold hover:bg-[#2c83ff]">Open Locker <IconExternalLink className="size-4" aria-hidden /></button>
              </div>
            </div>
          </div>

          <div className="px-3 pt-[17px]">
            <FolderTabs tabs={playerDetailTabs} active={activeDetailTab} onChange={(tab) => setActiveDetailTab(tab as PlayerDetailTab)} label="Selected player records" variant="folder-surface" />
          </div>

          {activeDetailTab === "Overview" ? (
            <div className="space-y-8 p-5">
              <div>
                <DigitalPresenceCanvas openAction={openAction} tone={tone} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Media</h3>
                <div className="mt-4 flex gap-3"><label className="relative min-w-0 flex-1"><span className="sr-only">Search player media</span><IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8ca0ba]" aria-hidden /><input placeholder="Search player media" className="min-h-11 w-full rounded-xl border border-white/10 bg-[#071a32] pl-10 pr-3 text-sm outline-none placeholder:text-[#6f829a] focus:ring-2 focus:ring-[#ffbb00]" /></label><button type="button" onClick={() => openAction("Filter player media", "Filter the selected player’s media by type, season, rights, and status.")} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 hover:border-[#ffbb00]" aria-label="Filter player media"><IconSearch className="size-4" aria-hidden /></button></div>
                <div className="mt-4 space-y-3">{[["Season opener highlights", "02:18", "12.4K"], ["Postgame interview", "04:06", "8.7K"], ["Training feature", "01:42", "6.2K"]].map(([title, duration, reach], index) => <button key={title} type="button" onClick={() => openAction(title, `Preview ${title.toLowerCase()} and its rights, reach, and Locker status.`)} className="grid min-h-24 w-full grid-cols-[7rem_1fr_4.5rem] items-center gap-4 rounded-2xl border border-white/10 p-2 text-left outline-none hover:border-[#ffbb00] focus-visible:ring-2 focus-visible:ring-[#ffbb00]"><span className={cn("flex h-20 items-center justify-center rounded-xl px-2 text-center text-xs font-bold", index === 0 ? "bg-[#294969]" : index === 1 ? "bg-[#243f5d]" : "bg-[#1d3651]")}>Video thumbnail</span><span className="min-w-0"><span className="block truncate font-bold">{title}</span><span className="mt-1 block text-sm text-[#9eb0c6]">Video caption · {duration}</span><span className="mt-3 inline-flex size-8 items-center justify-center rounded-lg bg-white/10"><IconExternalLink className="size-4" aria-hidden /></span></span><span className="text-right"><span className="block text-lg font-bold">{reach}</span><span className="text-[10px] uppercase tracking-[0.1em] text-[#8ca0ba]">Reach</span></span></button>)}</div>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <h3 className="text-lg font-bold">{activeDetailTab}</h3>
              <p className="mt-2 text-sm text-[#9eb0c6]">Focused {activeDetailTab.toLowerCase()} records for {selected.name}. This preview keeps the information inside the player workspace.</p>
              <button type="button" onClick={() => openAction(activeDetailTab, `${activeDetailTab} opens the selected player’s focused records.`)} className="mt-5 min-h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold hover:border-[#ffbb00]">View {activeDetailTab.toLowerCase()}</button>
            </div>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-4 self-start">
          <section className={cn("rounded-[24px] border p-5", dark ? "border-[#29425f] bg-[#0b213d]" : "border-[#dddcd6] bg-white")}>
            <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-xl border border-white/10 text-sm font-bold">3</span><h3 className="font-bold">Noted</h3></div><button type="button" onClick={() => openAction("Add note", "A private organization note will be attached to the selected player after authorization.")} className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-xl hover:border-[#ffbb00]" aria-label="Add note">+</button></div>
            <div className="mt-5 rounded-2xl bg-[#132a46] p-4"><p className="text-sm font-semibold leading-6">After our conversation, the following tasks remained:</p><div className="mt-4 space-y-4">{['Enroll in media readiness course', 'Conduct player asset review', 'Improve profile and interview notes'].map((item, index) => <button key={item} type="button" onClick={() => openAction(item, "This task will retain its owner, due time, and completion history.")} className="flex w-full items-start gap-3 text-left text-xs leading-5"><span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded", index < 2 ? "bg-[#ffdf39] text-[#0d213f]" : "border border-white/15")} >{index < 2 ? '✓' : ''}</span><span className={index < 2 ? "text-[#8ca0ba] line-through" : "text-white"}>{item}</span><span className="ml-auto shrink-0 text-[10px] text-[#6f829a]">{index === 0 ? '6:11 PM' : index === 1 ? '8:32 AM' : '8:12 PM'}</span></button>)}</div></div>
          </section>

          <section className={cn("flex flex-col rounded-[24px] border p-5", dark ? "border-[#29425f] bg-[#0b213d]" : "border-[#dddcd6] bg-white")}>
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><IconMessageCircle className="size-5" aria-hidden /><h3 className="font-bold">Chat</h3></div><button type="button" onClick={() => openAction("Open conversation", "The full player conversation will open with organization-scoped access.")} className="flex size-10 items-center justify-center rounded-xl border border-white/10 hover:border-[#ffbb00]" aria-label="Open conversation"><IconExternalLink className="size-4" aria-hidden /></button></div>
            <div className="mt-5 flex flex-col gap-5">
              <div className="ml-7 rounded-2xl bg-[#132a46] p-4 text-sm leading-6">Checking the final media rights and Locker selections.<p className="mt-2 text-right text-[10px] text-[#8ca0ba]">8:32 AM</p></div>
              <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => openAction("Rights review.pdf", "Preview the rights-review attachment without exposing private source files.")} className="flex aspect-[4/5] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-center text-xs text-[#9eb0c6] hover:border-[#ffbb00]">Rights<br />review.pdf</button><button type="button" onClick={() => openAction("Locker plan.pdf", "Preview the Locker-plan attachment without exposing private source files.")} className="flex aspect-[4/5] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-center text-xs text-[#9eb0c6] hover:border-[#ffbb00]">Locker<br />plan.pdf</button></div>
              <p className="text-[10px] text-[#8ca0ba]">Delivered · 8:42 AM</p>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#071a32] p-2"><button type="button" onClick={() => openAction("Attach file", "Choose an approved player document or media asset.")} className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[#9eb0c6] hover:bg-white/5" aria-label="Attach file"><IconPaperclip className="size-4" aria-hidden /></button><input aria-label="Message player" placeholder="Type something…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#6f829a]" /><button type="button" onClick={() => openAction("Send message", "Messages will send only after organization authorization and audit logging are connected.")} className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ffbb00] text-[#0d213f]" aria-label="Send message"><IconSend className="size-4" aria-hidden /></button></div>
          </section>
        </aside>
    </div>
  );
}

function ScoreMeter({ label, value, dark }: { label: string; value: number; dark: boolean }) {
  return <div className={cn("rounded-2xl border p-4 text-center", dark ? "border-[#29425f] bg-[#102742]" : "border-[#e6e3dc] bg-[#f8f7f3]")}><div><span className={cn("block text-sm font-semibold leading-5", dark ? "text-[#dbe5f2]" : "text-[#24334c]")}>{label}</span><span className={cn("mt-2 block font-mono text-3xl font-black", dark ? "text-white" : "text-[#0d213f]")}>{value}<span className={cn("ml-0.5 text-xs font-normal", dark ? "text-[#8ca0ba]" : "text-[#7c8592]")}>/100</span></span></div><div className={cn("mt-3 h-2 rounded-full", dark ? "bg-[#29425f]" : "bg-[#e2e0da]")}><div className="h-2 rounded-full bg-[#ffbb00]" style={{ width: `${value}%` }} /></div></div>;
}

function DigitalPresenceCanvas({ openAction, tone }: { openAction: (title: string, description: string) => void; tone: OrganizationThemeTone }) {
  const dark = tone === "dark" || tone === "team";
  const [activeTab, setActiveTab] = useState<IntelligenceTab>("Digital Presence Score");
  const panel = cn("rounded-[24px] border-0 px-[10px] py-6 shadow-[0_14px_44px_rgba(13,33,63,0.06)]", dark ? "bg-[#0b213d] text-white" : "bg-white");
  const sources = [
    [IconBrandInstagram, "Instagram", "@jalencaldwell24", "Verified"],
    [IconBrandTiktok, "TikTok", "@jalencaldwell24", "Verified"],
    [IconBrandX, "X", "@jalencaldwell24", "Verified"],
    [IconBrandYoutube, "YouTube", "Channel missing", "Unverified"],
    [IconShirt, "Official roster", "Profile verified", "Verified"],
  ] as const;
  return (
    <section className={panel}>
      <div className="-mx-2 px-2">
        <FolderTabs tabs={intelligenceTabs} active={activeTab} onChange={(tab) => setActiveTab(tab as IntelligenceTab)} label="Player intelligence views" variant="pill" />
      </div>

      {activeTab === "Digital Presence Score" ? (
        <div className="pt-6">
          <div className="grid items-center gap-2 md:grid-cols-[minmax(0,0.8fr)_minmax(14rem,1.25fr)_minmax(0,0.8fr)]">
            <div className="space-y-2">
              <div className={cn("rounded-2xl border p-4 text-center", dark ? "border-[#29425f] bg-[#102742]" : "border-[#e6e3dc] bg-[#f8f7f3]")}><p className={cn("text-sm font-semibold leading-5", dark ? "text-[#9eb0c6]" : "text-[#707987]")}>Since previous scan</p><p className="mt-2 text-3xl font-black text-[#37b66f]">↑ 6</p></div>
              <div className={cn("rounded-2xl border p-4 text-center", dark ? "border-[#29425f] bg-[#102742]" : "border-[#e6e3dc] bg-[#f8f7f3]")}><p className={cn("text-sm font-semibold leading-5", dark ? "text-[#9eb0c6]" : "text-[#707987]")}>Confidence</p><p className={cn("mt-2 text-3xl font-black", dark ? "text-white" : "text-[#0d213f]")}>91%</p></div>
            </div>
            <div className="mx-auto flex size-40 items-center justify-center rounded-full border-[12px] border-[#ffbb00] bg-[#fbfaf7]"><div className="text-center"><span className="text-3xl font-black text-[#0d213f]">78</span><span className="ml-0.5 text-xs text-[#707987]">/100</span><p className="mt-1 text-sm font-semibold text-[#9a7000]">Good</p></div></div>
            <div className="space-y-2">
              <ScoreMeter label="Social consistency" value={71} dark={dark} />
              <ScoreMeter label="Media completeness" value={84} dark={dark} />
            </div>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <ScoreMeter label="Discoverability" value={82} dark={dark} />
            <ScoreMeter label="Official source coverage" value={75} dark={dark} />
          </div>
          <p className="mt-8 text-xs text-[#707987]">Last verified scan May 16, 2026 · Methodology v2.1 · Fictional preview</p>
        </div>
      ) : null}

      {activeTab === "Social Presence" ? (
        <div className="pt-6">
          <div className="flex items-center justify-end"><span className="text-xs text-[#707987]">Last verified</span></div>
          <div className="mt-2 divide-y divide-[#ebe9e2]">{sources.map(([Icon, channel, handle, state]) => <button key={channel} type="button" onClick={() => openAction(`${channel} source`, `${handle}. The production source record will include verification evidence and scan history.`)} className="grid min-h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-3 text-left outline-none focus:ring-2 focus:ring-[#ffbb00] sm:grid-cols-[auto_7rem_1fr_auto]"><Icon className={cn("size-5", dark ? "text-white" : "text-[#0d213f]")} aria-hidden /><span className={cn("font-semibold", dark ? "text-white" : "text-[#0d213f]")}>{channel}</span><span className={cn("text-sm", dark ? "text-[#9eb0c6]" : "text-[#69717d]")}>{handle}</span><PreviewBadge tone={state === 'Verified' ? 'green' : 'gold'}>{state}</PreviewBadge></button>)}</div>
        </div>
      ) : null}

      {activeTab === "Recommendations" ? (
        <div className="pt-6">
          <div className="flex items-center justify-end"><span className="text-xs font-bold text-[#9a7000]">3 prioritized</span></div>
          <div className="mt-2 divide-y divide-[#ebe9e2]">{[['Connect a verified YouTube channel','89%','Media Ops'],['Update official roster bio','72%','Content Ops'],['Publish cleared interview clip','68%','Media Ops']].map(([title, confidence, owner]) => <button key={title} type="button" onClick={() => openAction(title, `Evidence, expected impact, confidence ${confidence}, and owner ${owner} will remain visible in the production workflow.`)} className="grid min-h-[68px] w-full grid-cols-[1fr_auto] items-center gap-3 text-left outline-none focus:ring-2 focus:ring-[#ffbb00]"><span><span className={cn("block font-semibold", dark ? "text-white" : "text-[#0d213f]")}>{title}</span><span className="mt-1 block text-xs text-[#707987]">Measured evidence → BLTZ recommendation</span></span><span className={cn("text-right text-xs", dark ? "text-[#9eb0c6]" : "text-[#69717d]")}><strong className={cn("block", dark ? "text-white" : "text-[#0d213f]")}>{confidence}</strong>{owner}</span></button>)}</div>
        </div>
      ) : null}
    </section>
  );
}

export function PlayersWorkspace() {
  const [activeDetailTab, setActiveDetailTab] = useState<PlayerDetailTab>("Overview");
  const [selectedId, setSelectedId] = useState("maya");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const openAction = (title: string, description: string) => setModal({ title, description });
  const tone = useReferencePageTone("dark");
  const dark = tone === "dark" || tone === "team";

  function changePlayerPage(tab: string) {
    if (tab !== "Roster") openAction(tab, `${tab} remains a top-level Players workspace and will connect to organization membership workflows in its owning phase.`);
  }

  return (
    <>
      <WorkspaceHeader eyebrow="Player operations" title="Players & roster" description="Manage your athlete roster, staff, and player access." action={<button type="button" onClick={() => openAction("Add a player", "The production flow will validate identity and organization membership before adding a canonical player record.")} className={cn(previewButton, dark ? "bg-[#1675ff] text-white" : "bg-[#ffbb00] text-[#0d213f]")}><IconUserPlus className="size-4" aria-hidden /> Add player</button>} />

      <FolderTabs tabs={playerPageTabs} active="Roster" onChange={changePlayerPage} label="Players workspace views" />
      <div className={cn("rounded-tl-none border-t-2 pt-5", dark ? "border-[#29425f]" : "border-[#d7d5cc]")}>

      <RosterWorkspace selectedId={selectedId} setSelectedId={setSelectedId} query={query} setQuery={setQuery} openAction={openAction} tone={tone} activeDetailTab={activeDetailTab} setActiveDetailTab={setActiveDetailTab} />
      </div>

      <PreviewModal open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null); }} title={modal?.title ?? "Preview"} description={modal?.description ?? "Preview interaction"}><div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5"><p className="text-sm leading-6 text-neutral-300">This interaction demonstrates the intended workflow only. Production actions require organization-scoped authorization, validation, persistence, and audit history.</p></div></PreviewModal>
    </>
  );
}
