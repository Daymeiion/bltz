"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { summarizeReach, type ActivationKind, type PilotActivation } from "@/lib/enterprise-crm/pilot/types";
import { cn } from "@/lib/utils";
import { AthleteAvatars } from "./AthleteAvatars";
import { AnimatePresence, MotionItem } from "./PilotMotion";
import { Bezel } from "./PilotPrimitives";

const TABS: Array<{ id: "all" | ActivationKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "post", label: "Posts" },
  { id: "video", label: "Videos" },
  { id: "article", label: "Articles" },
  { id: "event", label: "Events" },
  { id: "campaign", label: "Campaigns" },
];
const KIND_LABEL: Record<ActivationKind, string> = { post: "Post", video: "Video", article: "Article", campaign: "Campaign", event: "Event" };

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

/** Everything staff planned or posted, sorted by type, with how far it went and who was featured. */
export function ActivityPanel({ activity, intelligenceHref }: { activity: { state: "ready" | "unavailable"; activations: PilotActivation[] }; intelligenceHref: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const live = activity.activations.filter((row) => row.status !== "cancelled");
  const rows = tab === "all" ? live : live.filter((row) => row.kind === tab);
  const totals = summarizeReach(rows);

  return (
    <Bezel label="Activity and reach">
      <div className="pilot-card-head"><div><h2>Activity and reach</h2><p>Everything your staff planned or posted, and how far it went</p></div></div>
      <div className="pilot-pill-tabs" role="tablist" aria-label="Activity type">
        {TABS.map((item) => {
          const count = item.id === "all" ? live.length : live.filter((row) => row.kind === item.id).length;
          return (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className="pilot-pill-tabs__tab" onClick={() => setTab(item.id)}>
              {tab === item.id ? <motion.span layoutId="pilot-activity-tab" className="pilot-pill-tabs__bg" transition={{ type: "spring", stiffness: 420, damping: 36 }} /> : null}
              <span>{item.label}</span><em>{count}</em>
            </button>
          );
        })}
      </div>
      <div className="pilot-reach-strip">
        {[
          ["Posted", String(totals.posted)],
          ["Planned", String(totals.planned)],
          ["Post reach", compact(totals.impressions)],
          ["Engagements", compact(totals.engagements)],
          ["Locker visits from shares", compact(totals.visits)],
        ].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </div>
      {activity.state === "unavailable" ? <p className="pilot-quiet">Activity is temporarily unavailable.</p>
        : rows.length === 0 ? <p className="pilot-quiet">{live.length ? `No ${TABS.find((item) => item.id === tab)?.label.toLowerCase()} yet.` : "No activations yet. Open a player in Intelligence and plan one from a signal."}</p>
        : (
          <ul className="pilot-activity" role="tabpanel">
            <AnimatePresence initial={false} mode="popLayout">
              {rows.map((row) => (
                <MotionItem key={row.id}>
                  <span className="pilot-tag">{KIND_LABEL[row.kind]}</span>
                  <Link href={`${intelligenceHref}/${row.playerId}`} className="pilot-activity__title"><strong>{row.title}</strong><small>{row.athletes.length > 1 ? `${row.athletes.length} former players` : row.playerName ?? "Former player"}</small></Link>
                  <AthleteAvatars athletes={row.athletes} baseHref={intelligenceHref} />
                  <span className={cn("pilot-status", `pilot-status--${row.status}`)}>{row.status === "posted" ? "Posted" : "Planned"}</span>
                  <span className="pilot-activity__numbers"><b>{row.impressions === null ? "—" : compact(row.impressions)}</b> reach · <b>{compact(row.visits)}</b> visits</span>
                </MotionItem>
              ))}
            </AnimatePresence>
          </ul>
        )}
    </Bezel>
  );
}
