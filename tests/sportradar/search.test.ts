import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { matchPlayers, searchProviderPlayers } from "@/lib/sportradar/search";
const state = vi.hoisted(() => ({ fetch: vi.fn(), reserve: vi.fn(), writes: [] as unknown[], cache: new Map<string, unknown>(), failCache: false }));
const teamId = "768c92aa-75ff-4a43-bcc0-f2798c2e1724";
const playerId = "3069db07-aa43-4503-ab11-2ae5c0002721";
vi.mock("@/lib/sportradar/client", async original => ({ ...await original<typeof import("@/lib/sportradar/client")>(), fetchLookup: state.fetch }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({
  rpc: state.reserve,
  from: (table: string) => {
    let key = ""; let write: unknown;
    const chain = {
      select: () => chain, eq: (_field: string, value: string) => { key = value; return chain; }, maybeSingle: () => chain,
      upsert: (value: unknown) => { write = value; state.writes.push(value); return chain; },
      update: (value: unknown) => { write = value; state.writes.push(value); return chain; },
      then: (resolve: (value: unknown) => void) => resolve({ error: table === "sportradar_lookup_cache" && state.failCache ? { code: "missing" } : null,
        data: write ? null : table === "players" ? { gsis_id: "GSIS", full_name: "Keith Rivers", team: "BUF" }
          : table === "nfl_players" ? { latest_team: "BUF", last_season: 2014 } : state.cache.get(key) ?? null }),
    }; return chain;
  },
}) }));
beforeEach(() => { vi.clearAllMocks(); state.writes = []; state.cache.clear(); state.failCache = false; vi.stubEnv("SPORTRADAR_API_KEY", "fixture"); vi.stubEnv("SPORTRADAR_ACCESS_LEVEL", "trial"); state.reserve.mockResolvedValue({ data: "request" }); });
afterEach(() => vi.unstubAllEnvs());
it("matches names, keeps ambiguous candidates separate, and ignores invalid IDs", () => {
  const rows = [{ id: playerId, name: "Keith Rivers", position: "OLB" }, { id: teamId, name: "Keith Rivers Jr." }, { id: "bad", name: "Keith Rivers" }, { id: playerId, name: "Keith Rivers" }];
  expect(matchPlayers({ players: rows }, "keith rivers", "Buffalo Bills", 2014)).toHaveLength(2);
  expect(matchPlayers({ players: rows }, "Unrelated Athlete", "Buffalo Bills", 2014)).toEqual([]);
});
it("uses saved historical team/season and obtains the provider UUID without a manual ID", async () => {
  state.fetch.mockResolvedValueOnce({ status: 200, raw: { teams: [{ id: teamId, alias: "BUF", name: "Bills", market: "Buffalo" }] } });
  state.fetch.mockResolvedValueOnce({ status: 200, raw: { players: [{ id: playerId, name: "Keith Rivers", position: "OLB", statistics: { private: "discard" } }] } });
  const result = await searchProviderPlayers(playerId, "Keith Rivers");
  expect(result).toMatchObject({ team: "BUF", season: 2014, candidates: [{ id: playerId, name: "Keith Rivers", team: "Buffalo Bills" }] });
  expect(state.fetch.mock.calls[1][0]).toContain(`/seasons/2014/REG/teams/${teamId}/statistics.json`);
  expect(state.reserve).toHaveBeenCalledWith("reserve_sportradar_request", expect.objectContaining({ p_provider_id: null }));
  expect(JSON.stringify(state.writes)).not.toContain("private");
});
it("reuses cached feeds without consuming provider quota", async () => {
  const expires_at = new Date(Date.now() + 60000).toISOString();
  state.cache.set('/nfl/official/trial/v7/en/league/teams.json', { expires_at, payload: { teams: [{ id: teamId, alias: "BUF", name: "Bills" }] } });
  state.cache.set(`/nfl/official/trial/v7/en/seasons/2014/REG/teams/${teamId}/statistics.json`, { expires_at, payload: { players: [] } });
  expect((await searchProviderPlayers(playerId, "Keith Rivers")).candidates).toEqual([]);
  expect(state.fetch).not.toHaveBeenCalled(); expect(state.reserve).not.toHaveBeenCalled();
});
it("fails closed when quota reservation is refused", async () => {
  state.reserve.mockResolvedValue({ error: { message: "trial_budget_exhausted" } });
  await expect(searchProviderPlayers(playerId, "Keith Rivers")).rejects.toThrow("trial_budget_exhausted");
  expect(state.fetch).not.toHaveBeenCalled();
});
it("logs access failures and does not expose provider error bodies", async () => {
  state.fetch.mockResolvedValue({ status: 403, raw: "private upstream error" });
  await expect(searchProviderPlayers(playerId, "Keith Rivers")).rejects.toThrow("provider_access_denied");
  expect(state.writes).toContainEqual(expect.objectContaining({ response_status: 403, error_code: "provider_access_denied" }));
});
