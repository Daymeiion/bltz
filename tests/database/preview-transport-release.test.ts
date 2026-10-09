// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { parse } from "dotenv";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildTransportReleasePacket, type TransportReleaseBaseline } from "../helpers/transport-release-packet";
import { createAnalyticsDeliveryStore } from "@/lib/analytics/delivery/store";
import { createAnalyticsDeliveryPublisher, dispatchAnalyticsDelivery, deliverAnalyticsJob } from "@/lib/analytics/delivery/pipeline";
import { ingestAnalyticsBatch, reconcileAnalyticsBatch } from "@/lib/analytics/delivery/tinybird";
import { analyticsDeliveryJobSchema, type AnalyticsDeliveryJob } from "@/lib/analytics/delivery/contracts";
import type { AnalyticsDeliveryConfiguration } from "@/lib/analytics/delivery/config";
import { queryPreviewSprintCounts } from "@/lib/analytics/preview-report";

const service = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => service }));

const files = [
  "20261009003442_analytics_delivery_transport.sql",
  "20261009003448_analytics_delivery_production_environment.sql",
  "20261009003454_preview_sprint_delivery_bridge.sql",
];
const migrations = files.map((filename) => ({
  version: filename.slice(0, 14),
  name: filename.slice(15, -4),
  sql: fs.readFileSync(`docs/preview-lockers/transport-release-candidate/${filename}`, "utf8"),
}));
const db = new PGlite();
const preview = "10000000-0000-4000-8000-000000000001";
const session = "70000000-0000-4000-8000-000000000001";
const event = "60000000-0000-4000-8000-000000000001";
let baseline: TransportReleaseBaseline;
let packet: string;

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema private; create schema supabase_migrations;
    create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);
    insert into supabase_migrations.schema_migrations values('20261001035756','synthetic_baseline',array['-- local invariant proof']);
    create function private.has_active_platform_role(p_actor uuid,p_roles text[]) returns boolean language sql as $$ select false $$;
    create table analytics_events(id uuid primary key default gen_random_uuid(),client_event_id uuid unique not null,event_name text not null,user_id uuid,athlete_id uuid,session_id uuid,source text not null,page text,properties jsonb not null,occurred_at timestamptz not null);
    grant select,insert on analytics_events to service_role;
    create table preview_lockers(id uuid primary key,photos jsonb not null default '[]',videos jsonb not null default '[]',headshot_url text,hero_video_url text);
    create table preview_locker_short_links(preview_id uuid primary key references preview_lockers,public_access_enabled boolean not null default false);
    create table preview_locker_viewer_grants(preview_locker_id uuid references preview_lockers,viewer_user_id uuid,assigned_at timestamptz not null);
    create table preview_conversion_campaigns(preview_id uuid primary key references preview_lockers,is_test boolean not null default false);
    create table preview_conversion_events(id uuid primary key default gen_random_uuid(),preview_id uuid,actor_id uuid,session_id uuid not null,request_id uuid not null default gen_random_uuid(),kind text not null,related_id uuid,utm jsonb not null default '{}',created_at timestamptz not null default clock_timestamp());
    create table preview_link_inquiries(id uuid primary key default gen_random_uuid(),preview_id uuid not null references preview_lockers,email text not null,feature_requests text,created_at timestamptz not null default clock_timestamp(),unique(preview_id,email));
    revoke all on preview_conversion_events,preview_link_inquiries from public,anon,authenticated,service_role;
    grant select,insert on preview_link_inquiries to service_role;
    insert into preview_lockers(id,photos) values('${preview}','[{"id":"photo-1"}]');
    insert into preview_locker_short_links values('${preview}',true);`);
  const row = (await db.query<{ count: number; latestVersion: string; versionsMd5: string; systemIdentifier: string }>(`select count(*)::int "count",max(version) "latestVersion",md5(string_agg(version,',' order by version)) "versionsMd5",(select system_identifier::text from pg_control_system()) "systemIdentifier" from supabase_migrations.schema_migrations`)).rows[0];
  baseline = row;
  packet = buildTransportReleasePacket(migrations, baseline);
}, 30_000);
afterAll(async () => db.close());

describe("transport-only migration release", () => {
  it("refuses a changed database or history before changing schema", async () => {
    await expect(db.exec(buildTransportReleasePacket(migrations, { ...baseline, systemIdentifier: "1" }))).rejects.toThrow("Database identity changed");
    await db.exec("rollback");
    await expect(db.exec(buildTransportReleasePacket(migrations, { ...baseline, versionsMd5: "0".repeat(32) }))).rejects.toThrow("Migration history changed");
    await db.exec("rollback");
    expect((await db.query<{ absent: boolean }>("select to_regclass('public.analytics_delivery_outbox') is null absent")).rows[0].absent).toBe(true);
  });

  it("rolls back all three complete migrations and history on precommit failure", async () => {
    const failure = packet.replace(/commit;\s*$/, "select 1/0;\ncommit;");
    await expect(db.exec(failure)).rejects.toThrow("division by zero");
    await db.exec("rollback");
    const row = (await db.query<{ count: number; md5: string; absent: boolean; inquiryColumns: number }>(`select (select count(*)::int from supabase_migrations.schema_migrations) count,(select md5(string_agg(version,',' order by version)) from supabase_migrations.schema_migrations) md5,to_regclass('public.analytics_delivery_outbox') is null and to_regclass('private.preview_analytics_capture_config') is null absent,(select count(*)::int from information_schema.columns where table_name='preview_link_inquiries' and column_name='analytics_environment') "inquiryColumns"`)).rows[0];
    expect(row).toEqual({ count: baseline.count, md5: baseline.versionsMd5, absent: true, inquiryColumns: 0 });
  });

  it("records only complete new migrations, preserves original history and adds no engine schemas", async () => {
    await db.exec(packet);
    const history = (await db.query<{ version: string; name: string; statements: string[] }>("select version,name,statements from supabase_migrations.schema_migrations order by version")).rows;
    expect(history[0]).toEqual({ version: baseline.latestVersion, name: "synthetic_baseline", statements: ["-- local invariant proof"] });
    expect(history.slice(1)).toEqual(migrations.map((migration) => ({ version: migration.version, name: migration.name, statements: [migration.sql] })));
    expect((await db.query<{ n: number }>("select count(*)::int n from pg_tables where schemaname='public' and tablename like 'intelligence_%'")).rows[0].n).toBe(0);
    expect((await db.query<{ environment: string | null }>("select environment from private.preview_analytics_capture_config")).rows[0].environment).toBeNull();
    await expect(db.exec(packet)).rejects.toThrow("Migration history changed");
    await db.exec("rollback");
    expect((await db.query<{ n: number }>("select count(*)::int n from supabase_migrations.schema_migrations")).rows[0].n).toBe(baseline.count + 3);
  });

  it("accepts and deduplicates production preview events without a Player or Moment schema", async () => {
    await db.exec("select public.configure_preview_analytics_capture('production')");
    const input = JSON.stringify({ previewId: preview, eventId: event, sessionId: session, eventName: "photo_open", assetId: "photo-1" });
    const record = () => db.query<{ result: { accepted: boolean; duplicate: boolean } }>("select public.record_preview_analytics_event($1::jsonb,null,'production') result", [input]);
    expect((await record()).rows[0].result).toMatchObject({ accepted: true, duplicate: false });
    expect((await record()).rows[0].result).toMatchObject({ accepted: true, duplicate: true });
    expect((await db.query<{ n: number }>("select count(*)::int n from analytics_delivery_outbox")).rows[0].n).toBe(1);
    await db.exec("set role anon");
    try { await expect(record()).rejects.toThrow("permission denied"); }
    finally { await db.exec("reset role"); }
    await db.exec("set role service_role");
    try { await expect(db.query("select * from preview_conversion_events")).rejects.toThrow("permission denied"); }
    finally { await db.exec("reset role"); }
  });

  it("delivers a persisted form through real queue SQL and transport code without exporting form data or duplicating retries", async () => {
    await db.exec("select public.configure_preview_analytics_capture('development')");
    const claimPreview = randomUUID();
    await db.query("insert into preview_lockers(id) values($1)", [claimPreview]);
    await db.query("insert into preview_locker_short_links values($1,true)", [claimPreview]);
    const save = () => db.query<{ result: { saved: boolean } }>(
      "select public.save_preview_link_inquiry($1,$2,$3,$4,null,'development') result",
      [claimPreview, "claim-canary@example.invalid", "Private claim feedback", session],
    );
    await db.exec("set role service_role");
    try {
      expect((await save()).rows[0].result).toEqual({ saved: true });
      expect((await save()).rows[0].result).toEqual({ saved: true });
      const outbox = (await db.query<{ envelope: { event_name: string; session_id: string }; event_id: string }>(
        "select event_id,envelope from analytics_delivery_outbox where environment='development' order by event_id",
      )).rows;
      expect(outbox.map(row => row.envelope.event_name).sort()).toEqual(["preview_accepted", "preview_claim_submit"]);
      expect(outbox.every(row => row.envelope.session_id === session)).toBe(true);
      service.rpc.mockImplementation((name: string, args: Record<string, unknown>) => ({
        abortSignal: async () => {
          if (!/^(lease_analytics_delivery_batch|mark_analytics_delivery_published|release_analytics_delivery_publish|acquire_analytics_delivery_batch|settle_analytics_delivery_batch|get_analytics_delivery_batch)$/.test(name)) throw Error("unexpected_rpc");
          const keys = Object.keys(args);
          if (!keys.every(key => /^p_[a-z_]+$/.test(key))) throw Error("unexpected_argument");
          const row = (await db.query<{ result: unknown }>(`select public.${name}(${keys.map((key, index) => `${key} => $${index + 1}`).join(",")}) result`, Object.values(args))).rows[0];
          return { data: row.result, error: null };
        },
      }));
      const config = { environment: "development", workerUrl: "https://preview.example.invalid/api/internal/analytics/deliver",
        qstashUrl: "https://qstash-us-east-1.upstash.io", qstashToken: "synthetic-publish",
        tinybirdUrl: "https://api.tinybird.co", tinybirdIngestToken: "synthetic-append", tinybirdQueryToken: "synthetic-query",
      } as AnalyticsDeliveryConfiguration;
      // Explicit opt-in only: send anonymous synthetic fixture events to the
      // previously approved isolated development resources, never production.
      const liveTinybird = process.env.BLTZ_CLAIM_TINYBIRD_CANARY === "true";
      if (liveTinybird) {
        const runtime = parse(fs.readFileSync("output/preview-sprint-events-2026-10-05/.env.tinybird-development.local", "utf8"));
        if (runtime.BLTZ_ANALYTICS_ENVIRONMENT !== "development" || runtime.BLTZ_ANALYTICS_PIPELINE_ENABLED !== "false"
          || runtime.BLTZ_ANALYTICS_PRODUCTION_ENABLED !== "false"
          || !runtime.TINYBIRD_ANALYTICS_INGEST_TOKEN || !runtime.TINYBIRD_ANALYTICS_QUERY_TOKEN) throw Error("development_canary_configuration_invalid");
        const host = new URL(runtime.TINYBIRD_ANALYTICS_URL);
        if (host.protocol !== "https:" || !/^api(?:\.[a-z0-9-]+)*\.tinybird\.co$/.test(host.hostname) || host.pathname !== "/" || host.search || host.hash || host.username || host.password) throw Error("development_canary_host_invalid");
        config.tinybirdUrl = host.origin;
        config.tinybirdIngestToken = runtime.TINYBIRD_ANALYTICS_INGEST_TOKEN;
        config.tinybirdQueryToken = runtime.TINYBIRD_ANALYTICS_QUERY_TOKEN;
      }
      const store = createAnalyticsDeliveryStore();
      let job: AnalyticsDeliveryJob | undefined;
      const queueFetch = vi.fn(async (url: URL | RequestInfo, options?: RequestInit) => {
        expect(new URL(String(url)).hostname).toBe("qstash-us-east-1.upstash.io");
        job = analyticsDeliveryJobSchema.parse(JSON.parse(String(options?.body)));
        expect(Object.keys(job).sort()).toEqual(["batch_id", "environment", "job_version"]);
        return Response.json({ messageId: "synthetic-form-message" });
      });
      expect(await dispatchAnalyticsDelivery(config, { store, publisher: createAnalyticsDeliveryPublisher(config, queueFetch) }))
        .toEqual({ state: "published", eventCount: 2 });
      expect(queueFetch).toHaveBeenCalledTimes(1);
      const rows: { event_id: string; payload_hash: string; properties_json: string; session_id: string }[] = [];
      let liveResponse: { status?: number; successfulRows?: number; quarantinedRows?: number; networkCode?: string } = {};
      const ingestFetch = vi.fn(async (url: URL | RequestInfo, options?: RequestInit) => {
        const target = new URL(String(url));
        expect(target.pathname).toBe("/v0/events");
        expect(target.searchParams.get("name")).toBe("bltz_events_development_v1");
        const body = String(options?.body);
        expect(body).not.toContain("claim-canary@example.invalid");
        expect(body).not.toContain("Private claim feedback");
        rows.push(...body.trim().split("\n").map(line => JSON.parse(line)));
        if (!liveTinybird) return Response.json({ successful_rows: 2, quarantined_rows: 0 });
        try {
          const response = await fetch(url, options);
          const ack = await response.clone().json().catch(() => null);
          liveResponse = { status: response.status,
            successfulRows: typeof ack?.successful_rows === "number" ? ack.successful_rows : undefined,
            quarantinedRows: typeof ack?.quarantined_rows === "number" ? ack.quarantined_rows : undefined,
          };
          return response;
        } catch (error) {
          const code = (error as { cause?: { code?: string } })?.cause?.code;
          liveResponse = { networkCode: typeof code === "string" && /^[A-Z0-9_]+$/.test(code) ? code : "UNAVAILABLE" };
          throw error;
        }
      });
      const ingest = (cfg: AnalyticsDeliveryConfiguration, batch: Parameters<typeof ingestAnalyticsBatch>[1]) => ingestAnalyticsBatch(cfg, batch, ingestFetch);
      const delivered = await deliverAnalyticsJob(config, job!, { store, ingest });
      if (liveTinybird) fs.writeFileSync("output/preview-sprint-events-2026-10-05/claim-tinybird-canary.json", JSON.stringify({
        checkedAt: new Date().toISOString(), developmentOnly: true, syntheticPreviewId: claimPreview,
        batchId: job!.batch_id, deliveryState: delivered.state, response: liveResponse,
        expectedEventIds: rows.map(row => row.event_id), expectedPayloadHashes: rows.map(row => row.payload_hash),
        exactIdReconciliation: "not_yet_verified", qstash: "transport_contract_test_only; hosted_worker_still_pending", productionEnabled: false,
      }, null, 2) + "\n");
      expect(delivered).toEqual({ state: "acknowledged", duplicate: false, eventCount: 2 });
      expect(rows.map(row => JSON.parse(row.properties_json).event_kind).sort()).toEqual(["accepted", "claim_submit"]);
      expect(rows.every(row => row.session_id === session)).toBe(true);
      expect(await deliverAnalyticsJob(config, job!, { store, ingest })).toMatchObject({ state: "acknowledged", duplicate: true });
      expect(ingestFetch).toHaveBeenCalledTimes(1);
      const batch = (await store.readBatch(job!.batch_id, "development"))!;
      let reconciled = liveTinybird ? await reconcileAnalyticsBatch(config, batch)
        : await reconcileAnalyticsBatch(config, batch, async () => Response.json({ data: rows.map(row => ({ event_id: row.event_id, payload_hash: row.payload_hash, physical_rows: 1 })) }));
      // Insertion acknowledgment and report visibility are separate checks.
      // Re-read only; never replay an incomplete/ambiguous batch to find it.
      for (let attempt = 0; liveTinybird && reconciled.state === "incomplete" && attempt < 3; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        reconciled = await reconcileAnalyticsBatch(config, batch);
      }
      if (liveTinybird) {
        const path = "output/preview-sprint-events-2026-10-05/claim-tinybird-canary.json";
        const receipt = JSON.parse(fs.readFileSync(path, "utf8"));
        fs.writeFileSync(path, JSON.stringify({ ...receipt, exactIdReconciliation: reconciled.state }, null, 2) + "\n");
      }
      expect(reconciled).toMatchObject({ state: "complete", expectedEvents: 2, matchedEvents: 2, missingEvents: 0 });
      if (liveTinybird) {
        // Replay identical metadata to prove the hosted report deduplicates
        // physical re-delivery instead of inflating successful form counts.
        expect(await ingestAnalyticsBatch(config, batch)).toEqual({ outcome: "acknowledged", errorCode: null });
        const start = new Date(Date.parse(batch.envelopes[0].occurred_at) - 60_000).toISOString();
        const end = new Date(Date.now() + 60_000).toISOString();
        const report = await queryPreviewSprintCounts(claimPreview, start, end, { config, expectedEnvironment: "development" });
        expect(report.rows.map(row => ({ kind: row.event_kind, events: row.event_count, sessions: row.tab_session_count })).sort((a, b) => a.kind.localeCompare(b.kind)))
          .toEqual([{ kind: "accepted", events: 1, sessions: 1 }, { kind: "claim_submit", events: 1, sessions: 1 }]);
        fs.writeFileSync("output/preview-sprint-events-2026-10-05/claim-tinybird-canary.json", JSON.stringify({
          checkedAt: new Date().toISOString(), developmentOnly: true, syntheticPreviewId: claimPreview,
          batchId: batch.batch_id, acknowledgedEvents: 2, exactIdReconciliation: reconciled.state,
          replayLogicalCounts: { accepted: 1, claim_submit: 1 }, privateFormFieldsExported: false,
          qstash: "transport_contract_test_only; hosted_worker_still_pending", productionEnabled: false,
        }, null, 2) + "\n");
      }
    } finally { await db.exec("reset role"); }
  }, 30_000);
});
