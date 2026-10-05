import type { GraphEvidence, GraphMoment } from "./contracts";
import type { evaluateIntelligenceSignals } from "./signals";

export type LabSection<T> = { state: "ready" | "unavailable"; rows: T[]; truncated: boolean };
export type AthleteSummary = { id: string; name: string; slug: string; school: string | null; position: string | null };
export type CareerRelationship = { id: string; team: string; season: string; organization: string; startsOn: string; endsOn: string | null; status: string };
export type LabStatistic = { id: string; season: string; phase: string; team: string | null; source: string; stats: Record<string, unknown>; model: "legacy" | "roster" };
export type LabMedia = { id: string; title: string; kind: string; source: string | null; model: "legacy media" | "legacy video" };
export type LabExternalIdentity = { id: string; provider: string; externalId: string; sport: string; league: string; method: string; confidence: number | null; verifiedAt: string };
export type LabGraphMoment = GraphMoment & { relationship: string; relationshipStatus: string; relationshipConfidence: number | null };
export type LabAthlete = AthleteSummary & {
  teamLabel: string | null;
  verified: boolean | null;
  relationships: LabSection<CareerRelationship>;
  statistics: LabSection<LabStatistic>;
  media: LabSection<LabMedia>;
  externalIdentities: LabSection<LabExternalIdentity>;
  moments: LabSection<LabGraphMoment>;
  evidence: LabSection<GraphEvidence>;
  intelligenceState: "ready" | "incomplete";
  intelligence: ReturnType<typeof evaluateIntelligenceSignals>;
};
export type LabResult = {
  query: string;
  asOf: string;
  evaluatedAt?: string;
  search: LabSection<AthleteSummary>;
  selected: LabAthlete | null;
  selectionState: "none" | "ready" | "not_found" | "invalid";
};
