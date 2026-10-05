// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), permission: vi.fn(), service: vi.fn(), queryEvents: vi.fn(), persist: vi.fn(),
  tables: {} as Record<string, { data: unknown; error: unknown }>,
  reads: [] as Array<{ table: string; columns: string; filters: Array<[string, unknown]> }>,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.permission }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.service }));
vi.mock("@/lib/analytics/delivery/tinybird", () => ({ queryFeatureEvents: mocks.queryEvents }));

import { GET, POST } from "@/app/api/admin/intelligence/features/route";
import { loadMeasuredIntelligence, refreshMeasuredIntelligence } from "@/lib/intelligence/measured-server";
import { canonicalInputJson, measuredInputHash } from "@/lib/intelligence/measured-integrity";
import { measuredInputSchema } from "@/lib/intelligence/measured-validation";
import { featureSubjectKey, projectIntelligenceFeatures, type FeatureCoverage } from "@/lib/intelligence/features";
import type { BLTZEvent } from "@/lib/analytics/bltz-event";

// Canonical test identities never touch a live database or provider.
const playerId = "10000000-0000-4000-8000-000000000001";
const otherPlayer = "10000000-0000-4000-8000-000000000002";
const runId = "20000000-0000-4000-8000-000000000001";
const eventId = "30000000-0000-4000-8000-000000000001";
const sessionId = "40000000-0000-4000-8000-000000000001";
const now = "2026-10-05T12:00:00.000Z";
const endpoint = "https://development.example/api/admin/intelligence/features";
const instrumentation = ["locker_viewed", "film_room_opened", "photo_gallery_opened", "media_opened", "share_link_copied", "share_intent"];

function event(patch: Partial<BLTZEvent> = {}): BLTZEvent {
  return { event_id: eventId, schema_version: 1, event_name: "locker_viewed", event_version: "legacy-v1",
    occurred_at: "2026-10-04T12:00:00.000Z", received_at: now, environment: "development", surface: "public_locker",
    producer: "bltz_collector", actor_kind: "anonymous", measurement_basis: "unverified_client", audience_eligible: true,
    subject_player_id: playerId, moment_id: null, asset_id: null, asset_model: null, session_id: sessionId,
    scope_key: "public_audience", source_channel: "unknown", properties: { legacy_event_name: "locker_viewed", definition: "legacy tab-session entry; not people" }, ...patch };
}

function preservedRun(environment: "development" | "production" = "development") {
  const coverage = (start: string, end: string): FeatureCoverage => ({ state: "complete", start, end, fraction: 1,
    measurementVersion: "legacy-v1", instrumentedEvents: [...instrumentation] });
  const draft = { subject: { kind: "athlete" as const, playerId }, scope: { kind: "public_audience" as const },
    environment, events: [event({ environment })], asOf: now, computedAt: now, eventWatermark: now, runId,
    inputSnapshotReference: `intelligence_engine_runs:${runId}`, inputRevision: 1, queryTruncated: false,
    coverage: { current: coverage("2026-09-28T12:00:00.000Z", now), baseline: coverage("2026-09-21T12:00:00.000Z", "2026-09-28T12:00:00.000Z") } };
  const input = measuredInputSchema.parse({ ...draft, inputSnapshotHash: measuredInputHash(draft) });
  return { id: runId, input_snapshot: input, input_snapshot_hash: input.inputSnapshotHash, features: projectIntelligenceFeatures(input),
    player_id: playerId, moment_id: null, environment, scope_key: "public_audience" };
}

function chain(table: string) {
  const read = { table, columns: "", filters: [] as Array<[string, unknown]> };
  mocks.reads.push(read);
  const query = {
    select(columns: string) { read.columns = columns; return query; },
    eq(key: string, value: unknown) { read.filters.push([key, value]); return query; },
    maybeSingle() { return Promise.resolve(mocks.tables[table] ?? { data: null, error: null }); },
  };
  return query;
}
function makeReadable(run = preservedRun()) {
  mocks.tables.intelligence_feature_snapshots = { data: { run_id: run.id }, error: null };
  mocks.tables.intelligence_engine_runs = { data: run, error: null };
  return run;
}
function request(body: unknown = { playerId }, origin = new URL(endpoint).origin) {
  return new Request(endpoint, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
function deny(status: 401 | 403 | 503) {
  if (status === 401) mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
  if (status === 403) mocks.permission.mockResolvedValue({ data: false, error: null });
  if (status === 503) mocks.permission.mockResolvedValue({ data: null, error: { message: "PRIVATE_AUTH_FAILURE" } });
}

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  vi.stubEnv("BLTZ_ANALYTICS_PIPELINE_ENABLED", "true"); vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "development"); vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("BLTZ_ANALYTICS_PRODUCTION_ENABLED", "false");
  mocks.auth.mockResolvedValue({ data: { user: { id: "internal-admin" } }, error: null });
  mocks.permission.mockResolvedValue({ data: true, error: null });
  mocks.tables = { players: { data: { id: playerId }, error: null } }; mocks.reads = [];
  mocks.service.mockImplementation(() => ({ from: chain, rpc: mocks.persist }));
  mocks.persist.mockResolvedValue({ data: true, error: null });
  mocks.queryEvents.mockResolvedValue({ events: [event()], truncated: false });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("measured feature authorization and serving", () => {
  it("keeps production reads and refresh disabled without explicit opt-in", async () => {
    vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "production"); vi.stubEnv("VERCEL_ENV", "production");
    expect(await loadMeasuredIntelligence(playerId)).toMatchObject({ state: "unavailable", refreshAllowed: false });
    await expect(refreshMeasuredIntelligence(playerId)).rejects.toThrow("development_measurement_disabled");
    expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.queryEvents).not.toHaveBeenCalled();
  });
  it("serves only reproduced production inputs with explicitly scoped privileged reads", async () => {
    vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "production"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BLTZ_ANALYTICS_PRODUCTION_ENABLED", "true");
    const run = makeReadable(preservedRun("production"));
    expect(await loadMeasuredIntelligence(playerId)).toMatchObject({ state: "ready", environment: "production", snapshot: run.features });
    expect(mocks.reads.every(read => read.filters.some(([key,value]) => key === "environment" && value === "production"))).toBe(true);
    expect(mocks.persist).not.toHaveBeenCalled();
    deny(403); mocks.service.mockClear();
    await expect(loadMeasuredIntelligence(playerId)).rejects.toMatchObject({ status: 403 });
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it.each(["development_row", "wrong_input", "mixed_event", "wrong_projection"])("withholds cross-environment persisted %s", async mode => {
    vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "production"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BLTZ_ANALYTICS_PRODUCTION_ENABLED", "true");
    const run = makeReadable(preservedRun("production"));
    if (mode === "development_row") run.environment = "development";
    if (mode === "wrong_input") run.input_snapshot.environment = "development";
    if (mode === "mixed_event") run.input_snapshot.events[0].environment = "development";
    if (mode === "wrong_projection") run.features.environment = "development";
    expect(await loadMeasuredIntelligence(playerId)).toMatchObject({ state: "unavailable", environment: "production", snapshot: null, evaluation: null });
    expect(mocks.persist).not.toHaveBeenCalled();
  });
  it.each(["disabled", "wrong_environment", "production"])("does no privileged reads or provider query when %s", async mode => {
    if (mode === "disabled") vi.stubEnv("BLTZ_ANALYTICS_PIPELINE_ENABLED", "false");
    if (mode === "wrong_environment") vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "production");
    if (mode === "production") vi.stubEnv("VERCEL_ENV", "production");
    expect(await loadMeasuredIntelligence(playerId)).toMatchObject({ state: "unavailable", snapshot: null, evaluation: null });
    await expect(refreshMeasuredIntelligence(playerId)).rejects.toThrow("development_measurement_disabled");
    expect(mocks.permission).toHaveBeenCalledWith("is_internal_admin");
    expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.queryEvents).not.toHaveBeenCalled();
  });

  it.each([401, 403, 503] as const)("fails closed before service construction on authorization status %s", async status => {
    deny(status);
    await expect(loadMeasuredIntelligence(playerId)).rejects.toMatchObject({ status });
    await expect(refreshMeasuredIntelligence(playerId)).rejects.toMatchObject({ status });
    expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.queryEvents).not.toHaveBeenCalled(); expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("rejects provider IDs instead of treating them as canonical athlete identities", async () => {
    await expect(loadMeasuredIntelligence("provider:1234")).rejects.toThrow();
    await expect(refreshMeasuredIntelligence("provider:1234")).rejects.toThrow();
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it("replays preserved inputs and scopes both pointer and run reads without writing", async () => {
    const run = makeReadable();
    const loaded = await loadMeasuredIntelligence(playerId);
    expect(loaded.state).toBe("ready"); expect(loaded.snapshot).toEqual(run.features);
    expect(loaded.snapshot?.current.metrics.lockerOpens).toMatchObject({ value: 1, state: "observed" });
    expect(mocks.reads[0]).toMatchObject({ table: "intelligence_feature_snapshots", filters: [
      ["environment", "development"], ["subject_key", featureSubjectKey({ kind: "athlete", playerId })], ["scope_key", "public_audience"], ["feature_version", "engagement-v1"],
    ] });
    expect(mocks.reads[1].filters).toEqual([["id", runId], ["player_id", playerId], ["environment", "development"], ["scope_key", "public_audience"]]);
    expect(mocks.persist).not.toHaveBeenCalled(); expect(mocks.queryEvents).not.toHaveBeenCalled();
  });

  it("marks old reads stale while preserving immutable computation, watermark and hash", async () => {
    const run = makeReadable(); const original = canonicalInputJson(run);
    vi.setSystemTime("2026-10-05T13:00:00.000Z");
    const loaded = await loadMeasuredIntelligence(playerId);
    expect(loaded.state).toBe("ready"); expect(loaded.snapshot?.quality.stale).toBe(true);
    expect(loaded.snapshot?.current.metrics.lockerOpens).toMatchObject({ value: 1, state: "stale" });
    expect(loaded.snapshot?.provenance).toEqual(run.features.provenance);
    expect(loaded.evaluation?.suppressed.find(row => row.type === "locker_discovery_spike")?.reasons).toContain("stale_features");
    expect(canonicalInputJson(run)).toBe(original); expect(mocks.persist).not.toHaveBeenCalled();
  });

  it.each(["input_hash", "run_hash", "projection", "subject", "run_identity", "scope", "missing_truncation"])("withholds stored metrics for corrupted %s", async corruption => {
    const run = makeReadable();
    if (corruption === "input_hash") run.input_snapshot.events[0].event_name = "share_intent";
    if (corruption === "run_hash") run.input_snapshot_hash = "0".repeat(64);
    if (corruption === "projection") run.features.current.metrics.lockerOpens.value = 50;
    if (corruption === "subject") run.input_snapshot.subject.playerId = otherPlayer;
    if (corruption === "run_identity") run.id = "20000000-0000-4000-8000-000000000002";
    if (corruption === "scope") Object.assign(run.input_snapshot.scope, { kind: "internal_admin" });
    if (corruption === "missing_truncation") delete (run.input_snapshot as Partial<typeof run.input_snapshot>).queryTruncated;
    expect(await loadMeasuredIntelligence(playerId)).toMatchObject({ state: "unavailable", snapshot: null, evaluation: null });
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it.each(["absent_pointer", "pointer_error", "absent_run", "run_error"])("withholds unavailable lineage for %s", async failure => {
    makeReadable();
    const table = failure.includes("pointer") ? "intelligence_feature_snapshots" : "intelligence_engine_runs";
    mocks.tables[table] = { data: null, error: failure.endsWith("error") ? { message: "PRIVATE_DB_DETAILS" } : null };
    const loaded = await loadMeasuredIntelligence(playerId);
    expect(loaded).toMatchObject({ state: "unavailable", snapshot: null, evaluation: null });
    expect(JSON.stringify(loaded)).not.toContain("PRIVATE_DB_DETAILS");
    expect(mocks.persist).not.toHaveBeenCalled();
  });
});

describe("explicit development feature refresh", () => {
  it("uses explicit production provider scope and persists only matching partial measurements", async () => {
    vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "production"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BLTZ_ANALYTICS_PRODUCTION_ENABLED", "true");
    mocks.queryEvents.mockResolvedValue({ events: [event({ environment: "production" })], truncated: false });
    await refreshMeasuredIntelligence(playerId);
    expect(mocks.queryEvents).toHaveBeenCalledWith(playerId, "2026-09-21T12:00:00.000Z", now, { expectedEnvironment: "production" });
    const run = mocks.persist.mock.calls[0][1].p_run;
    expect(run).toMatchObject({ environment: "production", input_snapshot: { environment: "production" }, features: { environment: "production", current: { coverage: { state: "partial", fraction: null } } } });
    expect(run.input_snapshot.events.every((row: BLTZEvent) => row.environment === "production")).toBe(true);
    expect(run.features.comparisons.lockerSessions.growthFraction).toBeNull();
  });
  it.each(["development", "production"] as const)("refuses mixed provider rows during %s refresh before persistence", async environment => {
    if (environment === "production") {
      vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "production"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BLTZ_ANALYTICS_PRODUCTION_ENABLED", "true");
    }
    mocks.queryEvents.mockResolvedValue({ events: [event({ environment }), event({ environment: environment === "production" ? "development" : "production" })], truncated: false });
    await expect(refreshMeasuredIntelligence(playerId)).rejects.toThrow("measurement_environment_mismatch");
    expect(mocks.persist).not.toHaveBeenCalled();
  });
  it("persists replayable inputs and permits events received during the bounded query", async () => {
    mocks.queryEvents.mockImplementation(async () => {
      vi.setSystemTime("2026-10-05T12:00:02.000Z");
      return { events: [event({ received_at: "2026-10-05T12:00:01.000Z" })], truncated: false };
    });
    const result = await refreshMeasuredIntelligence(playerId);
    expect(mocks.queryEvents).toHaveBeenCalledWith(playerId, "2026-09-21T12:00:00.000Z", now, { expectedEnvironment: "development" });
    const [procedure, { p_run: run }] = mocks.persist.mock.calls[0];
    expect(procedure).toBe("store_intelligence_feature_run"); expect(result).toEqual({ runId: run.id, projected: true });
    const input = measuredInputSchema.parse(run.input_snapshot);
    expect(input).toMatchObject({ asOf: now, computedAt: "2026-10-05T12:00:02.000Z", eventWatermark: "2026-10-05T12:00:01.000Z", queryTruncated: false });
    expect(measuredInputHash(input)).toBe(run.input_snapshot_hash); expect(input.inputSnapshotHash).toBe(run.input_snapshot_hash);
    expect(run.features).toEqual(projectIntelligenceFeatures(input)); expect(run.features.provenance.inputSnapshotHash).toBe(run.input_snapshot_hash);
    expect(run).toMatchObject({ environment: "development", player_id: playerId, moment_id: null, scope_key: "public_audience", feature_version: "engagement-v1", rule_version: "measured-v1" });
  });

  it.each([false, true])("records truncation=%s without claiming complete audience coverage", async truncated => {
    mocks.queryEvents.mockResolvedValue({ events: [event()], truncated });
    await refreshMeasuredIntelligence(playerId);
    const run = mocks.persist.mock.calls[0][1].p_run;
    expect(run.input_snapshot.queryTruncated).toBe(truncated);
    expect(run.features.current.coverage).toMatchObject({ state: "partial", start: null, end: null, fraction: null });
    expect(run.features.current.metrics.lockerOpens).toMatchObject({ value: 1, state: "partial" });
    expect(run.features.comparisons.lockerSessions.growthFraction).toBeNull();
    expect(run.signals.signals.every((row: { type: string }) => row.type === "measurement_coverage_failure")).toBe(true);
    expect(run.signals.opportunities).toEqual([]);
    expect(run.signals.suppressed.find((row: { type: string }) => row.type === "locker_discovery_spike").reasons).toContain("incomplete_current_coverage");
    expect(measuredInputHash(run.input_snapshot)).toBe(run.input_snapshot_hash);
  });

  it("does not turn empty provider rows into observed zero demand", async () => {
    mocks.queryEvents.mockResolvedValue({ events: [], truncated: false });
    await expect(refreshMeasuredIntelligence(playerId)).rejects.toThrow("measurement_has_no_observed_events");
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it.each(["missing_player", "player_error"])("does not query a provider or store runs for %s", async failure => {
    mocks.tables.players = { data: null, error: failure === "player_error" ? { message: "PRIVATE_PLAYER_QUERY" } : null };
    await expect(refreshMeasuredIntelligence(playerId)).rejects.toThrow("measurement_subject_unavailable");
    expect(mocks.queryEvents).not.toHaveBeenCalled(); expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("keeps a rejected pointer promotion visible instead of reporting a current snapshot", async () => {
    mocks.persist.mockResolvedValue({ data: false, error: null });
    expect(await refreshMeasuredIntelligence(playerId)).toMatchObject({ projected: false });
  });

  it("never persists an input snapshot after a provider exception", async () => {
    mocks.queryEvents.mockRejectedValue(new Error("PRIVATE_PROVIDER_QUERY"));
    await expect(refreshMeasuredIntelligence(playerId)).rejects.toThrow("PRIVATE_PROVIDER_QUERY");
    expect(mocks.persist).not.toHaveBeenCalled();
  });
});

describe("protected measured-feature API", () => {
  it("serves sanitized replayed metrics and manual refresh results without public caching", async () => {
    const run = makeReadable();
    const read = await GET(new Request(`${endpoint}?playerId=${playerId}`));
    expect(read.status).toBe(200); expect(await read.json()).toMatchObject({ state: "ready", snapshot: run.features });
    expect(read.headers.get("cache-control")).toBe("private, no-store");
    const refreshed = await POST(request());
    expect(refreshed.status).toBe(200); expect(await refreshed.json()).toMatchObject({ projected: true });
    expect(refreshed.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each([401, 403, 503] as const)("returns safe authorization status %s for both routes before privilege use", async status => {
    deny(status);
    for (const response of [await GET(new Request(`${endpoint}?playerId=${playerId}`)), await POST(request())]) {
      expect(response.status).toBe(status); expect(await response.text()).not.toContain("PRIVATE_AUTH_FAILURE");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("vary")).toBe("Cookie"); expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    }
    expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.queryEvents).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin refresh before authorization or persistence", async () => {
    expect((await POST(request({ playerId }, "https://attacker.example"))).status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("caps actual streamed bytes even when a caller supplies a false content length", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode("x".repeat(513))); },
      cancel() { cancelled = true; },
    });
    const streamed = new Request(endpoint, { method: "POST", headers: { origin: new URL(endpoint).origin, "content-length": "1" }, body, duplex: "half" } as RequestInit);
    const response = await POST(streamed);
    expect(response.status).toBe(413); expect(cancelled).toBe(true);
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("rejects invalid canonical IDs and unknown payload properties before database access", async () => {
    expect((await GET(new Request(`${endpoint}?playerId=provider-id`))).status).toBe(400);
    expect((await POST(request({ playerId, environment: "production" }))).status).toBe(400);
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it.each(["provider", "persistence"])("does not expose private %s failures or publish failed metrics", async failure => {
    if (failure === "provider") mocks.queryEvents.mockRejectedValue(new Error("PRIVATE_PROVIDER_QUERY_AND_TOKEN"));
    if (failure === "persistence") mocks.persist.mockResolvedValue({ data: null, error: { message: "PRIVATE_PERSISTENCE_DETAILS" } });
    const response = await POST(request());
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "Development measurements are unavailable." });
    if (failure === "provider") expect(mocks.persist).not.toHaveBeenCalled();
  });
});
