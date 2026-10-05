import {
  SIGNAL_SCORE_SCALE,
  type IntelligenceOpportunity,
  type IntelligenceSignal,
  type SignalEvaluationOptions,
  type SignalEvaluationResult,
  type SignalEvidence,
  type SignalMomentFact,
} from "./types";

const DAY_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function confidenceValid(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Date.parse alone accepts impossible dates such as February 30. */
function exactDate(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value ? parsed : null;
}

function instant(value: string): number | null {
  if (!ISO_INSTANT.test(value) || exactDate(value.slice(0, 10)) === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function windowDays(value: number | undefined, defaultDays: number) {
  const resolved = value ?? defaultDays;
  if (!Number.isInteger(resolved) || resolved < 0 || resolved > 366) {
    throw new RangeError("signal windows must be whole days between 0 and 366");
  }
  return resolved;
}

function validEvidence(evidence: SignalEvidence[], asOf: number): boolean {
  const observed = new Map<string, string>();
  return evidence.length > 0 && evidence.every(item => {
    const fetched = instant(item.fetchedAt);
    const signature = JSON.stringify([item.sourceId, item.sourceLabel, item.sourceProvider,
      item.sourceLocator, item.sourceUrl, item.fetchedAt, item.assertion, item.confidence]);
    const previous = observed.get(item.id);
    if (previous !== undefined && previous !== signature) return false;
    observed.set(item.id, signature);
    return UUID.test(item.id) && UUID.test(item.sourceId)
      && Boolean(item.sourceLabel.trim()) && Boolean(item.assertion.trim())
      && Boolean(item.sourceProvider.trim())
      && (item.sourceProvider === "manual" || Boolean(item.sourceLocator?.trim()))
      && confidenceValid(item.confidence) && fetched !== null && fetched <= asOf;
  });
}

function orderedEvidence(items: SignalEvidence[]) {
  return [...new Map(items.map(item => [item.id, item])).values()]
    .sort((a, b) => a.id.localeCompare(b.id));
}

function makeSignal(
  fact: SignalMomentFact,
  type: IntelligenceSignal["type"],
  targetDate: string,
  asOf: string,
  score: number,
  explanation: string,
  data: IntelligenceSignal["data"],
  evidence: SignalEvidence[] = fact.evidence,
): IntelligenceSignal {
  const sortedEvidence = orderedEvidence(evidence);
  return {
    key: `${type}:v1:${fact.playerId}:${fact.momentId}:${targetDate}`,
    type, ruleVersion: "v1", playerId: fact.playerId, momentId: fact.momentId,
    score, scoreScale: SIGNAL_SCORE_SCALE,
    confidence: Math.min(fact.confidence, ...sortedEvidence.map(item => item.confidence)),
    explanation, evidence: sortedEvidence,
    sourceEntities: [
      { type: "player", id: fact.playerId },
      { type: "moment", id: fact.momentId },
      ...[...new Set(sortedEvidence.map(item => item.sourceId))].sort()
        .map(id => ({ type: "source" as const, id })),
    ],
    detectedAt: asOf, asOf, targetDate, data, status: "candidate",
  };
}

function opportunityFor(signal: IntelligenceSignal): IntelligenceOpportunity {
  const anniversary = signal.type === "historical_anniversary";
  const type = anniversary ? "anniversary_retrospective_review" : "career_milestone_review";
  return {
    key: `${type}:v1:${signal.key}`,
    type, playerId: signal.playerId, momentId: signal.momentId,
    signalKeys: [signal.key], strength: signal.score, confidence: signal.confidence,
    explanation: `${signal.explanation} Review this ${anniversary ? "retrospective" : "career milestone"} opportunity and its evidence. Check available media, rights, and athlete preferences before proposing an activation.`,
    evidence: signal.evidence, status: "candidate",
  };
}

/** Pure, reproducible evaluator. Never fetches, publishes, merges identities, or writes. */
export function evaluateIntelligenceSignals(
  facts: SignalMomentFact[],
  options: SignalEvaluationOptions,
): SignalEvaluationResult {
  const asOfInstant = instant(options.asOf);
  if (asOfInstant === null) throw new RangeError("asOf must be a valid ISO timestamp with a UTC offset");
  const asOf = new Date(asOfInstant).toISOString();
  const today = exactDate(asOf.slice(0, 10))!;
  const year = new Date(today).getUTCFullYear();
  const anniversaryWindow = windowDays(options.anniversaryWindowDays, 30);
  const milestoneWindow = windowDays(options.milestoneRecencyDays, 30);
  const signals = new Map<string, IntelligenceSignal>();
  const skipped: SignalEvaluationResult["skipped"] = [];

  // Duplicate graph rows must not invent duplicate signals or choose conflicting facts.
  const grouped = new Map<string, SignalMomentFact[]>();
  for (const fact of facts) {
    const identity = `${fact.playerId}:${fact.momentId}`;
    grouped.set(identity, [...(grouped.get(identity) ?? []), fact]);
  }
  for (const entries of grouped.values()) {
    const fact = entries[0];
    const skip = (reason: string) => skipped.push({ playerId: fact.playerId, momentId: fact.momentId, reason });
    if (entries.length > 1) { skip("duplicate_moment_facts_require_resolution"); continue; }
    if (!UUID.test(fact.playerId) || !UUID.test(fact.momentId)) { skip("invalid_canonical_identity"); continue; }
    if (fact.verificationStatus !== "verified") { skip("moment_or_athlete_relationship_unverified"); continue; }
    if (!fact.title.trim() || !confidenceValid(fact.confidence)) { skip("invalid_moment_fact"); continue; }
    if (!validEvidence(fact.evidence, asOfInstant)) { skip("missing_invalid_or_future_evidence"); continue; }
    const occurredAt = exactDate(fact.occurredOn);
    if (fact.datePrecision !== "day" || occurredAt === null) { skip("exact_occurrence_date_required"); continue; }
    if (occurredAt > today) { skip("future_moment"); continue; }

    const occurrenceYear = new Date(occurredAt).getUTCFullYear();
    const monthDay = fact.occurredOn!.slice(4);
    // Leap-day anniversaries are evaluated only on actual February 29.
    for (const targetYear of [year, year + 1]) {
      const targetDate = `${String(targetYear).padStart(4, "0")}${monthDay}`;
      const anniversaryAt = exactDate(targetDate);
      if (anniversaryAt === null || targetYear <= occurrenceYear) continue;
      const daysUntil = (anniversaryAt - today) / DAY_MS;
      if (daysUntil < 0 || daysUntil > anniversaryWindow) continue;
      const anniversaryYears = targetYear - occurrenceYear;
      const proximity = anniversaryWindow === 0 ? 40 : Math.round(40 * (1 - daysUntil / anniversaryWindow));
      const roundYearBonus = anniversaryYears % 5 === 0 ? 20 : 0;
      const explanation = `The ${anniversaryYears}-year anniversary of "${fact.title}" (${fact.occurredOn}) falls on ${targetDate}, ${daysUntil} UTC calendar day${daysUntil === 1 ? "" : "s"} from the evaluation date. Verified graph evidence establishes the moment and athlete relationship. Editorial score: 40 base + ${proximity} date proximity + ${roundYearBonus} five-year anniversary bonus = ${40 + proximity + roundYearBonus}/100.`;
      const signal = makeSignal(fact, "historical_anniversary", targetDate, asOf,
        40 + proximity + roundYearBonus, explanation, { anniversaryYears, daysUntil, anniversaryWindowDays: anniversaryWindow });
      signals.set(signal.key, signal);
    }

    const milestone = fact.milestone;
    if (milestone) {
      const ageDays = (today - occurredAt) / DAY_MS;
      if (milestone.verificationStatus !== "verified" || !validEvidence(milestone.evidence, asOfInstant)
        || !validEvidence([...fact.evidence, ...milestone.evidence], asOfInstant)
        || !milestone.label.trim() || !milestone.statistic.trim() || !milestone.unit.trim()
        || !Number.isFinite(milestone.value) || !Number.isFinite(milestone.threshold)
        || milestone.threshold <= 0 || milestone.value < milestone.threshold) {
        skip("career_milestone_assertion_not_supported");
      } else if (ageDays <= milestoneWindow) {
        const score = 70;
        const explanation = `Verified career milestone "${milestone.label}" on ${fact.occurredOn}: ${milestone.statistic} = ${milestone.value} ${milestone.unit}, meeting the explicit threshold of ${milestone.threshold} ${milestone.unit}. The moment is ${ageDays} UTC calendar day${ageDays === 1 ? "" : "s"} old. Editorial score: fixed 70/100 for a reviewed milestone inside the ${milestoneWindow}-day window. This rule does not infer a first crossing or a record.`;
        const signal = makeSignal(fact, "career_milestone", fact.occurredOn!, asOf, score, explanation,
          { statistic: milestone.statistic, value: milestone.value, threshold: milestone.threshold, unit: milestone.unit, ageDays, milestoneRecencyDays: milestoneWindow },
          [...fact.evidence, ...milestone.evidence]);
        signals.set(signal.key, signal);
      }
    }
  }
  const orderedSignals = [...signals.values()].sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return { asOf, signals: orderedSignals, opportunities: orderedSignals.map(opportunityFor),
    skipped: skipped.sort((a, b) => `${a.playerId}:${a.momentId}:${a.reason}`.localeCompare(`${b.playerId}:${b.momentId}:${b.reason}`)) };
}
