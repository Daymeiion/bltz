// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Execute the repository's SQL routines against disposable compatible tables.
// Auth predicates and absent surrounding tables are fixtures, not hosted RLS proof.
const db = new PGlite();
const actor = "10000000-0000-4000-8000-000000000001";
const otherActor = "10000000-0000-4000-8000-000000000002";
const player = "30000000-0000-4000-8000-000000000001";
const foundation = readFileSync("supabase/migrations/20260825000000_gtm_relationship_intelligence_foundation.sql", "utf8");
const hardened = readFileSync("supabase/migrations/20260828121000_harden_gtm_contact_import.sql", "utf8");
const current = readFileSync("supabase/migrations/20260828233000_close_gtm_prompt6_p1_gaps.sql", "utf8");

function statement(sql: string, start: string, end: string) {
  const begin = sql.indexOf(start);
  const finish = sql.indexOf(end, begin);
  if (begin < 0 || finish < 0) throw new Error(`SQL fixture statement not found: ${start}`);
  return sql.slice(begin, finish + end.length);
}

function row(status: "possible" | "ambiguous" | "clear" = "possible") {
  return { displayName: `Fixture ${status}`, firstName: "Fixture", lastName: status,
    email: "", linkedinUrl: `https://www.linkedin.com/in/fixture-${status}`, currentCompany: "", currentTitle: "", connectedOn: "",
    sport: "", leagueLevel: "", doNotAutomate: false, sourceRecordId: status === "possible" ? "a".repeat(64) : "b".repeat(64),
    contactType: "unclassified", segment: null, personas: [], classificationSource: "fixture", classificationConfidence: 0.4,
    classificationStatus: "needs_review", classificationReasons: [], relationshipStrength: null, bltzRelevance: null,
    buyingAuthority: null, networkLeverage: null, timingScore: null, priorityScoreExplanation: null,
    playerMasterGsisId: null as string | null, playerId: null as string | null, playerMatchType: null as string | null,
    playerMatchConfidence: null as number | null, playerMatchVerified: false, identityReviewStatus: status,
    identityReviewReason: "Deferred during import; contact preserved without a new Player link for later review" };
}
type Row = ReturnType<typeof row>;
const summary = { valid: 1, invalid: 0, duplicates: 0, playerReviewSha256: "c".repeat(64) };
const mapping = { displayName: "Name", linkedinUrl: "LinkedIn" };

async function digest(rows: Row[]) {
  return (await db.query<{ value: string }>("select public.gtm_import_rows_sha256($1::jsonb) value", [JSON.stringify(rows)])).rows[0].value;
}

async function prepare(rows: Row[], previewSummary = { ...summary, valid: rows.length }) {
  const key = randomUUID();
  await db.query("select public.prepare_gtm_import_job_v2('fixture.csv','linkedin_connections',$1,$2::uuid,$3::jsonb,$4::jsonb,$5::jsonb,$6,0,0,0)",
    ["d".repeat(64), key, JSON.stringify(mapping), JSON.stringify(previewSummary), JSON.stringify(rows), rows.length]);
  return key;
}

async function commit(key: string, rows: Row[], previewSummary = { ...summary, valid: rows.length }) {
  return (await db.query<{ value: { status: string; rows_created: number; rows_failed: number } }>(
    "select row_to_json(public.import_gtm_contacts_v2('fixture.csv',$1,$2::uuid,$3::jsonb,$4::jsonb,$5::jsonb,0,0)) value",
    ["d".repeat(64), key, JSON.stringify(mapping), JSON.stringify(previewSummary), JSON.stringify(rows)])).rows[0].value;
}

beforeAll(async () => {
  await db.exec(`create schema auth;create schema extensions;create schema gtm_private;
    create table auth.users(id uuid primary key);create table public.gtm_organizations(id uuid primary key);
    create table public.players(id uuid primary key);create table public.nfl_players(gsis_id text primary key);
    insert into auth.users values('${actor}'),('${otherActor}');insert into players values('${player}');insert into nfl_players values('fixture-gsis');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('fixture.actor',true),'')::uuid $$;
    create function public.is_internal_admin() returns boolean language sql stable as $$ select coalesce(current_setting('fixture.admin',true),'false')='true' $$;
    create function extensions.digest(value bytea, algorithm text) returns bytea language sql immutable as $$
      select case when algorithm='sha256' then pg_catalog.sha256(value) else null end $$;`);
  for (const table of ["gtm_contacts", "gtm_contact_players", "gtm_import_jobs"]) {
    await db.exec(statement(foundation, `create table if not exists public.${table} (`, "\n);"));
  }
  // Existing later columns required by these routines; no test migration modifies the repository.
  await db.exec(`alter table public.gtm_contacts add column player_master_gsis_id text references nfl_players(gsis_id);
    alter table public.gtm_import_jobs add column rows_sha256 text,add column potential_matches integer default 0,
      add column approved_by uuid references auth.users(id),add column approved_at timestamptz;`);
  await db.exec(current.slice(current.indexOf("alter table public.gtm_contacts"), current.indexOf("create index if not exists gtm_contacts_classification_queue_idx")));
  for (const [source, name] of [[current, "public.gtm_import_rows_sha256"], [hardened, "public.prepare_gtm_import_job_v2"],
    [current, "gtm_private.import_gtm_contacts_v2_impl"], [current, "public.import_gtm_contacts_v2"]]) {
    await db.exec(statement(source, `create or replace function ${name}(`, "\n$$;"));
  }
}, 30_000);

beforeEach(async () => {
  await db.exec(`truncate public.gtm_contact_players,public.gtm_contacts,public.gtm_import_jobs;
    select set_config('fixture.actor','${actor}',false),set_config('fixture.admin','true',false);`);
});
afterAll(async () => db.close());

describe("current GTM SQL preview and deferred import contract", () => {
  it("binds source rows but permits reviewed derived choices and row ordering without changing the digest", async () => {
    const original = [row("possible"), row("ambiguous")];
    const deferred = original.map(item => ({ ...item, identityReviewReason: "Deferred", playerMatchVerified: false }));
    expect(await digest(deferred.reverse())).toBe(await digest(original));
    expect(await digest([{ ...original[0], playerMasterGsisId: "fixture-gsis", playerId: player, playerMatchType: "manual", playerMatchVerified: true }])).toBe(await digest([original[0]]));
    expect(await digest([{ ...original[0], linkedinUrl: "https://www.linkedin.com/in/changed" }])).not.toBe(await digest([original[0]]));
  });

  it("persists possible and ambiguous deferred contacts without a Player Master or canonical Player link", async () => {
    const rows = [row("possible"), row("ambiguous")];
    const result = await commit(await prepare(rows), rows);
    expect(result).toMatchObject({ status: "completed", rows_created: 2, rows_failed: 0 });
    expect((await db.query("select identity_review_status,player_master_gsis_id from public.gtm_contacts order by identity_review_status")).rows).toEqual([
      { identity_review_status: "ambiguous", player_master_gsis_id: null }, { identity_review_status: "possible", player_master_gsis_id: null },
    ]);
    expect((await db.query<{ count: number }>("select count(*)::int count from public.gtm_contact_players")).rows[0].count).toBe(0);
  });

  it("keeps an automatic canonical association unverified with no verification provenance", async () => {
    const automatic = { ...row("clear"), contactType: "athlete", playerMasterGsisId: "fixture-gsis", playerId: player,
      playerMatchType: "name_and_team", playerMatchConfidence: 0.96, playerMatchVerified: false };
    expect(await commit(await prepare([automatic]), [automatic])).toMatchObject({ status: "completed", rows_created: 1, rows_failed: 0 });
    expect((await db.query("select player_id,verified,verified_by,verified_at from public.gtm_contact_players")).rows).toEqual([
      { player_id: player, verified: false, verified_by: null, verified_at: null },
    ]);
  });

  it.each(["source", "review summary", "actor"])("rejects changed %s before pending-job contact writes", async change => {
    const rows = [row()];
    const key = await prepare(rows);
    const changedRows = change === "source" ? [{ ...rows[0], displayName: "Changed identity" }] : rows;
    const changedSummary = change === "review summary" ? { ...summary, playerReviewSha256: "e".repeat(64) } : summary;
    if (change === "actor") await db.query("select set_config('fixture.actor',$1,false)", [otherActor]);
    await expect(commit(key, changedRows, changedSummary)).rejects.toThrow("does not match its approved preview");
    expect((await db.query<{ count: number }>("select count(*)::int count from public.gtm_contacts")).rows[0].count).toBe(0);
    expect((await db.query<{ status: string }>("select status from public.gtm_import_jobs where idempotency_key=$1", [key])).rows[0].status).toBe("preview_ready");
  });

  it("requires an authenticated internal admin to prepare a preview", async () => {
    await db.query("select set_config('fixture.admin','false',false)");
    await expect(prepare([row()])).rejects.toThrow("GTM access denied");
    expect((await db.query<{ count: number }>("select count(*)::int count from public.gtm_import_jobs")).rows[0].count).toBe(0);
  });
});
