import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ANALYTICS_DISPATCH_BATCH_CAP, ANALYTICS_DISPATCH_BUDGET_MS, type AnalyticsDeliveryConfiguration } from "./config";
import { validateDeliveryBatch, type AnalyticsDeliveryJob, type AnalyticsDeliveryBatch } from "./contracts";
import { createAnalyticsDeliveryStore, type AnalyticsDeliveryStore } from "./store";
import { ingestAnalyticsBatch, type AnalyticsIngestResult } from "./tinybird";
import { AnalyticsBodyLimitError, readBoundedBody } from "./http";

export interface AnalyticsDeliveryPublisher {
  publish(job: AnalyticsDeliveryJob, attempt: number): Promise<string>;
}

/** Only locally classified codes may reach the durable registry; never provider details. */
class AnalyticsPublishError extends Error {
  constructor(readonly code: string) { super(code); }
}

function publishNetworkCode(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError") return "qstash_publish_network_timeout";
  if (error instanceof Error && error.name === "AbortError") return "qstash_publish_network_aborted";
  const cause = error instanceof Error ? error.cause : undefined;
  const code = cause && typeof cause === "object" && "code" in cause ? cause.code : undefined;
  if (typeof code !== "string") return "qstash_publish_network_unknown";
  if (["ENOTFOUND", "EAI_AGAIN"].includes(code)) return "qstash_publish_network_dns";
  if (["ECONNREFUSED", "ECONNRESET", "UND_ERR_SOCKET"].includes(code)) return "qstash_publish_network_connection";
  if (["ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"].includes(code)) return "qstash_publish_network_timeout";
  if (["CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "ERR_TLS_CERT_ALTNAME_INVALID"].includes(code)) return "qstash_publish_network_tls";
  return "qstash_publish_network_unknown";
}

export function createAnalyticsDeliveryPublisher(config: AnalyticsDeliveryConfiguration, fetcher: typeof fetch = fetch): AnalyticsDeliveryPublisher {
  return {
    async publish(job, attempt) {
      if (job.environment !== config.environment) throw new Error("analytics_job_environment_mismatch");
      // SDK2.12 exposes destination timeout but no publisher fetch timeout.
      // Use its documented REST boundary here, while Receiver handles signatures.
      const url = new URL(`/v2/publish/${config.workerUrl}`, config.qstashUrl ?? "https://qstash.upstash.io");
      let response: Response;
      try { response = await fetcher(url, {
        method: "POST", body: JSON.stringify(job), redirect: "error", cache: "no-store",
        signal: AbortSignal.timeout(15_000), headers: {
          Authorization: `Bearer ${config.qstashToken}`, "Content-Type": "application/json",
          "Upstash-Retries": "4", "Upstash-Timeout": "30s",
          // Durable dispatch generations have distinct queue dedupe IDs; the
          // immutable batch/event IDs still survive all generations and retries.
          "Upstash-Deduplication-Id": `bltz-${config.environment === "development" ? "dev" : "production"}-analytics-${job.batch_id}-${attempt}`,
          "Upstash-Label": `bltz-${config.environment}-analytics`,
          ...(config.vercelAutomationBypassSecret ? { "Upstash-Forward-x-vercel-protection-bypass": config.vercelAutomationBypassSecret } : {}),
        },
      }); } catch (error) { throw new AnalyticsPublishError(publishNetworkCode(error)); }
      if (!response.ok) throw new AnalyticsPublishError(`qstash_publish_http_${response.status}`);
      let body: string;
      try { body = await readBoundedBody(response, 16_384); }
      catch (error) { throw new AnalyticsPublishError(error instanceof AnalyticsBodyLimitError ? "qstash_publish_ack_too_large" : "qstash_publish_ack_unreadable"); }
      let acknowledgment: unknown;
      try { acknowledgment = JSON.parse(body); }
      catch { throw new AnalyticsPublishError("qstash_publish_ack_malformed"); }
      if (!acknowledgment || typeof acknowledgment !== "object" || !("messageId" in acknowledgment)) throw new AnalyticsPublishError("qstash_publish_ack_missing");
      const result = z.object({ messageId: z.string().min(1).max(200) }).safeParse(acknowledgment);
      if (!result.success) throw new AnalyticsPublishError("qstash_publish_ack_invalid");
      return result.data.messageId;
    },
  };
}

export async function dispatchAnalyticsDelivery(
  config: AnalyticsDeliveryConfiguration,
  dependencies: { store?: AnalyticsDeliveryStore; publisher?: AnalyticsDeliveryPublisher } = {},
) {
  const store = dependencies.store ?? createAnalyticsDeliveryStore();
  const leaseToken = randomUUID();
  const batch = await store.lease(config.environment, leaseToken);
  if (!batch) return { state: "idle" as const, eventCount: 0 };
  validateDeliveryBatch(batch, config.environment);
  const job: AnalyticsDeliveryJob = { job_version: 1, batch_id: batch.batch_id, environment: config.environment };
  let messageId: string;
  try { messageId = await (dependencies.publisher ?? createAnalyticsDeliveryPublisher(config)).publish(job, batch.attempt); }
  catch (error) {
    await store.releasePublish(batch.batch_id, leaseToken, error instanceof AnalyticsPublishError ? error.code : "qstash_publish_unconfirmed");
    return { state: "retry" as const, eventCount: batch.event_count };
  }
  const recorded = await store.published(batch.batch_id, leaseToken, messageId);
  if (!recorded) throw new Error("analytics_publish_registry_conflict");
  return { state: "published" as const, eventCount: batch.event_count };
}

/** Schedule-ready bounded draining, not an automatic schedule or an unbounded backlog claim. */
export async function dispatchAnalyticsBacklog(
  config: AnalyticsDeliveryConfiguration,
  dependencies: { store?: AnalyticsDeliveryStore; publisher?: AnalyticsDeliveryPublisher; now?: () => number } = {},
) {
  const store = dependencies.store ?? createAnalyticsDeliveryStore();
  const publisher = dependencies.publisher ?? createAnalyticsDeliveryPublisher(config);
  const now = dependencies.now ?? Date.now;
  const started = now();
  let batches = 0, eventCount = 0;
  let stopped: "idle" | "retry" | "batch_limit" | "time_budget" = "batch_limit";
  for (let index = 0; index < ANALYTICS_DISPATCH_BATCH_CAP; index += 1) {
    if (now() - started >= ANALYTICS_DISPATCH_BUDGET_MS) { stopped = "time_budget"; break; }
    const result = await dispatchAnalyticsDelivery(config, { store, publisher });
    eventCount += result.eventCount;
    if (result.state === "idle") { stopped = "idle"; break; }
    batches += 1;
    if (result.state === "retry") { stopped = "retry"; break; }
  }
  return { environment: config.environment, batches, eventCount, stopped, backlogRemaining: "unknown" as const };
}

export async function deliverAnalyticsJob(
  config: AnalyticsDeliveryConfiguration,
  job: AnalyticsDeliveryJob,
  dependencies: { store?: AnalyticsDeliveryStore; ingest?: (config: AnalyticsDeliveryConfiguration, batch: AnalyticsDeliveryBatch) => Promise<AnalyticsIngestResult> } = {},
) {
  if (job.environment !== config.environment) throw new Error("analytics_job_environment_mismatch");
  const store = dependencies.store ?? createAnalyticsDeliveryStore();
  const leaseToken = randomUUID();
  const batch = await store.acquire(job.batch_id, config.environment, leaseToken);
  if (!batch) return { state: "not_acquired" as const, eventCount: 0 };
  if (batch.batch_id !== job.batch_id) throw new Error("analytics_batch_registry_mismatch");
  validateDeliveryBatch(batch, config.environment);
  if (batch.state === "acknowledged") return { state: "acknowledged" as const, duplicate: true, eventCount: batch.event_count };
  const result = await (dependencies.ingest ?? ingestAnalyticsBatch)(config, batch);
  const recorded = await store.settle(batch.batch_id, leaseToken, result.outcome, result.errorCode);
  if (!recorded) throw new Error("analytics_worker_registry_conflict");
  return { state: result.outcome, duplicate: false, eventCount: batch.event_count };
}
