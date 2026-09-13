import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ cached: null as unknown, fetched: vi.fn(), rpc: vi.fn(), failReservation: false, failLog: false, logWrites: [] as unknown[], inserts: [] as unknown[] }));
vi.mock("@/lib/sportradar/client", async importOriginal => {
  const original = await importOriginal<typeof import("@/lib/sportradar/client")>();
  return { ...original, fetchProfile: mock.fetched };
});
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({
  rpc: mock.rpc,
  from: (table: string) => {
    let operation = "read";
    let value: unknown;
    const chain = {
      select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
      insert: (body: unknown) => { operation = "insert"; value = body; if (table === "provider_request_logs") mock.logWrites.push(body); else mock.inserts.push(body); return chain; },
      update: (body: unknown) => { operation = "update"; value = body; mock.logWrites.push(body); return chain; },
      maybeSingle: () => chain, single: () => chain,
      then: (resolve: (r: unknown) => void) => resolve({ error: table === "provider_request_logs" && mock.failLog ? { message: "fail" } : null,
        data: table === "players" ? { id: "03570d21-b56b-43ec-aa85-f95883c65b6b" } : table === "player_stat_ingestions" ? (operation === "read" ? mock.cached : { id: "review-id", ...(value as object) }) : null }),
    };
    return chain;
  },
}) }));
import { previewProfile } from "@/lib/sportradar/service";
const player = "03570d21-b56b-43ec-aa85-f95883c65b6b", provider = "3069db07-aa43-4503-ab11-2ae5c0002721";
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("SPORTRADAR_API_KEY", "fixture-secret");
  mock.cached = null; mock.failLog = false; mock.logWrites = []; mock.inserts = [];
  mock.rpc.mockResolvedValue({ data: "request-id", error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("manual ingestion quota behavior", () => {
  it("serves a cached profile without reserving or consuming an API call", async () => {
    mock.cached = { id: "cached", status: "IMPORTED", fetched_at: "2020-01-01" };
    expect(await previewProfile(player,provider,"nfl",false)).toMatchObject({ id: "cached", cacheHit: true });
    expect(mock.fetched).not.toHaveBeenCalled(); expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.logWrites[0]).toMatchObject({ cache_hit: true });
  });
  it("cannot bypass quota reservation", async () => {
    mock.rpc.mockResolvedValue({ error: { message: "trial_budget_exhausted" } });
    await expect(previewProfile(player,provider,"nfl",false)).rejects.toThrow("trial_budget_exhausted");
    expect(mock.fetched).not.toHaveBeenCalled();
  });
  it("preserves failure logs and does not retry 429", async () => {
    mock.fetched.mockResolvedValue({ raw: null, status: 429 });
    await expect(previewProfile(player,provider,"nfl",false)).rejects.toThrow("provider_quota_limited");
    expect(mock.fetched).toHaveBeenCalledTimes(1); expect(mock.logWrites[0]).toMatchObject({ response_status: 429, error_code: "provider_quota_limited" });
  });
  it("retries a 5xx once, with a second logged quota reservation", async () => {
    vi.useFakeTimers();
    mock.fetched.mockResolvedValueOnce({ raw: null, status: 503 }).mockResolvedValueOnce({ raw: { id: provider }, status: 200 });
    const pending = previewProfile(player,provider,"nfl",false);
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toMatchObject({ status: "NO_DATA" });
    expect(mock.rpc).toHaveBeenCalledTimes(2); expect(mock.logWrites).toHaveLength(2);
  });
  it("refuses refresh within the minimum interval", async () => {
    mock.cached = { fetched_at: new Date().toISOString() };
    await expect(previewProfile(player,provider,"nfl",true)).rejects.toThrow("refresh_cooldown");
    expect(mock.fetched).not.toHaveBeenCalled();
  });
  it("fails closed if request completion cannot be logged", async () => {
    mock.failLog = true; mock.fetched.mockResolvedValue({ raw: null, status: 503 });
    await expect(previewProfile(player,provider,"nfl",false)).rejects.toThrow("stats_storage_unavailable");
    expect(mock.fetched).toHaveBeenCalledTimes(1);
  });
});
