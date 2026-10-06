import { describe, expect, it } from "vitest";
import type { CfbImport } from "@/lib/preview-lockers/cfb-csv";
import { evaluateSource } from "@/lib/source-policy/policy";
import { canSaveStatsImports } from "@/lib/source-policy/preview-stats";

const entry: CfbImport = {
  category: "defense",
  sourceUrl: "https://www.sports-reference.com/cfb/players/fixture-player-1.html",
  importedAt: "2026-09-29T00:00:00.000Z",
  seasons: [{ year: 2007, team: "Fixture", gamesPlayed: 12, gamesStarted: null, statistics: { sacks: 2.5 } }],
};

describe("manual CSV retention policy", () => {
  it("retains unchanged entries without mutating inputs and permits removal or reordering", () => {
    const another: CfbImport = { ...structuredClone(entry), category: "passing" };
    another.seasons[0].statistics = { passingYards: 100 };
    const saved = [entry, another];
    const snapshot = structuredClone(saved);
    expect(canSaveStatsImports([structuredClone(another), structuredClone(entry)], saved)).toBe(true);
    expect(canSaveStatsImports([structuredClone(another)], saved)).toBe(true);
    expect(canSaveStatsImports([], saved)).toBe(true);
    expect(canSaveStatsImports([], [])).toBe(true);
    expect(saved).toEqual(snapshot);
  });

  it("blocks new, changed or replaced manual entries", () => {
    expect(canSaveStatsImports([entry])).toBe(false);
    const changed = structuredClone(entry);
    changed.seasons[0].statistics.sacks = 3;
    expect(canSaveStatsImports([changed], [entry])).toBe(false);
    expect(canSaveStatsImports([{ ...entry, importedAt: "2026-10-05T00:00:00.000Z" }], [entry])).toBe(false);
  });

  it.each([
    "https://en.wikipedia.org/wiki/Fixture_Athlete",
    "https://www.youtube.com/results",
    "https://site.web.api.espn.com/apis/search/v2",
    "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes/1",
  ])("does not infer manual CSV permission from a bounded adapter grant: %s", sourceUrl => {
    expect(evaluateSource(sourceUrl).allowed_actions).toContain("PERSIST_FACTS");
    const manual = { ...entry, sourceUrl };
    expect(canSaveStatsImports([manual])).toBe(false);
    expect(canSaveStatsImports([manual], [entry])).toBe(false);
  });

  it("consumes each saved entry only once, preventing duplicate-count expansion", () => {
    expect(canSaveStatsImports([entry, structuredClone(entry)], [entry])).toBe(false);
    const historicalDuplicates = [entry, structuredClone(entry)];
    expect(canSaveStatsImports([structuredClone(entry), structuredClone(entry)], historicalDuplicates)).toBe(true);
    expect(canSaveStatsImports([structuredClone(entry)], historicalDuplicates)).toBe(true);
    expect(canSaveStatsImports([entry, structuredClone(entry), structuredClone(entry)], historicalDuplicates)).toBe(false);
  });
});
