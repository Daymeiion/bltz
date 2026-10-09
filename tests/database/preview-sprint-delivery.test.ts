// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { previewSprintEventSchema } from "@/lib/analytics/bltz-event";

const db = new PGlite();
const preview = "10000000-0000-4000-8000-000000000001";
const privatePreview = "10000000-0000-4000-8000-000000000002";
const testPreview = "10000000-0000-4000-8000-000000000003";
const viewer = "40000000-0000-4000-8000-000000000001";
const expired = "40000000-0000-4000-8000-000000000002";
const admin = "40000000-0000-4000-8000-000000000003";
const session = "70000000-0000-4000-8000-000000000001";
const id = (index: number) => `60000000-0000-4000-8000-${String(index).padStart(12,"0")}`;
async function record(index: number, patch: Record<string, unknown> = {}, actor: string | null = null) {
  return (await db.query<{ result: { accepted: boolean; duplicate?: boolean; excluded?: boolean } }>("select public.record_preview_analytics_event($1::jsonb,$2::uuid,'development') result", [JSON.stringify({ previewId: preview, eventId: id(index), sessionId: session, eventName: "locker_view", ...patch }), actor])).rows[0].result;
}
async function inquiry(email: string, environment: string | null = "development", actor: string | null = null) {
  return (await db.query<{ result: { saved: boolean } }>("select public.save_preview_link_inquiry($1,$2,'Private feature requests',$3,$4,$5) result", [preview,email,session,actor,environment])).rows[0].result;
}
beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create schema private;create table auth.users(id uuid primary key);create table players(id uuid primary key);create table moments(id uuid primary key);
    create function private.has_active_platform_role(p_user_id uuid,p_roles text[]) returns boolean language sql stable as $$ select p_user_id='${admin}'::uuid $$;
    revoke all on function private.has_active_platform_role(uuid,text[]) from public,anon,authenticated,service_role;
    create table analytics_events(id uuid primary key default gen_random_uuid(),client_event_id uuid unique not null,event_name text not null,user_id uuid,athlete_id uuid,session_id uuid,source text not null,page text,properties jsonb not null,occurred_at timestamptz not null,created_at timestamptz default now());
    grant select,insert on analytics_events to service_role;
    create table preview_lockers(id uuid primary key,photos jsonb not null default '[]',videos jsonb not null default '[]',headshot_url text,hero_video_url text);
    create table preview_locker_short_links(preview_id uuid primary key references preview_lockers,public_access_enabled boolean not null default false);
    create table preview_locker_viewer_grants(preview_locker_id uuid references preview_lockers,viewer_user_id uuid,assigned_at timestamptz not null);
    create table preview_conversion_campaigns(preview_id uuid primary key references preview_lockers,is_test boolean not null default false);
    create table preview_conversion_events(id uuid primary key default gen_random_uuid(),preview_id uuid references preview_conversion_campaigns,actor_id uuid,session_id uuid not null,request_id uuid not null default gen_random_uuid(),kind text not null,related_id uuid,utm jsonb not null default '{}',created_at timestamptz not null default clock_timestamp());
    create table preview_link_inquiries(id uuid primary key default gen_random_uuid(),preview_id uuid not null references preview_lockers,email text not null,feature_requests text,created_at timestamptz not null default clock_timestamp(),unique(preview_id,email));
    alter table preview_link_inquiries enable row level security;alter table preview_conversion_events enable row level security;
    revoke all on preview_conversion_events,preview_link_inquiries,preview_conversion_campaigns from public,anon,authenticated,service_role;
    grant select,insert on preview_link_inquiries to service_role;
    insert into preview_lockers(id,photos,videos) values('${preview}','[{"id":"photo-1"}]','[{"id":"clip-1"}]'),('${privatePreview}','[]','[]'),('${testPreview}','[]','[]');
    insert into preview_locker_short_links values('${preview}',true),('${testPreview}',true);
    insert into preview_locker_viewer_grants values('${privatePreview}','${viewer}',clock_timestamp()),('${privatePreview}','${expired}',clock_timestamp()-interval '49 hours');
    insert into preview_conversion_campaigns values('${preview}',false),('${testPreview}',true);`);
  await db.exec(fs.readFileSync("supabase/migrations/20261009003442_analytics_delivery_transport.sql","utf8"));
  await db.exec(fs.readFileSync("supabase/migrations/20261009003448_analytics_delivery_production_environment.sql","utf8"));
  await db.exec(fs.readFileSync("supabase/migrations/20261009003454_preview_sprint_delivery_bridge.sql","utf8"));
},30_000);
afterAll(async () => db.close());

describe("preview sprint bridge SQL", () => {
  it("is default disabled, while the current public interest form still saves", async () => {
    expect(await record(1)).toEqual({ accepted: false, excluded: true });
    expect(await inquiry("disabled@example.com")).toEqual({ saved: true });
    expect((await db.query<{ n: number }>("select count(*)::int n from analytics_delivery_outbox")).rows[0].n).toBe(0);
    await db.exec("select public.configure_preview_analytics_capture('development')");
  });
  it("accepts published/assigned previews and rejects unauthorized or expired access, test and internal traffic", async () => {
    expect((await record(2)).accepted).toBe(true);
    await expect(record(3,{ previewId: privatePreview })).rejects.toThrow("preview unavailable");
    await expect(record(3,{ previewId: privatePreview },expired)).rejects.toThrow("preview unavailable");
    expect((await record(3,{ previewId: privatePreview },viewer)).accepted).toBe(true);
    expect(await record(4,{},admin)).toEqual({ accepted: false, excluded: true });
    expect(await record(4,{ previewId: testPreview })).toEqual({ accepted: false, excluded: true });
  });
  it("keeps retries immutable/idempotent and throttles fresh IDs for identical rapid actions", async () => {
    const before = (await db.query("select envelope,payload_hash from analytics_delivery_outbox where event_id=$1",[id(2)])).rows[0];
    expect(await record(2)).toEqual({ accepted: true, duplicate: true, eventId: id(2) });
    expect((await db.query("select envelope,payload_hash from analytics_delivery_outbox where event_id=$1",[id(2)])).rows[0]).toEqual(before);
    await expect(record(2,{ eventName: "stats_view" })).rejects.toThrow("identity collision");
    expect(await record(5)).toEqual({ accepted: false, excluded: true });
    await expect(record(6,{ eventName: "photo_open", assetId: "private-photo" })).rejects.toThrow("invalid preview asset");
    await expect(record(6,{ eventName: "photo_open", assetId: "https://private.example/secret" })).rejects.toThrow("invalid preview input");
    expect((await record(6,{ eventName: "photo_open", assetId: "photo-1" })).accepted).toBe(true);
    expect((await record(7,{ eventName: "video_progress", assetId: "clip-1", progress: 50 })).accepted).toBe(true);
  });
  it("exports persisted conversion and DB-created referral stages while avoiding duplicate room events", async () => {
    for (const kind of ["view","photos_view","film_view","accepted","referral_submit","referred_prepared","booking_confirmed"])
      await db.query("insert into preview_conversion_events(preview_id,actor_id,session_id,kind,utm) values($1,$2,$3,$4,$5::jsonb)",[preview,kind==="booking_confirmed" ? admin : viewer,session,kind,JSON.stringify({ utm_campaign: "private-contact-campaign" })]);
    const rows=(await db.query<{ envelope: unknown }>("select envelope from analytics_delivery_outbox where envelope->>'measurement_basis'='server_workflow'")).rows;
    expect(rows).toHaveLength(4);
    for (const row of rows) expect(previewSprintEventSchema.safeParse(row.envelope).success).toBe(true);
    const exported=JSON.stringify(rows);
    expect(exported).not.toContain("private-contact-campaign"); expect(exported).not.toContain(viewer); expect(exported).not.toContain(admin);
    expect(exported).not.toContain('"audience_eligible":true');
  });
  it("saves public acceptance/submission and outbox atomically, with duplicate-form retries producing no new events", async () => {
    const before=(await db.query<{ n:number }>("select count(*)::int n from analytics_delivery_outbox")).rows[0].n;
    expect(await inquiry("interested@example.com")).toEqual({ saved: true });
    expect(await inquiry("interested@example.com")).toEqual({ saved: true });
    const rows=(await db.query<{ envelope: unknown }>("select envelope from analytics_delivery_outbox order by accepted_at")).rows;
    expect(rows).toHaveLength(before+2);
    for (const row of rows) expect(previewSprintEventSchema.safeParse(row.envelope).success).toBe(true);
    expect(JSON.stringify(rows)).not.toContain("interested@example.com"); expect(JSON.stringify(rows)).not.toContain("Private feature requests");
    await db.exec("alter table analytics_events add constraint simulate_unavailable_export check(event_name<>'preview_claim_submit') not valid");
    try { await expect(inquiry("retry-after-failure@example.com")).rejects.toThrow("simulate_unavailable_export"); }
    finally { await db.exec("alter table analytics_events drop constraint simulate_unavailable_export"); }
    expect((await db.query<{ n:number }>("select count(*)::int n from preview_link_inquiries where email='retry-after-failure@example.com'")).rows[0].n).toBe(0);
    expect((await db.query<{ n:number }>("select count(*)::int n from analytics_delivery_outbox")).rows[0].n).toBe(before+2);
    expect(await inquiry("retry-after-failure@example.com")).toEqual({ saved: true });
    const savedCount=(await db.query<{ n:number }>("select count(*)::int n from analytics_delivery_outbox")).rows[0].n;
    await inquiry("staff@example.com","development",admin); await inquiry("prefetch@example.com",null);
    expect((await db.query<{ n:number }>("select count(*)::int n from analytics_delivery_outbox")).rows[0].n).toBe(savedCount);
  });
  it("never expands browser or service access to the protected conversion ledger/configuration", async () => {
    for(const role of ["anon","authenticated"]){
      await db.exec(`set role ${role}`);
      try { await expect(record(10)).rejects.toThrow(/permission denied/); await expect(inquiry("forbidden@example.com")).rejects.toThrow(/permission denied/); }
      finally { await db.exec("reset role"); }
    }
    await db.exec("set role service_role");
    try {
      await expect(db.query("select * from preview_conversion_events")).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from private.preview_analytics_capture_config")).rejects.toThrow(/permission denied/);
      expect((await record(11,{ eventName: "film_view" })).accepted).toBe(true);
    } finally { await db.exec("reset role"); }
  });
});
