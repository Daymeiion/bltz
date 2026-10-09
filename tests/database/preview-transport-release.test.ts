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
  "20261009022458_preview_claim_browser_session.sql",
];
const migrations = files.map((filename) => ({
  version: filename.slice(0, 14),
  name: filename.slice(15, -4),
  sql: fs.readFileSync(`supabase/migrations/${filename}`, "utf8"),
}));
const db = new PGlite();
const preview = "10000000-0000-4000-8000-000000000001";
const session = "70000000-0000-4000-8000-000000000001";
const event = "60000000-0000-4000-8000-000000000001";
const viewer = "40000000-0000-4000-8000-000000000001";
const admin = "40000000-0000-4000-8000-000000000003";
const originalClaim = fs.readFileSync("supabase/migrations/20260914184728_preview_claim_requests_and_expiry.sql", "utf8");
const originalClaimFunction = originalClaim.match(/create or replace function private\.preview_conversion\(p_preview uuid,p_action text,p_request uuid,p_session uuid,p_data jsonb\)[\s\S]*?\$\$;/)![0];
type PrivateClaimState = { bodyMd5: string; owner: string; acl: string; definer: boolean; configuration: string[] };
const readPrivateClaimState = async () => (await db.query<PrivateClaimState>(`select
  md5(replace(prosrc,E'\\r\\n',E'\\n')) "bodyMd5",proowner::text owner,proacl::text acl,
  prosecdef definer,proconfig configuration from pg_proc
  where oid='private.preview_conversion(uuid,text,uuid,uuid,jsonb)'::regprocedure`)).rows[0];
let originalPrivateClaimState: PrivateClaimState;
let originalHistory: { version: string; name: string; statements: string[] }[];
let baseline: TransportReleaseBaseline;
let packet: string;

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create role claim_owner bypassrls;
    create schema auth; create schema private; create schema supabase_migrations;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.claim_actor',true),'')::uuid $$;
    create function public.is_internal_admin() returns boolean language sql stable as $$ select auth.uid()='${admin}'::uuid $$;
    create table gtm_contacts(id uuid primary key,archived boolean default false,player_master_gsis_id text);
    create table audit_logs(id uuid primary key default gen_random_uuid(),actor_user_id uuid,action text,entity_type text,entity_id text,actor_role_scope text,risk_level text,new_values jsonb);
    create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);
    insert into supabase_migrations.schema_migrations values('20261001035756','synthetic_baseline',array['-- local invariant proof']);
    create function private.has_active_platform_role(p_actor uuid,p_roles text[]) returns boolean language sql as $$ select false $$;
    create table analytics_events(id uuid primary key default gen_random_uuid(),client_event_id uuid unique not null,event_name text not null,user_id uuid,athlete_id uuid,session_id uuid,source text not null,page text,properties jsonb not null,occurred_at timestamptz not null);
    grant select,insert on analytics_events to service_role;
    create table preview_lockers(id uuid primary key,photos jsonb not null default '[]',videos jsonb not null default '[]',headshot_url text,hero_video_url text);
    create table preview_locker_short_links(preview_id uuid primary key references preview_lockers,public_access_enabled boolean not null default false);
    create table preview_locker_viewer_grants(preview_locker_id uuid references preview_lockers,viewer_user_id uuid,assigned_at timestamptz not null);
    create table preview_link_inquiries(id uuid primary key default gen_random_uuid(),preview_id uuid not null references preview_lockers,email text not null,feature_requests text,created_at timestamptz not null default clock_timestamp(),unique(preview_id,email));
    revoke all on preview_link_inquiries from public,anon,authenticated,service_role;
    grant select,insert on preview_link_inquiries to service_role;
    insert into preview_lockers(id,photos) values('${preview}','[{"id":"photo-1"}]');
    insert into preview_locker_short_links values('${preview}',true);
    insert into auth.users(id) values('${viewer}'),('${admin}');
    insert into gtm_contacts(id) values('${preview}');
    insert into preview_locker_viewer_grants values('${preview}','${viewer}',clock_timestamp());
    grant usage on schema auth,private to authenticated;`);
  const foundation = fs.readFileSync("supabase/migrations/20260911185101_preview_conversion_sprint.sql", "utf8");
  await db.exec(foundation.slice(0, foundation.indexOf("-- One transaction entry point")).replace(/^begin;\s*/i, ""));
  await db.exec(originalClaim.slice(originalClaim.indexOf("alter table public.preview_conversion_responses"), originalClaim.indexOf("create or replace function private.can_view_preview_locker")));
  await db.exec(originalClaim.match(/create or replace function private\.can_view_preview_locker\([\s\S]*?\$\$;/)![0]);
  await db.exec(originalClaimFunction);
  await db.exec(`revoke all on function private.preview_conversion(uuid,text,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
    grant execute on function private.preview_conversion(uuid,text,uuid,uuid,jsonb) to authenticated;
    grant usage on schema auth,private,public to claim_owner;
    grant all on all tables in schema private,public to claim_owner;
    alter function private.preview_conversion(uuid,text,uuid,uuid,jsonb) owner to claim_owner;
    create function public.preview_conversion(p_preview uuid,p_action text,p_request uuid,p_session uuid,p_data jsonb)
    returns jsonb language sql security invoker set search_path='' begin atomic;
      select private.preview_conversion(p_preview,p_action,p_request,p_session,p_data);
    end;
    revoke all on function public.preview_conversion(uuid,text,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
    grant execute on function public.preview_conversion(uuid,text,uuid,uuid,jsonb) to authenticated;
    insert into preview_conversion_campaigns(preview_id,contact_id,campaign,channel,relationship,source,is_test,created_by)
      values('${preview}','${preview}','sprint','email','warm','fixture',false,'${admin}');`);
  await db.query("insert into supabase_migrations.schema_migrations values($1,$2,$3)", ["20260914184728", "preview_claim_requests_and_expiry", [originalClaim]]);
  originalPrivateClaimState = await readPrivateClaimState();
  originalHistory = (await db.query<{ version: string; name: string; statements: string[] }>("select version,name,statements from supabase_migrations.schema_migrations order by version")).rows;
  const row = (await db.query<{ count: number; latestVersion: string; versionsMd5: string; systemIdentifier: string }>(`select count(*)::int "count",max(version) "latestVersion",md5(string_agg(version,',' order by version)) "versionsMd5",(select system_identifier::text from pg_control_system()) "systemIdentifier" from supabase_migrations.schema_migrations`)).rows[0];
  baseline = row;
  packet = buildTransportReleasePacket(migrations, baseline);
}, 30_000);
afterAll(async () => db.close());

describe("scoped transport and claim-session migration release", () => {
  it("refuses a changed database or history before changing schema", async () => {
    await expect(db.exec(buildTransportReleasePacket(migrations, { ...baseline, systemIdentifier: "1" }))).rejects.toThrow("Database identity changed");
    await db.exec("rollback");
    await expect(db.exec(buildTransportReleasePacket(migrations, { ...baseline, versionsMd5: "0".repeat(32) }))).rejects.toThrow("Migration history changed");
    await db.exec("rollback");
    expect((await db.query<{ absent: boolean }>("select to_regclass('public.analytics_delivery_outbox') is null absent")).rows[0].absent).toBe(true);
  });

  it("keeps transaction and engine guards when including the fourth candidate", () => {
    expect(() => buildTransportReleasePacket(migrations.slice(0, 3), baseline)).not.toThrow();
    const replaceFourth = (changes: Partial<(typeof migrations)[number]>) => [...migrations.slice(0, 3), { ...migrations[3], ...changes }];
    expect(() => buildTransportReleasePacket(replaceFourth({ name: "unreviewed_claim_change" }), baseline)).toThrow("Invalid or unscoped");
    expect(() => buildTransportReleasePacket(replaceFourth({ sql: migrations[3].sql.replace("commit;", "commit;\ncommit;") }), baseline)).toThrow("Invalid or unscoped");
    expect(() => buildTransportReleasePacket(replaceFourth({ sql: migrations[3].sql.replace("commit;", "create table intelligence_feature_snapshots(id uuid);\ncommit;") }), baseline)).toThrow("Invalid or unscoped");
  });

  it("rolls back transport DDL and history when private function provenance changes", async () => {
    await db.exec(originalClaimFunction.replace(/declare\r?\n/, "declare\n  -- changed local provenance\n"));
    const changed = await readPrivateClaimState();
    expect(changed.bodyMd5).not.toBe(originalPrivateClaimState.bodyMd5);
    try {
      await expect(db.exec(packet)).rejects.toThrow("Private claim function changed");
      await db.exec("rollback");
      expect(await readPrivateClaimState()).toEqual(changed);
      expect((await db.query<{ absent: boolean; count: number }>(`select
        to_regclass('public.analytics_delivery_outbox') is null and to_regclass('private.preview_analytics_capture_config') is null absent,
        (select count(*)::int from supabase_migrations.schema_migrations) count`)).rows[0]).toEqual({ absent: true, count: baseline.count });
    } finally { await db.exec(originalClaimFunction); }
  });

  it("rolls back all four complete migrations, private function and history on precommit failure", async () => {
    const failure = packet.replace(/commit;\s*$/, "select 1/0;\ncommit;");
    await expect(db.exec(failure)).rejects.toThrow("division by zero");
    await db.exec("rollback");
    const row = (await db.query<{ count: number; md5: string; absent: boolean; inquiryColumns: number }>(`select (select count(*)::int from supabase_migrations.schema_migrations) count,(select md5(string_agg(version,',' order by version)) from supabase_migrations.schema_migrations) md5,to_regclass('public.analytics_delivery_outbox') is null and to_regclass('private.preview_analytics_capture_config') is null absent,(select count(*)::int from information_schema.columns where table_name='preview_link_inquiries' and column_name='analytics_environment') "inquiryColumns"`)).rows[0];
    expect(row).toEqual({ count: baseline.count, md5: baseline.versionsMd5, absent: true, inquiryColumns: 0 });
    expect(await readPrivateClaimState()).toEqual(originalPrivateClaimState);
  });

  it("records only complete new migrations, preserves original history and adds no engine schemas", async () => {
    await db.exec(packet);
    const history = (await db.query<{ version: string; name: string; statements: string[] }>("select version,name,statements from supabase_migrations.schema_migrations order by version")).rows;
    expect(history.slice(0, baseline.count)).toEqual(originalHistory);
    expect(history.slice(baseline.count)).toEqual(migrations.map((migration) => ({ version: migration.version, name: migration.name, statements: [migration.sql] })));
    const privateState = await readPrivateClaimState();
    expect(privateState.bodyMd5).not.toBe(originalPrivateClaimState.bodyMd5);
    expect({ ...privateState, bodyMd5: originalPrivateClaimState.bodyMd5 }).toEqual(originalPrivateClaimState);
    expect((await db.query<{ authenticated: boolean; anonymous: boolean; service: boolean }>(`select
      has_function_privilege('authenticated','private.preview_conversion(uuid,text,uuid,uuid,jsonb)','execute') authenticated,
      has_function_privilege('anon','private.preview_conversion(uuid,text,uuid,uuid,jsonb)','execute') anonymous,
      has_function_privilege('service_role','private.preview_conversion(uuid,text,uuid,uuid,jsonb)','execute') service`)).rows[0])
      .toEqual({ authenticated: true, anonymous: false, service: false });
    expect((await db.query<{ n: number }>("select count(*)::int n from pg_tables where schemaname='public' and tablename like 'intelligence_%'")).rows[0].n).toBe(0);
    expect((await db.query<{ environment: string | null }>("select environment from private.preview_analytics_capture_config")).rows[0].environment).toBeNull();
    await expect(db.exec(packet)).rejects.toThrow("Migration history changed");
    await db.exec("rollback");
    expect((await db.query<{ n: number }>("select count(*)::int n from supabase_migrations.schema_migrations")).rows[0].n).toBe(baseline.count + 4);
    expect((await db.query("select version,name,statements from supabase_migrations.schema_migrations order by version")).rows).toEqual(history);
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

  it("preserves private claim form persistence and tab-session delivery across retries", async () => {
    await db.exec("select public.configure_preview_analytics_capture('development')");
    const submit = async (sessionId: string) => {
      await db.query("select set_config('test.claim_actor',$1,false)", [viewer]);
      await db.exec("set role authenticated");
      try {
        return (await db.query<{ result: { saved: boolean; state?: string } }>(
          "select public.preview_conversion($1,'claim_submit',$2,$3,$4::jsonb) result",
          [preview, randomUUID(), sessionId, JSON.stringify({ email: "private-claim@example.invalid", consent: true, feature_requests: "Private career feedback", dashboard_interest: true })],
        )).rows[0].result;
      } finally { await db.exec("reset role"); }
    };
    expect(await submit(session)).toMatchObject({ saved: true });
    const response = (await db.query("select email,feature_requests,dashboard_interest from preview_conversion_responses where preview_id=$1", [preview])).rows;
    expect(response).toEqual([{ email: "private-claim@example.invalid", feature_requests: "Private career feedback", dashboard_interest: true }]);
    const readEvents = () => db.query("select kind,session_id from preview_conversion_events where preview_id=$1 order by kind", [preview]);
    expect((await readEvents()).rows).toEqual(["accepted", "claim_submit", "dashboard_interest"].map(kind => ({ kind, session_id: session })));
    const readDelivery = () => db.query<{ envelope: { session_id: string; properties: { event_kind: string }; measurement_basis: string }; payload_hash: string }>(
      "select envelope,payload_hash from analytics_delivery_outbox where envelope->'properties'->>'preview_id'=$1 and environment='development' order by event_id", [preview],
    );
    const delivery = (await readDelivery()).rows;
    expect(delivery).toHaveLength(3);
    expect(delivery.map(row => row.envelope.properties.event_kind).sort()).toEqual(["accepted", "claim_submit", "dashboard_interest"]);
    expect(delivery.every(row => row.envelope.session_id === session && row.envelope.measurement_basis === "server_workflow")).toBe(true);
    expect(JSON.stringify(delivery)).not.toContain("private-claim@example.invalid");
    expect(JSON.stringify(delivery)).not.toContain("Private career feedback");
    expect(JSON.stringify(delivery)).not.toContain(viewer);
    expect(await submit(session)).toEqual({ saved: true, state: "accepted" });
    expect(await submit(randomUUID())).toEqual({ saved: true, state: "accepted" });
    expect((await readDelivery()).rows).toEqual(delivery);
    expect((await readEvents()).rows).toEqual(["accepted", "claim_submit", "dashboard_interest"].map(kind => ({ kind, session_id: session })));
    expect((await db.query("select email,feature_requests,dashboard_interest from preview_conversion_responses where preview_id=$1", [preview])).rows).toEqual(response);
    expect((await db.query("select count(*)::int n from audit_logs where action='preview.interest.submitted'")).rows[0]).toEqual({ n: 1 });
  });
});
