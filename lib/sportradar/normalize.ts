import { z } from "zod";
import { PlayerStats, STAT_FIELDS, type League, type SeasonStats } from "./types";
import { StatsError } from "./errors";

const Team = z.object({
  id: z.string().uuid(), name: z.string().optional(), market: z.string().optional(),
  alias: z.string().optional(), statistics: z.record(z.string(), z.unknown()),
});
const Profile = z.object({
  id: z.string().uuid(), name: z.string().optional(), first_name: z.string().optional(),
  last_name: z.string().optional(), position: z.string().optional(),
  // A legitimate profile without seasons is a no-data response.
  seasons: z.array(z.object({ year: z.number().int().min(1900).max(2200),
    type: z.enum(["REG", "PST", "PRE"]), teams: z.array(Team),
  })).optional(),
});

export function normalizeProfile(raw: unknown, playerId: string, providerId: string, league: League, syncedAt: string): PlayerStats {
  const parsed = Profile.safeParse(raw);
  if (!parsed.success || parsed.data.id !== providerId) throw new StatsError("malformed_profile", 502);
  const profile = parsed.data;
  const seen = new Set<string>();
  const seasons: SeasonStats[] = [];
  for (const season of profile.seasons ?? []) for (const team of season.teams) {
    const key = `${season.year}/${season.type}/${team.id}`;
    if (seen.has(key)) throw new StatsError("duplicate_season_team", 502);
    seen.add(key);
    const number = (value: unknown): number | null => {
      if (value == null) return null;
      if (typeof value !== "number" || !Number.isFinite(value)) throw new StatsError("malformed_statistics", 502);
      return value;
    };
    const statistics: Record<string, number> = {};
    for (const [name, field] of Object.entries(STAT_FIELDS)) {
      const [category, metric] = field.path.split(".");
      const group = team.statistics[category];
      if (group != null && (typeof group !== "object" || Array.isArray(group))) throw new StatsError("malformed_statistics", 502);
      const value = number((group as Record<string, unknown> | undefined)?.[metric]);
      if (value !== null) statistics[name] = value;
    }
    const gamesPlayed = number(team.statistics.games_played);
    const gamesStarted = number(team.statistics.games_started);
    if ([gamesPlayed, gamesStarted].some(n => n !== null && (!Number.isInteger(n) || n < 0))) throw new StatsError("malformed_statistics", 502);
    seasons.push({ year: season.year, seasonType: season.type,
      team: [team.market, team.name].filter(Boolean).join(" ") || team.alias || "Unknown team",
      providerTeamId: team.id, position: profile.position ?? null,
      gamesPlayed, gamesStarted, statistics });
  }
  return PlayerStats.parse({ version: 1, playerId, provider: "sportradar", providerPlayerId: providerId,
    league, seasons, lastSyncedAt: syncedAt });
}

export function hasStatistics(stats: PlayerStats) {
  return stats.seasons.some(s => Object.keys(s.statistics).length > 0);
}
