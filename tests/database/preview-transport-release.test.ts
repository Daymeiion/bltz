// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTransportReleasePacket, type TransportReleaseBaseline } from "../helpers/transport-release-packet";

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
});
