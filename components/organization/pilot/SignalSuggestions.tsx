"use client";

import { IconCalendarEvent, IconChartBar, IconNews, IconPlus, IconSpeakerphone, IconUsers, IconVideo } from "@tabler/icons-react";
import { signalReasons, suggestActivations, VERDICT_ACTION, type ReachHistory, type Suggestion } from "@/lib/enterprise-crm/pilot/suggestions";
import type { ActivationKind, AthleteFile, PilotAthleteMedia } from "@/lib/enterprise-crm/pilot/types";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<ActivationKind, typeof IconNews> = { post: IconSpeakerphone, video: IconVideo, article: IconNews, campaign: IconUsers, event: IconCalendarEvent };

function targetDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

/**
 * The decision for one signal: what to do by when, why it matters, and ready-made
 * activations with their expected reach. "Plan this" opens the composer pre-filled.
 */
export function SignalSuggestions({ signal, playerName, momentTitle, media, hasContact, followers, history, canManage, onPlan }: {
  signal: AthleteFile["signals"][number];
  playerName: string;
  momentTitle: string | null;
  media: readonly PilotAthleteMedia[];
  hasContact: boolean;
  followers: number;
  history: ReachHistory;
  canManage: boolean;
  onPlan: (idea: Suggestion) => void;
}) {
  const reasons = signalReasons({ signal, playerName, momentTitle, media, followers });
  const ideas = suggestActivations({ signal, playerName, momentTitle, media, hasContact, followers, history });
  const soon = signal.verdict === "act_now" || signal.verdict === "prepare";
  return (
    <>
      <p className="pilot-signal__do"><strong>{VERDICT_ACTION[signal.verdict]}</strong>{signal.verdict !== "upcoming" ? ` Target date: ${targetDay(signal.targetDate)}.` : ""}</p>
      {reasons.length ? <div className="pilot-why"><h4>Why it matters</h4><ul>{reasons.map((line) => <li key={line}>{line}</li>)}</ul></div> : null}
      {ideas.length ? (
        <details className="pilot-ideas" open={soon}>
          <summary>{ideas.length} suggested activation{ideas.length === 1 ? "" : "s"}</summary>
          <ul>
            {ideas.map((idea) => {
              const Icon = KIND_ICON[idea.kind];
              return (
                <li key={idea.id} className={cn("pilot-idea", idea.ready && "pilot-idea--ready")}>
                  <span className="pilot-idea__icon" aria-hidden><Icon stroke={1.5} /></span>
                  <div className="pilot-idea__body">
                    <strong>{idea.title}</strong>
                    {idea.reasons.map((line) => <p key={line}>{line}</p>)}
                    <p className="pilot-idea__reach"><IconChartBar stroke={1.5} aria-hidden /><span>{idea.reach}</span></p>
                    <div className="pilot-idea__foot">
                      <small className={cn("pilot-idea__status", idea.ready && "pilot-idea__status--ready")}>{idea.status}</small>
                      {canManage ? <button type="button" className="pilot-pill pilot-pill--ghost" aria-label={`Plan this: ${idea.title}`} onClick={() => onPlan(idea)}><span>Plan this</span><span className="pilot-pill__icon" aria-hidden><IconPlus stroke={1.5} /></span></button> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </>
  );
}
