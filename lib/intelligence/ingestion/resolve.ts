import {
  AthleteCandidateSchema, CanonicalAthleteSchema, VerifiedAthleteMappingSchema,
  type AthleteCandidate, type CanonicalAthlete, type VerifiedAthleteMapping,
} from "./contracts";

export interface ResolutionOption {
  playerId: string;
  // Heuristic review rank, not calibrated identity probability.
  reviewScore: number;
  evidence: string[];
}
export interface AthleteResolution {
  status: "matched" | "needs_review" | "ambiguous" | "unmatched" | "conflict";
  playerId: string | null;
  confidence: number | null;
  matchMethod: string;
  reason: string;
  options: ResolutionOption[];
}

function comparable(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Only a previously verified scoped mapping can link automatically. Never merges. */
export function resolveAthleteCandidate(
  input: AthleteCandidate, athletes: CanonicalAthlete[], verifiedMappings: VerifiedAthleteMapping[],
): AthleteResolution {
  const candidate = AthleteCandidateSchema.parse(input);
  const players = athletes.map(athlete => CanonicalAthleteSchema.parse(athlete));
  const mappings = verifiedMappings.map(mapping => VerifiedAthleteMappingSchema.parse(mapping));
  const base = { playerId: null, confidence: null, options: [] };
  const scoped = mappings.filter(mapping => mapping.provider === candidate.provider
    && mapping.sport === candidate.sport && mapping.league === candidate.league
    && mapping.namespace === candidate.namespace && mapping.externalId === candidate.externalId);
  if (scoped.length > 1) return { ...base, status: "conflict", matchMethod: "verified_mapping", reason: "Multiple verified mappings require correction." };
  if (scoped.length === 1) {
    const mapping = scoped[0];
    const linked = players.filter(player => player.playerId === mapping.playerId);
    if (linked.length !== 1) return { ...base, status: "conflict", matchMethod: "verified_mapping", reason: "Mapped canonical athlete is missing or duplicated in the resolution input." };
    const athlete = linked[0];
    if (comparable(athlete.fullName) !== comparable(candidate.fullName)
      || (athlete.dob && candidate.dob && athlete.dob !== candidate.dob)) {
      return { ...base, status: "conflict", matchMethod: "verified_mapping", reason: "Fetched identity conflicts with the verified canonical athlete; review before linking." };
    }
    return { ...base, status: "matched", playerId: mapping.playerId, confidence: mapping.confidence,
      matchMethod: mapping.matchMethod, reason: "An existing verified mapping matches provider, sport, league, namespace and external ID." };
  }
  const options = players.filter(player => comparable(player.fullName) === comparable(candidate.fullName))
    .map(player => {
      let reviewScore = 0.3;
      const evidence = ["Exact normalized name; name alone is insufficient to link."];
      if (player.dob && candidate.dob) {
        if (player.dob !== candidate.dob) return null;
        reviewScore += 0.4; evidence.push("Birth dates match.");
      }
      for (const field of ["school", "team"] as const) {
        if (candidate[field] && player[field] && comparable(candidate[field]) === comparable(player[field])) {
          reviewScore += 0.15; evidence.push(`${field === "school" ? "School" : "Team"} labels match; verify temporal context.`);
        }
      }
      return { playerId: player.playerId, reviewScore: Math.round(reviewScore * 100) / 100, evidence };
    }).filter((option): option is ResolutionOption => option !== null)
    .sort((a, b) => b.reviewScore - a.reviewScore || a.playerId.localeCompare(b.playerId));
  const uniqueOptions = [...new Map(options.map(option => [option.playerId, option])).values()];
  return { ...base, options: uniqueOptions, matchMethod: "name_context_review",
    status: uniqueOptions.length > 1 ? "ambiguous" : uniqueOptions.length === 1 ? "needs_review" : "unmatched",
    reason: uniqueOptions.length > 1 ? "Several canonical athletes match; no identity was selected."
      : uniqueOptions.length === 1 ? "One review candidate exists; explicit verification is required."
        : "No verified mapping or sufficiently compatible name candidate exists." };
}
