import { z } from "zod";

export const League = z.enum(["nfl", "ncaafb"]);
export type League = z.infer<typeof League>;
export const SeasonStats = z.object({
  year: z.number().int(), seasonType: z.enum(["REG", "PST", "PRE"]),
  team: z.string(), providerTeamId: z.string(), position: z.string().nullable(),
  gamesPlayed: z.number().nullable(), gamesStarted: z.number().nullable(),
  statistics: z.record(z.string(), z.number().finite()),
});
export type SeasonStats = z.infer<typeof SeasonStats>;
export const PlayerStats = z.object({
  version: z.literal(1), playerId: z.string().uuid(), provider: z.literal("sportradar"),
  providerPlayerId: z.string().uuid(), league: League,
  seasons: z.array(SeasonStats), lastSyncedAt: z.string(),
});
export type PlayerStats = z.infer<typeof PlayerStats>;

// Explicit, position-dependent fields. Missing is unknown, never an invented zero.
export const STAT_FIELDS: Record<string, { path: string; label: string; sum: boolean }> = {
  passingYards: { path: "passing.yards", label: "Passing yards", sum: true },
  passingAttempts: { path: "passing.attempts", label: "Pass attempts", sum: true },
  completions: { path: "passing.completions", label: "Completions", sum: true },
  passingTouchdowns: { path: "passing.touchdowns", label: "Passing TD", sum: true },
  passingInterceptions: { path: "passing.interceptions", label: "Pass interceptions", sum: true },
  passerRating: { path: "passing.rating", label: "Passer rating", sum: false },
  rushingAttempts: { path: "rushing.attempts", label: "Rush attempts", sum: true },
  rushingYards: { path: "rushing.yards", label: "Rushing yards", sum: true },
  rushingTouchdowns: { path: "rushing.touchdowns", label: "Rushing TD", sum: true },
  receptions: { path: "receiving.receptions", label: "Receptions", sum: true },
  receivingYards: { path: "receiving.yards", label: "Receiving yards", sum: true },
  receivingTouchdowns: { path: "receiving.touchdowns", label: "Receiving TD", sum: true },
  tackles: { path: "defense.combined", label: "Combined tackles", sum: true },
  soloTackles: { path: "defense.tackles", label: "Solo tackles", sum: true },
  assists: { path: "defense.assists", label: "Assisted tackles", sum: true },
  sacks: { path: "defense.sacks", label: "Sacks", sum: true },
  interceptions: { path: "defense.interceptions", label: "Interceptions", sum: true },
  passesDefended: { path: "defense.passes_defended", label: "Passes defended", sum: true },
  forcedFumbles: { path: "defense.forced_fumbles", label: "Forced fumbles", sum: true },
  fumbleRecoveries: { path: "defense.fumble_recoveries", label: "Fumble recoveries", sum: true },
  kickReturns: { path: "kick_returns.returns", label: "Kick returns", sum: true },
  kickReturnYards: { path: "kick_returns.yards", label: "Kick return yards", sum: true },
  kickReturnTouchdowns: { path: "kick_returns.touchdowns", label: "Kick return TD", sum: true },
  puntReturns: { path: "punt_returns.returns", label: "Punt returns", sum: true },
  puntReturnYards: { path: "punt_returns.yards", label: "Punt return yards", sum: true },
  puntReturnTouchdowns: { path: "punt_returns.touchdowns", label: "Punt return TD", sum: true },
};

// Only sum an additive metric when every included stint reports it. Rates are
// displayed per stint; neither NFL nor NCAA ratings are summed or averaged.
export function careerTotals(seasons: SeasonStats[]) {
  const totals: Record<string, number> = {};
  for (const [key, field] of Object.entries(STAT_FIELDS)) {
    if (field.sum && seasons.length && seasons.every(s => s.statistics[key] !== undefined)) {
      totals[key] = seasons.reduce((n, s) => n + s.statistics[key], 0);
    }
  }
  return totals;
}
