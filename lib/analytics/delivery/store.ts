import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";
import {
  ANALYTICS_DELIVERY_BATCH_LIMIT,
  ANALYTICS_DELIVERY_BYTE_CAP,
  ANALYTICS_DELIVERY_LEASE_SECONDS,
} from "./config";
import { validateDeliveryBatch, type AnalyticsDeliveryBatch, type AnalyticsDeliveryOutcome } from "./contracts";
import type { AnalyticsRuntimeEnvironment } from "../bltz-event";

export interface AnalyticsDeliveryStore {
  lease(environment: AnalyticsRuntimeEnvironment, leaseToken: string): Promise<AnalyticsDeliveryBatch | null>;
  published(batchId: string, leaseToken: string, messageId: string): Promise<boolean>;
  releasePublish(batchId: string, leaseToken: string, errorCode: string): Promise<boolean>;
  acquire(batchId: string, environment: AnalyticsRuntimeEnvironment, leaseToken: string): Promise<AnalyticsDeliveryBatch | null>;
  settle(batchId: string, leaseToken: string, outcome: AnalyticsDeliveryOutcome, errorCode: string | null): Promise<boolean>;
  readBatch(batchId: string, environment: AnalyticsRuntimeEnvironment): Promise<AnalyticsDeliveryBatch | null>;
}

export function createAnalyticsDeliveryStore(): AnalyticsDeliveryStore {
  const service = createServiceClient();
  const rpc = async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    const { data, error } = await service.rpc(name, args).abortSignal(AbortSignal.timeout(10_000));
    if (error) throw new Error("analytics_delivery_registry_unavailable");
    return data;
  };
  const leased = (data: unknown, environment: AnalyticsRuntimeEnvironment) => data === null ? null : validateDeliveryBatch(data, environment);
  return {
    async lease(environment, leaseToken) {
      return leased(await rpc("lease_analytics_delivery_batch", {
        p_environment: environment, p_limit: ANALYTICS_DELIVERY_BATCH_LIMIT,
        p_byte_cap: ANALYTICS_DELIVERY_BYTE_CAP, p_lease_token: leaseToken,
        p_lease_seconds: ANALYTICS_DELIVERY_LEASE_SECONDS,
      }), environment);
    },
    async published(batchId, leaseToken, messageId) {
      return await rpc("mark_analytics_delivery_published", {
        p_batch_id: batchId, p_lease_token: leaseToken, p_message_id: messageId,
      }) === true;
    },
    async releasePublish(batchId, leaseToken, errorCode) {
      return await rpc("release_analytics_delivery_publish", {
        p_batch_id: batchId, p_lease_token: leaseToken, p_error_code: errorCode,
      }) === true;
    },
    async acquire(batchId, environment, leaseToken) {
      return leased(await rpc("acquire_analytics_delivery_batch", {
        p_batch_id: batchId, p_environment: environment, p_lease_token: leaseToken,
        p_lease_seconds: ANALYTICS_DELIVERY_LEASE_SECONDS,
      }), environment);
    },
    async settle(batchId, leaseToken, outcome, errorCode) {
      return await rpc("settle_analytics_delivery_batch", {
        p_batch_id: batchId, p_lease_token: leaseToken, p_outcome: outcome,
        p_error_code: errorCode,
      }) === true;
    },
    async readBatch(batchId, environment) {
      return leased(await rpc("get_analytics_delivery_batch", { p_batch_id: batchId, p_environment: environment }), environment);
    },
  };
}

const operationalRowSchema = z.object({
  state: z.string(), created_at: z.string(), acknowledged_at: z.string().nullable(),
  event_count: z.number().int().nonnegative(),
});

/** Bounded, service-only operational view. Truncation never pretends to be complete. */
export async function readAnalyticsDeliveryOperations(now = new Date(), environment: AnalyticsRuntimeEnvironment = "development") {
  if (environment !== "development" && environment !== "production") throw new Error("analytics_environment_invalid");
  const service = createServiceClient();
  const [batches, accepted, unbatched, acceptedWatermark] = await Promise.all([
    service.from("analytics_delivery_batches").select("state, created_at, acknowledged_at, event_count")
      .eq("environment", environment).order("created_at", { ascending: false }).limit(1001).abortSignal(AbortSignal.timeout(10_000)),
    service.from("analytics_delivery_outbox").select("event_id", { count: "exact", head: true })
      .eq("environment", environment).abortSignal(AbortSignal.timeout(10_000)),
    service.from("analytics_delivery_outbox").select("event_id", { count: "exact", head: true })
      .eq("environment", environment).is("batch_id", null).abortSignal(AbortSignal.timeout(10_000)),
    service.from("analytics_delivery_outbox").select("accepted_at").eq("environment", environment)
      .order("accepted_at", { ascending: false }).limit(1).abortSignal(AbortSignal.timeout(10_000)).maybeSingle(),
  ]);
  if ([batches, accepted, unbatched, acceptedWatermark].some((result) => result.error)
    || accepted.count === null || unbatched.count === null) throw new Error("analytics_delivery_registry_unavailable");
  const rows = z.array(operationalRowSchema).parse(batches.data ?? []);
  const counts: Record<string, number> = {};
  let acknowledgedWatermark: string | null = null;
  let oldestPending: string | null = null;
  for (const row of rows.slice(0, 1000)) {
    counts[row.state] = (counts[row.state] ?? 0) + row.event_count;
    if (row.state === "acknowledged" && row.acknowledged_at && (!acknowledgedWatermark || Date.parse(row.acknowledged_at) > Date.parse(acknowledgedWatermark))) {
      acknowledgedWatermark = row.acknowledged_at;
    }
    if (!["acknowledged", "dead_letter", "quarantined"].includes(row.state) && (!oldestPending || Date.parse(row.created_at) < Date.parse(oldestPending))) oldestPending = row.created_at;
  }
  return {
    environment, basis: "latest_1000_delivery_batches" as const,
    completeness: rows.length > 1000 ? "partial" as const : "complete" as const,
    acceptedEventsTotal: accepted.count, unbatchedPendingEvents: unbatched.count,
    acceptedAtWatermark: acceptedWatermark.data?.accepted_at ?? null,
    eventCountsByState: counts, acknowledgedAtWatermark: acknowledgedWatermark,
    watermarkBasis: "highest_delivery_acknowledgment_not_contiguous_event_coverage" as const,
    oldestPendingAgeSeconds: oldestPending ? Math.max(0, Math.floor((now.getTime() - Date.parse(oldestPending)) / 1000)) : null,
  };
}
