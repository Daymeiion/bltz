"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconCalendarEvent, IconChartBar, IconCheck, IconChevronDown, IconNews, IconPlus, IconSparkles, IconSpeakerphone, IconUsers, IconVideo } from "@tabler/icons-react";
import { signalReasons, suggestActivations, VERDICT_ACTION, type ReachHistory, type Suggestion } from "@/lib/enterprise-crm/pilot/suggestions";
import type { ActivationKind, AthleteFile, PilotAthleteMedia } from "@/lib/enterprise-crm/pilot/types";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<ActivationKind, typeof IconNews> = { post: IconSpeakerphone, video: IconVideo, article: IconNews, campaign: IconUsers, event: IconCalendarEvent };
const KIND_LABEL: Record<ActivationKind, string> = { post: "Social post", video: "Video", article: "Article", campaign: "Campaign", event: "Event" };

function shortDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * The action half of a signal card: the instruction and target date, a suggestions
 * button that glows when the date is close, and a dropdown with why it matters and
 * ready-made activations. "Plan this" opens the composer pre-filled.
 */
export function SignalSuggestions({ signal, playerName, momentTitle, media, hasContact, followers, history, canManage, planned, onPlan, onPlanManual }: {
  signal: AthleteFile["signals"][number];
  playerName: string;
  momentTitle: string | null;
  media: readonly PilotAthleteMedia[];
  hasContact: boolean;
  followers: number;
  history: ReachHistory;
  canManage: boolean;
  planned: boolean;
  onPlan: (idea: Suggestion) => void;
  onPlanManual: () => void;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const panelId = useId();
  const reasons = [signal.explanation, ...signalReasons({ signal, playerName, momentTitle, media, followers })].filter(Boolean);
  const ideas = suggestActivations({ signal, playerName, momentTitle, media, hasContact, followers, history });
  const urgent = !planned && (signal.verdict === "act_now" || signal.verdict === "prepare");
  return (
    <div className="pilot-act">
      <div className="pilot-act__bar">
        <p className="pilot-act__do">{VERDICT_ACTION[signal.verdict]}{signal.verdict !== "upcoming" ? <span> by {shortDay(signal.targetDate)}</span> : null}</p>
        <div className="pilot-act__buttons">
          {ideas.length ? (
            <button type="button" className={cn("pilot-ideas-btn", urgent && "pilot-ideas-btn--urgent", open && "pilot-ideas-btn--open")} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
              <IconSparkles stroke={1.6} aria-hidden />
              <span>{ideas.length} ideas</span>
              <IconChevronDown stroke={1.6} aria-hidden className="pilot-ideas-btn__chevron" />
            </button>
          ) : null}
          {canManage ? (
            planned ? <span className="pilot-planned"><IconCheck stroke={1.5} aria-hidden />Activation planned</span>
              : <button type="button" className="pilot-pill pilot-pill--ghost" onClick={onPlanManual}><span>Plan activation</span><span className="pilot-pill__icon" aria-hidden><IconPlus stroke={1.5} /></span></button>
          ) : null}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div id={panelId} key="panel" className="pilot-act__panel" initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? undefined : { height: 0, opacity: 0 }} transition={{ duration: 0.36, ease: [0.32, 0.72, 0, 1] }}>
            <div className="pilot-act__inner">
              {reasons.length ? (
                <ul className="pilot-act__why" aria-label="Why it matters">
                  {reasons.map((line) => <li key={line}><IconCheck stroke={2} aria-hidden />{line}</li>)}
                </ul>
              ) : null}
              <ul className="pilot-act__ideas" aria-label="Suggested activations">
                {ideas.map((idea, index) => {
                  const Icon = KIND_ICON[idea.kind];
                  return (
                    <motion.li key={idea.id} className="pilot-idea" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: reduce ? 0 : 0.06 * index, ease: [0.32, 0.72, 0, 1] }}>
                      <div className="pilot-idea__head">
                        <span className="pilot-idea__icon" aria-hidden><Icon stroke={1.5} /></span>
                        <span className="pilot-idea__kind">{KIND_LABEL[idea.kind]}</span>
                        <span className={cn("pilot-idea__dot", idea.ready && "pilot-idea__dot--ready")} title={idea.status}><span className="sr-only">{idea.status}</span></span>
                      </div>
                      <strong>{idea.title}</strong>
                      <p>{idea.reasons[0]}</p>
                      <p className="pilot-idea__reach" title={idea.reach}><IconChartBar stroke={1.5} aria-hidden /><span>{idea.reachShort}</span><span className="sr-only">. {idea.reach}</span></p>
                      <div className="pilot-idea__foot">
                        <small className={cn("pilot-idea__status", idea.ready && "pilot-idea__status--ready")}>{idea.status}</small>
                        {canManage && !planned ? <button type="button" className="pilot-idea__plan" aria-label={`Plan this: ${idea.title}`} onClick={() => onPlan(idea)}>Plan this<IconPlus stroke={1.8} aria-hidden /></button> : null}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
