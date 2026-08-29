import { describe, expect, it } from "vitest";
import type { NormalizedGtmImportRow } from "@/lib/gtm/import-contract";
import {
  buildPlayerMatchReviewMap,
  buildUniquePlayerMatchMap,
  type CanonicalPlayerCandidate,
} from "@/lib/gtm/player-matching";

function connection(displayName: string): NormalizedGtmImportRow {
  return { rowNumber: 2, displayName, firstName: "", lastName: "", email: "", linkedinUrl: "", currentCompany: "", currentTitle: "", connectedOn: "", contactType: "unclassified", sport: "", leagueLevel: "", doNotAutomate: false, sourceRecordId: "row-1" };
}

function player(gsisId: string, displayName: string, overrides: Partial<CanonicalPlayerCandidate> = {}): CanonicalPlayerCandidate {
  return { gsisId, playerId: null, displayName, team: null, college: null, position: null, status: null, ...overrides };
}

describe("GTM canonical Player Master matching", () => {
  it("keeps a unique name-only match in review instead of auto-linking", () => {
    const rows = [connection("Alex Smith")];
    const candidates = [player("one", "Alex Smith", { position: "QB" })];
    expect(buildUniquePlayerMatchMap(rows, candidates).size).toBe(0);
    expect(buildPlayerMatchReviewMap(rows, candidates).get("row-1")).toMatchObject({ strength: "possible" });
  });

  it("checks unclassified LinkedIn rows against the full Player Master", () => {
    const reviews = buildPlayerMatchReviewMap([connection("Alex Smith")], [player("one", "Alex Smith")]);
    expect(reviews.get("row-1")?.candidates[0]).toMatchObject({ id: "one", matchType: "name_only", confidence: 0.65 });
  });

  it("keeps same-name Players ambiguous", () => {
    const reviews = buildPlayerMatchReviewMap([connection("Alex Smith")], [
      player("one", "Alex Smith", { team: "Denver" }),
      player("two", "Alex Smith", { team: "Atlanta" }),
    ]);
    expect(reviews.get("row-1")).toMatchObject({ strength: "ambiguous" });
    expect(reviews.get("row-1")?.candidates.map((candidate) => candidate.id)).toEqual(["one", "two"]);
  });

  it("uses team context for a strong, stable GSIS match", () => {
    const reviews = buildPlayerMatchReviewMap([{ ...connection("Alex Smith"), currentCompany: "Denver Broncos" }], [
      player("one", "Alex Smith", { team: "Denver Broncos", playerId: "8b148fe2-5e87-4a42-9b69-74341f75854a" }),
      player("two", "Alex Smith", { team: "Washington Commanders" }),
    ]);
    expect(reviews.get("row-1")).toMatchObject({ strength: "strong" });
    expect(reviews.get("row-1")?.candidates[0]).toMatchObject({ id: "one", matchType: "name_and_team", confidence: 0.96 });
    expect(buildUniquePlayerMatchMap([{ ...connection("Alex Smith"), currentCompany: "Denver Broncos" }], [
      player("one", "Alex Smith", { team: "Denver Broncos" }),
      player("two", "Alex Smith", { team: "Washington Commanders" }),
    ]).get("row-1")?.id).toBe("one");
  });

  it("uses college context without merging an unrelated same-name Player", () => {
    const reviews = buildPlayerMatchReviewMap([{ ...connection("Alex Smith"), currentCompany: "University of Utah" }], [
      player("one", "Alex Smith", { college: "University of Utah" }),
      player("two", "Alex Smith", { college: "Alabama" }),
    ]);
    expect(reviews.get("row-1")?.candidates[0]).toMatchObject({ id: "one", matchType: "name_and_college", confidence: 0.93 });
  });
});
