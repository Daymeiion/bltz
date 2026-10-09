import { z } from "zod";
import { bltzEventSchema, type BLTZEvent, type AnalyticsRuntimeEnvironment } from "@/lib/analytics/bltz-event";
import { ANALYTICS_DELIVERY_BATCH_LIMIT, ANALYTICS_DELIVERY_BYTE_CAP } from "./config";

export const analyticsDeliveryJobSchema = z.object({
  job_version: z.literal(1),
  batch_id: z.string().uuid(),
  environment: z.enum(["development", "production"]),
}).strict();

export type AnalyticsDeliveryJob = z.infer<typeof analyticsDeliveryJobSchema>;
export type AnalyticsDeliveryOutcome = "acknowledged" | "retry" | "quarantined" | "dead_letter";

export const analyticsDeliveryBatchSchema = z.object({
  batch_id: z.string().uuid(),
  event_count: z.number().int().min(0).max(ANALYTICS_DELIVERY_BATCH_LIMIT),
  event_ids: z.array(z.string().uuid()).max(ANALYTICS_DELIVERY_BATCH_LIMIT),
  payload_hashes: z.array(z.string().regex(/^[a-f0-9]{32}(?:[a-f0-9]{32})?$/)).max(ANALYTICS_DELIVERY_BATCH_LIMIT),
  envelopes: z.array(bltzEventSchema).max(ANALYTICS_DELIVERY_BATCH_LIMIT),
  attempt: z.number().int().min(0).default(0),
  state: z.enum(["pending", "published", "processing", "retry", "acknowledged", "quarantined", "dead_letter"]),
});

export type AnalyticsDeliveryBatch = z.infer<typeof analyticsDeliveryBatchSchema>;

export function validateDeliveryBatch(value: unknown, environment: AnalyticsRuntimeEnvironment = "development"): AnalyticsDeliveryBatch {
  const batch = analyticsDeliveryBatchSchema.parse(value);
  if (!batch.event_count || batch.envelopes.length !== batch.event_count || batch.event_ids.length !== batch.event_count || batch.payload_hashes.length !== batch.event_count) {
    throw new Error("analytics_batch_count_mismatch");
  }
  const ids = batch.envelopes.map((event) => event.event_id);
  if (new Set(ids).size !== ids.length || batch.event_ids.some((id, index) => id !== ids[index])) {
    throw new Error("analytics_batch_identity_mismatch");
  }
  if (batch.envelopes.some((event) => event.environment !== environment)) {
    throw new Error("analytics_batch_environment_mismatch");
  }
  if (new TextEncoder().encode(JSON.stringify(batch.envelopes)).byteLength > ANALYTICS_DELIVERY_BYTE_CAP) {
    throw new Error("analytics_batch_too_large");
  }
  return batch;
}

export function eventWatermark(events: readonly BLTZEvent[]): string | null {
  return events.reduce<string | null>((latest, event) =>
    !latest || Date.parse(event.received_at) > Date.parse(latest) ? event.received_at : latest, null);
}
