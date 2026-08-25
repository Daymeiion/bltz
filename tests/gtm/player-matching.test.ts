import { describe, expect, it } from "vitest";
import type { NormalizedGtmImportRow } from "@/lib/gtm/import-contract";
import { buildUniquePlayerMatchMap } from "@/lib/gtm/player-matching";

function athlete(displayName: string): NormalizedGtmImportRow {
  return { rowNumber: 2, displayName, firstName: "", lastName: "", email: "", linkedinUrl: "", currentCompany: "", currentTitle: "", contactType: "athlete", sport: "", leagueLevel: "", doNotAutomate: false, sourceRecordId: "row-1" };
}

describe("GTM canonical Player matching", () => {
  it("returns a single exact canonical-name match as an unverified candidate", () => {
    const matches = buildUniquePlayerMatchMap([athlete("Alex Smith")], [
      { id: "one", name: "Alex Smith", fullName: null, displayName: "Alexander Smith", team: "A", position: "QB", level: "pro" },
    ]);
    expect(matches.get("row-1")?.id).toBe("one");
  });

  it("rejects an ambiguous alias even when preferred display names differ", () => {
    const matches = buildUniquePlayerMatchMap([athlete("Alex Smith")], [
      { id: "one", name: "Alex Smith", fullName: null, displayName: "Alexander Smith", team: "A", position: "QB", level: "pro" },
      { id: "two", name: "Alex Smith", fullName: null, displayName: "Alex J. Smith", team: "B", position: "WR", level: "college" },
    ]);
    expect(matches.has("row-1")).toBe(false);
  });

  it("never matches non-athlete contacts", () => {
    expect(buildUniquePlayerMatchMap([{ ...athlete("Alex Smith"), contactType: "enterprise" }], [
      { id: "one", name: "Alex Smith", fullName: null, displayName: null, team: null, position: null, level: null },
    ]).size).toBe(0);
  });
});
