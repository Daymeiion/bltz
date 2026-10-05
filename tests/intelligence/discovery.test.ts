// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createDiscoveryProbe, extractAthleteGameEvidence } from "@/scripts/intelligence-sportradar-discovery.mjs";

const ID = "00000000-0000-4000-8000-000000000001";
const endpoint = "/nfl/official/trial/v7/en/league/seasons.json";
function setup() {
  const completion = { eq: vi.fn().mockResolvedValue({ error: null }) };
  const update = vi.fn(() => completion);
  const db = { rpc: vi.fn().mockResolvedValue({ data: ID, error: null }), from: vi.fn(() => ({ update })) };
  const fetchImpl = vi.fn().mockResolvedValue(new Response('{"seasons":[]}', { status: 200 }));
  const wait = vi.fn().mockResolvedValue(undefined);
  const readLedger = vi.fn().mockResolvedValue({ waitMs: 0, cooldownUntil: null });
  const probe = createDiscoveryProbe({ db, apiKey: "test-private-key", playerId: ID, providerId: ID, fetchImpl, wait, readLedger });
  return { db, fetchImpl, wait, update, probe, readLedger };
}
describe("bounded Sportradar research transport", () => {
  it("rejects arbitrary/production/provider URLs before quota reservation", async () => {
    const { db, fetchImpl, probe } = setup();
    for (const value of ["https://example.com", endpoint + "?key=secret", endpoint.replace("trial", "production"), "/ncaafb/trial/v7/en/league/seasons.json"]) await expect(probe.request(value)).rejects.toThrow("endpoint_not_allowlisted");
    expect(db.rpc).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("requires durable reservation before external IO and never sends a key in a URL", async () => {
    const { db, fetchImpl, probe } = setup();
    await probe.request(endpoint);
    expect(db.rpc.mock.invocationCallOrder[0]).toBeLessThan(fetchImpl.mock.invocationCallOrder[0]);
    expect(fetchImpl.mock.calls[0][0]).not.toContain("test-private-key");
    expect(fetchImpl.mock.calls[0][1].headers["x-api-key"]).toBe("test-private-key");
    expect(JSON.stringify(probe.observations)).not.toContain("test-private-key");
  });
  it("stops without calling the provider when the reservation budget is exhausted", async () => {
    const { db, fetchImpl, probe } = setup();
    db.rpc.mockResolvedValue({ data: null, error: { message: "trial_budget_exhausted" } });
    await expect(probe.request(endpoint)).rejects.toThrow("trial_budget_exhausted");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("logs access denial and stops without retrying or following provider errors", async () => {
    const { fetchImpl, update, probe } = setup();
    fetchImpl.mockResolvedValue(new Response("provider error api_key=test-private-key", { status: 403 }));
    await expect(probe.request(endpoint)).rejects.toThrow("provider_access_or_response_failure");
    await expect(probe.request(endpoint)).rejects.toThrow("discovery_stopped_or_call_cap");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ response_status: 403, error_code: "provider_access_or_response_failure" }));
    expect(JSON.stringify(probe.observations)).not.toContain("test-private-key");
  });
  it("caps calls at four and spaces calls even when each succeeds", async () => {
    const { fetchImpl, wait, probe } = setup();
    fetchImpl.mockImplementation(async () => new Response("{}", { status: 200 }));
    for (let index = 0; index < 4; index++) await probe.request(endpoint);
    await expect(probe.request(endpoint)).rejects.toThrow("discovery_stopped_or_call_cap");
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(wait).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledWith(2500);
  });
  it("checks the provider-wide ledger before the first call and waits for recent traffic", async () => {
    const { readLedger, wait, probe } = setup();
    readLedger.mockResolvedValue({ waitMs: 2100, cooldownUntil: null });
    await probe.request(endpoint);
    expect(wait).toHaveBeenCalledWith(2100);
  });
  it("does not reserve or fetch while the shared SQL cooldown is active", async () => {
    const { readLedger, db, fetchImpl, probe } = setup();
    readLedger.mockResolvedValue({ waitMs: 0, cooldownUntil: "2026-10-01T00:00:00.000Z" });
    await expect(probe.request(endpoint)).rejects.toThrow("provider_cooldown");
    expect(db.rpc).not.toHaveBeenCalled(); expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("backs off a bounded reservation race without making an unreserved provider call", async () => {
    const { db, fetchImpl, wait, probe } = setup();
    db.rpc.mockResolvedValueOnce({ data: null, error: { message: "request_throttled" } });
    await probe.request(endpoint);
    expect(db.rpc).toHaveBeenCalledTimes(2); expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledWith(2500);
  });
  it("stops after three throttled reservations without spending a provider call", async () => {
    const { db, fetchImpl, probe } = setup();
    db.rpc.mockResolvedValue({ data: null, error: { message: "request_throttled" } });
    await expect(probe.request(endpoint)).rejects.toThrow("request_throttled");
    expect(db.rpc).toHaveBeenCalledTimes(3); expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("records redacted HTTP429 diagnostics and honors the longer shared cooldown", async () => {
    const { fetchImpl, probe } = setup();
    fetchImpl.mockResolvedValue(new Response("Too many requests; api_key=test-private-key https://provider.test/?key=secret", { status: 429, headers: { "Retry-After": "5", "x-ratelimit-remaining": "900", "set-cookie": "secret-cookie" } }));
    await expect(probe.request(endpoint)).rejects.toThrow("provider_rate_limited");
    const observed = probe.observations[0];
    expect(observed.retryAfterMs).toBe(5000);
    expect(Date.parse(observed.nextEligibleAt!) - Date.parse(observed.fetchedAt)).toBe(3600000);
    expect(observed.headers["x-ratelimit-remaining"]).toBe("900");
    expect(observed.headers).not.toHaveProperty("set-cookie");
    expect(JSON.stringify(observed)).not.toContain("test-private-key");
    expect(JSON.stringify(observed)).not.toContain("https://provider.test");
    expect(JSON.stringify(observed)).not.toContain("secret-cookie");
    await expect(probe.request(endpoint)).rejects.toThrow("discovery_stopped_or_call_cap");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("prevents concurrent requests from racing the per-run call cap", async () => {
    const { probe } = setup();
    const pending = probe.request(endpoint);
    await expect(probe.request(endpoint)).rejects.toThrow("discovery_request_in_progress");
    await pending;
  });
});

describe("source-backed game candidate", () => {
  const player = "d2c5d2fa-dd75-444e-b8e0-63c31a3791be";
  const game = "eb3bb333-6ae5-417c-b9e3-1d3dfdb8673e";
  const stats = { id: game, status: "closed", scheduled: "2014-09-07T17:03:22+00:00", statistics: { away: { defense: { players: [{ id: player, name: "Keith Rivers", tackles: 3, assists: 1, combined: 4, sacks: 0 }] } } } };
  const pbp = { id: game, periods: [{ pbp: [{ events: [{ id: ID, type: "play", clock: "13:53", wall_clock: "2014-09-07T17:41:00+00:00", statistics: [{ stat_type: "defense", tackle: 1, player: { id: player, name: "Keith Rivers" } }] }] }] }] };
  const source = { provider: "sportradar", locator: endpoint, fetchedAt: "2026-10-01T03:56:14.559Z" };
  it("retains exact statistic/play paths and does not double-count nested player objects", () => {
    const result = extractAthleteGameEvidence({ playerId: ID, providerId: player, statistics: stats, pbp, statisticsSource: source, playSource: source });
    expect(result.uniquePlayCount).toBe(1); expect(result.playActionCount).toBe(1);
    expect(result.performances[0]).toMatchObject({ pointer: "/statistics/away/defense/players/0", numericMetrics: { tackles: 3, assists: 1, combined: 4, sacks: 0 }, source });
    expect(result.plays[0].actions[0].pointer).toBe("/periods/0/pbp/0/events/0/statistics/0");
    expect(result.event.actualCompletionTime).toBeNull();
    expect(result).toMatchObject({ reviewStatus: "candidate", significance: "not_evaluated", economicParticipation: "not_established" });
  });
  it("rejects conflicting game identity and absent explicit athlete performance", () => {
    expect(() => extractAthleteGameEvidence({ playerId: ID, providerId: player, statistics: stats, pbp: { ...pbp, id: ID }, statisticsSource: source, playSource: source })).toThrow("game_evidence_identity_conflict");
    expect(() => extractAthleteGameEvidence({ playerId: ID, providerId: ID, statistics: stats, pbp, statisticsSource: source, playSource: source })).toThrow("explicit_athlete_performance_required");
  });
});
