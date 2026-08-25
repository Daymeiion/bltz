import { describe, expect, it } from "vitest";
import type { NormalizedGtmImportRow } from "@/lib/gtm/import-contract";
import { buildPlayerMatchReviewMap, buildUniquePlayerMatchMap } from "@/lib/gtm/player-matching";

function athlete(displayName: string): NormalizedGtmImportRow {
  return { rowNumber: 2, displayName, firstName: "", lastName: "", email: "", linkedinUrl: "", currentCompany: "", currentTitle: "", connectedOn: "", contactType: "athlete", sport: "", leagueLevel: "", doNotAutomate: false, sourceRecordId: "row-1" };
}

describe("GTM canonical Player matching", () => {
  it("returns a single exact canonical-name match as an unverified candidate", () => {
    const matches = buildUniquePlayerMatchMap([athlete("Alex Smith")], [
      { id: "one", name: "Alex Smith", fullName: null, displayName: "Alexander Smith", team: "A", school: null, college: null, position: "QB", level: "pro" },
    ]);
    expect(matches.get("row-1")?.id).toBe("one");
    expect(matches.get("row-1")).toMatchObject({ matchType: "name_only", confidence: 0.65 });
  });

  it("rejects an ambiguous alias even when preferred display names differ", () => {
    const matches = buildUniquePlayerMatchMap([athlete("Alex Smith")], [
      { id: "one", name: "Alex Smith", fullName: null, displayName: "Alexander Smith", team: "A", school: null, college: null, position: "QB", level: "pro" },
      { id: "two", name: "Alex Smith", fullName: null, displayName: "Alex J. Smith", team: "B", school: null, college: null, position: "WR", level: "college" },
    ]);
    expect(matches.has("row-1")).toBe(false);
  });

  it("never matches non-athlete contacts", () => {
    expect(buildUniquePlayerMatchMap([{ ...athlete("Alex Smith"), contactType: "enterprise" }], [
      { id: "one", name: "Alex Smith", fullName: null, displayName: null, team: null, school: null, college: null, position: null, level: null },
    ]).size).toBe(0);
  });

  it("uses team context to disambiguate same-name players", () => {
    const matches = buildUniquePlayerMatchMap([{ ...athlete("Alex Smith"), currentCompany: "Denver Broncos" }], [
      { id: "one", name: "Alex Smith", fullName: null, displayName: null, team: "Denver Broncos", school: null, college: null, position: "QB", level: "pro" },
      { id: "two", name: "Alex Smith", fullName: null, displayName: null, team: "Washington Commanders", school: null, college: null, position: "QB", level: "pro" },
    ]);

    expect(matches.get("row-1")).toMatchObject({ id: "one", matchType: "name_and_team", confidence: 0.92 });
  });

  it("uses college context but never verifies the candidate automatically", () => {
    const matches = buildUniquePlayerMatchMap([{ ...athlete("Alex Smith"), currentCompany: "University of Utah" }], [
      { id: "one", name: "Alex Smith", fullName: null, displayName: null, team: null, school: null, college: ["University of Utah"], position: "QB", level: "college" },
      { id: "two", name: "Alex Smith", fullName: null, displayName: null, team: null, school: null, college: ["Alabama"], position: "WR", level: "college" },
    ]);

    expect(matches.get("row-1")).toMatchObject({ id: "one", matchType: "name_and_college", confidence: 0.9 });
  });

  it("returns every same-name candidate for manual review without choosing one", () => {
    const reviews = buildPlayerMatchReviewMap([athlete("Alex Smith")], [
      { id: "one", name: "Alex Smith", fullName: null, displayName: null, team: "Denver", school: null, college: null, position: "QB", level: "pro" },
      { id: "two", name: "Alex Smith", fullName: null, displayName: null, team: "Atlanta", school: null, college: null, position: "WR", level: "pro" },
    ]);

    expect(reviews.get("row-1")).toMatchObject({ strength: "ambiguous" });
    expect(reviews.get("row-1")?.candidates.map((candidate) => candidate.id)).toEqual(["one", "two"]);
  });

  it("marks a unique contextual candidate strong while preserving alternatives for review", () => {
    const reviews = buildPlayerMatchReviewMap([{ ...athlete("Alex Smith"), currentCompany: "Denver" }], [
      { id: "one", name: "Alex Smith", fullName: null, displayName: null, team: "Denver", school: null, college: null, position: "QB", level: "pro" },
      { id: "two", name: "Alex Smith", fullName: null, displayName: null, team: "Atlanta", school: null, college: null, position: "WR", level: "pro" },
    ]);

    expect(reviews.get("row-1")).toMatchObject({ strength: "strong" });
    expect(reviews.get("row-1")?.candidates[0]).toMatchObject({ id: "one", matchType: "name_and_team", confidence: 0.92 });
  });
});
