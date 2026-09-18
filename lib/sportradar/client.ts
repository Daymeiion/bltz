import "server-only";
import { z } from "zod";
import { League } from "./types";
import { StatsError, responseError } from "./errors";

export function profileEndpoint(league: League, id: string) {
  League.parse(league); z.string().uuid().parse(id);
  const access = z.enum(["trial", "production"]).parse(process.env.SPORTRADAR_ACCESS_LEVEL || "trial");
  return `/${league}${league === "nfl" ? "/official" : ""}/${access}/v7/en/players/${id}/profile.json`;
}

export async function fetchProfile(endpoint: string): Promise<{ raw: unknown; status: number }> {
  // The Preview Locker cohort is NFL-only; keep NCAA normalization for future use.
  if (endpoint.startsWith("/ncaafb/")) throw new StatsError("ncaa_calls_disabled_for_cohort", 403);
  const key = process.env.SPORTRADAR_API_KEY;
  if (!key) throw new StatsError("provider_key_not_configured", 503);
  // Prevent future callers from turning this into an arbitrary authenticated fetch.
  if (!/^\/(nfl\/official|ncaafb)\/(trial|production)\/v7\/en\/players\/[0-9a-f-]+\/profile\.json$/.test(endpoint)) throw new StatsError("invalid_endpoint");
  return fetchProviderJson(endpoint, key);
}

export function lookupEndpoint(kind: "teams" | "season", year?: number, teamId?: string) {
  const access = z.enum(["trial", "production"]).parse(process.env.SPORTRADAR_ACCESS_LEVEL || "trial");
  const root = `/nfl/official/${access}/v7/en`;
  if (kind === "teams") return `${root}/league/teams.json`;
  z.number().int().min(2000).max(new Date().getUTCFullYear()).parse(year);
  z.string().uuid().parse(teamId);
  return `${root}/seasons/${year}/REG/teams/${teamId}/statistics.json`;
}

export async function fetchLookup(endpoint: string) {
  if (!/^\/nfl\/official\/(trial|production)\/v7\/en\/(league\/teams\.json|seasons\/\d{4}\/REG\/teams\/[0-9a-f-]+\/statistics\.json)$/.test(endpoint)) throw new StatsError("invalid_endpoint");
  const key = process.env.SPORTRADAR_API_KEY;
  if (!key) throw new StatsError("provider_key_not_configured", 503);
  return fetchProviderJson(endpoint, key);
}

async function fetchProviderJson(endpoint: string, key: string): Promise<{ raw: unknown; status: number }> {
  try {
    const response = await fetch(`https://api.sportradar.com${endpoint}`, {
      headers: { "x-api-key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(12000), cache: "no-store", redirect: "error",
    });
    if (!response.ok) return { raw: null, status: response.status };
    const body = await response.text();
    if (body.length > 5_000_000) throw new StatsError("profile_too_large", 502);
    // Sanitize even an unexpected echoed credential before storage or preview.
    const safe = body.split(key).join("[REDACTED]");
    try { return { raw: JSON.parse(safe), status: response.status }; }
    catch { throw new StatsError("malformed_profile", 502); }
  } catch (error) {
    if (error instanceof StatsError) throw error;
    throw new StatsError(error instanceof Error && error.name === "TimeoutError" ? "provider_timeout" : "provider_network_error", 502);
  }
}
export { responseError };
