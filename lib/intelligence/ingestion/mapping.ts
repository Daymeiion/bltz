import type { GraphSourceReference } from "../contracts";
import { AthleteCandidateSchema, VerifiedAthleteMappingSchema, type AthleteCandidate } from "./contracts";

/** Explicit adapter into the existing mapping authority; does not persist anything. */
export function legacyVerifiedMapping(row: {
  player_id: string; provider: string; sport: string; league: string;
  provider_player_id: string; status: string; match_confidence: number | null; match_method: string;
}) {
  return VerifiedAthleteMappingSchema.parse({
    playerId: row.player_id, provider: row.provider, sport: row.sport, league: row.league,
    namespace: "league-profile", externalId: row.provider_player_id,
    status: row.status, confidence: row.match_confidence, matchMethod: row.match_method,
  });
}

/** Shared Graph source DTO; unresolved candidates still have source traceability. */
export function candidateSourceReference(input: AthleteCandidate): GraphSourceReference {
  const candidate = AthleteCandidateSchema.parse(input);
  return { id: candidate.sourceId ?? null, name: `${candidate.provider} ${candidate.sport}/${candidate.league}`,
    provider: candidate.provider, locator: candidate.locator, fetchedAt: candidate.fetchedAt };
}
