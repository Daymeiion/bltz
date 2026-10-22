import type { GraphEvidence, GraphMoment } from "@/lib/intelligence/contracts";
import { evaluateIntelligenceSignals } from "./evaluate";
import type { GameMilestoneFact, SignalEvaluationOptions, SignalEvidence, SignalMomentFact, VerifiedMilestoneFact } from "./types";

/** Incomplete source records cannot support deterministic signals. */
function evidenceForSignal(evidence: GraphEvidence): SignalEvidence | null {
  if (evidence.status !== "verified" || evidence.confidence === null
    || !evidence.source.id || !evidence.source.fetchedAt) return null;
  const locator = evidence.source.locator;
  return {
    id: evidence.id, sourceId: evidence.source.id, sourceLabel: evidence.source.name,
    sourceProvider: evidence.source.provider, sourceLocator: locator,
    sourceUrl: locator && /^https?:\/\//i.test(locator) ? locator : null,
    fetchedAt: evidence.source.fetchedAt, assertion: evidence.statement,
    confidence: evidence.confidence,
  };
}

function milestoneAssertion(evidence: GraphEvidence): VerifiedMilestoneFact | null {
  const { label, statistic, value, threshold, unit } = evidence.data;
  const source = evidenceForSignal(evidence);
  if (!source || typeof label !== "string" || typeof statistic !== "string"
    || typeof value !== "number" || typeof threshold !== "number" || typeof unit !== "string") return null;
  return { label, statistic, value, threshold, unit, verificationStatus: "verified", evidence: [source] };
}

const GAME_MILESTONE_KINDS = new Set<GameMilestoneFact["kind"]>(["debut", "career_first", "career_high"]);

function gameMilestone(evidence: GraphEvidence): GameMilestoneFact | null {
  const { kind, label, statistic, value, league } = evidence.data;
  if (!evidenceForSignal(evidence) || typeof kind !== "string" || !GAME_MILESTONE_KINDS.has(kind as GameMilestoneFact["kind"])
    || typeof label !== "string" || !label.trim() || typeof league !== "string" || !league.trim()) return null;
  return { kind: kind as GameMilestoneFact["kind"], label: label.trim(), league,
    statistic: typeof statistic === "string" ? statistic : null, value: typeof value === "number" && Number.isFinite(value) ? value : null };
}

/**
 * Canonical graph → rule facts. A moment date is usable only with an explicit
 * reviewed occurrence assertion and the exact athlete association. An external
 * identity row, birth date, season year, or account timestamp is insufficient.
 */
export function signalFactsFromGraph(moments: GraphMoment[], playerId: string): SignalMomentFact[] {
  return moments.flatMap(moment => {
    const associations = moment.athletes.filter(athlete => athlete.athleteId === playerId);
    if (associations.length === 0) return [];
    const relevant = moment.evidence.filter(item => item.athleteId === playerId && item.momentId === moment.id);
    const occurrence = relevant.filter(item => item.factType === "moment_occurrence" && item.status === "verified");
    const dateConflict = occurrence.some(item => item.data.occurredOn !== moment.occurredOn);
    const milestones = relevant.filter(item => item.factType === "career_milestone" && item.status === "verified");
    const verifiedAssociations = associations.filter(association => association.status === "verified");
    // Several reviewed roles still describe one athlete/Moment relationship.
    // Pending or rejected roles do not erase established reviewed participation.
    const verified = moment.status === "verified" && verifiedAssociations.length > 0
      && moment.confidence !== null && verifiedAssociations.every(association => association.confidence !== null)
      && !dateConflict;
    const milestone = milestones.length === 1 ? milestoneAssertion(milestones[0]) : null;
    // Conflicting classifications are dropped rather than one being chosen.
    const games = relevant.filter(item => item.factType === "game_milestone" && item.status === "verified");
    const game = games.length === 1 ? gameMilestone(games[0]) : null;
    return [{
        playerId, momentId: moment.id, title: moment.title, occurredOn: moment.occurredOn,
        datePrecision: moment.datePrecision,
        verificationStatus: verified ? "verified" : "candidate",
        confidence: Math.min(moment.confidence ?? 0, ...verifiedAssociations.map(association => association.confidence ?? 0)),
        evidence: occurrence.filter(item => item.data.occurredOn === moment.occurredOn)
          .map(evidenceForSignal).filter((item): item is SignalEvidence => item !== null),
        ...(milestone ? { milestone } : {}),
        ...(game ? { gameMilestone: game } : {}),
      } satisfies SignalMomentFact];
  });
}

/** Server callers authorize graph reads before passing their data here. */
export function evaluateGraphIntelligence(moments: GraphMoment[], playerId: string, options: SignalEvaluationOptions) {
  return evaluateIntelligenceSignals(signalFactsFromGraph(moments, playerId), options);
}
