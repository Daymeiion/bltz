import "server-only";
import { z } from "zod";
import { bltzEventSchema, type BLTZEvent } from "@/lib/analytics/bltz-event";
import type { AnalyticsRuntimeEnvironment } from "@/lib/analytics/bltz-event";
import { ANALYTICS_DELIVERY_BYTE_CAP, analyticsDeliveryResources, getAnalyticsDeliveryConfiguration, type AnalyticsDeliveryConfiguration } from "./config";
import { validateDeliveryBatch, type AnalyticsDeliveryBatch, type AnalyticsDeliveryOutcome } from "./contracts";
import { readBoundedBody } from "./http";

export interface AnalyticsIngestResult { outcome: AnalyticsDeliveryOutcome; errorCode: string | null }
const ackSchema = z.object({ successful_rows: z.number().int().nonnegative(), quarantined_rows: z.number().int().nonnegative() });

function tinybirdDate(iso: string): string { return new Date(iso).toISOString().replace("T", " ").replace("Z", ""); }

export function serializeTinybirdBatch(batch: AnalyticsDeliveryBatch): string {
  const lines = batch.envelopes.map((event: BLTZEvent, index) => {
    const { properties, ...envelope } = event;
    return JSON.stringify({ ...envelope,
      occurred_at: tinybirdDate(event.occurred_at), received_at: tinybirdDate(event.received_at),
      audience_eligible: event.audience_eligible ? 1 : 0, properties_json: JSON.stringify(properties),
      delivery_batch_id: batch.batch_id, payload_hash: batch.payload_hashes[index],
    });
  }).join("\n") + "\n";
  if (new TextEncoder().encode(lines).byteLength > ANALYTICS_DELIVERY_BYTE_CAP) throw new Error("analytics_batch_too_large");
  return lines;
}

/** Network ambiguity and partial writes require reconciliation, not blind replay. */
export async function ingestAnalyticsBatch(config: AnalyticsDeliveryConfiguration, batch: AnalyticsDeliveryBatch, fetcher: typeof fetch = fetch): Promise<AnalyticsIngestResult> {
  let body: string;
  try { validateDeliveryBatch(batch, config.environment); body = serializeTinybirdBatch(batch); } catch {
    return { outcome: "quarantined", errorCode: "batch_serialization_invalid" };
  }
  const url = new URL("/v0/events", config.tinybirdUrl);
  url.searchParams.set("name", analyticsDeliveryResources(config.environment).datasource);
  url.searchParams.set("wait", "true");
  let response: Response;
  try {
    response = await fetcher(url, { method: "POST", redirect: "error", cache: "no-store",
      headers: { Authorization: `Bearer ${config.tinybirdIngestToken}`, "Content-Type": "application/x-ndjson" },
      body, signal: AbortSignal.timeout(15_000),
    });
  } catch { return { outcome: "quarantined", errorCode: "insert_acknowledgment_ambiguous" }; }
  if (response.status === 429 || response.status === 503) return { outcome: "retry", errorCode: `tinybird_${response.status}` };
  if ([401, 403, 404].includes(response.status)) return { outcome: "dead_letter", errorCode: `tinybird_${response.status}` };
  if (response.status !== 200) return { outcome: "quarantined", errorCode: `tinybird_${response.status}` };
  try {
    const ack = ackSchema.parse(JSON.parse(await readBoundedBody(response, 16_384)));
    if (ack.successful_rows !== batch.event_count || ack.quarantined_rows !== 0) {
      return { outcome: "quarantined", errorCode: "insert_partial_acknowledgment" };
    }
    return { outcome: "acknowledged", errorCode: null };
  } catch { return { outcome: "quarantined", errorCode: "insert_acknowledgment_invalid" }; }
}

const reconciliationRowSchema = z.object({ event_id: z.string().uuid(), payload_hash: z.string().regex(/^[a-f0-9]{32}(?:[a-f0-9]{32})?$/), physical_rows: z.coerce.number().int().positive() });

export async function reconcileAnalyticsBatch(config: AnalyticsDeliveryConfiguration, batch: AnalyticsDeliveryBatch, fetcher: typeof fetch = fetch) {
  validateDeliveryBatch(batch, config.environment);
  const url = new URL(`/v0/pipes/${analyticsDeliveryResources(config.environment).reconciliationPipe}.json`, config.tinybirdUrl);
  url.searchParams.set("batch_id", batch.batch_id);
  const response = await fetcher(url, { headers: { Authorization: `Bearer ${config.tinybirdQueryToken}` },
    redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("analytics_reconciliation_unavailable");
  const parsed = z.object({ data: z.array(reconciliationRowSchema).max(200) }).parse(JSON.parse(await readBoundedBody(response, 65_536)));
  const expected = new Map(batch.event_ids.map((id, index) => [id, batch.payload_hashes[index]]));
  const observed = new Map<string, string>();
  let conflicts = 0;
  let unexpected = 0;
  let physicalRows = 0;
  for (const row of parsed.data) {
    physicalRows += row.physical_rows;
    if (!expected.has(row.event_id)) { unexpected++; continue; }
    if (expected.get(row.event_id) !== row.payload_hash || (observed.has(row.event_id) && observed.get(row.event_id) !== row.payload_hash)) conflicts++;
    observed.set(row.event_id, row.payload_hash);
  }
  const matching = [...expected].filter(([id, hash]) => observed.get(id) === hash).length;
  return {
    batchId: batch.batch_id, state: conflicts || unexpected ? "conflict" as const : matching === expected.size ? "complete" as const : "incomplete" as const,
    expectedEvents: expected.size, matchedEvents: matching, missingEvents: expected.size - matching,
    conflictingRows: conflicts, unexpectedRows: unexpected, rawPhysicalRows: physicalRows,
    // Read-only; complete reconciliation does not automatically release or acknowledge a quarantine.
    automaticStateChange: false as const,
  };
}

function normalizedTimestamp(value: unknown): string {
  if (typeof value !== "string") throw new Error("analytics_feature_timestamp_invalid");
  const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  return z.string().datetime({ offset: true }).parse(normalized);
}

/** No cloud writes. Full bounded envelopes support versioned feature definitions. */
export async function queryFeatureEvents(
  subjectId: string, windowStart: string, windowEnd: string,
  dependencies: { config?: AnalyticsDeliveryConfiguration; fetcher?: typeof fetch; expectedEnvironment?: AnalyticsRuntimeEnvironment } = {},
): Promise<{ events: BLTZEvent[]; truncated: boolean }> {
  z.string().uuid().parse(subjectId);
  z.string().datetime({ offset: true }).parse(windowStart);
  z.string().datetime({ offset: true }).parse(windowEnd);
  if (Date.parse(windowStart) >= Date.parse(windowEnd) || Date.parse(windowEnd) - Date.parse(windowStart) > 90 * 86_400_000) throw new Error("analytics_feature_window_invalid");
  const config = dependencies.config ?? getAnalyticsDeliveryConfiguration();
  if (!config) throw new Error("analytics_pipeline_disabled");
  if (dependencies.expectedEnvironment && dependencies.expectedEnvironment !== config.environment) throw new Error("analytics_feature_environment_mismatch");
  const url = new URL(`/v0/pipes/${analyticsDeliveryResources(config.environment).featureEventsPipe}.json`, config.tinybirdUrl);
  url.searchParams.set("subject_player_id", subjectId); url.searchParams.set("window_start", windowStart);
  url.searchParams.set("window_end", windowEnd); url.searchParams.set("max_events", "5001");
  const response = await (dependencies.fetcher ?? fetch)(url, { headers: { Authorization: `Bearer ${config.tinybirdQueryToken}` },
    redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("analytics_feature_query_unavailable");
  const rows = z.object({ data: z.array(z.record(z.string(), z.unknown())).max(5001) }).parse(JSON.parse(await readBoundedBody(response, 8 * 1024 * 1024))).data;
  const events = rows.map((row) => {
    const { properties_json, ...fields } = row;
    if (typeof properties_json !== "string" || properties_json.length > 16_384 || typeof row.audience_eligible !== "number" || ![0, 1].includes(row.audience_eligible)) throw new Error("analytics_feature_row_invalid");
    const event = bltzEventSchema.parse({ ...fields, occurred_at: normalizedTimestamp(row.occurred_at),
      received_at: normalizedTimestamp(row.received_at), audience_eligible: Number(row.audience_eligible) === 1,
      properties: JSON.parse(properties_json) });
    if (event.environment !== config.environment || event.subject_player_id !== subjectId || event.scope_key !== "public_audience"
      || Date.parse(event.occurred_at) < Date.parse(windowStart) || Date.parse(event.occurred_at) >= Date.parse(windowEnd)) throw new Error("analytics_feature_scope_mismatch");
    return event;
  });
  if (new Set(events.map((event) => event.event_id)).size !== events.length) throw new Error("analytics_feature_duplicate_identity");
  return { events: events.slice(0, 5000), truncated: events.length > 5000 };
}
