import {
  SIGNAL_SCORE_SCALE,
  type AthleteBirthdayFact,
  type GameMilestoneKind,
  type IntelligenceOpportunity,
  type IntelligenceSignal,
  type SignalEvaluationOptions,
  type SignalEvaluationResult,
  type SignalEvidence,
  type SignalMomentFact,
  type SignalType,
  type SignalVerdict,
} from "./types";

const DAY_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
/** Proximity points scale over this fixed horizon, whatever the lookahead window. */
const PROXIMITY_HORIZON_DAYS = 30;
const ANNIVERSARY_TYPE: Record<GameMilestoneKind, SignalType> = {
  debut: "debut_anniversary", career_first: "career_first_anniversary", career_high: "career_high_anniversary",
};
/** Debuts and firsts are the career dates athletes and fans most often mark. */
const MILESTONE_BONUS: Record<GameMilestoneKind, number> = { debut: 15, career_first: 10, career_high: 10 };

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

/** One decision per signal: act this week, prepare this month, plan this quarter, or later. */
export function signalVerdict(daysUntil: number): SignalVerdict {
  return daysUntil <= 7 ? "act_now" : daysUntil <= 30 ? "prepare" : daysUntil <= 90 ? "plan" : "upcoming";
}

function proximityPoints(daysUntil: number): number {
  return Math.round(40 * (1 - Math.min(daysUntil, PROXIMITY_HORIZON_DAYS) / PROXIMITY_HORIZON_DAYS));
}

/** First occurrence of a month/day on or after today, in a later year than the origin, inside the window. */
function nextOccurrence(isoDay: string, today: number, window: number): { targetDate: string; years: number; daysUntil: number } | null {
  const originYear = Number(isoDay.slice(0, 4));
  const monthDay = isoDay.slice(4);
  const year = new Date(today).getUTCFullYear();
  // Leap-day dates are evaluated only on an actual February 29.
  for (const targetYear of [year, year + 1]) {
    const targetDate = `${String(targetYear).padStart(4, "0")}${monthDay}`;
    const at = exactDate(targetDate);
    if (at === null || targetYear <= originYear) continue;
    const daysUntil = (at - today) / DAY_MS;
    if (daysUntil < 0) continue;
    return daysUntil > window ? null : { targetDate, years: targetYear - originYear, daysUntil };
  }
  return null;
}

function orderedEvidence(items: SignalEvidence[]) {
  return [...new Map(items.map(item => [item.id, item])).values()]
    .sort((a, b) => a.id.localeCompare(b.id));
}

function makeSignal(
  subject: { playerId: string; momentId: string | null; confidence: number },
  type: SignalType,
  targetDate: string,
  daysUntil: number,
  asOf: string,
  score: number,
  explanation: string,
  data: IntelligenceSignal["data"],
  evidence: SignalEvidence[],
): IntelligenceSignal {
  const sortedEvidence = orderedEvidence(evidence);
  return {
    key: `${type}:v1:${subject.playerId}:${subject.momentId ?? "athlete"}:${targetDate}`,
    type, ruleVersion: "v1", playerId: subject.playerId, momentId: subject.momentId,
    verdict: signalVerdict(Math.max(daysUntil, 0)), daysUntil,
    score: Math.min(100, score), scoreScale: SIGNAL_SCORE_SCALE,
    confidence: Math.min(subject.confidence, ...sortedEvidence.map(item => item.confidence)),
    explanation, evidence: sortedEvidence,
    sourceEntities: [
      { type: "player", id: subject.playerId },
      ...(subject.momentId ? [{ type: "moment" as const, id: subject.momentId }] : []),
      ...[...new Set(sortedEvidence.map(item => item.sourceId))].sort()
        .map(id => ({ type: "source" as const, id })),
    ],
    detectedAt: asOf, asOf, targetDate, data, status: "candidate",
  };
}

function opportunityFor(signal: IntelligenceSignal): IntelligenceOpportunity {
  const type = signal.type === "birthday" ? "birthday_greeting_review"
    : signal.type === "career_milestone" ? "career_milestone_review" : "anniversary_retrospective_review";
  const subject = type === "birthday_greeting_review" ? "birthday greeting" : type === "career_milestone_review" ? "career milestone" : "retrospective";
  return {
    key: `${type}:v1:${signal.key}`,
    type, playerId: signal.playerId, momentId: signal.momentId,
    signalKeys: [signal.key], strength: signal.score, confidence: signal.confidence,
    explanation: `${signal.explanation} Review this ${subject} opportunity and its evidence. Check available media, rights, and athlete preferences before proposing an activation.`,
    evidence: signal.evidence, status: "candidate",
  };
}

/** Reviewed dates of birth only; an age, season or account date never stands in for one. */
function birthdaySignals(facts: AthleteBirthdayFact[], today: number, asOfInstant: number, asOf: string, window: number,
  skipped: SignalEvaluationResult["skipped"]): IntelligenceSignal[] {
  const byAthlete = new Map<string, AthleteBirthdayFact[]>();
  for (const fact of facts) byAthlete.set(fact.playerId, [...(byAthlete.get(fact.playerId) ?? []), fact]);
  return [...byAthlete.values()].flatMap(entries => {
    const fact = entries[0];
    const skip = (reason: string) => { skipped.push({ playerId: fact.playerId, momentId: null, reason }); return []; };
    if (new Set(entries.map(entry => entry.dob)).size > 1) return skip("conflicting_birth_dates_require_resolution");
    if (!UUID.test(fact.playerId)) return skip("invalid_canonical_identity");
    const born = exactDate(fact.dob);
    if (born === null || born >= today) return skip("exact_birth_date_required");
    if (!validEvidence(entries.flatMap(entry => entry.evidence), asOfInstant)) return skip("missing_invalid_or_future_evidence");
    const next = nextOccurrence(fact.dob, today, window);
    if (!next) return [];
    const { targetDate, years: age, daysUntil } = next;
    const proximity = proximityPoints(daysUntil);
    const roundAge = age % 10 === 0 ? 20 : age % 5 === 0 ? 10 : 0;
    const score = Math.min(100, 35 + proximity + roundAge);
    const explanation = `Turns ${age} on ${targetDate}, ${daysUntil} UTC calendar day${daysUntil === 1 ? "" : "s"} from the evaluation date, per the reviewed date of birth (${fact.dob}). Editorial score: 35 base + ${proximity} date proximity + ${roundAge} round-age bonus = ${score}/100.`;
    return [makeSignal({ playerId: fact.playerId, momentId: null, confidence: 1 }, "birthday", targetDate, daysUntil, asOf, score, explanation,
      { age, daysUntil, windowDays: window }, entries.flatMap(entry => entry.evidence))];
  });
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

    const next = nextOccurrence(fact.occurredOn!, today, anniversaryWindow);
    if (next) {
      const { targetDate, years: anniversaryYears, daysUntil } = next;
      const game = fact.gameMilestone;
      const proximity = proximityPoints(daysUntil);
      const roundYearBonus = anniversaryYears % 5 === 0 ? 20 : 0;
      const milestoneBonus = game ? MILESTONE_BONUS[game.kind] : 0;
      const score = Math.min(100, 40 + proximity + roundYearBonus + milestoneBonus);
      const what = game ? `${game.label} ("${fact.title}")` : `"${fact.title}"`;
      const explanation = `The ${anniversaryYears}-year anniversary of ${what} (${fact.occurredOn}) falls on ${targetDate}, ${daysUntil} UTC calendar day${daysUntil === 1 ? "" : "s"} from the evaluation date. Verified graph evidence establishes the moment and athlete relationship. Editorial score: 40 base + ${proximity} date proximity + ${roundYearBonus} five-year anniversary bonus${game ? ` + ${milestoneBonus} ${game.kind.replace("_", " ")} bonus` : ""} = ${score}/100.`;
      const data: IntelligenceSignal["data"] = { anniversaryYears, daysUntil, anniversaryWindowDays: anniversaryWindow,
        ...(game ? { milestoneKind: game.kind, milestoneLabel: game.label, league: game.league,
          ...(game.statistic ? { statistic: game.statistic } : {}), ...(game.value !== null ? { value: game.value } : {}) } : {}) };
      const signal = makeSignal(fact, game ? ANNIVERSARY_TYPE[game.kind] : "historical_anniversary", targetDate, daysUntil, asOf,
        score, explanation, data, fact.evidence);
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
        const signal = makeSignal(fact, "career_milestone", fact.occurredOn!, -ageDays, asOf, score, explanation,
          { statistic: milestone.statistic, value: milestone.value, threshold: milestone.threshold, unit: milestone.unit, ageDays, milestoneRecencyDays: milestoneWindow },
          [...fact.evidence, ...milestone.evidence]);
        signals.set(signal.key, signal);
      }
    }
  }
  for (const signal of birthdaySignals(options.birthdays ?? [], today, asOfInstant, asOf, anniversaryWindow, skipped)) signals.set(signal.key, signal);
  // Soonest first, so the first signal is always the next decision; score breaks ties.
  const orderedSignals = [...signals.values()].sort((a, b) => Math.max(a.daysUntil, 0) - Math.max(b.daysUntil, 0) || b.score - a.score || a.key.localeCompare(b.key));
  return { asOf, signals: orderedSignals, opportunities: orderedSignals.map(opportunityFor),
    skipped: skipped.sort((a, b) => `${a.playerId}:${a.momentId ?? ""}:${a.reason}`.localeCompare(`${b.playerId}:${b.momentId ?? ""}:${b.reason}`)) };
}
