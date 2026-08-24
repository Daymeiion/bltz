"use client";

import { useState } from "react";
import {
  IconArrowRight,
  IconAlertTriangle,
  IconBell,
  IconBrush,
  IconCalendar,
  IconChecklist,
  IconCoin,
  IconFileCheck,
  IconLock,
  IconMessageCircle,
  IconPhoto,
  IconPaperclip,
  IconPalette,
  IconPlus,
  IconRoute,
  IconSend,
  IconShieldCheck,
  IconSpeakerphone,
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
  SectionHeading,
  WorkspaceHeader,
  previewButton,
} from "./PreviewPrimitives";

type OperationsSection = "rights" | "approvals" | "campaigns" | "attribution" | "messages" | "revenue" | "settings";

type WorkspaceConfig = {
  eyebrow: string;
  title: string;
  description: string;
  primary: string;
  tabs: readonly string[];
  columns: [string, string, string];
  rows: Array<{ title: string; detail: string; meta: string; status: string; tone: "green" | "gold" | "red" | "blue" | "neutral" }>;
};

const configs: Record<Exclude<OperationsSection, "settings">, WorkspaceConfig> = {
  rights: {
    eyebrow: "Clearance operations", title: "Rights", description: "Review safe rights summaries, restrictions, and readiness before a publishing decision.", primary: "Create review", tabs: ["Needs review", "Cleared", "Restricted", "Expiring"], columns: ["Asset or record", "Rights context", "Readiness"],
    rows: [
      { title: "Maya Johnson media day portrait", detail: "Editorial photo · Women’s Basketball", meta: "Photographer consent pending", status: "Needs review", tone: "gold" },
      { title: "Home opener team huddle", detail: "Video · Varsity Football", meta: "Organization-owned source", status: "Cleared", tone: "green" },
      { title: "Ryan Patel postgame interview", detail: "Video · Track Invitational", meta: "Territory restriction recorded", status: "Restricted", tone: "red" },
    ],
  },
  approvals: {
    eyebrow: "Review queue", title: "Approvals", description: "Keep media, player, and organization decisions accountable without turning the overview into a queue.", primary: "New request", tabs: ["Assigned to me", "Open", "Approved", "Declined"], columns: ["Approval request", "Owner", "State"],
    rows: [
      { title: "Locker publication · Jalen Brooks", detail: "3 media assets included", meta: "Owner: Media Ops", status: "Awaiting player", tone: "gold" },
      { title: "Campaign use · Fuel Tomorrow", detail: "Maya Johnson portrait", meta: "Owner: Rights Ops", status: "Internal review", tone: "blue" },
      { title: "Profile update · Ryan Patel", detail: "Official biography", meta: "Owner: Roster Ops", status: "Approved", tone: "green" },
    ],
  },
  campaigns: {
    eyebrow: "Activation planning", title: "Campaigns", description: "Organize partners, athletes, approved media, and measurable activation goals in one focused workspace.", primary: "Create campaign", tabs: ["Active", "Planning", "Completed", "Templates"], columns: ["Campaign", "Team and owner", "Progress"],
    rows: [
      { title: "Fuel Tomorrow", detail: "Gatorade · Spring 2026", meta: "Women’s Basketball · Maya Johnson", status: "6 of 8 ready", tone: "gold" },
      { title: "Win Every Day", detail: "Nike · Spring 2026", meta: "Men’s Soccer · Jalen Brooks", status: "Active", tone: "green" },
      { title: "Sound On", detail: "Beats · Summer 2026", meta: "Multi-team · Media Ops", status: "Planning", tone: "blue" },
    ],
  },
  attribution: {
    eyebrow: "Measured value", title: "Attribution", description: "Trace how assets, athletes, campaigns, and partners connect while separating measured facts from estimates.", primary: "Open model", tabs: ["Overview", "By player", "By media", "By partner"], columns: ["Attribution path", "Measured window", "Quality"],
    rows: [
      { title: "Top plays → Jalen Brooks → Nike", detail: "Media asset · Player · Partner", meta: "May 1–17 · 17-day denominator", status: "Measured", tone: "green" },
      { title: "Media day → Maya Johnson → Gatorade", detail: "Media asset · Player · Campaign", meta: "May 1–17 · partial source coverage", status: "Partial", tone: "gold" },
      { title: "Team huddle → Varsity Football", detail: "Media asset · Team", meta: "No partner association", status: "Unassigned", tone: "neutral" },
    ],
  },
  messages: {
    eyebrow: "Team coordination", title: "Messages & notes", description: "Keep conversations, private notes, assignments, and attachments next to the work they concern.", primary: "New message", tabs: ["Inbox", "Assigned", "Internal notes", "Archived"], columns: ["Conversation", "Context", "Activity"],
    rows: [
      { title: "Media approval follow-up", detail: "Emma Carter, Liam Patel", meta: "Jalen Brooks top plays", status: "2 unread", tone: "blue" },
      { title: "Gatorade agreement notes", detail: "Finance and Rights Ops", meta: "Fuel Tomorrow campaign", status: "Updated today", tone: "green" },
      { title: "Roster verification questions", detail: "Roster Ops", meta: "Track and Field", status: "Assigned", tone: "gold" },
    ],
  },
  revenue: {
    eyebrow: "Financial review", title: "Revenue", description: "Review attributed revenue and stakeholder allocations without mixing estimates with authoritative financial records.", primary: "Open allocation", tabs: ["Summary", "Records", "Allocations", "Disputes"], columns: ["Revenue record", "Attribution context", "State"],
    rows: [
      { title: "Gatorade · Fuel Tomorrow", detail: "$250,000.00 preview gross", meta: "Campaign · Maya Johnson", status: "Pending allocation", tone: "gold" },
      { title: "Nike · Win Every Day", detail: "$125,000.00 preview gross", meta: "Campaign · Jalen Brooks", status: "Reviewed", tone: "green" },
      { title: "Fanatics · Gear Up", detail: "$60,000.00 preview gross", meta: "Campaign · Avery Stokes", status: "Draft", tone: "neutral" },
    ],
  },
};

const icons = {
  rights: IconShieldCheck,
  approvals: IconChecklist,
  campaigns: IconSpeakerphone,
  attribution: IconRoute,
  messages: IconMessageCircle,
  revenue: IconCoin,
};

const workspaceSignals: Record<Exclude<OperationsSection, "settings" | "messages">, {
  title: string;
  value: string;
  label: string;
  steps: readonly string[];
}> = {
  rights: { title: "Clearance readiness", value: "74%", label: "14 of 19 assets have complete evidence", steps: ["Source", "Terms", "Approval", "Publish"] },
  approvals: { title: "Decision flow", value: "08", label: "open decisions across three departments", steps: ["Submitted", "Internal", "Player", "Resolved"] },
  campaigns: { title: "Activation readiness", value: "6 / 8", label: "requirements ready for Fuel Tomorrow", steps: ["Partner", "Players", "Media", "Launch"] },
  attribution: { title: "Evidence coverage", value: "82%", label: "measured paths in the May 1–17 window", steps: ["Media", "Player", "Campaign", "Value"] },
  revenue: { title: "Allocation state", value: "$435K", label: "fictional gross across reviewed records", steps: ["Gross", "Rights", "Shares", "Payout"] },
};

export function OperationsWorkspace({ section }: { section: OperationsSection }) {
  if (section === "settings") return <SettingsWorkspace />;
  if (section === "messages") return <MessagesWorkspace />;
  if (section === "attribution") return <AttributionWorkspace />;

  return <ConfiguredOperationsWorkspace section={section} />;
}

function AttributionWorkspace() {
  const tone = useReferencePageTone("dark");
  const dark = tone === "dark" || tone === "team";
  const panel = cn("min-w-0 overflow-hidden rounded-[24px] border p-5 sm:p-6", dark ? "border-[#29425f] bg-[#0b213d] text-white" : "border-[#d9d8d1] bg-white text-[#0d213f]");
  const [action, setAction] = useState<string | null>(null);
  const stages = [
    { title: "Media assets", value: "1,248", detail: "Content captured across channels", icon: IconPhoto },
    { title: "Athletes", value: "87", detail: "Players associated with content", icon: IconUsers },
    { title: "Campaigns", value: "36", detail: "Partner activations using content", icon: IconSpeakerphone },
    { title: "Revenue", value: "$4.37M", detail: "Attributed partner and sponsorship value", icon: IconCoin },
  ];
  return (
    <>
      <WorkspaceHeader eyebrow="Measured value" title="Attribution" description="Connect media assets, athletes, partners, campaigns, and revenue to measure true impact." action={<button type="button" onClick={() => setAction("Review attribution exceptions")} className={cn(previewButton, dark ? "bg-[#1675ff] text-white" : "bg-[#ffbb00] text-[#0d213f]")}>Review exceptions</button>} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className={panel}>
          <div className={cn("flex max-w-xl overflow-hidden rounded-2xl border p-1", dark ? "border-white/10 bg-[#132a46]" : "border-[#dddcd6] bg-[#f3f2ed]")}>{["Overview","Assets","Athletes","Partners"].map((tab,index) => <button key={tab} type="button" onClick={() => index > 0 && setAction(`${tab} attribution`)} className={cn("min-h-11 flex-1 rounded-xl text-sm font-semibold", index === 0 ? "bg-white text-[#0d213f] shadow-sm" : dark ? "text-[#b5c2d3]" : "text-[#66707d]")}>{tab}</button>)}</div>
          <div className="mt-8 grid grid-cols-3 divide-x divide-white/10 text-center"><div className="min-w-0 px-1"><p className="text-[10px] uppercase tracking-[0.08em] text-[#8ca0ba] sm:text-xs sm:tracking-[0.12em]">Attributed assets</p><p className="mt-2 text-2xl font-black sm:text-4xl">1,248</p></div><div className="min-w-0 px-1"><p className="text-[10px] uppercase tracking-[0.08em] text-[#8ca0ba] sm:text-xs sm:tracking-[0.12em]">Athletes connected</p><p className="mt-2 text-2xl font-black sm:text-4xl">87</p></div><div className="min-w-0 px-1"><p className="text-[10px] uppercase tracking-[0.08em] text-[#8ca0ba] sm:text-xs sm:tracking-[0.12em]">Attributed value</p><p className="mt-2 text-2xl font-black text-[#ffbb00] sm:text-4xl">$4.37M</p></div></div>
          <div className="mt-9 grid items-stretch gap-3 lg:grid-cols-4">
            {stages.map(({ title, detail, icon: Icon }, index) => <button key={title} type="button" onClick={() => setAction(title)} className={cn("relative min-h-52 rounded-[20px] border p-5 text-left outline-none focus:ring-2 focus:ring-[#ffbb00]", dark ? "border-[#34506e] bg-[#102944]" : "border-[#dddcd6] bg-[#f8f7f3]")}><span className="flex size-14 items-center justify-center rounded-full border border-[#1675ff] bg-[#1269d8] text-white shadow-lg"><Icon className="size-7" aria-hidden /></span><h2 className="mt-5 text-lg font-bold">{title}</h2><p className={cn("mt-2 text-sm leading-5", dark ? "text-[#b5c2d3]" : "text-[#677180]")}>{detail}</p>{index < stages.length - 1 ? <IconArrowRight className="absolute -right-5 top-1/2 z-10 hidden size-7 text-[#1675ff] lg:block" aria-hidden /> : null}</button>)}
          </div>
          <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-[#ffbb00]/40 bg-[#ffbb00]/10 px-4 py-3 text-center text-sm text-[#ffbb00]"><IconAlertTriangle className="size-5" aria-hidden /> Exceptions need review—missing links or data issues interrupt the measured path.</div>
        </section>
        <aside className={panel}><h2 className="flex items-center gap-3 text-xl font-bold"><IconAlertTriangle className="size-7 text-[#ffbb00]" aria-hidden /> Needs review</h2><div className="mt-6 space-y-3">{[["Missing athlete association","12 assets are missing athlete associations."],["Unmatched partner reference","8 campaigns have partner references that cannot be matched."],["Revenue not linked to campaign","5 revenue records are not linked to a campaign."]].map(([title,detail],index) => <button key={title} type="button" onClick={() => setAction(title)} className={cn("flex min-h-28 w-full items-center gap-4 rounded-2xl border p-4 text-left", dark ? "border-white/10 bg-[#132a46]" : "border-[#dddcd6] bg-[#f8f7f3]")}><span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#9a7000] text-xl font-black text-[#ffbb00]">{index + 1}</span><span className="flex-1"><strong className="block">{title}</strong><span className={cn("mt-1 block text-sm leading-5", dark ? "text-[#b5c2d3]" : "text-[#677180]")}>{detail}</span></span><IconArrowRight className="size-5" aria-hidden /></button>)}</div><button type="button" onClick={() => setAction("Review all exceptions")} className="mt-5 min-h-12 w-full rounded-xl bg-[#1675ff] font-semibold text-white">Review all exceptions</button></aside>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className={panel}><div className="flex gap-7 border-b border-white/10 text-sm"><span className="border-b-2 border-[#ffbb00] pb-3 font-semibold">By content</span><button type="button" onClick={() => setAction("By athlete")} className="pb-3">By athlete</button><button type="button" onClick={() => setAction("By partner")} className="pb-3">By partner</button></div><h2 className="mt-5 text-xl font-bold">Attributed value by content</h2><p className="mt-1 text-sm text-[#8ca0ba]">Honest denominator: $5.20M total partner spend</p><div className="mt-5 grid min-h-28 grid-cols-2 overflow-hidden rounded-xl text-white sm:flex"><div className="bg-[#1269d8] p-4 sm:flex-[35]"><IconPhoto className="size-6" /><strong className="mt-2 block">$1.82M</strong><span className="text-sm">Game highlights · 35%</span></div><div className="bg-[#1d7b45] p-4 sm:flex-[24]"><IconCalendar className="size-6" /><strong className="mt-2 block">$1.25M</strong><span className="text-sm">Behind the scenes · 24%</span></div><div className="bg-[#4d6179] p-4 sm:flex-[21]"><IconUsers className="size-6" /><strong className="mt-2 block">$1.09M</strong><span className="text-sm">Athlete features · 21%</span></div><div className="bg-[#d28d00] p-4 sm:flex-[16]"><IconSpeakerphone className="size-6" /><strong className="mt-2 block">$0.81M</strong><span className="text-sm">Live events · 16%</span></div></div></section>
        <aside className={panel}><p className="text-lg font-bold">Top contribution</p><div className="mt-7 flex items-center gap-5"><span className="flex size-28 items-center justify-center rounded-full border-8 border-[#62758d] bg-[#d8b99a] text-3xl font-black text-[#0d213f]">JB</span><div><h2 className="text-xl font-bold">Jalen Brooks</h2><p className="mt-3 text-sm text-[#8ca0ba]">Total attributed value</p><p className="mt-1 text-3xl font-black text-[#ffbb00]">$1.34M</p><p className="mt-2 text-sm">26% of total value</p></div></div><button type="button" onClick={() => setAction("Open athlete")} className="mt-6 min-h-12 w-full rounded-xl bg-[#1675ff] font-semibold text-white">Open athlete</button></aside>
      </div>
      <section className={cn(panel, "mt-5")}><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Recent attributed paths</h2><button type="button" onClick={() => setAction("All attributed paths")} className="text-sm font-semibold text-[#1675ff]">View all</button></div><div className="mt-5 divide-y divide-white/10">{[["Jalen Brooks Top Plays","Jalen Brooks","Nike · Win Every Day","$184,200"],["Maya Johnson Media Day","Maya Johnson","Gatorade · Fuel Tomorrow","$142,800"],["Home Opener Hype","Team association","Fanatics · Gear Up","$96,100"],["Locker Room Review","Maya Caldwell","Beats · Sound On","$72,400"],["Track Invitational Recap","Ryan Patel","Adidas · Built for More","$58,900"]].map(([asset,athlete,campaign,value]) => <button key={asset} type="button" onClick={() => setAction(asset)} className="grid min-h-16 w-full gap-2 py-3 text-left text-sm md:grid-cols-[1.2fr_0.8fr_1fr_auto] md:items-center"><strong>{asset}</strong><span className="text-[#8ca0ba]">{athlete}</span><span>{campaign}</span><span className="font-mono font-bold text-[#ffbb00]">{value}</span></button>)}</div></section>
      <PreviewModal open={action !== null} onOpenChange={(open) => { if (!open) setAction(null); }} title={action ?? "Attribution detail"} description="This reference-faithful preview opens the selected attribution context without persisting changes."><p className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm leading-6 text-neutral-300">Production attribution will expose source evidence, denominator, time window, confidence, exceptions, and server-authorized correction history.</p></PreviewModal>
    </>
  );
}

function MessagesWorkspace() {
  const tone = useReferencePageTone("dark");
  const dark = tone === "dark" || tone === "team";
  const [selectedThread, setSelectedThread] = useState("Maya Caldwell");
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const threads = [
    ["Maya Caldwell", "Locker media review", "Hi team, I’ve uploaded the latest clips…", "9:41 AM"],
    ["Jalen Brooks", "Partnership activation", "Can we sync on the upcoming activation?", "Yesterday"],
    ["Emma Carter", "Rights report draft", "Sharing the draft for your review…", "May 16"],
    ["Liam Patel", "Q2 content calendar", "Here’s the proposed calendar for Q2…", "May 15"],
    ["Morgan Lee", "Event recap", "Thanks for the support at the event…", "May 14"],
  ];
  return (
    <>
      <WorkspaceHeader eyebrow="Team coordination" title="Messages & notes" description="Centralize team communication, player context, private notes, and follow-up work." action={<button type="button" onClick={() => setNewMessageOpen(true)} className={cn(previewButton, "bg-[#1675ff] text-white")}><IconPlus className="size-4" aria-hidden /> New message</button>} />
      <div className={cn("space-y-4 rounded-[28px] p-4 shadow-[0_28px_80px_rgba(2,15,32,0.22)] sm:p-5", dark ? "bg-[#06182f] text-white" : "bg-[#f7f6f2] text-[#0d213f]")}>
        <div className={cn("grid min-h-[620px] overflow-hidden rounded-[24px] border xl:grid-cols-[27rem_minmax(26rem,1fr)_21rem]", dark ? "border-[#29425f] bg-[#0b213d]" : "border-[#dddcd6] bg-white")}>
          <section className="border-b border-[#29425f] xl:border-b-0 xl:border-r">
            <div className="flex gap-5 border-b border-[#29425f] px-5 text-sm text-[#afbdd0]">{['Inbox','Players','Teams','Internal'].map((tab,index) => <button key={tab} type="button" onClick={() => index > 0 && setAction(`${tab} messages`)} className={cn("relative min-h-16", index === 0 && "text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#ffbb00]")}>{tab}</button>)}</div>
            <div className="p-3">{threads.map(([name,subject,excerpt,time], index) => <button key={name} type="button" onClick={() => setSelectedThread(name)} className={cn("flex min-h-[76px] w-full items-center gap-3 rounded-xl px-3 text-left outline-none focus:ring-2 focus:ring-[#ffbb00]", selectedThread === name ? "bg-[#143d75]" : "border-b border-white/10 hover:bg-[#102944]")}><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#d8b99a] font-bold text-[#0d213f]">{name.split(' ').map(part => part[0]).join('')}</span><span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong className="truncate text-sm">{name}</strong><span className="shrink-0 text-xs text-[#9fb0c5]">{time}</span></span><span className="mt-1 block truncate text-sm">{subject}</span><span className="mt-1 block truncate text-xs text-[#9fb0c5]">{excerpt}</span></span>{index === 0 ? <span className="size-2 rounded-full bg-[#1675ff]" aria-hidden /> : null}</button>)}</div>
          </section>
          <section className="flex min-h-[500px] flex-col border-b border-[#29425f] p-5 xl:border-b-0 xl:border-r">
            <div className="flex items-start justify-between border-b border-white/10 pb-5"><div><h2 className="text-xl font-bold">Locker media review</h2><p className="mt-1 text-xs text-[#9fb0c5]">From: {selectedThread}</p></div><span className="text-xs text-[#9fb0c5]">Today, 9:41 AM</span></div>
            <div className="flex-1 space-y-5 py-5"><div className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#d8b99a] text-xs font-bold text-[#0d213f]">MC</span><div><p className="text-sm font-semibold">Maya Caldwell <span className="ml-2 text-xs font-normal text-[#8ca0ba]">9:41 AM</span></p><p className="mt-2 text-sm leading-6 text-[#d4deea]">Hi team, I’ve uploaded the latest Locker room footage. Please review it and send feedback by end of day.</p></div></div><div className="ml-12 rounded-2xl border border-white/10 bg-[#102944] p-4"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-xl bg-[#071a35]"><IconMessageCircle className="size-6 text-[#ffbb00]" aria-hidden /></span><div><p className="text-sm font-semibold">locker_room_review.mp4</p><p className="mt-1 text-xs text-[#8ca0ba]">MP4 · 128 MB · Fictional attachment</p></div></div></div><div className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#d8b99a] text-xs font-bold text-[#0d213f]">MC</span><p className="text-sm leading-6 text-[#d4deea]">We captured a few strong moments for social and sponsor highlights. I also attached potential quotes from the team.</p></div></div>
            <div className="rounded-2xl border border-white/10 bg-[#102944] p-2"><label><span className="sr-only">Type a preview message</span><textarea rows={2} placeholder="Type your message…" className="w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-[#7589a1]" /></label><div className="flex items-center justify-between"><button type="button" onClick={() => setAction("Add attachment")} aria-label="Add attachment" className="flex size-9 items-center justify-center rounded-lg border border-white/10"><IconPaperclip className="size-4" aria-hidden /></button><button type="button" onClick={() => setAction("Send message")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1675ff] px-5 text-sm font-semibold">Send <IconSend className="size-4" aria-hidden /></button></div></div>
          </section>
          <aside className="p-5"><h2 className="flex items-center gap-2 text-lg font-bold"><IconUsers className="size-5" aria-hidden /> Player context</h2><div className="mt-7 flex items-center gap-4"><span className="flex size-16 items-center justify-center rounded-full bg-[#d8b99a] text-lg font-black text-[#0d213f]">MC</span><div><p className="font-bold">Maya Caldwell</p><p className="mt-1 text-sm text-[#9fb0c5]">Wide Receiver · #17</p><p className="mt-2 text-sm font-semibold text-[#ffbb00]">BLTZ Thunder</p></div></div><p className="mt-8 text-sm font-semibold">Locker status</p><div className="mt-3 rounded-xl bg-[#132a46] p-4 text-sm"><span className="mr-2 inline-block size-2 rounded-full bg-[#ffbb00]" />Available<span className="mt-1 block text-xs text-[#9fb0c5]">Ready for media</span></div><div className="mt-4 grid gap-2"><PreviewLink href="/organization/preview/players">Open player</PreviewLink><PreviewLink href="/organization/preview/media">View media</PreviewLink></div></aside>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_21rem]"><section className={cn("rounded-[22px] border p-5", dark ? "border-[#29425f] bg-[#0b213d]" : "border-[#dddcd6] bg-white")}><div className="flex gap-8 border-b border-white/10 text-sm"><span className="border-b-2 border-[#ffbb00] pb-3 font-semibold">Notes</span><button type="button" onClick={() => setAction("Tasks")} className="pb-3 text-[#9fb0c5]">Tasks</button><button type="button" onClick={() => setAction("History")} className="pb-3 text-[#9fb0c5]">History</button></div><div className="mt-4 divide-y divide-white/10">{[['Emma Carter','Discussed the upcoming rights report with Maya.'],['Liam Patel','Planning a joint content piece with Jalen Brooks.'],['Morgan Lee','Confirmed event attendance and media access.']].map(([name,note]) => <button key={name} type="button" onClick={() => setAction(`${name} note`)} className="flex min-h-20 w-full items-center gap-3 text-left"><span className="size-2 rounded-full bg-[#ffbb00]" /><span><strong className="text-sm">{name}</strong><span className="mt-1 block text-xs text-[#9fb0c5]">{note}</span></span></button>)}</div></section><aside className={cn("rounded-[22px] border p-5", dark ? "border-[#29425f] bg-[#0b213d]" : "border-[#dddcd6] bg-white")}><h3 className="font-bold">Follow-up</h3><p className="mt-5 text-xs text-[#8ca0ba]">Assigned to</p><p className="mt-2 font-semibold">Liam Patel</p><p className="mt-6 text-xs text-[#8ca0ba]">Due date</p><p className="mt-2 flex items-center gap-2 font-semibold"><IconCalendar className="size-5 text-[#ffbb00]" aria-hidden /> May 22, 2026</p><button type="button" onClick={() => setAction("Mark follow-up complete")} className="mt-6 min-h-11 w-full rounded-xl bg-[#1675ff] font-semibold text-white">Mark complete</button></aside></div>
      </div>
      <PreviewModal open={newMessageOpen} onOpenChange={setNewMessageOpen} title="New message" description="Choose a player, teammate, or organization context before sending a production message."><div className="space-y-3"><label className="block"><span className="text-xs text-neutral-400">Recipient</span><input className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-white" defaultValue="Maya Caldwell" /></label><label className="block"><span className="text-xs text-neutral-400">Message</span><textarea rows={4} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-white" /></label></div></PreviewModal>
      <PreviewModal open={action !== null} onOpenChange={(open) => { if (!open) setAction(null); }} title={action ?? "Message action"} description="This preview control is connected; no message, note, or task was persisted."><p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-neutral-300">The production action will be organization-scoped, permission checked, and recorded in the relevant activity history.</p></PreviewModal>
    </>
  );
}

function ConfiguredOperationsWorkspace({
  section,
}: {
  section: Exclude<OperationsSection, "settings" | "messages" | "attribution">;
}) {
  const config = configs[section];
  const Icon = icons[section];
  const signal = workspaceSignals[section];
  const [activeTab, setActiveTab] = useState(config.tabs[0]);
  const [selected, setSelected] = useState<(typeof config.rows)[number] | null>(null);
  const [primaryOpen, setPrimaryOpen] = useState(false);

  return (
    <>
      <WorkspaceHeader eyebrow={config.eyebrow} title={config.title} description={config.description} action={<button type="button" onClick={() => setPrimaryOpen(true)} className={cn(previewButton, "bg-[#ffbb00] text-[#0d213f] hover:bg-[#ffc933]")}><IconPlus className="size-4" aria-hidden /> {config.primary}</button>} />
      <FolderTabs tabs={config.tabs} active={activeTab} onChange={setActiveTab} label={`${config.title} views`} />
      <FolderSurface className="rounded-tl-none">
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="min-w-0">
            <SectionHeading title={`${activeTab} list`} description={`Focused ${config.title.toLowerCase()} work for the active team and season.`} action={<PreviewBadge tone="gold">{config.rows.length} records</PreviewBadge>} />
            <div className="hidden grid-cols-[1.2fr_0.9fr_auto] gap-4 border-b border-[#dedcd4] px-4 pb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#898f99] md:grid"><span>{config.columns[0]}</span><span>{config.columns[1]}</span><span>{config.columns[2]}</span></div>
            <div className="divide-y divide-[#e6e4dc]">
              {config.rows.map((row) => (
                <button key={row.title} type="button" onClick={() => setSelected(row)} className="grid w-full gap-4 px-4 py-5 text-left outline-none transition hover:bg-[#f4f3ee] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffbb00] md:grid-cols-[1.2fr_0.9fr_auto] md:items-center">
                  <span className="flex items-center gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#0d213f] text-white"><Icon className="size-5" aria-hidden /></span><span><span className="block text-sm font-bold text-[#0d213f]">{row.title}</span><span className="mt-1 block text-xs text-[#777d87]">{row.detail}</span></span></span>
                  <span className="text-sm text-[#565f6d]">{row.meta}</span>
                  <span className="flex items-center gap-3"><PreviewBadge tone={row.tone}>{row.status}</PreviewBadge><IconArrowRight className="size-4 text-[#9297a0]" aria-hidden /></span>
                </button>
              ))}
            </div>
            <div className="mt-7"><PreviewNotice>Preview records demonstrate hierarchy only. Production detail remains role-authorized and audit-aware.</PreviewNotice></div>
          </section>
          <aside className="relative min-h-[420px] overflow-hidden rounded-[24px] bg-[#0d213f] p-6 text-white shadow-[0_20px_45px_rgba(13,33,63,0.16)]">
            <div className="absolute -right-16 -top-16 size-52 rounded-full border-[34px] border-white/[0.04]" aria-hidden />
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ffbb00] text-[#0d213f]"><Icon className="size-6" aria-hidden /></span>
            <p className="mt-9 text-xs font-bold uppercase tracking-[0.16em] text-[#9eb0c7]">{signal.title}</p>
            <p className="mt-3 font-[var(--font-oswald)] text-5xl font-semibold tracking-tight">{signal.value}</p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-[#bdc9d8]">{signal.label}</p>
            <div className="mt-10 space-y-3">
              {signal.steps.map((step, index) => (
                <button key={step} type="button" onClick={() => setSelected(config.rows[Math.min(index, config.rows.length - 1)])} className="group flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-left outline-none hover:border-[#ffbb00]/60 focus-visible:ring-2 focus-visible:ring-[#ffbb00]">
                  <span className={cn("flex size-7 items-center justify-center rounded-lg text-xs font-bold", index < 2 ? "bg-[#ffbb00] text-[#0d213f]" : "bg-white/10 text-white")}>{index + 1}</span>
                  <span className="flex-1 text-sm font-semibold">{step}</span>
                  <IconArrowRight className="size-4 text-[#7589a1] transition group-hover:translate-x-0.5 group-hover:text-[#ffbb00]" aria-hidden />
                </button>
              ))}
            </div>
          </aside>
        </div>
      </FolderSurface>

      <PreviewModal open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }} title={selected?.title ?? `${config.title} detail`} description="A simple detail view for information that should not expand the main list.">
        {selected ? <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><p className="text-xs text-neutral-400">Context</p><p className="mt-2 text-sm font-semibold">{selected.detail}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><p className="text-xs text-neutral-400">Current state</p><p className="mt-2 text-sm font-semibold">{selected.status}</p></div></div><p className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm leading-6 text-neutral-300">The production page will show only the fields and actions permitted for the active organization role. This preview performs no mutation.</p>{section === "rights" ? <PreviewLink href="/organization/preview/media">Open media</PreviewLink> : null}{section === "revenue" ? <PreviewLink href="/organization/preview/agreements">Open agreements</PreviewLink> : null}{section === "campaigns" ? <PreviewLink href="/organization/preview/reports">Open reports</PreviewLink> : null}</div> : null}
      </PreviewModal>
      <PreviewModal open={primaryOpen} onOpenChange={setPrimaryOpen} title={config.primary} description={`Reserved production flow for ${config.title.toLowerCase()}.`}><div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5"><p className="text-sm leading-6 text-neutral-300">This connected control opens a clear preview state. The owning phase will add validated form fields, server authorization, persistence, and audit behavior.</p></div></PreviewModal>
    </>
  );
}

function SettingsWorkspace() {
  const [activeTab, setActiveTab] = useState("Appearance");
  const [saved, setSaved] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);
  const tabs = ["Organization", "Teams", "Members", "Appearance", "Notifications"] as const;
  return (
    <>
      <WorkspaceHeader eyebrow="Workspace controls" title="Settings" description="Manage organization context and reserve safe customization controls without changing operational information hierarchy." action={<button type="button" onClick={() => setSaved(true)} className={cn(previewButton, "bg-[#ffbb00] text-[#0d213f]")}>Save preview settings</button>} />
      <FolderTabs tabs={tabs} active={activeTab} onChange={setActiveTab} label="Organization settings views" />
      <FolderSurface className="rounded-tl-none">
        {activeTab === "Appearance" ? <div className="grid gap-7 lg:grid-cols-[1fr_0.9fr]"><section><SectionHeading title="Organization theme" description="Brand expression changes approved tokens, never status meaning or contrast requirements." /><div className="space-y-5 rounded-[22px] border border-[#dfddd5] bg-white p-6"><fieldset><legend className="text-sm font-bold text-[#0d213f]">Accent color</legend><div className="mt-4 flex flex-wrap gap-3">{["#ffbb00", "#3b82f6", "#16a34a", "#dc2626"].map((color, index) => <label key={color} className={cn("flex size-12 cursor-pointer items-center justify-center rounded-2xl border-2", index === 0 ? "border-[#0d213f]" : "border-transparent")} style={{ backgroundColor: color }}><input type="radio" name="accent" defaultChecked={index === 0} className="sr-only" /><span className="sr-only">Accent {color}</span>{index === 0 ? <IconFileCheck className="size-5 text-[#0d213f]" aria-hidden /> : null}</label>)}</div></fieldset><label className="block"><span className="text-sm font-bold text-[#0d213f]">Sidebar motion</span><select className="mt-3 min-h-11 w-full rounded-xl border border-[#d8d7d0] bg-white px-3 text-sm text-[#0d213f] outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]"><option>Subtle (recommended)</option><option>Reduced</option><option>None</option></select></label><label className="flex items-center justify-between gap-4 rounded-2xl bg-[#f3f2ed] p-4"><span><span className="block text-sm font-bold text-[#0d213f]">Show team logo</span><span className="mt-1 block text-xs text-[#777d87]">Use the approved organization mark in the shell.</span></span><input type="checkbox" defaultChecked className="size-5 accent-[#ffbb00]" /></label></div></section><section className="rounded-[22px] bg-[#0d213f] p-6 text-white"><div className="flex items-center justify-between"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffcf4d]">Shell preview</p><IconPalette className="size-5 text-[#ffbb00]" aria-hidden /></div><div className="mt-10 rounded-[20px] bg-[#f5f4ef] p-5 text-[#0d213f]"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#ffbb00] font-black">W</span><span className="font-bold">Westlake Athletics</span></div><div className="mt-6 rounded-2xl border border-[#dedcd4] bg-white p-4"><p className="text-sm font-bold">Workspace folder</p><div className="mt-4 h-2 rounded-full bg-[#ffbb00]" /></div></div></section></div> : <SettingsList tab={activeTab} onSelect={setSelectedSetting} />}
      </FolderSurface>
      <PreviewModal open={saved} onOpenChange={setSaved} title="Preview settings saved" description="The controls demonstrated their expected feedback; no organization settings were persisted."><div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-5"><IconBrush className="size-6 shrink-0 text-[#ffbb00]" aria-hidden /><p className="text-sm leading-6 text-neutral-300">Production theme settings will be organization-scoped, contrast-validated, auditable, and applied only to approved customization tokens.</p></div></PreviewModal>
      <PreviewModal open={selectedSetting !== null} onOpenChange={(open) => { if (!open) setSelectedSetting(null); }} title={selectedSetting ?? "Setting detail"} description="Simple settings details are disclosed in a modal instead of making the main page denser."><p className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm leading-6 text-neutral-300">This preview record will become editable only when its organization-scoped permission and validation contract is implemented.</p></PreviewModal>
    </>
  );
}

function SettingsList({ tab, onSelect }: { tab: string; onSelect: (title: string) => void }) {
  const items = tab === "Members" ? [["Emma Carter", "Organization admin"], ["Liam Patel", "Media manager"], ["Sophia Nguyen", "Rights manager"]] : tab === "Teams" ? [["Varsity Football", "Active"], ["Women’s Basketball", "Active"], ["Track and Field", "Active"]] : tab === "Notifications" ? [["Approval assignments", "Immediate"], ["Rights expiration", "14 days before"], ["Export ready", "In app"]] : [["Organization name", "Westlake University Athletics"], ["Organization type", "School athletics"], ["Status", "Approved"]];
  const Icon = tab === "Members" ? IconUsers : tab === "Notifications" ? IconBell : IconLock;
  return <div><SectionHeading title={tab} description={`Simple ${tab.toLowerCase()} information for the preview shell.`} /><div className="space-y-3">{items.map(([title, value]) => <button key={title} type="button" onClick={() => onSelect(title)} className="flex w-full items-center gap-4 rounded-[18px] border border-[#e0ded6] bg-white p-4 text-left outline-none hover:border-[#ffbb00] focus-visible:ring-2 focus-visible:ring-[#ffbb00]"><span className="flex size-10 items-center justify-center rounded-2xl bg-[#0d213f] text-white"><Icon className="size-5" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-[#0d213f]">{title}</span><span className="mt-1 block text-sm text-[#777d87]">{value}</span></span><IconArrowRight className="size-4 text-[#9297a0]" aria-hidden /></button>)}</div></div>;
}
