/**
 * Pure nflverse weekly-stat analysis for reviewable game Moments. No network,
 * database or path-alias imports, so the import script can load it directly.
 *
 * nflverse weekly rows exist only for games in which a player recorded a
 * statistic, and coverage starts in 1999. "First recorded game" is therefore
 * never called a debut unless the whole career is covered, and the label keeps
 * the "recorded stats" qualifier.
 */

export const NFLVERSE_FIRST_SEASON = 1999;
export const NFLVERSE_NORMALIZER_VERSION = "nflverse_game_milestones_v1";

export type WeeklyRow = Record<string, string>;
export type ScheduleGame = { gameId: string; gameday: string; season: number; week: number; gameType: string; homeTeam: string; awayTeam: string; homeScore: number | null; awayScore: number | null };
export type MilestoneKind = "debut" | "career_first" | "career_high";
export type GameMilestone = { kind: MilestoneKind; label: string; statistic: string | null; value: number | null };
export type GameMoment = {
  gameId: string;
  gameday: string;
  season: number;
  week: number;
  seasonType: string;
  team: string;
  opponent: string;
  home: boolean;
  /** Highest-priority milestone first: debut, then firsts, then career highs. */
  milestones: GameMilestone[];
  statistics: Record<string, number>;
};
export type CareerCoverage = { rookieSeason: number | null; lastSeason: number | null; seasonsLoaded: number[] };

/** RFC 4180 subset: quoted fields, escaped quotes, CRLF or LF. */
export function parseCsv(text: string): WeeklyRow[] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter(item => item.length > 1 || item[0]);
  if (!header) return [];
  return body.map(values => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

const number = (value: string | undefined) => {
  const parsed = Number(value);
  return value !== undefined && value !== "" && Number.isFinite(parsed) ? parsed : 0;
};

export function scheduleFromCsv(rows: WeeklyRow[]): Map<string, ScheduleGame> {
  return new Map(rows.filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.gameday ?? "")).map(row => [row.game_id, {
    gameId: row.game_id, gameday: row.gameday, season: number(row.season), week: number(row.week), gameType: row.game_type,
    homeTeam: row.home_team, awayTeam: row.away_team,
    homeScore: row.home_score === "" ? null : number(row.home_score), awayScore: row.away_score === "" ? null : number(row.away_score),
  }]));
}

/** Reader-facing statistics recorded in one game; zero values are omitted. */
export function gameStatistics(row: WeeklyRow): Record<string, number> {
  const stats: Record<string, number> = {
    tackles: number(row.def_tackles_solo) + number(row.def_tackle_assists),
    soloTackles: number(row.def_tackles_solo),
    sacks: number(row.def_sacks),
    interceptions: number(row.def_interceptions),
    passesDefended: number(row.def_pass_defended),
    forcedFumbles: number(row.def_fumbles_forced),
    tacklesForLoss: number(row.def_tackles_for_loss),
    receptions: number(row.receptions),
    receivingYards: number(row.receiving_yards),
    carries: number(row.carries),
    rushingYards: number(row.rushing_yards),
    passingYards: number(row.passing_yards),
    touchdowns: touchdowns(row),
    kickReturnYards: number(row.kickoff_return_yards),
    puntReturnYards: number(row.punt_return_yards),
  };
  return Object.fromEntries(Object.entries(stats).filter(([, value]) => value !== 0));
}

function touchdowns(row: WeeklyRow): number {
  return ["passing_tds", "rushing_tds", "receiving_tds", "def_tds", "special_teams_tds", "fumble_recovery_tds"]
    .reduce((total, key) => total + number(row[key]), 0);
}

const FIRSTS: Array<{ statistic: string; label: string; minimum: number }> = [
  { statistic: "touchdowns", label: "first NFL touchdown", minimum: 1 },
  { statistic: "interceptions", label: "first NFL interception", minimum: 1 },
  { statistic: "sacks", label: "first NFL sack", minimum: 0.5 },
  { statistic: "forcedFumbles", label: "first NFL forced fumble", minimum: 1 },
  { statistic: "receptions", label: "first NFL reception", minimum: 1 },
  { statistic: "rushingYards", label: "first 100-yard rushing game", minimum: 100 },
  { statistic: "receivingYards", label: "first 100-yard receiving game", minimum: 100 },
];

/** Career highs are reported only past a floor that makes the game worth revisiting. */
const HIGHS: Array<{ statistic: string; noun: string; floor: number }> = [
  { statistic: "tackles", noun: "tackles", floor: 6 },
  { statistic: "sacks", noun: "sacks", floor: 2 },
  { statistic: "interceptions", noun: "interceptions", floor: 2 },
  { statistic: "passesDefended", noun: "passes defended", floor: 3 },
  { statistic: "receptions", noun: "receptions", floor: 5 },
  { statistic: "receivingYards", noun: "receiving yards", floor: 70 },
  { statistic: "rushingYards", noun: "rushing yards", floor: 70 },
  { statistic: "passingYards", noun: "passing yards", floor: 200 },
  { statistic: "touchdowns", noun: "touchdowns", floor: 2 },
  { statistic: "kickReturnYards", noun: "kick return yards", floor: 100 },
];

const KIND_ORDER: Record<MilestoneKind, number> = { debut: 0, career_first: 1, career_high: 2 };

/** nflverse uses current franchise codes; show the code the team used that season. */
const RELOCATIONS: Array<{ current: string; before: number; historical: string }> = [
  { current: "LAC", before: 2017, historical: "SD" },
  { current: "LA", before: 2016, historical: "STL" },
  { current: "LV", before: 2020, historical: "OAK" },
];
export function historicalTeam(team: string, season: number): string {
  return RELOCATIONS.find(item => item.current === team && season < item.before)?.historical ?? team;
}

/** The whole career must sit inside nflverse coverage before "first" or "career-high" is claimed. */
export function careerFullyCovered(coverage: CareerCoverage): boolean {
  const { rookieSeason, lastSeason, seasonsLoaded } = coverage;
  if (!rookieSeason || !lastSeason || rookieSeason < NFLVERSE_FIRST_SEASON || lastSeason < rookieSeason) return false;
  for (let season = rookieSeason; season <= lastSeason; season++) if (!seasonsLoaded.includes(season)) return false;
  return true;
}

/**
 * Regular-season and postseason games only. Returns one entry per game that
 * carries at least one milestone, ordered by date.
 */
export function detectGameMilestones(rows: WeeklyRow[], schedule: Map<string, ScheduleGame>, coverage: CareerCoverage): GameMoment[] {
  if (!careerFullyCovered(coverage)) return [];
  const games = rows.flatMap(row => {
    const game = schedule.get(row.game_id);
    if (!game || !["REG", "POST"].includes(row.season_type)) return [];
    return [{ row, game, statistics: gameStatistics(row) }];
  }).sort((a, b) => a.game.gameday.localeCompare(b.game.gameday) || a.game.gameId.localeCompare(b.game.gameId));
  if (!games.length) return [];
  const found = new Map<string, GameMilestone[]>();
  const add = (gameId: string, milestone: GameMilestone) => found.set(gameId, [...(found.get(gameId) ?? []), milestone]);
  add(games[0].game.gameId, { kind: "debut", label: "first NFL game with recorded stats", statistic: null, value: null });
  for (const first of FIRSTS) {
    const game = games.find(item => (item.statistics[first.statistic] ?? 0) >= first.minimum);
    if (game) add(game.game.gameId, { kind: "career_first", label: first.label, statistic: first.statistic, value: game.statistics[first.statistic] });
  }
  for (const high of HIGHS) {
    const best = Math.max(...games.map(item => item.statistics[high.statistic] ?? 0));
    if (best < high.floor) continue;
    const matches = games.filter(item => item.statistics[high.statistic] === best);
    // Ties keep the first game that reached the high and say so.
    add(matches[0].game.gameId, { kind: "career_high", label: `career-high ${best} ${high.noun}${matches.length > 1 ? " (first time)" : ""}`, statistic: high.statistic, value: best });
  }
  return games.filter(item => found.has(item.game.gameId)).map(({ row, game, statistics }) => {
    const home = game.homeTeam === row.team;
    return { gameId: game.gameId, gameday: game.gameday, season: game.season, week: game.week, seasonType: row.season_type,
      team: historicalTeam(row.team, game.season), opponent: historicalTeam(row.opponent_team || (home ? game.awayTeam : game.homeTeam), game.season), home,
      milestones: found.get(game.gameId)!.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]), statistics };
  });
}

/** "first NFL interception and career-high 13 tackles". */
export function milestoneSummary(milestones: GameMilestone[]): string {
  const labels = milestones.map(item => item.label);
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : labels[0] ?? "";
}

export function momentTitle(name: string, game: GameMoment): string {
  const lead = game.milestones[0]?.label ?? "game";
  return `${name}: ${lead.charAt(0).toUpperCase()}${lead.slice(1)} (${game.team} ${game.home ? "vs." : "at"} ${game.opponent})`;
}
