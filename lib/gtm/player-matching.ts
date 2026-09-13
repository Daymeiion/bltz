import type { NormalizedGtmImportRow } from "@/lib/gtm/import-contract";
import type { GtmPlayerMatchType } from "@/lib/gtm/types";

export interface CanonicalPlayerCandidate {
  gsisId: string;
  playerId: string | null;
  displayName: string;
  team: string | null;
  college: string | null;
  position: string | null;
  status: string | null;
}

export interface UniquePlayerMatch {
  /** Stable Player Master identifier used by review decisions. */
  id: string;
  playerId: string | null;
  name: string;
  team: string | null;
  school: string | null;
  college: string[] | null;
  position: string | null;
  level: string | null;
  status: string | null;
  matchType: GtmPlayerMatchType;
  confidence: number;
}

export type PlayerMatchStrength = "strong" | "possible" | "ambiguous";

export interface PlayerMatchReview {
  sourceRecordId: string;
  rowNumber: number;
  displayName: string;
  currentCompany: string;
  strength: PlayerMatchStrength;
  candidates: UniquePlayerMatch[];
}

function normalized(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim() ?? "";
}

function contextMatches(company: string, candidate: CanonicalPlayerCandidate) {
  if (!company) return null;
  const contexts = [candidate.team, candidate.college]
    .map(normalized)
    .filter(Boolean);
  const matched = contexts.find((context) => company === context
    || (context.length >= 5 && company.includes(context))
    || (company.length >= 5 && context.includes(company)));
  if (!matched) return null;
  return normalized(candidate.team) === matched ? "team" as const : "college" as const;
}

function optionFor(candidate: CanonicalPlayerCandidate, company: string): UniquePlayerMatch {
  const context = contextMatches(company, candidate);
  return {
    id: candidate.gsisId,
    playerId: candidate.playerId,
    name: candidate.displayName,
    team: candidate.team,
    school: candidate.college,
    college: candidate.college ? [candidate.college] : null,
    position: candidate.position,
    level: "NFL",
    status: candidate.status,
    matchType: context === "team" ? "name_and_team" : context === "college" ? "name_and_college" : "name_only",
    confidence: context === "team" ? 0.96 : context === "college" ? 0.93 : 0.65,
  };
}

/**
 * Builds a review map for every plausible Player Master name, regardless of
 * pre-existing contact classification. Name-only results are never strong.
 */
export function buildPlayerMatchReviewMap(
  rows: NormalizedGtmImportRow[],
  players: CanonicalPlayerCandidate[],
) {
  const rowsByName = new Map<string, NormalizedGtmImportRow[]>();
  for (const row of rows) {
    const name = normalized(row.displayName);
    if (!name) continue;
    rowsByName.set(name, [...(rowsByName.get(name) ?? []), row]);
  }

  const playersByName = new Map<string, CanonicalPlayerCandidate[]>();
  for (const player of players) {
    const name = normalized(player.displayName);
    if (!name || !rowsByName.has(name)) continue;
    const candidates = playersByName.get(name) ?? [];
    if (!candidates.some((candidate) => candidate.gsisId === player.gsisId)) candidates.push(player);
    playersByName.set(name, candidates);
  }

  const reviews = new Map<string, PlayerMatchReview>();
  for (const [name, matchingRows] of rowsByName) {
    const candidates = playersByName.get(name) ?? [];
    if (candidates.length === 0) continue;
    for (const row of matchingRows) {
      const company = normalized(row.currentCompany);
      const options = candidates.map((candidate) => optionFor(candidate, company))
        .sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name));
      const contextual = options.filter((candidate) => candidate.matchType !== "name_only");
      const strength: PlayerMatchStrength = contextual.length === 1
        ? "strong"
        : candidates.length === 1 ? "possible" : "ambiguous";
      reviews.set(row.sourceRecordId, {
        sourceRecordId: row.sourceRecordId,
        rowNumber: row.rowNumber,
        displayName: row.displayName,
        currentCompany: row.currentCompany,
        strength,
        candidates: options,
      });
    }
  }
  return reviews;
}

export function buildUniquePlayerMatchMap(
  rows: NormalizedGtmImportRow[],
  players: CanonicalPlayerCandidate[],
) {
  const reviews = buildPlayerMatchReviewMap(rows, players);
  return new Map([...reviews].flatMap(([sourceRecordId, review]) => {
    if (review.strength !== "strong") return [];
    const candidate = review.candidates.find((item) => item.matchType !== "name_only");
    return candidate ? [[sourceRecordId, candidate] as const] : [];
  }));
}
