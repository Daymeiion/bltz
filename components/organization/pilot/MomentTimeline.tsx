"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconCheck, IconChevronDown, IconExternalLink, IconPlus } from "@tabler/icons-react";
import type { AthleteFile, PilotActivation, PilotAthleteMedia } from "@/lib/enterprise-crm/pilot/types";
import type { PendingMedia } from "./MediaAttach";
import { MomentMedia } from "./MomentMedia";
import { DismissMenu } from "./Dismiss";
import { MOMENT_REASONS } from "@/lib/enterprise-crm/pilot/dismissals-shared";
import { cn } from "@/lib/utils";

type Moment = AthleteFile["moments"][number];

function longDate(date: string | null): string {
  if (!date) return "Date unknown";
  if (/^\d{4}$/.test(date)) return date;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * Career Moments as an expandable timeline: game numbers up front, then the
 * sources, coverage of the same day, and what the school has already run from it.
 */
export function MomentTimeline({ file, activations, media, organizationId, preview, canManage, onPlan, onShowActivation, onAddMedia, onLinkMedia, onDismiss }: {
  file: AthleteFile;
  activations: readonly PilotActivation[];
  media: readonly PilotAthleteMedia[];
  organizationId: string;
  preview: boolean;
  canManage: boolean;
  onAddMedia: (item: PendingMedia & { momentId: string }) => Promise<boolean>;
  onLinkMedia: (mediaId: string, momentId: string | null) => Promise<boolean>;
  /** Hides the Moment, and the signals it drives, from this school only. */
  onDismiss?: (moment: Moment, reason: string) => void;
  onPlan: (moment: Moment) => void;
  onShowActivation: (id: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const reduce = useReducedMotion();
  return (
    <ol className="pilot-moments">
      {file.moments.map((moment) => {
        const expanded = open === moment.id;
        const stats = moment.stats ?? [];
        const sources = moment.sourceLinks ?? [];
        const coverage = moment.date && moment.date.length === 10 ? (file.research ?? []).filter((item) => item.aboutDate === moment.date) : [];
        const signal = file.signals.find((row) => row.momentId === moment.id);
        // Planned from the Moment itself or from the signal it drives.
        const runs = activations.filter((row) => row.status !== "cancelled" && (row.momentId === moment.id || (signal && row.signalKey === signal.key)));
        return (
          <li key={moment.id} className={cn("pilot-moment", expanded && "pilot-moment--open")}>
            <button type="button" className="pilot-moment__head" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : moment.id)}>
              <span className="pilot-moment__date">{longDate(moment.date)}</span>
              <span className="pilot-moment__title">
                <strong>{moment.title}</strong>
                <small>{moment.status === "verified" ? "Verified" : "Awaiting BLTZ review"} · {moment.sources} source{moment.sources === 1 ? "" : "s"}{signal ? ` · ${signal.headline}` : ""}</small>
              </span>
              {stats.length ? <span className="pilot-moment__peek">{stats.slice(0, 2).map((stat) => <b key={stat.label}>{stat.value} <i>{stat.label}</i></b>)}</span> : null}
              <IconChevronDown stroke={1.6} aria-hidden className="pilot-moment__chevron" />
            </button>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div key="body" className="pilot-moment__panel" initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? undefined : { height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}>
                  <div className="pilot-moment__body">
                    {stats.length ? <dl className="pilot-moment__stats">{stats.map((stat) => <div key={stat.label}><dd>{stat.value}</dd><dt>{stat.label}</dt></div>)}</dl> : null}
                    {sources.length ? (
                      <div><h4>Sources</h4><ul className="pilot-moment__sources">{sources.map((source) => (
                        <li key={`${source.label}-${source.url ?? ""}`}><IconCheck stroke={2} aria-hidden /><span>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<IconExternalLink stroke={1.5} aria-hidden /></a> : <strong>{source.label}</strong>}{source.note ? <small>{source.note}</small> : null}</span></li>
                      ))}</ul></div>
                    ) : null}
                    {coverage.length ? (
                      <div><h4>Coverage of this game</h4><ul className="pilot-moment__sources">{coverage.map((item) => (
                        <li key={item.id}><IconExternalLink stroke={1.5} aria-hidden /><span><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a><small>{item.publisher}</small></span></li>
                      ))}</ul></div>
                    ) : null}
                    <MomentMedia moment={moment} media={media} organizationId={organizationId} playerId={file.player.id} playerName={file.player.name} preview={preview} canManage={canManage} onAdd={onAddMedia} onLink={onLinkMedia} />
                    <div className="pilot-moment__foot">
                      {runs.length ? <span className="pilot-moment__runs">{runs.map((row) => <button key={row.id} type="button" onClick={() => onShowActivation(row.id)}>{row.title}</button>)}</span>
                        : <span className="pilot-quiet">Nothing planned from this Moment yet.</span>}
                      {canManage && onDismiss ? <DismissMenu choices={MOMENT_REASONS.map((reason) => ({ label: reason, onSelect: () => onDismiss(moment, reason) }))} /> : null}
                      {canManage ? <button type="button" className="pilot-pill pilot-pill--ghost" onClick={() => onPlan(moment)}><span>Plan from this Moment</span><span className="pilot-pill__icon" aria-hidden><IconPlus stroke={1.5} /></span></button> : null}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </li>
        );
      })}
    </ol>
  );
}
