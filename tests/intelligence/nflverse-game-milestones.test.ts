import { describe, expect, it } from "vitest";
import { careerFullyCovered, detectGameMilestones, historicalTeam, milestoneSummary, momentTitle, parseCsv, scheduleFromCsv, type WeeklyRow } from "@/lib/intelligence/nflverse/game-milestones";

// Synthetic nflverse-shaped rows; IDs and lines are not real players.
const GSIS = "00-0000001";
const schedule = scheduleFromCsv(parseCsv([
  "game_id,season,game_type,week,gameday,away_team,away_score,home_team,home_score",
  "2008_01_AAA_BBB,2008,REG,1,2008-09-07,AAA,10,BBB,17",
  "2008_02_CCC_AAA,2008,REG,2,2008-09-14,CCC,3,AAA,20",
  "2008_03_AAA_DDD,2008,REG,3,2008-09-21,AAA,24,DDD,21",
  "2009_01_LAC_AAA,2009,REG,1,2009-09-13,LAC,7,AAA,14",
].join("\n")));
const row = (gameId: string, team: string, opponent: string, stats: Record<string, number>, seasonType = "REG"): WeeklyRow => ({
  player_id: GSIS, game_id: gameId, team, opponent_team: opponent, season_type: seasonType,
  ...Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, String(value)])),
});
const rows = [
  row("2008_01_AAA_BBB", "AAA", "BBB", { def_tackles_solo: 3, def_tackle_assists: 1 }),
  row("2008_02_CCC_AAA", "AAA", "CCC", { def_tackles_solo: 5, def_tackle_assists: 3, def_interceptions: 1, def_fumbles_forced: 1 }),
  row("2008_03_AAA_DDD", "AAA", "DDD", { def_tackles_solo: 6, def_tackle_assists: 2, def_tds: 1 }),
  row("2009_01_LAC_AAA", "AAA", "LAC", { def_tackles_solo: 2, def_sacks: 1 }),
];
const coverage = { rookieSeason: 2008, lastSeason: 2009, seasonsLoaded: [2008, 2009] };

describe("nflverse game milestones", () => {
  it("parses quoted CSV fields with commas and escaped quotes", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\r\n1,2')).toEqual([{ a: "x, y", b: 'say "hi"' }, { a: "1", b: "2" }]);
  });

  it("finds the first recorded game, career firsts and ties for a career high", () => {
    const games = detectGameMilestones(rows, schedule, coverage);
    expect(games.map(game => [game.gameday, milestoneSummary(game.milestones)])).toEqual([
      ["2008-09-07", "first NFL game with recorded stats"],
      ["2008-09-14", "first NFL interception, first NFL forced fumble and career-high 8 tackles (first time)"],
      ["2008-09-21", "first NFL touchdown"],
      ["2009-09-13", "first NFL sack"],
    ]);
    expect(games[1]).toMatchObject({ home: true, opponent: "CCC", statistics: { tackles: 8, interceptions: 1 } });
    expect(momentTitle("Test Athlete", games[0])).toBe("Test Athlete: First NFL game with recorded stats (AAA at BBB)");
  });

  it("claims nothing when the career starts before 1999 or a season is missing", () => {
    expect(careerFullyCovered({ rookieSeason: 1998, lastSeason: 2005, seasonsLoaded: [1999, 2000, 2001, 2002, 2003, 2004, 2005] })).toBe(false);
    expect(detectGameMilestones(rows, schedule, { ...coverage, seasonsLoaded: [2008] })).toEqual([]);
    expect(detectGameMilestones(rows, schedule, { rookieSeason: null, lastSeason: 2009, seasonsLoaded: [2008, 2009] })).toEqual([]);
  });

  it("ignores preseason rows and games missing from the schedule", () => {
    const games = detectGameMilestones([row("2008_01_AAA_BBB", "AAA", "BBB", { def_interceptions: 1 }, "PRE"), row("unknown", "AAA", "ZZZ", { def_tackles_solo: 9 })], schedule, coverage);
    expect(games).toEqual([]);
  });

  it("shows the franchise code a relocated team used that season", () => {
    expect(historicalTeam("LAC", 2009)).toBe("SD");
    expect(historicalTeam("LAC", 2017)).toBe("LAC");
    expect(historicalTeam("LV", 2015)).toBe("OAK");
    expect(detectGameMilestones(rows, schedule, coverage).at(-1)).toMatchObject({ opponent: "SD" });
  });
});
