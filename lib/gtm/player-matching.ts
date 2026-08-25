import type { NormalizedGtmImportRow } from "@/lib/gtm/import-contract";
import type { GtmPlayerMatchType } from "@/lib/gtm/types";

export interface CanonicalPlayerCandidate {
  id: string;
  name: string | null;
  fullName: string | null;
  displayName: string | null;
  team: string | null;
  school: string | null;
  college: string[] | null;
  position: string | null;
  level: string | null;
}

export interface UniquePlayerMatch {
  id: string;
  name: string;
  team: string | null;
  school: string | null;
  college: string[] | null;
  position: string | null;
  level: string | null;
  matchType: GtmPlayerMatchType;
  confidence: number;
}

function normalizedName(value: string | null) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

export function buildUniquePlayerMatchMap(
  rows: NormalizedGtmImportRow[],
  players: CanonicalPlayerCandidate[],
) {
  const athleteRows = rows.filter((row) => row.contactType === "athlete");
  const requestedNames = new Set(athleteRows.map((row) => normalizedName(row.displayName)));
  const candidatesByName = new Map<string, Map<string, UniquePlayerMatch>>();

  for (const player of players) {
    const option: UniquePlayerMatch = {
      id: player.id,
      name: player.displayName || player.fullName || player.name || "Unnamed player",
      team: player.team,
      school: player.school,
      college: player.college,
      position: player.position,
      level: player.level,
      matchType: "name_only",
      confidence: 0.65,
    };
    const matchingNames = new Set([player.name, player.fullName, player.displayName]
      .map(normalizedName)
      .filter((name) => name && requestedNames.has(name)));
    for (const name of matchingNames) {
      const candidates = candidatesByName.get(name) ?? new Map<string, UniquePlayerMatch>();
      candidates.set(option.id, option);
      candidatesByName.set(name, candidates);
    }
  }

  return new Map(athleteRows.flatMap((row) => {
    const candidates = [...(candidatesByName.get(normalizedName(row.displayName))?.values() ?? [])];
    const company = normalizedName(row.currentCompany);
    const contextual = company
      ? candidates.filter((candidate) => {
        return normalizedName(candidate.team) === company
          || normalizedName(candidate.school) === company
          || candidate.college?.some((college) => normalizedName(college) === company) === true;
      })
      : [];
    if (contextual.length === 1) {
      const candidate = contextual[0];
      const teamMatch = normalizedName(candidate.team) === company;
      return [[row.sourceRecordId, {
        ...candidate,
        matchType: teamMatch ? "name_and_team" : "name_and_college",
        confidence: teamMatch ? 0.92 : 0.9,
      }] as const];
    }
    return candidates.length === 1 ? [[row.sourceRecordId, candidates[0]] as const] : [];
  }));
}
