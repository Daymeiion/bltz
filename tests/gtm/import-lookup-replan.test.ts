// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Disposable compatible database. Actual repository routines, constraints and
// audit triggers execute; the local Auth transport is not hosted RLS evidence.
const db = new PGlite();
const actor = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const player = "30000000-0000-4000-8000-000000000001";
const sql = (file: string) => readFileSync(`supabase/migrations/${file}`, "utf8").replace(/\r\n/g, "\n");
const foundation = sql("20260825000000_gtm_relationship_intelligence_foundation.sql");
const complete = sql("20260825150037_complete_gtm_foundation_v1.sql");
const workflow = sql("20260825202830_implement_gtm_core_workflows.sql");
const phase2 = sql("20260818000001_phase2_tenant_authorization_foundation.sql");
const authCurrent = sql("20260818000002_phase2_legacy_admin_super_admin_transition.sql");
const current = sql("20260828233000_close_gtm_prompt6_p1_gaps.sql");
const migration = sql("20261006043000_replan_gtm_import_identity_lookups.sql");
const signature = "gtm_private.import_gtm_contacts_v2_impl(text,text,uuid,jsonb,jsonb,jsonb,integer,integer)";
function statement(text: string, start: string, end: string) {
  const a = text.indexOf(start), b = text.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error(`Missing fixture statement: ${start}`);
  return text.slice(a, b + end.length);
}
const func = (text: string, name: string) => statement(text, `create or replace function ${name}(`, "\n$$;");
const trigger = (text: string, name: string) => statement(text, `create or replace trigger ${name}`, ";");
const baseline = func(current, "gtm_private.import_gtm_contacts_v2_impl");
const normalizedBody = (definition: string) => definition.slice(definition.indexOf("as $$") + 5, definition.lastIndexOf("$$;")).trim().replace(/\s+/g, " ");
const bodyMd5 = (definition: string) => createHash("md5").update(normalizedBody(definition)).digest("hex");

function row(index = 0) {
  return { displayName: `Disposable import fixture ${index}`, firstName: "Disposable", lastName: `Fixture ${index}`,
    email: `fixture-${index}@example.invalid`, linkedinUrl: `https://www.linkedin.com/in/disposable-fixture-${index}`,
    currentCompany: "", currentTitle: "", connectedOn: "", sport: "", leagueLevel: "", doNotAutomate: false,
    sourceRecordId: String(index).padStart(64, "0"), contactType: "unclassified", segment: null, personas: [] as string[],
    classificationSource: "fixture", classificationConfidence: 0.4, classificationStatus: "needs_review", classificationReasons: [] as string[],
    relationshipStrength: null, bltzRelevance: null, buyingAuthority: null, networkLeverage: null, timingScore: null,
    priorityScoreExplanation: null, playerMasterGsisId: null, playerId: null, playerMatchType: null,
    playerMatchConfidence: null, playerMatchVerified: false, identityReviewStatus: "clear", identityReviewReason: null as string | null };
}
type Row = ReturnType<typeof row>;
const mapping = { displayName: "Name", linkedinUrl: "LinkedIn", email: "Email" };
const summary = (rows: Row[], invalid = 0) => ({ valid: rows.length, invalid, duplicates: 0, playerReviewSha256: "c".repeat(64) });
async function prepare(rows: Row[], invalid = 0) {
  const key = randomUUID();
  await db.query("select public.prepare_gtm_import_job_v2('fixture.csv','linkedin_connections',$1,$2::uuid,$3::jsonb,$4::jsonb,$5::jsonb,$6,0,$7,$8)",
    ["d".repeat(64), key, JSON.stringify(mapping), JSON.stringify(summary(rows, invalid)), JSON.stringify(rows), rows.length + invalid, invalid, rows.filter(r => r.identityReviewStatus !== "clear").length]);
  return key;
}
async function commit(key: string, rows: Row[], invalid = 0) {
  return (await db.query<{ value: { id: string; status: string; rows_created: number; rows_updated: number; rows_failed: number } }>(
    "select row_to_json(public.import_gtm_contacts_v2('fixture.csv',$1,$2::uuid,$3::jsonb,$4::jsonb,$5::jsonb,0,$6)) value",
    ["d".repeat(64), key, JSON.stringify(mapping), JSON.stringify(summary(rows, invalid)), JSON.stringify(rows), invalid])).rows[0].value;
}
async function count(table: string) { return (await db.query<{ n: number }>(`select count(*)::int n from public.${table}`)).rows[0].n; }
async function seed(values: { id: string; email?: string | null; linkedin?: string | null; source?: string; record?: string | null; archived?: boolean }) {
  await db.query("insert into public.gtm_contacts(id,display_name,email,linkedin_url,source,source_record_id,archived,created_by) values($1,'Existing fixture',$2,$3,$4,$5,$6,$7)",
    [values.id, values.email ?? null, values.linkedin ?? null, values.source ?? "manual", values.record ?? values.id, values.archived ?? false, actor]);
}
let attributes: unknown;
const metadata = async () => (await db.query("select oid,proowner,proacl,prolang,provolatile,prosecdef,proisstrict,prorettype,proargtypes::text,proargnames,proconfig,procost,prorows from pg_proc where oid=$1::regprocedure", [signature])).rows[0];

beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema private;create schema extensions;
    grant usage on schema auth,extensions to authenticated,service_role;
    create table auth.users(id uuid primary key);insert into auth.users values('${actor}'),('${other}');
    create table public.organizations(id uuid primary key);create table public.schools(id uuid primary key);
    create table public.players(id uuid primary key,gsis_id text);insert into players values('${player}','fixture-gsis');
    create table public.nfl_players(gsis_id text primary key,display_name text,college_name text,latest_team text,position text,status text);
    create table public.platform_role_assignments(user_id uuid,role text,revoked_at timestamptz);
    insert into platform_role_assignments values('${actor}','super_admin',null);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('fixture.actor',true),'')::uuid$$;
    create function extensions.digest(value bytea,algorithm text) returns bytea language sql immutable as $$select case when algorithm='sha256' then pg_catalog.sha256(value) else null end$$;
    create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;`);
  await db.exec(func(phase2, "private.has_active_platform_role"));
  await db.exec(func(authCurrent, "public.is_internal_admin"));
  for (const table of ["gtm_organizations", "gtm_contacts", "gtm_contact_players", "gtm_opportunities", "gtm_interactions", "gtm_notes", "gtm_import_jobs"]) {
    await db.exec(statement(foundation, `create table if not exists public.${table} (`, "\n);"));
  }
  await db.exec(statement(phase2, "create table if not exists public.audit_logs (", "\n);"));
  await db.exec(complete.slice(complete.indexOf("alter table public.gtm_contact_players"), complete.indexOf("alter table public.gtm_notes")));
  await db.exec(workflow.slice(workflow.indexOf("alter table public.gtm_contacts"), workflow.indexOf("-- Follow-up intent")));
  await db.exec(statement(complete, "create table if not exists public.gtm_customer_discovery (", "\n);"));
  await db.exec(sql("20260828120000_gtm_player_prospect_references.sql"));
  for (const name of ["private.protect_gtm_record_provenance", "private.stamp_gtm_updated_by", "private.enforce_gtm_player_verification_actor", "private.protect_gtm_import_provenance", "private.audit_gtm_contact_change"]) await db.exec(func(foundation, name));
  await db.exec(func(workflow, "private.audit_gtm_foundation_child_change"));
  await db.exec(func(phase2, "private.enforce_append_only_audit_log"));
  for (const name of ["gtm_contacts_protect_provenance", "gtm_contacts_stamp_updated_by", "gtm_contact_players_protect_provenance", "gtm_contact_players_enforce_verification_actor", "gtm_import_jobs_protect_provenance", "gtm_contacts_write_audit"]) await db.exec(trigger(foundation, name));
  for (const name of ["gtm_import_jobs_write_audit", "gtm_contact_players_write_audit"]) await db.exec(trigger(complete, name));
  await db.exec(trigger(phase2, "audit_logs_enforce_append_only"));
  for (const table of ["gtm_contacts", "gtm_import_jobs", "gtm_contact_players"]) {
    await db.exec(`alter table public.${table} enable row level security;grant select,insert,update on public.${table} to authenticated;
      create policy fixture_select on public.${table} for select to authenticated using(public.is_internal_admin());
      create policy fixture_insert on public.${table} for insert to authenticated with check(public.is_internal_admin());
      create policy fixture_update on public.${table} for update to authenticated using(public.is_internal_admin()) with check(public.is_internal_admin());`);
  }
  await db.exec("grant select on public.players,public.nfl_players to authenticated");
  await db.exec(sql("20260828121000_harden_gtm_contact_import.sql"));
  await db.exec(sql("20260828215242_promote_player_prospects_to_gtm_contacts.sql"));
  await db.exec(current);
  await db.exec(sql("20260911210051_simplify_gtm_contact_pipeline.sql"));
  for (const text of [foundation, workflow]) for (const match of text.matchAll(/create\s+(?:unique\s+)?index\s+if\s+not\s+exists\s+[\s\S]*?;/ig)) {
    if (/on\s+public\.gtm_contacts\s*\(/i.test(match[0])) await db.exec(match[0]);
  }
  await db.exec(sql("20261006033000_index_gtm_import_email_lookup.sql"));
  attributes = await metadata();
  await db.exec(migration);
}, 30_000);
beforeEach(async () => {
  // Reset only disposable in-memory test tables, never a hosted database.
  await db.exec(`reset role;truncate public.gtm_contact_players,public.gtm_contacts,public.gtm_import_jobs,public.audit_logs cascade;
    select set_config('fixture.actor','${actor}',false);`);
});
afterAll(async () => db.close());

describe("GTM importer narrowly re-plans changing identity lookups", () => {
  it("preserves function identity, owner, ACLs, signature and security attributes", async () => {
    expect(await metadata()).toEqual(attributes);
    expect(bodyMd5(baseline)).toBe("c17054ebf22e4acd185df3d9003b5052");
    expect(bodyMd5(func(migration, "gtm_private.import_gtm_contacts_v2_impl"))).toBe("b2fd020687b8b21c268c1d40578d222e");
    expect((await db.query<{ allowed: boolean }>("select has_function_privilege('anon',$1,'EXECUTE') allowed", [signature])).rows[0].allowed).toBe(false);
  });

  it("fails closed on a changed body and on a missing or changed reviewed email index", async () => {
    await expect(db.exec(migration)).rejects.toThrow("baseline changed");
    await db.exec("begin");await db.exec(baseline);
    await db.exec("drop index public.gtm_contacts_active_email_normalized_idx");
    await expect(db.exec(migration)).rejects.toThrow("index is missing or changed");await db.exec("rollback");
    await db.exec("begin");await db.exec(baseline);
    await db.exec("drop index public.gtm_contacts_active_email_normalized_idx;create unique index gtm_contacts_active_email_normalized_idx on public.gtm_contacts(lower(btrim(email))) where archived=false");
    await expect(db.exec(migration)).rejects.toThrow("index is missing or changed");await db.exec("rollback");
    expect(await metadata()).toEqual(attributes);
  });

  it("binds quote and SQL injection strings as values for all three lookup keys", async () => {
    const poison = "x' OR true; DROP TABLE public.players; --";
    const original = { ...row(), email: poison, linkedinUrl: `https://www.linkedin.com/in/${poison}`, sourceRecordId: poison };
    await db.exec("set role authenticated");
    expect(await commit(await prepare([original]), [original])).toMatchObject({ rows_created: 1, rows_updated: 0, rows_failed: 0 });
    expect(await commit(await prepare([original]), [original])).toMatchObject({ rows_created: 0, rows_updated: 1, rows_failed: 0 });
    await db.exec("reset role");expect(await count("players")).toBe(1);expect(await count("gtm_contacts")).toBe(1);
  });

  it("preserves normalized shared-email ambiguity and does not collapse duplicate identities", async () => {
    const first = randomUUID(), second = randomUUID();
    await seed({ id: first, email: " Shared@example.invalid " });await seed({ id: second, email: "shared@example.invalid" });
    const input = { ...row(), email: "SHARED@example.invalid", linkedinUrl: "" };
    const before = (await db.query("select id,email from gtm_contacts order by id")).rows;
    expect(await commit(await prepare([input]), [input])).toMatchObject({ rows_created: 0, rows_updated: 0, rows_failed: 1 });
    expect((await db.query("select id,email from gtm_contacts order by id")).rows).toEqual(before);
  });

  it("ignores archived email and LinkedIn matches while retaining the original source-record scope", async () => {
    const input = row();await seed({ id: randomUUID(), email: input.email, linkedin: input.linkedinUrl, archived: true });
    expect(await commit(await prepare([input]), [input])).toMatchObject({ rows_created: 1, rows_updated: 0, rows_failed: 0 });
    await db.exec("truncate gtm_contacts,gtm_contact_players cascade");
    await seed({ id: randomUUID(), source: "contacts_csv", record: input.sourceRecordId, archived: true });
    expect(await commit(await prepare([input]), [input])).toMatchObject({ rows_created: 0, rows_updated: 1, rows_failed: 0 });
    expect((await db.query<{ archived: boolean }>("select archived from gtm_contacts")).rows[0].archived).toBe(true);
  });

  it("rejects conflicting LinkedIn, email and source signals without mutating any candidate", async () => {
    const input = row();await seed({ id: randomUUID(), linkedin: input.linkedinUrl });
    await seed({ id: randomUUID(), email: input.email });await seed({ id: randomUUID(), source: "contacts_csv", record: input.sourceRecordId });
    const before = (await db.query("select id,email,linkedin_url,source_record_id,updated_at from gtm_contacts order by id")).rows;
    expect(await commit(await prepare([input]), [input])).toMatchObject({ rows_created: 0, rows_updated: 0, rows_failed: 1 });
    expect((await db.query("select id,email,linkedin_url,source_record_id,updated_at from gtm_contacts order by id")).rows).toEqual(before);
  });

  it("treats absent, null and empty lookup keys as absent instead of matching other contacts", async () => {
    const rows = [0, 1, 2].map(i => ({ ...row(i), email: "", linkedinUrl: "", sourceRecordId: "" }));
    delete (rows[0] as Partial<Row>).email;delete (rows[0] as Partial<Row>).linkedinUrl;delete (rows[0] as Partial<Row>).sourceRecordId;
    Object.assign(rows[1], { email: null, linkedinUrl: null, sourceRecordId: null });
    // Null/missing source identities still fail the existing provenance check;
    // an empty non-null source key retains its existing behavior.
    expect(await commit(await prepare(rows), rows)).toMatchObject({ rows_created: 1, rows_updated: 0, rows_failed: 2 });
    expect(await count("gtm_contacts")).toBe(1);
  });

  it("preserves manual fields and classification on an identity update", async () => {
    const input = row(), id = randomUUID();await seed({ id, email: input.email });
    await db.query("update gtm_contacts set display_name='Reviewed name',current_company='Reviewed company',manual_field_locks=array['display_name','current_company'],classification_locked=true,classification_source='manual_admin',classification_status='manual_verified' where id=$1", [id]);
    expect(await commit(await prepare([input]), [input])).toMatchObject({ rows_created: 0, rows_updated: 1, rows_failed: 0 });
    expect((await db.query("select display_name,current_company,classification_locked,classification_source,classification_status from gtm_contacts where id=$1", [id])).rows[0])
      .toEqual({ display_name: "Reviewed name", current_company: "Reviewed company", classification_locked: true, classification_source: "manual_admin", classification_status: "manual_verified" });
  });

  it("preserves preview guards and denies an actor without an assigned platform role", async () => {
    const rows = [row()], key = await prepare(rows);
    await expect(commit(key, [{ ...rows[0], displayName: "Changed source" }])).rejects.toThrow("does not match its approved preview");
    await db.query("select set_config('fixture.actor',$1,false)", [other]);await db.exec("set role authenticated");
    await expect(commit(key, rows)).rejects.toThrow("GTM access denied");await db.exec("reset role");
    expect(await count("gtm_contacts")).toBe(0);expect((await db.query<{ status: string }>("select status from gtm_import_jobs")).rows[0].status).toBe("preview_ready");
  });

  it("commits an audited6100-row batch from analyzed-empty state and replays the same receipt without writes", async () => {
    await db.exec("analyze public.gtm_contacts;discard plans");
    expect((await db.query("select reltuples,relpages from pg_class where oid='public.gtm_contacts'::regclass")).rows[0]).toEqual({ reltuples: 0, relpages: 0 });
    const rows = Array.from({ length: 6100 }, (_, i) => ({ ...row(i), identityReviewStatus: i < 464 ? "possible" : i < 544 ? "ambiguous" : "clear", identityReviewReason: i < 544 ? "Explicitly deferred fixture identity" : null }));
    await db.exec("set role authenticated");const key = await prepare(rows, 278);
    const start = performance.now(), receipt = await commit(key, rows, 278), elapsedMs = performance.now() - start;
    expect(receipt).toMatchObject({ status: "completed_with_errors", rows_created: 6100, rows_updated: 0, rows_failed: 278 });
    await db.exec("reset role");expect(await count("gtm_contacts")).toBe(6100);expect(await count("gtm_contact_players")).toBe(0);expect(await count("players")).toBe(1);
    expect((await db.query("select identity_review_status,count(*)::int n from gtm_contacts group by identity_review_status order by identity_review_status")).rows)
      .toEqual([{ identity_review_status: "ambiguous", n: 80 }, { identity_review_status: "clear", n: 5556 }, { identity_review_status: "possible", n: 464 }]);
    expect((await db.query<{ n: number }>("select count(*)::int n from audit_logs where action='gtm.contact.created'")).rows[0].n).toBe(6100);
    const before = { contacts: await count("gtm_contacts"), jobs: await count("gtm_import_jobs"), audits: await count("audit_logs") };
    await db.exec("set role authenticated");expect(await commit(key, rows, 278)).toEqual(receipt);await db.exec("reset role");
    expect({ contacts: await count("gtm_contacts"), jobs: await count("gtm_import_jobs"), audits: await count("audit_logs") }).toEqual(before);
    console.log(JSON.stringify({ disposableLocalOnly: true, importerRows: 6100, excluded: 278, newContactAudits: 6100, elapsedMs: Math.round(elapsedMs), hostedTimeoutProof: false }));
  }, 60_000);
});
