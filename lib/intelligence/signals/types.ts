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
}

export const SIGNAL_SCORE_SCALE = "0–100 editorial review priority; not probability, earnings, or monetary value";

export interface IntelligenceSignal {
  key: string;
  type: "historical_anniversary" | "career_milestone";
  ruleVersion: "v1";
  playerId: string;
  momentId: string;
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
  type: "anniversary_retrospective_review" | "career_milestone_review";
  playerId: string;
  momentId: string;
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
}

export interface SignalEvaluationResult {
  asOf: string;
  signals: IntelligenceSignal[];
  opportunities: IntelligenceOpportunity[];
  skipped: Array<{ playerId: string; momentId: string; reason: string }>;
}
