import type { NormalizedGtmImportRow } from "@/lib/gtm/import-contract";

export interface CanonicalPlayerCandidate {
  id: string;
  name: string | null;
  fullName: string | null;
  displayName: string | null;
  team: string | null;
  position: string | null;
  level: string | null;
}

export interface UniquePlayerMatch {
  id: string;
  name: string;
  team: string | null;
  position: string | null;
  level: string | null;
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
      position: player.position,
      level: player.level,
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
    return candidates.length === 1 ? [[row.sourceRecordId, candidates[0]] as const] : [];
  }));
}
