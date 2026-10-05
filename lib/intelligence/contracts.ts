/** Provider-independent read contracts. Raw ingestion payloads never enter these DTOs. */
export type GraphReviewStatus = "candidate" | "verified" | "rejected";
export type GraphDatePrecision = "day" | "year" | "unknown";

export interface GraphSourceReference {
  id: string | null;
  name: string;
  provider: string;
  locator: string | null;
  fetchedAt: string | null;
}

export interface GraphEvidence {
  id: string;
  athleteId: string;
  momentId: string | null;
  factType: string;
  statement: string;
  data: Record<string, unknown>;
  status: GraphReviewStatus;
  confidence: number | null;
  source: GraphSourceReference;
  ingestionId: string | null;
}

export interface GraphMomentAthlete {
  athleteId: string;
  relationshipType: string;
  status: GraphReviewStatus;
  confidence: number | null;
}

export interface GraphMoment {
  id: string;
  title: string;
  occurredOn: string | null;
  occurredYear: number | null;
  datePrecision: GraphDatePrecision;
  sport: string | null;
  eventId: string | null;
  status: GraphReviewStatus;
  confidence: number | null;
  athletes: GraphMomentAthlete[];
  evidence: GraphEvidence[];
}

/** Existing player_external_ids remains the verified athlete mapping authority. */
export interface GraphExternalIdentity {
  id: string;
  athleteId: string;
  provider: string;
  namespace: string;
  externalId: string;
  matchMethod: string;
  confidence: number | null;
  verifiedAt: string;
  source: "player_external_ids";
}
