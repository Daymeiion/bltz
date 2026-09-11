import { describe, expect, it } from "vitest";
import { normalizeProfile, hasStatistics } from "@/lib/sportradar/normalize";
import { careerTotals } from "@/lib/sportradar/types";

export const playerId = "03570d21-b56b-43ec-aa85-f95883c65b6b";
export const providerId = "3069db07-aa43-4503-ab11-2ae5c0002721";
const teamId = "768c92aa-75ff-4a43-bcc0-f2798c2e1724";
export const profile = { id: providerId, name: "Fixture Player", position: "QB", seasons: [
  { year: 2023, type: "REG", teams: [{ id: teamId, name: "Bills", market: "Buffalo", statistics: {
    games_played: 17, games_started: 17, passing: { yards: 4306, attempts: 579, completions: 385, touchdowns: 29, interceptions: 18, rating: 92.2 },
    defense: { sacks: 0.5, tackles: 2, assists: 1, combined: 3 }, kick_returns: { returns: 0, yards: 0 },
  } }] },
] };
const normalize = (raw: unknown, league: "nfl" | "ncaafb" = "nfl") => normalizeProfile(raw, playerId, providerId, league, "2026-09-10T00:00:00Z");
describe("football normalization", () => {
  it.each(["nfl", "ncaafb"] as const)("uses the same internal shape for %s", league => {
    const result = normalize(profile, league);
    expect(result.league).toBe(league);
    expect(result.seasons[0].statistics).toMatchObject({ passingYards: 4306, passingTouchdowns: 29, passingAttempts: 579, sacks: 0.5, soloTackles: 2, tackles: 3, kickReturns: 0 });
    expect(result.seasons[0].statistics.receivingYards).toBeUndefined();
  });
  it("preserves team stints and never sums ratings", () => {
    const second = { ...profile.seasons[0].teams[0], id: "82d2d380-3834-4938-835f-aec541e5ece7" };
    const result = normalize({ ...profile, seasons: [{ ...profile.seasons[0], teams: [...profile.seasons[0].teams, second] }] });
    expect(result.seasons).toHaveLength(2);
    expect(careerTotals(result.seasons)).toMatchObject({ passingYards: 8612 });
    expect(careerTotals(result.seasons).passerRating).toBeUndefined();
  });
  it("does not label incomplete fields as career totals", () => {
    const result = normalize(profile);
    expect(careerTotals([...result.seasons, { ...result.seasons[0], statistics: {} }])).toEqual({});
  });
  it("distinguishes empty history from malformed data", () => {
    expect(hasStatistics(normalize({ id: providerId }))).toBe(false);
    expect(() => normalize({ id: providerId, seasons: {} })).toThrow("malformed_profile");
    expect(() => normalize({ ...profile, id: playerId })).toThrow("malformed_profile");
  });
  it("rejects duplicate season/team records and nonnumeric stats", () => {
    expect(() => normalize({ ...profile, seasons: [...profile.seasons, ...profile.seasons] })).toThrow("duplicate_season_team");
    const bad = structuredClone(profile); (bad.seasons[0].teams[0].statistics.passing as unknown as { yards: string }).yards = "bad";
    expect(() => normalize(bad)).toThrow("malformed_statistics");
  });
});
