import "server-only";
import { getAnalyticsRuntimeEnvironment, type AnalyticsRuntimeEnvironment } from "../bltz-event";

export const ANALYTICS_DELIVERY_BATCH_LIMIT = 100;
export const ANALYTICS_DELIVERY_BYTE_CAP = 262_144;
export const ANALYTICS_DELIVERY_LEASE_SECONDS = 60;
export const ANALYTICS_DELIVERY_MAX_ATTEMPTS = 5;
export const ANALYTICS_DELIVERY_DATASOURCE = "bltz_events_development_v1";
export const ANALYTICS_DISPATCH_BATCH_CAP = 3;
export const ANALYTICS_DISPATCH_BUDGET_MS = 20_000;

/** Fixed resource names: request/event fields can never select a datasource or pipe. */
export function analyticsDeliveryResources(environment: AnalyticsRuntimeEnvironment) {
  if (environment !== "development" && environment !== "production") throw new AnalyticsDeliveryConfigurationError("analytics_configuration_invalid:environment_isolation");
  return {
    datasource: environment === "production" ? "bltz_events_production_v1" : ANALYTICS_DELIVERY_DATASOURCE,
    reconciliationPipe: environment === "production" ? "bltz_events_production_batch_reconciliation_v1" : "bltz_events_batch_reconciliation_v1",
    featureEventsPipe: environment === "production" ? "bltz_events_production_feature_events_v1" : "bltz_events_feature_events_v1",
  };
}

export class AnalyticsDeliveryConfigurationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AnalyticsDeliveryConfigurationError";
  }
}

export interface AnalyticsDeliveryConfiguration {
  environment: AnalyticsRuntimeEnvironment;
  workerUrl: string;
  dispatchSecret: string;
  qstashToken: string;
  qstashUrl?: string;
  currentSigningKey: string;
  nextSigningKey: string;
  /** Server-only preview protection exception; forwarded solely to the fixed worker destination. */
  vercelAutomationBypassSecret?: string;
  tinybirdUrl: string;
  tinybirdIngestToken: string;
  tinybirdQueryToken: string;
}

function required(env: Record<string, string | undefined>, name: string): string {
  const value = env[name]?.trim();
  if (!value || /[\r\n]/.test(value)) {
    throw new AnalyticsDeliveryConfigurationError(`analytics_configuration_missing:${name}`);
  }
  return value;
}

function validateUrl(value: string, kind: "worker" | "tinybird" | "qstash"): string {
  let url: URL;
  try { url = new URL(value); } catch {
    throw new AnalyticsDeliveryConfigurationError(`analytics_configuration_invalid:${kind}_url`);
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new AnalyticsDeliveryConfigurationError(`analytics_configuration_invalid:${kind}_url`);
  }
  if (kind === "worker" && url.pathname !== "/api/internal/analytics/deliver") {
    throw new AnalyticsDeliveryConfigurationError("analytics_configuration_invalid:worker_path");
  }
  if (kind === "tinybird" && (!/^api(?:\.[a-z0-9-]+)*\.tinybird\.co$/.test(url.hostname) || url.pathname !== "/")) {
    throw new AnalyticsDeliveryConfigurationError("analytics_configuration_invalid:tinybird_url");
  }
  if (kind === "qstash" && (!/^(?:qstash|qstash-[a-z0-9-]+)\.upstash\.io$/.test(url.hostname) || url.pathname !== "/")) {
    throw new AnalyticsDeliveryConfigurationError("analytics_configuration_invalid:qstash_url");
  }
  return kind === "worker" ? url.href : url.origin;
}

/** Default off. Production requires a distinct opt-in on a production deployment. */
export function getAnalyticsDeliveryConfiguration(env: Record<string, string | undefined> = process.env): AnalyticsDeliveryConfiguration | null {
  if (env.BLTZ_ANALYTICS_PIPELINE_ENABLED !== "true") return null;
  const environment = getAnalyticsRuntimeEnvironment(env);
  if (!environment) throw new AnalyticsDeliveryConfigurationError("analytics_configuration_invalid:environment_isolation");
  const dispatchSecret = required(env, "BLTZ_ANALYTICS_DISPATCH_SECRET");
  if (dispatchSecret.length < 32) {
    throw new AnalyticsDeliveryConfigurationError("analytics_configuration_invalid:dispatch_secret");
  }
  const bypass = env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypass && (bypass.length > 1024 || /[^\x21-\x7e]/.test(bypass))) {
    throw new AnalyticsDeliveryConfigurationError("analytics_configuration_invalid:vercel_automation_bypass");
  }
  return {
    environment,
    workerUrl: validateUrl(required(env, "BLTZ_ANALYTICS_WORKER_URL"), "worker"),
    dispatchSecret,
    qstashToken: required(env, "QSTASH_TOKEN"),
    ...(env.QSTASH_URL || environment === "production" ? { qstashUrl: validateUrl(required(env, "QSTASH_URL"), "qstash") } : {}),
    currentSigningKey: required(env, "QSTASH_CURRENT_SIGNING_KEY"),
    nextSigningKey: required(env, "QSTASH_NEXT_SIGNING_KEY"),
    ...(bypass ? { vercelAutomationBypassSecret: bypass } : {}),
    // No fallback to the workspace-admin token used by the infrastructure CLI.
    tinybirdUrl: validateUrl(required(env, "TINYBIRD_ANALYTICS_URL"), "tinybird"),
    tinybirdIngestToken: required(env, "TINYBIRD_ANALYTICS_INGEST_TOKEN"),
    tinybirdQueryToken: required(env, "TINYBIRD_ANALYTICS_QUERY_TOKEN"),
  };
}
