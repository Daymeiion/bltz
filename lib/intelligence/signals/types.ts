/** Canonical IDs refer to public.players and BLTZ moments, never provider IDs. */
export interface SignalEvidence {
  id: string;
  sourceId: string;
  sourceLabel: string;
  sourceProvider: string;
  sourceLocator: string | null;
  sourceUrl: string | null;
  fetchedAt: string;
  assertion: string;
  confidence: number;
}

export interface VerifiedMilestoneFact {
  label: string;
  statistic: string;
  value: number;
  threshold: number;
  unit: string;
  verificationStatus: "candidate" | "verified" | "rejected";
  evidence: SignalEvidence[];
}

export interface SignalMomentFact {
  playerId: string;
  momentId: string;
  title: string;
  occurredOn: string | null;
  datePrecision: "day" | "year" | "unknown";
  verificationStatus: "candidate" | "verified" | "rejected";
  confidence: number;
  evidence: SignalEvidence[];
  /** Explicit reviewed career statistic assertion; not an inferred first crossing. */
  milestone?: VerifiedMilestoneFact;
  /** Reviewed game-level classification, e.g. a first recorded NFL game or a single-game career high. */
  gameMilestone?: GameMilestoneFact;
}

export type GameMilestoneKind = "debut" | "career_first" | "career_high";

/** Classification asserted by a reviewed `game_milestone` evidence row. */
export interface GameMilestoneFact {
  kind: GameMilestoneKind;
  /** Short reader label, e.g. "first NFL interception" or "career-high 13 tackles". */
  label: string;
  statistic: string | null;
  value: number | null;
  league: string;
}

/** Reviewed date of birth. A birthday never becomes a Moment or a career date. */
export interface AthleteBirthdayFact {
  playerId: string;
  dob: string;
  evidence: SignalEvidence[];
}

export const SIGNAL_SCORE_SCALE = "0–100 editorial review priority; not probability, earnings, or monetary value";

export type SignalType =
  | "historical_anniversary" | "debut_anniversary" | "career_first_anniversary" | "career_high_anniversary"
  | "career_milestone" | "birthday";

/** How soon to act, from UTC calendar days until the target date. */
export type SignalVerdict = "act_now" | "prepare" | "plan" | "upcoming";

export interface IntelligenceSignal {
  key: string;
  type: SignalType;
  ruleVersion: "v1";
  playerId: string;
  /** Null for athlete-level signals such as birthdays. */
  momentId: string | null;
  verdict: SignalVerdict;
  daysUntil: number;
  score: number;
  scoreScale: string;
  confidence: number;
  explanation: string;
  evidence: SignalEvidence[];
  sourceEntities: Array<{ type: "player" | "moment" | "source"; id: string }>;
  detectedAt: string;
  asOf: string;
  targetDate: string;
  data: Record<string, string | number>;
  status: "candidate";
}

export interface IntelligenceOpportunity {
  key: string;
  type: "anniversary_retrospective_review" | "career_milestone_review" | "birthday_greeting_review";
  playerId: string;
  momentId: string | null;
  signalKeys: string[];
  strength: number;
  confidence: number;
  explanation: string;
  evidence: SignalEvidence[];
  status: "candidate";
}

export interface SignalEvaluationOptions {
  /** Required ISO timestamp with an explicit UTC offset. Calendar rules use UTC. */
  asOf: string;
  anniversaryWindowDays?: number;
  milestoneRecencyDays?: number;
  /** Reviewed dates of birth evaluated with the same window as anniversaries. */
  birthdays?: AthleteBirthdayFact[];
}

export interface SignalEvaluationResult {
  asOf: string;
  signals: IntelligenceSignal[];
  opportunities: IntelligenceOpportunity[];
  skipped: Array<{ playerId: string; momentId: string | null; reason: string }>;
}
