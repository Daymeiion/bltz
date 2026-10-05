import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ dispatch: vi.fn(), backlog: vi.fn(), deliver: vi.fn(), readBatch: vi.fn(), operations: vi.fn(), reconcile: vi.fn() }));
vi.mock("@/lib/analytics/delivery/pipeline", () => ({ dispatchAnalyticsDelivery: mocks.dispatch, dispatchAnalyticsBacklog: mocks.backlog, deliverAnalyticsJob: mocks.deliver }));
vi.mock("@/lib/analytics/delivery/store", () => ({ createAnalyticsDeliveryStore: () => ({ readBatch: mocks.readBatch }), readAnalyticsDeliveryOperations: mocks.operations }));
vi.mock("@/lib/analytics/delivery/tinybird", () => ({ reconcileAnalyticsBatch: mocks.reconcile }));
import { POST as worker } from "@/app/api/internal/analytics/deliver/route";
import { POST as dispatch, GET as cron } from "@/app/api/internal/analytics/dispatch/route";
import { POST as reconcile } from "@/app/api/internal/analytics/reconcile/route";

const workerUrl = "https://development.example.com/api/internal/analytics/deliver";
const key = "synthetic-current-key";
const dispatchSecret = "synthetic-development-trigger-secret";
const batchId = "c50d01ca-45a1-450f-93a2-b30afefb5b18";
const job = { job_version: 1, batch_id: batchId, environment: "development" };
function signature(raw: string) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: "Upstash", sub: workerUrl, nbf: Math.floor(Date.now() / 1000) - 10,
    exp: Math.floor(Date.now() / 1000) + 60, body: createHash("sha256").update(raw).digest("base64url") })).toString("base64url");
  return `${header}.${payload}.${createHmac("sha256", key).update(`${header}.${payload}`).digest("base64url")}`;
}
function signedRequest(value: unknown = job) {
  const raw = JSON.stringify(value);
  return new Request(workerUrl, { method: "POST", body: raw, headers: { "upstash-signature": signature(raw) } });
}
beforeEach(() => {
  vi.clearAllMocks();
  const env = {
    BLTZ_ANALYTICS_PIPELINE_ENABLED: "true", BLTZ_ANALYTICS_ENVIRONMENT: "development", VERCEL_ENV: "preview",
    BLTZ_ANALYTICS_WORKER_URL: workerUrl, BLTZ_ANALYTICS_DISPATCH_SECRET: dispatchSecret,
    QSTASH_TOKEN: "synthetic-token", QSTASH_CURRENT_SIGNING_KEY: key, QSTASH_NEXT_SIGNING_KEY: "synthetic-next-key", QSTASH_URL: "",
    TINYBIRD_ANALYTICS_URL: "https://api.us-west-2.aws.tinybird.co", TINYBIRD_ANALYTICS_INGEST_TOKEN: "synthetic-append", TINYBIRD_ANALYTICS_QUERY_TOKEN: "synthetic-read",
  };
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  mocks.deliver.mockResolvedValue({ state: "acknowledged", eventCount: 1 });
  mocks.dispatch.mockResolvedValue({ state: "published", eventCount: 1 });
});
afterEach(() => vi.unstubAllEnvs());

describe("internal analytics route boundaries", () => {
  it("rejects missing or modified signatures before durable registry access", async () => {
    expect((await worker(new Request(workerUrl, { method: "POST", body: JSON.stringify(job) }))).status).toBe(401);
    const changed = new Request(workerUrl, { method: "POST", body: JSON.stringify({ ...job, extra: true }), headers: { "upstash-signature": signature(JSON.stringify(job)) } });
    expect((await worker(changed)).status).toBe(401);
    expect(mocks.deliver).not.toHaveBeenCalled();
  });
  it("rejects production/synthetic and event-bearing payloads even if signed", async () => {
    for (const value of [{ ...job, environment: "production" }, { ...job, environment: "synthetic" }, { ...job, events: [] }]) {
      expect((await worker(signedRequest(value))).status).toBe(400);
    }
    expect(mocks.deliver).not.toHaveBeenCalled();
  });
  it("enforces streamed request bounds and accepts the signed immutable batch reference", async () => {
    expect((await worker(new Request(workerUrl, { method: "POST", body: "a".repeat(4097) }))).status).toBe(413);
    expect((await worker(signedRequest())).status).toBe(200);
    expect(mocks.deliver).toHaveBeenCalledWith(expect.objectContaining({ environment: "development", workerUrl }), job);
  });
  it("returns queue retry for retryable/leased work and acknowledges durable quarantine", async () => {
    for (const state of ["retry", "not_acquired"]) {
      mocks.deliver.mockResolvedValueOnce({ state }); expect((await worker(signedRequest())).status).toBe(503);
    }
    mocks.deliver.mockResolvedValueOnce({ state: "quarantined" }); expect((await worker(signedRequest())).status).toBe(200);
  });
  it("stays disabled by default and fails closed for missing runtime credentials", async () => {
    vi.stubEnv("BLTZ_ANALYTICS_PIPELINE_ENABLED", "false"); expect((await worker(signedRequest())).status).toBe(404);
    vi.stubEnv("BLTZ_ANALYTICS_PIPELINE_ENABLED", "true"); vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "");
    expect((await worker(signedRequest())).status).toBe(503); expect(mocks.deliver).not.toHaveBeenCalled();
  });
  it("authorizes dispatch on the server and never exposes upstream error text", async () => {
    expect((await dispatch(new Request("https://development.example.com/api/internal/analytics/dispatch", { method: "POST" }))).status).toBe(401);
    expect(mocks.dispatch).not.toHaveBeenCalled();
    mocks.dispatch.mockRejectedValueOnce(new Error("private upstream credential body"));
    const result = await dispatch(new Request("https://development.example.com/api/internal/analytics/dispatch", { method: "POST", headers: { authorization: `Bearer ${dispatchSecret}` } }));
    expect(result.status).toBe(503); expect(await result.json()).toEqual({ error: "analytics_delivery_unavailable" });
  });
  it("keeps reconciliation read-only and protected by the separate trigger secret", async () => {
    const url = "https://development.example.com/api/internal/analytics/reconcile";
    expect((await reconcile(new Request(url, { method: "POST", body: JSON.stringify({ batch_id: batchId }) }))).status).toBe(401);
    mocks.readBatch.mockResolvedValue({ batch_id: batchId }); mocks.reconcile.mockResolvedValue({ state: "complete", automaticStateChange: false });
    const result = await reconcile(new Request(url, { method: "POST", body: JSON.stringify({ batch_id: batchId }), headers: { authorization: `Bearer ${dispatchSecret}` } }));
    expect(await result.json()).toEqual({ state: "complete", automaticStateChange: false });
    expect(mocks.operations).not.toHaveBeenCalled(); expect(mocks.readBatch).toHaveBeenCalledWith(batchId, "development");
  });
  it("keeps GET scheduling disabled in development and requires a separate production cron bearer", async () => {
    const url = "https://development.example.com/api/internal/analytics/dispatch";
    expect((await cron(new Request(url))).status).toBe(404);
    expect(mocks.backlog).not.toHaveBeenCalled();
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "production");
    vi.stubEnv("BLTZ_ANALYTICS_PRODUCTION_ENABLED", "true"); vi.stubEnv("QSTASH_URL", "https://qstash-us-east-1.upstash.io");
    const secret = "synthetic-separate-production-cron-secret"; vi.stubEnv("CRON_SECRET", secret);
    expect((await cron(new Request(url, { headers: { authorization: `Bearer ${dispatchSecret}` } }))).status).toBe(401);
    expect((await cron(new Request(`${url}?secret=${secret}`))).status).toBe(401);
    mocks.backlog.mockResolvedValue({ stopped: "batch_limit", batches: 3, backlogRemaining: "unknown" });
    const result = await cron(new Request(url, { headers: { authorization: `Bearer ${secret}` } }));
    expect(result.status).toBe(200); expect(result.headers.get("cache-control")).toContain("no-store");
    expect(mocks.backlog).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ environment: "production" }));
  });
  it("accepts opted-in production jobs but rejects a signed development job on the production worker", async () => {
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BLTZ_ANALYTICS_ENVIRONMENT", "production");
    vi.stubEnv("BLTZ_ANALYTICS_PRODUCTION_ENABLED", "true"); vi.stubEnv("QSTASH_URL", "https://qstash-us-east-1.upstash.io");
    expect((await worker(signedRequest())).status).toBe(400); expect(mocks.deliver).not.toHaveBeenCalled();
    expect((await worker(signedRequest({ ...job, environment: "production" }))).status).toBe(200);
    expect(mocks.deliver).toHaveBeenCalledWith(expect.objectContaining({ environment: "production" }), { ...job, environment: "production" });
  });
});
