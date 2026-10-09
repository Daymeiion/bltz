// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { previewSprintEventSchema } from "@/lib/analytics/bltz-event";

const db = new PGlite();
const preview = "10000000-0000-4000-8000-000000000001";
const testPreview = "10000000-0000-4000-8000-000000000002";
const viewer = "40000000-0000-4000-8000-000000000001";
const outsider = "40000000-0000-4000-8000-000000000002";
const admin = "40000000-0000-4000-8000-000000000003";
const session = "70000000-0000-4000-8000-000000000001";
const retrySession = "70000000-0000-4000-8000-000000000002";
const requestId = "60000000-0000-4000-8000-000000000001";
const original = fs.readFileSync("supabase/migrations/20260914184728_preview_claim_requests_and_expiry.sql", "utf8");
const originalFunction = original.match(/create or replace function private\.preview_conversion\(p_preview uuid,p_action text,p_request uuid,p_session uuid,p_data jsonb\)[\s\S]*?\$\$;/)![0];
const candidate = fs.readFileSync("docs/preview-lockers/transport-release-candidate/20261009022458_preview_claim_browser_session.sql", "utf8");
const held = "docs/preview-lockers/transport-release-candidate/";

async function submit(actor: string | null = viewer, target = preview, sessionId = session, data: object = {}) {
  await db.query("select set_config('test.claim_actor',$1,false)", [actor ?? ""]);
  await db.exec("set role authenticated");
  try {
    return (await db.query<{ result: { saved?: boolean; excluded?: boolean; state?: string } }>(
      "select public.preview_conversion($1,'claim_submit',$2,$3,$4::jsonb) result",
      [target, requestId, sessionId, JSON.stringify({ email: "athlete@example.test", consent: true, feature_requests: "Private career feedback", dashboard_interest: true, ...data })],
    )).rows[0].result;
  } finally { await db.exec("reset role"); }
}

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.claim_actor',true),'')::uuid $$;
    create function public.is_internal_admin() returns boolean language sql stable as $$ select auth.uid()='${admin}'::uuid $$;
    create function private.has_active_platform_role(p_user_id uuid,p_roles text[]) returns boolean language sql stable as $$ select p_user_id='${admin}'::uuid $$;
    create table players(id uuid primary key); create table moments(id uuid primary key);
    create table gtm_contacts(id uuid primary key,archived boolean default false,player_master_gsis_id text);
    create table preview_lockers(id uuid primary key,photos jsonb not null default '[]',videos jsonb not null default '[]',headshot_url text,hero_video_url text);
    create table preview_locker_viewer_grants(preview_locker_id uuid references preview_lockers,viewer_user_id uuid references auth.users,assigned_at timestamptz not null);
    create table preview_locker_short_links(preview_id uuid primary key references preview_lockers,public_access_enabled boolean not null default false);
    create table analytics_events(id uuid primary key default gen_random_uuid(),client_event_id uuid unique not null,event_name text not null,user_id uuid,athlete_id uuid,session_id uuid,source text not null,page text,properties jsonb not null,occurred_at timestamptz not null,created_at timestamptz default now());
    create table preview_link_inquiries(id uuid primary key default gen_random_uuid(),preview_id uuid not null references preview_lockers,email text not null,feature_requests text,created_at timestamptz not null default clock_timestamp(),unique(preview_id,email));
    create table audit_logs(id uuid primary key default gen_random_uuid(),actor_user_id uuid,action text,entity_type text,entity_id text,actor_role_scope text,risk_level text,new_values jsonb);
    grant usage on schema auth,private to authenticated;
    insert into auth.users(id) values('${viewer}'),('${outsider}'),('${admin}');
    insert into preview_lockers(id) values('${preview}'),('${testPreview}');
    insert into gtm_contacts(id) values('${preview}'),('${testPreview}');
    insert into preview_locker_viewer_grants values('${preview}','${viewer}',clock_timestamp()),('${testPreview}','${viewer}',clock_timestamp());`);
  const foundation = fs.readFileSync("supabase/migrations/20260911185101_preview_conversion_sprint.sql", "utf8");
  await db.exec(foundation.slice(0, foundation.indexOf("-- One transaction entry point")).replace(/^begin;\s*/i, ""));
  await db.exec(original.slice(original.indexOf("alter table public.preview_conversion_responses"), original.indexOf("create or replace function private.can_view_preview_locker")));
  await db.exec(original.match(/create or replace function private\.can_view_preview_locker\([\s\S]*?\$\$;/)![0]);
  await db.exec(originalFunction);
  await db.exec(`revoke all on function private.preview_conversion(uuid,text,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
    grant execute on function private.preview_conversion(uuid,text,uuid,uuid,jsonb) to authenticated;
    create function public.preview_conversion(p_preview uuid,p_action text,p_request uuid,p_session uuid,p_data jsonb)
    returns jsonb language sql security invoker set search_path='' begin atomic;
      select private.preview_conversion(p_preview,p_action,p_request,p_session,p_data);
    end;
    revoke all on function public.preview_conversion(uuid,text,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
    grant execute on function public.preview_conversion(uuid,text,uuid,uuid,jsonb) to authenticated;
    insert into preview_conversion_campaigns(preview_id,contact_id,campaign,channel,relationship,source,is_test,created_by)
      values('${preview}','${preview}','sprint','email','warm','fixture',false,'${admin}'),('${testPreview}','${testPreview}','sprint','email','warm','fixture',true,'${admin}');`);
  await db.exec(fs.readFileSync(`${held}20261009003442_analytics_delivery_transport.sql`, "utf8"));
  await db.exec(fs.readFileSync(`${held}20261009003448_analytics_delivery_production_environment.sql`, "utf8"));
  await db.exec(fs.readFileSync(`${held}20261009003454_preview_sprint_delivery_bridge.sql`, "utf8"));
  await db.exec(candidate);
  await db.exec("select public.configure_preview_analytics_capture('development')");
}, 30_000);
afterAll(async () => db.close());

describe("private claim browser-session forward candidate", () => {
  it("retains the submitted tab session across accepted, form submission and optional dashboard interest", async () => {
    expect(await submit()).toMatchObject({ saved: true });
    const ledger = (await db.query<{ kind: string; session_id: string }>("select kind,session_id from preview_conversion_events order by kind")).rows;
    expect(ledger).toEqual(["accepted", "claim_submit", "dashboard_interest"].map(kind => ({ kind, session_id: session })));
    const envelopes = (await db.query<{ envelope: unknown }>("select envelope from analytics_delivery_outbox")).rows.map(row => previewSprintEventSchema.parse(row.envelope));
    expect(envelopes).toHaveLength(3);
    for (const event of envelopes) expect(event).toMatchObject({ session_id: session, measurement_basis: "server_workflow", properties: { preview_id: preview } });
    expect(JSON.stringify(envelopes)).not.toContain("athlete@example.test");
    expect(JSON.stringify(envelopes)).not.toContain("Private career feedback");
    expect(JSON.stringify(envelopes)).not.toContain(viewer);
  });

  it("reuses the original persisted conversion across retries with the same or a new browser session", async () => {
    const before = (await db.query("select envelope,payload_hash from analytics_delivery_outbox order by event_id")).rows;
    expect(await submit()).toMatchObject({ saved: true, state: "accepted" });
    expect(await submit(viewer, preview, retrySession)).toMatchObject({ saved: true, state: "accepted" });
    expect((await db.query("select envelope,payload_hash from analytics_delivery_outbox order by event_id")).rows).toEqual(before);
  });

  it("does not create conversion events for an unauthorized actor, missing consent, staff or test previews", async () => {
    const before = (await db.query("select id from preview_conversion_events order by id")).rows;
    await expect(submit(outsider)).rejects.toThrow("forbidden");
    await expect(submit(null)).rejects.toThrow("forbidden");
    await expect(submit(viewer, preview, session, { consent: false })).rejects.toThrow("email and consent required");
    expect(await submit(admin)).toEqual({ excluded: true });
    expect(await submit(viewer, testPreview)).toEqual({ excluded: true });
    expect((await db.query("select id from preview_conversion_events order by id")).rows).toEqual(before);
  });

  it("preserves the private function ACL and fails closed rather than replacing a newer function", async () => {
    const permissions = (await db.query<{ authenticated: boolean; anonymous: boolean; service: boolean; definer: boolean }>(`select
      has_function_privilege('authenticated','private.preview_conversion(uuid,text,uuid,uuid,jsonb)','execute') authenticated,
      has_function_privilege('anon','private.preview_conversion(uuid,text,uuid,uuid,jsonb)','execute') anonymous,
      has_function_privilege('service_role','private.preview_conversion(uuid,text,uuid,uuid,jsonb)','execute') service,
      prosecdef definer from pg_proc where oid='private.preview_conversion(uuid,text,uuid,uuid,jsonb)'::regprocedure`)).rows[0];
    expect(permissions).toEqual({ authenticated: true, anonymous: false, service: false, definer: true });
    await expect(db.exec(candidate)).rejects.toThrow("Private claim function changed");
    await db.exec("rollback");
    expect((await db.query("select count(*)::int n from analytics_delivery_outbox")).rows[0]).toEqual({ n: 3 });
  });
});
