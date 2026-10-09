import { createHash, createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { getAnalyticsDeliveryConfiguration } from "@/lib/analytics/delivery/config";
import { validateDeliveryBatch, type AnalyticsDeliveryBatch } from "@/lib/analytics/delivery/contracts";
import { createAnalyticsDeliveryPublisher, dispatchAnalyticsDelivery, deliverAnalyticsJob } from "@/lib/analytics/delivery/pipeline";
import { verifyAnalyticsDispatchSecret, verifyAnalyticsWorkerSignature } from "@/lib/analytics/delivery/authentication";
import { readBoundedBody } from "@/lib/analytics/delivery/http";
import { ingestAnalyticsBatch, queryFeatureEvents, reconcileAnalyticsBatch, serializeTinybirdBatch } from "@/lib/analytics/delivery/tinybird";
import { bltzEventsSubjectCounts, DEDUPLICATED_EVENTS_SQL } from "@/lib/analytics/delivery/tinybird-definitions";
import type { AnalyticsDeliveryStore } from "@/lib/analytics/delivery/store";

const env: Record<string, string | undefined> = {
  BLTZ_ANALYTICS_PIPELINE_ENABLED: "true", BLTZ_ANALYTICS_ENVIRONMENT: "development", VERCEL_ENV: "preview",
  BLTZ_ANALYTICS_WORKER_URL: "https://development.example.com/api/internal/analytics/deliver",
  BLTZ_ANALYTICS_DISPATCH_SECRET: "synthetic-development-trigger-secret",
  QSTASH_TOKEN: "synthetic-publish-token", QSTASH_CURRENT_SIGNING_KEY: "synthetic-current-key", QSTASH_NEXT_SIGNING_KEY: "synthetic-next-key",
  TINYBIRD_ANALYTICS_URL: "https://api.us-west-2.aws.tinybird.co", TINYBIRD_ANALYTICS_INGEST_TOKEN: "synthetic-append-token", TINYBIRD_ANALYTICS_QUERY_TOKEN: "synthetic-read-token",
};
const config = getAnalyticsDeliveryConfiguration(env)!;
const eventId = "0807a497-a70e-4eea-907e-196c4c8ba8c7";
const batchId = "c50d01ca-45a1-450f-93a2-b30afefb5b18";
const hash = "a".repeat(32);
const batch: AnalyticsDeliveryBatch = {
  batch_id: batchId, event_count: 1, event_ids: [eventId], payload_hashes: [hash], attempt: 1, state: "processing",
  envelopes: [{ event_id: eventId, schema_version: 1, event_name: "locker_viewed", event_version: "legacy-v1",
    occurred_at: "2026-10-04T11:00:00Z", received_at: "2026-10-04T11:00:01Z", environment: "development", surface: "public_locker",
    producer: "bltz_collector", actor_kind: "anonymous", measurement_basis: "unverified_client", audience_eligible: true,
    subject_player_id: "8047df5b-87da-47bd-8468-7bb4181c2743", moment_id: null, asset_id: null, asset_model: null,
    session_id: "132d3879-5f82-4d42-b132-e5c23a77d4ec", scope_key: "public_audience", source_channel: "unknown",
    properties: { legacy_event_name: "locker_viewed", definition: "tab session only" },
  }],
};
function store(overrides: Partial<AnalyticsDeliveryStore> = {}): AnalyticsDeliveryStore {
  return { lease: vi.fn(async () => batch), published: vi.fn(async () => true), releasePublish: vi.fn(async () => true),
    acquire: vi.fn(async () => batch), settle: vi.fn(async () => true), readBatch: vi.fn(async () => batch), ...overrides };
}
function signed(raw: string, key: string, url = config.workerUrl, expires = Math.floor(Date.now() / 1000) + 60): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: "Upstash", sub: url, exp: expires, nbf: Math.floor(Date.now() / 1000) - 10,
    body: createHash("sha256").update(raw).digest("base64url") })).toString("base64url");
  return `${header}.${payload}.${createHmac("sha256", key).update(`${header}.${payload}`).digest("base64url")}`;
}
const request = (raw: string, signature: string) => new Request(config.workerUrl, { method: "POST", body: raw, headers: { "upstash-signature": signature } });

describe("development delivery safeguards", () => {
  it("stays disabled unless explicitly enabled and rejects production", () => {
    expect(getAnalyticsDeliveryConfiguration({})).toBeNull();
    expect(() => getAnalyticsDeliveryConfiguration({ ...env, VERCEL_ENV: "production" })).toThrow("environment_isolation");
    expect(() => getAnalyticsDeliveryConfiguration({ ...env, BLTZ_ANALYTICS_ENVIRONMENT: "production" })).toThrow("environment_isolation");
  });
  it("never falls back to account/workspace-admin credentials", () => {
    expect(() => getAnalyticsDeliveryConfiguration({ ...env, TINYBIRD_ANALYTICS_INGEST_TOKEN: "", TINYBIRD_TOKEN: "workspace-admin" })).toThrow("TINYBIRD_ANALYTICS_INGEST_TOKEN");
    expect(() => getAnalyticsDeliveryConfiguration({ ...env, QSTASH_TOKEN: "" })).toThrow("QSTASH_TOKEN");
    expect(() => getAnalyticsDeliveryConfiguration({ ...env, BLTZ_ANALYTICS_WORKER_URL: "https://user:secret@example.com/api/internal/analytics/deliver" })).toThrow("worker_url");
  });
  it("requires the private dispatch bearer secret, never query parameters", () => {
    expect(verifyAnalyticsDispatchSecret(new Request("https://example.com?secret=" + config.dispatchSecret), config.dispatchSecret)).toBe(false);
    expect(verifyAnalyticsDispatchSecret(new Request("https://example.com", { headers: { authorization: `Bearer ${config.dispatchSecret}` } }), config.dispatchSecret)).toBe(true);
  });
  it("verifies both SDK signing keys, the original raw body and the configured URL", async () => {
    const raw = `{ "batch_id": "${batchId}" }`;
    for (const key of [config.currentSigningKey, config.nextSigningKey]) expect(await verifyAnalyticsWorkerSignature(config, request(raw, signed(raw, key)), raw)).toBe(true);
    expect(await verifyAnalyticsWorkerSignature(config, request(raw, signed(raw, config.currentSigningKey)), JSON.stringify(JSON.parse(raw)))).toBe(false);
    expect(await verifyAnalyticsWorkerSignature(config, request(raw, signed(raw, config.currentSigningKey, "https://other.example.com/worker")), raw)).toBe(false);
    expect(await verifyAnalyticsWorkerSignature(config, request(raw, signed(raw, config.currentSigningKey, config.workerUrl, 1)), raw)).toBe(false);
  });
  it("bounds streamed bytes even without a content length", async () => {
    await expect(readBoundedBody(new Response("12345"), 4)).rejects.toThrow("too_large");
    expect(await readBoundedBody(new Response("1234"), 4)).toBe("1234");
  });
  it("validates batch membership, duplicate IDs and environment before external writes", () => {
    expect(() => validateDeliveryBatch({ ...batch, event_ids: [batchId] })).toThrow("identity_mismatch");
    expect(() => validateDeliveryBatch({ ...batch, event_count: 2, event_ids: [eventId, eventId], payload_hashes: [hash, hash], envelopes: [batch.envelopes[0], batch.envelopes[0]] })).toThrow("identity_mismatch");
    expect(() => validateDeliveryBatch({ ...batch, envelopes: [{ ...batch.envelopes[0], environment: "production" }] })).toThrow("environment_mismatch");
  });
});

describe("durable dispatcher and duplicate-safe worker", () => {
  it("bounds publisher HTTP with signed endpoint delivery settings and generation-specific dedupe", async () => {
    const fetcher = vi.fn(async () => Response.json({ messageId: "message-1", deduplicated: true }, { status: 202 }));
    const publisher = createAnalyticsDeliveryPublisher(config, fetcher);
    const job = { job_version: 1 as const, batch_id: batchId, environment: "development" as const };
    expect(await publisher.publish(job, 1)).toBe("message-1");
    expect(await publisher.publish(job, 2)).toBe("message-1");
    const [url, options] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toBe(`https://qstash.upstash.io/v2/publish/${config.workerUrl}`);
    expect(options.redirect).toBe("error"); expect(options.signal).toBeDefined();
    expect(options.headers).toMatchObject({ "Upstash-Retries": "4", "Upstash-Timeout": "30s", "Upstash-Deduplication-Id": `bltz-dev-analytics:${batchId}:1` });
    expect((fetcher.mock.calls[1] as unknown as [URL, RequestInit])[1].headers).toMatchObject({ "Upstash-Deduplication-Id": `bltz-dev-analytics:${batchId}:2` });
    await expect(createAnalyticsDeliveryPublisher(config, async () => new Response("x".repeat(16385))).publish(job, 1)).rejects.toThrow();
  });
  it("retains an unpublished durable batch after queue failure", async () => {
    const registry = store();
    const publisher = { publish: vi.fn(async () => { throw new Error("do not expose provider details"); }) };
    expect(await dispatchAnalyticsDelivery(config, { store: registry, publisher })).toEqual({ state: "retry", eventCount: 1 });
    expect(registry.releasePublish).toHaveBeenCalledWith(batchId, expect.any(String), "qstash_publish_unconfirmed");
    expect(registry.published).not.toHaveBeenCalled();
  });
  it.each([
    ["HTTP rejection", async () => new Response("synthetic private provider detail", { status: 401 }), "qstash_publish_http_401"],
    ["non-JSON acknowledgment", async () => new Response("synthetic private provider detail"), "qstash_publish_ack_malformed"],
    ["missing acknowledgment ID", async () => Response.json({ accepted: true }), "qstash_publish_ack_missing"],
    ["invalid acknowledgment ID", async () => Response.json({ messageId: "" }), "qstash_publish_ack_invalid"],
    ["DNS failure", async () => { throw new TypeError("synthetic private URL", { cause: { code: "ENOTFOUND", hostname: "private.example.com" } }); }, "qstash_publish_network_dns"],
    ["TLS failure", async () => { throw new TypeError("synthetic private certificate", { cause: { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" } }); }, "qstash_publish_network_tls"],
    ["timeout", async () => { throw new DOMException("synthetic private URL", "TimeoutError"); }, "qstash_publish_network_timeout"],
    ["unknown network cause", async () => { throw new TypeError("synthetic private token", { cause: { code: "synthetic_private_token" } }); }, "qstash_publish_network_unknown"],
  ] as const)("persists only a safe code after %s, without retrying or marking published", async (_label, fail, code) => {
    const registry = store();
    const fetcher = vi.fn(fail);
    expect(await dispatchAnalyticsDelivery(config, { store: registry, publisher: createAnalyticsDeliveryPublisher(config, fetcher) })).toEqual({ state: "retry", eventCount: 1 });
    expect(registry.releasePublish).toHaveBeenCalledWith(batchId, expect.any(String), code);
    expect(code).toMatch(/^[a-z0-9_]{1,80}$/);
    expect(registry.published).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("publishes a bounded reference to the immutable batch, with no event data", async () => {
    const registry = store(); const publisher = { publish: vi.fn(async () => "message-1") };
    expect(await dispatchAnalyticsDelivery(config, { store: registry, publisher })).toEqual({ state: "published", eventCount: 1 });
    expect(publisher.publish).toHaveBeenCalledWith({ job_version: 1, batch_id: batchId, environment: "development" }, 1);
    expect(registry.published).toHaveBeenCalledWith(batchId, expect.any(String), "message-1");
  });
  it("never inserts again for a durable acknowledged duplicate", async () => {
    const registry = store({ acquire: vi.fn(async () => ({ ...batch, state: "acknowledged" as const })) });
    const ingest = vi.fn(async () => ({ outcome: "acknowledged" as const, errorCode: null }));
    expect(await deliverAnalyticsJob(config, { job_version: 1, batch_id: batchId, environment: "development" }, { store: registry, ingest })).toMatchObject({ state: "acknowledged", duplicate: true });
    expect(ingest).not.toHaveBeenCalled(); expect(registry.settle).not.toHaveBeenCalled();
  });
  it("does not send a leased, quarantined or expired crash-ambiguity batch when it cannot acquire it", async () => {
    const registry = store({ acquire: vi.fn(async () => null) }); const ingest = vi.fn();
    expect(await deliverAnalyticsJob(config, { job_version: 1, batch_id: batchId, environment: "development" }, { store: registry, ingest })).toMatchObject({ state: "not_acquired" });
    expect(ingest).not.toHaveBeenCalled();
  });
  it("holds uncertain external writes for exact reconciliation", async () => {
    const registry = store();
    await deliverAnalyticsJob(config, { job_version: 1, batch_id: batchId, environment: "development" }, { store: registry,
      ingest: async () => ({ outcome: "quarantined", errorCode: "insert_acknowledgment_ambiguous" }) });
    expect(registry.settle).toHaveBeenCalledWith(batchId, expect.any(String), "quarantined", "insert_acknowledgment_ambiguous");
  });
});

describe("Tinybird acknowledged inserts and reconciliation", () => {
  it("requests NDJSON wait=true and accepts only complete acknowledged row counts", async () => {
    const fetcher = vi.fn(async () => Response.json({ successful_rows: 1, quarantined_rows: 0 }));
    expect(await ingestAnalyticsBatch(config, batch, fetcher)).toEqual({ outcome: "acknowledged", errorCode: null });
    const [url, options] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.get("wait")).toBe("true"); expect(url.searchParams.get("name")).toBe("bltz_events_development_v1");
    expect(options.redirect).toBe("error");
    const row = JSON.parse(serializeTinybirdBatch(batch)); expect(row.event_id).toBe(eventId); expect(row.payload_hash).toBe(hash);
    expect(row).not.toHaveProperty("user_id"); expect(row.audience_eligible).toBe(1);
  });
  it.each([202, 422, 500])("quarantines ambiguous HTTP %i without blind replay", async (status) => {
    const fetcher = vi.fn(async () => new Response("provider detail", { status }));
    expect((await ingestAnalyticsBatch(config, batch, fetcher)).outcome).toBe("quarantined"); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([429, 503])("retries explicit no-write HTTP %i through the durable registry", async (status) => {
    expect((await ingestAnalyticsBatch(config, batch, async () => new Response("", { status }))).outcome).toBe("retry");
  });
  it("quarantines network ambiguity, partial acceptance and oversized acknowledgments", async () => {
    expect((await ingestAnalyticsBatch(config, batch, async () => { throw new Error("lost ack"); })).outcome).toBe("quarantined");
    expect((await ingestAnalyticsBatch(config, batch, async () => Response.json({ successful_rows: 0, quarantined_rows: 1 }))).outcome).toBe("quarantined");
    expect((await ingestAnalyticsBatch(config, batch, async () => new Response("a".repeat(16385)))).outcome).toBe("quarantined");
  });
  it("compares exact logical IDs and fingerprints, counts raw replay separately, and never settles state", async () => {
    const result = await reconcileAnalyticsBatch(config, batch, async () => Response.json({ data: [{ event_id: eventId, payload_hash: hash, physical_rows: 2 }] }));
    expect(result).toMatchObject({ state: "complete", matchedEvents: 1, rawPhysicalRows: 2, automaticStateChange: false });
    const mismatch = await reconcileAnalyticsBatch(config, batch, async () => Response.json({ data: [{ event_id: eventId, payload_hash: "b".repeat(32), physical_rows: 1 }] }));
    expect(mismatch).toMatchObject({ state: "conflict", missingEvents: 1 });
  });
  it("deduplicates environment/event identity before subject counts and excludes conflicting revisions", () => {
    expect(DEDUPLICATED_EVENTS_SQL).toContain("GROUP BY environment, event_id");
    expect(DEDUPLICATED_EVENTS_SQL).toContain("argMax(tuple(");
    expect(bltzEventsSubjectCounts.options.nodes[1].sql).toContain("FROM logical_events");
    expect(bltzEventsSubjectCounts.options.nodes[1].sql).toContain("payload_revisions = 1");
  });
  it("reconstructs typed feature input and refuses cross-subject data or duplicate logical IDs", async () => {
    const event = batch.envelopes[0];
    const { properties, ...fields } = event;
    const row = { ...fields, audience_eligible: 1, properties_json: JSON.stringify(properties), occurred_at: "2026-10-04 11:00:00", received_at: "2026-10-04 11:00:01" };
    const query = (data: unknown[]) => queryFeatureEvents(event.subject_player_id!, "2026-10-01T00:00:00Z", "2026-10-05T00:00:00Z", { config, fetcher: async () => Response.json({ data }) });
    expect(await query([row])).toEqual({ events: [{ ...event, occurred_at: "2026-10-04T11:00:00Z", received_at: "2026-10-04T11:00:01Z" }], truncated: false });
    await expect(query([{ ...row, subject_player_id: batchId }])).rejects.toThrow("scope_mismatch");
    await expect(query([row, row])).rejects.toThrow("duplicate_identity");
    await expect(query([{ ...row, audience_eligible: 0.5 }])).rejects.toThrow("row_invalid");
  });
  it("marks the 5001st feature row as partial coverage rather than complete", async () => {
    const event = batch.envelopes[0]; const { properties, ...fields } = event;
    const rows = Array.from({ length: 5001 }, (_, index) => ({ ...fields,
      event_id: `0807a497-a70e-4eea-907e-${String(index).padStart(12, "0")}`,
      audience_eligible: 1, properties_json: JSON.stringify(properties),
    }));
    const result = await queryFeatureEvents(event.subject_player_id!, "2026-10-01T00:00:00Z", "2026-10-05T00:00:00Z", { config, fetcher: async () => Response.json({ data: rows }) });
    expect(result.truncated).toBe(true); expect(result.events).toHaveLength(5000);
  });
});
