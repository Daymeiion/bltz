// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsPipelineEnabled, getAnalyticsRuntimeEnvironment, toBLTZEvent } from "@/lib/analytics/bltz-event";
import { analyticsDeliveryResources, getAnalyticsDeliveryConfiguration } from "@/lib/analytics/delivery/config";
import { validateDeliveryBatch, type AnalyticsDeliveryBatch } from "@/lib/analytics/delivery/contracts";
import { createAnalyticsDeliveryPublisher, deliverAnalyticsJob, dispatchAnalyticsBacklog } from "@/lib/analytics/delivery/pipeline";
import { verifyAnalyticsCronSecret } from "@/lib/analytics/delivery/authentication";
import { ingestAnalyticsBatch, queryFeatureEvents, reconcileAnalyticsBatch } from "@/lib/analytics/delivery/tinybird";
import { bltzEventsProduction, bltzEventsProductionDeduplicated, bltzEventsProductionSubjectCounts,
  bltzEventsProductionBatchReconciliation, bltzEventsProductionFeatureEvents, PRODUCTION_DEDUPLICATED_EVENTS_SQL } from "@/lib/analytics/delivery/tinybird-definitions";
import type { AnalyticsDeliveryStore } from "@/lib/analytics/delivery/store";

const environment = {
  BLTZ_ANALYTICS_PIPELINE_ENABLED: "true", BLTZ_ANALYTICS_ENVIRONMENT: "production", BLTZ_ANALYTICS_PRODUCTION_ENABLED: "true", VERCEL_ENV: "production",
  BLTZ_ANALYTICS_WORKER_URL: "https://production.example.com/api/internal/analytics/deliver", BLTZ_ANALYTICS_DISPATCH_SECRET: "synthetic-production-dispatch-secret",
  QSTASH_URL: "https://qstash-us-east-1.upstash.io", QSTASH_TOKEN: "synthetic-production-publish", QSTASH_CURRENT_SIGNING_KEY: "synthetic-production-current", QSTASH_NEXT_SIGNING_KEY: "synthetic-production-next",
  TINYBIRD_ANALYTICS_URL: "https://api.us-west-2.aws.tinybird.co", TINYBIRD_ANALYTICS_INGEST_TOKEN: "synthetic-production-append", TINYBIRD_ANALYTICS_QUERY_TOKEN: "synthetic-production-read",
};
const config = getAnalyticsDeliveryConfiguration(environment)!;
const playerId = "10000000-0000-4000-8000-000000000001";
const eventId = "60000000-0000-4000-8000-000000000001";
const batchId = "c50d01ca-45a1-450f-93a2-b30afefb5b18";
const event = toBLTZEvent({ eventName: "locker_viewed", source: "public_locker", clientEventId: eventId,
  athleteId: playerId, sessionId: "70000000-0000-4000-8000-000000000001", occurredAt: "2026-10-05T00:00:00Z" }, "2026-10-05T00:00:01Z", "production");
const batch: AnalyticsDeliveryBatch = { batch_id: batchId, event_count: 1, event_ids: [eventId], payload_hashes: ["a".repeat(32)], envelopes: [event], attempt: 1, state: "processing" };
const job = { job_version: 1 as const, batch_id: batchId, environment: "production" as const };
function registry(overrides: Partial<AnalyticsDeliveryStore> = {}): AnalyticsDeliveryStore {
  return { lease: vi.fn(async () => batch), published: vi.fn(async () => true), releasePublish: vi.fn(async () => true),
    acquire: vi.fn(async () => batch), settle: vi.fn(async () => true), readBatch: vi.fn(async () => batch), ...overrides };
}
afterEach(() => vi.unstubAllEnvs());

describe("explicit production opt-in and deployment identity", () => {
  it("keeps configuration absent until the main flag and separate production approval are both enabled", () => {
    expect(getAnalyticsRuntimeEnvironment({ ...environment, BLTZ_ANALYTICS_PIPELINE_ENABLED: "false" })).toBeNull();
    expect(getAnalyticsDeliveryConfiguration({ ...environment, BLTZ_ANALYTICS_PIPELINE_ENABLED: "false" })).toBeNull();
    expect(getAnalyticsRuntimeEnvironment({ ...environment, BLTZ_ANALYTICS_PRODUCTION_ENABLED: "false" })).toBeNull();
    expect(() => getAnalyticsDeliveryConfiguration({ ...environment, BLTZ_ANALYTICS_PRODUCTION_ENABLED: undefined })).toThrow("environment_isolation");
    expect(getAnalyticsRuntimeEnvironment(environment)).toBe("production");
    expect(analyticsPipelineEnabled(environment)).toBe(true);
  });
  it.each(["preview", "development", undefined])("cannot export production from deployment %s", deployment => {
    expect(getAnalyticsRuntimeEnvironment({ ...environment, VERCEL_ENV: deployment })).toBeNull();
    expect(() => getAnalyticsDeliveryConfiguration({ ...environment, VERCEL_ENV: deployment })).toThrow("environment_isolation");
  });
  it("does not export development data from a production deployment or silently select the EU region", () => {
    expect(getAnalyticsRuntimeEnvironment({ ...environment, BLTZ_ANALYTICS_ENVIRONMENT: "development" })).toBeNull();
    expect(() => getAnalyticsDeliveryConfiguration({ ...environment, QSTASH_URL: undefined })).toThrow("QSTASH_URL");
    expect(toBLTZEvent({ eventName: "locker_viewed", source: "public_locker", clientEventId: eventId }, undefined, "production").environment).toBe("production");
  });
  it("pins different datasource and serving endpoints for each environment", () => {
    expect(analyticsDeliveryResources("production")).toEqual({ datasource: "bltz_events_production_v1", reconciliationPipe: "bltz_events_production_batch_reconciliation_v1", featureEventsPipe: "bltz_events_production_feature_events_v1" });
    expect(analyticsDeliveryResources("development").datasource).toBe("bltz_events_development_v1");
    expect(() => validateDeliveryBatch(batch)).toThrow("environment_mismatch");
    expect(validateDeliveryBatch(batch, "production")).toEqual(batch);
  });
});

describe("production transport fencing", () => {
  it("publishes the fixed production reference with isolated logical dedupe and no event payload", async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => Response.json({ messageId: "synthetic-message" }));
    const publisher = createAnalyticsDeliveryPublisher(config, fetcher);
    expect(await publisher.publish(job, 2)).toBe("synthetic-message");
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).toBe(`https://qstash-us-east-1.upstash.io/v2/publish/${config.workerUrl}`);
    expect(options?.headers).toMatchObject({ "Upstash-Deduplication-Id": `bltz-production-analytics:${batchId}:2`, "Upstash-Label": "bltz-production-analytics" });
    expect(JSON.parse(options?.body as string)).toEqual(job);
    await expect(publisher.publish({ ...job, environment: "development" }, 2)).rejects.toThrow("environment_mismatch");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(options?.headers).not.toHaveProperty("Upstash-Forward-x-vercel-protection-bypass");
  });
  it("forwards an optional server-only protection secret only with the fixed worker publish request", async () => {
    const secret = "synthetic-private-automation-bypass";
    const configured = getAnalyticsDeliveryConfiguration({ ...environment, VERCEL_AUTOMATION_BYPASS_SECRET: secret })!;
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => Response.json({ messageId: "synthetic-message" }));
    await createAnalyticsDeliveryPublisher(configured, fetcher).publish(job, 1);
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ "Upstash-Forward-x-vercel-protection-bypass": secret });
    expect(String(fetcher.mock.calls[0][0])).not.toContain(secret);
    expect(fetcher.mock.calls[0][1]?.body).not.toContain(secret);
    const store = registry();
    const failure = { publish: vi.fn(async () => { throw new Error(secret); }) };
    expect(JSON.stringify(await dispatchAnalyticsBacklog(configured, { store, publisher: failure }))).not.toContain(secret);
  });
  it.each(["synthetic-secret\nheader", "synthetic-secret\rheader", "synthetic-secret\u0000", "secret with spaces", "x".repeat(1025)])("rejects unsafe automation bypass values with fixed errors", secret => {
    try { getAnalyticsDeliveryConfiguration({ ...environment, VERCEL_AUTOMATION_BYPASS_SECRET: secret }); throw new Error("should reject"); }
    catch (error) { expect((error as Error).message).toBe("analytics_configuration_invalid:vercel_automation_bypass"); expect(String(error)).not.toContain(secret); }
  });
  it("rejects a mismatched job before any registry lease, including direct helper use", async () => {
    const store = registry();
    await expect(deliverAnalyticsJob(config, { ...job, environment: "development" }, { store })).rejects.toThrow("environment_mismatch");
    expect(store.acquire).not.toHaveBeenCalled(); expect(store.settle).not.toHaveBeenCalled();
  });
  it("rejects a registry batch from the other environment before ingest or acknowledgment", async () => {
    const store = registry({ acquire: vi.fn(async () => ({ ...batch, envelopes: [{ ...event, environment: "development" as const }] })) });
    const ingest = vi.fn();
    await expect(deliverAnalyticsJob(config, job, { store, ingest })).rejects.toThrow("environment_mismatch");
    expect(ingest).not.toHaveBeenCalled(); expect(store.settle).not.toHaveBeenCalled();
  });
  it("ingests production only into its own datasource and fails closed before cross-environment transport", async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => Response.json({ successful_rows: 1, quarantined_rows: 0 }));
    expect(await ingestAnalyticsBatch(config, batch, fetcher)).toEqual({ outcome: "acknowledged", errorCode: null });
    expect(new URL(String(fetcher.mock.calls[0][0])).searchParams.get("name")).toBe("bltz_events_production_v1");
    expect(new URL(String(fetcher.mock.calls[0][0])).searchParams.get("wait")).toBe("true");
    expect(await ingestAnalyticsBatch(config, { ...batch, envelopes: [{ ...event, environment: "development" }] }, fetcher)).toMatchObject({ outcome: "quarantined" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("reconciles via the production endpoint without mutating or releasing a held batch", async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => Response.json({ data: [{ event_id: eventId, payload_hash: batch.payload_hashes[0], physical_rows: 2 }] }));
    expect(await reconcileAnalyticsBatch(config, batch, fetcher)).toMatchObject({ state: "complete", automaticStateChange: false, rawPhysicalRows: 2 });
    expect(new URL(String(fetcher.mock.calls[0][0])).pathname).toBe("/v0/pipes/bltz_events_production_batch_reconciliation_v1.json");
  });
  it("queries production features and rejects mismatched requested scope before fetching", async () => {
    const { properties, ...fields } = event;
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => Response.json({ data: [{ ...fields, audience_eligible: 1, properties_json: JSON.stringify(properties) }] }));
    const window = ["2026-10-04T00:00:00Z", "2026-10-06T00:00:00Z"] as const;
    expect(await queryFeatureEvents(playerId, ...window, { config, fetcher, expectedEnvironment: "production" })).toEqual({ events: [event], truncated: false });
    expect(new URL(String(fetcher.mock.calls[0][0])).pathname).toBe("/v0/pipes/bltz_events_production_feature_events_v1.json");
    await expect(queryFeatureEvents(playerId, ...window, { config, fetcher, expectedEnvironment: "development" })).rejects.toThrow("environment_mismatch");
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(queryFeatureEvents(playerId, ...window, { config, fetcher: async () => Response.json({ data: [{ ...fields, environment: "development", audience_eligible: 1, properties_json: JSON.stringify(properties) }] }) })).rejects.toThrow("scope_mismatch");
  });
});

describe("bounded authenticated scheduling contract", () => {
  it("requires a sufficiently long separate cron bearer, never query/header assertions", () => {
    const secret = "synthetic-separate-cron-secret-012345";
    const url = "https://production.example.com/api/internal/analytics/dispatch";
    expect(verifyAnalyticsCronSecret(new Request(`${url}?secret=${secret}`, { headers: { "x-vercel-cron": "1" } }), secret)).toBe(false);
    expect(verifyAnalyticsCronSecret(new Request(url, { headers: { authorization: `Bearer ${environment.BLTZ_ANALYTICS_DISPATCH_SECRET}` } }), secret)).toBe(false);
    expect(verifyAnalyticsCronSecret(new Request(url, { headers: { authorization: `Bearer ${secret}` } }), secret)).toBe(true);
    expect(verifyAnalyticsCronSecret(new Request(url), "short")).toBe(false);
  });
  it("drains at most three batches without claiming the backlog is empty", async () => {
    const store = registry(); const publisher = { publish: vi.fn(async () => "synthetic-message") };
    expect(await dispatchAnalyticsBacklog(config, { store, publisher, now: () => 0 })).toEqual({ environment: "production", batches: 3, eventCount: 3, stopped: "batch_limit", backlogRemaining: "unknown" });
    expect(store.lease).toHaveBeenCalledTimes(3); expect(publisher.publish).toHaveBeenCalledTimes(3);
  });
  it("stops on idle or durable retry and never discards the failed batch", async () => {
    const publisher = { publish: vi.fn(async () => "synthetic-message") };
    const idle = registry({ lease: vi.fn(async () => null) });
    expect(await dispatchAnalyticsBacklog(config, { store: idle, publisher })).toMatchObject({ batches: 0, stopped: "idle" });
    expect(publisher.publish).not.toHaveBeenCalled();
    const retry = registry(); const failing = { publish: vi.fn(async () => { throw new Error("synthetic-private-error"); }) };
    expect(await dispatchAnalyticsBacklog(config, { store: retry, publisher: failing })).toMatchObject({ batches: 1, stopped: "retry" });
    expect(retry.releasePublish).toHaveBeenCalledOnce(); expect(retry.lease).toHaveBeenCalledOnce();
  });
  it("does not start another batch after its elapsed-time budget", async () => {
    const clock = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(20_000);
    const store = registry(); const publisher = { publish: vi.fn(async () => "synthetic-message") };
    expect(await dispatchAnalyticsBacklog(config, { store, publisher, now: clock })).toMatchObject({ batches: 1, stopped: "time_budget" });
    expect(store.lease).toHaveBeenCalledOnce();
  });
});

describe("production Tinybird definition isolation", () => {
  it("creates separate names while retaining deduplication before feature/subject aggregation", () => {
    expect(bltzEventsProduction._name).toBe("bltz_events_production_v1");
    expect(PRODUCTION_DEDUPLICATED_EVENTS_SQL).toContain("FROM bltz_events_production_v1");
    expect(PRODUCTION_DEDUPLICATED_EVENTS_SQL).toContain("WHERE environment = 'production'");
    for (const pipe of [bltzEventsProductionDeduplicated, bltzEventsProductionSubjectCounts, bltzEventsProductionBatchReconciliation, bltzEventsProductionFeatureEvents]) {
      expect(pipe._name).toContain("bltz_events_production_");
      const sql = pipe.options.nodes.map(node => node.sql).join("\n");
      expect(sql).not.toContain("bltz_events_development_v1"); expect(sql).not.toContain("'development'");
    }
    expect(bltzEventsProductionSubjectCounts.options.nodes[0].sql).toBe(PRODUCTION_DEDUPLICATED_EVENTS_SQL);
    expect(bltzEventsProductionFeatureEvents.options.nodes[0].sql).toBe(PRODUCTION_DEDUPLICATED_EVENTS_SQL);
  });
});
