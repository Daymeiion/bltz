// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migration = fs.readFileSync(path.resolve("supabase/migrations/20260930181840_intelligence_graph_foundation.sql"), "utf8");
const reviewMigration = fs.readFileSync(path.resolve("supabase/migrations/20261001035756_intelligence_source_review.sql"), "utf8");
const source = "00000000-0000-4000-8000-000000000001";
const otherSource = "00000000-0000-4000-8000-000000000002";
const player = "00000000-0000-4000-8000-000000000003";
const moment = "00000000-0000-4000-8000-000000000004";
const ingestion = "00000000-0000-4000-8000-000000000005";
const db = new PGlite();

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema private; revoke all on schema private from public, anon, authenticated;
    alter default privileges in schema public grant all on tables to service_role;
    create table public.players(id uuid primary key);
    create table public.sports_events(id uuid primary key);
    insert into public.players values ('${player}');`);
  await db.exec(migration);
  await db.exec(reviewMigration);
  await db.exec(`insert into intelligence_sources(id,source_key,name,provider) values
    ('${source}','archive','Institution archive','archive'),('${otherSource}','other','Other source','web');
    insert into intelligence_ingestions(id,source_id,namespace,external_id,fetched_at,normalizer_version,idempotency_key,raw_payload)
    values('${ingestion}','${source}','football:college','external-athlete','2026-09-30T00:00:00Z','v1','one','{"observed":42}');
    insert into moments(id,title,occurred_on,occurred_year,date_precision,status,confidence)
    values('${moment}','Documented performance','2006-10-01',2006,'day','verified',1);
    insert into moment_athletes(moment_id,player_id,relationship_type,status,confidence)
    values('${moment}','${player}','participant','verified',1);
    insert into intelligence_evidence(player_id,moment_id,source_id,ingestion_id,fact_type,statement,confidence,status)
    values('${player}','${moment}','${source}','${ingestion}','performance','Archive documents 42 points',1,'verified');`);
}, 30000);
afterAll(async () => { await db.close(); });

describe("Intelligence graph SQL integration", () => {
  it("joins canonical athlete → Moment → evidence → imported source", async () => {
    const rows = (await db.query(`select p.id,s.provider,e.statement,i.external_id
      from players p join moment_athletes ma on ma.player_id=p.id
      join moments m on m.id=ma.moment_id join intelligence_evidence e on e.moment_id=m.id and e.player_id=p.id
      join intelligence_sources s on s.id=e.source_id join intelligence_ingestions i on i.id=e.ingestion_id`)).rows;
    expect(rows).toEqual([{id:player,provider:"archive",statement:"Archive documents 42 points",external_id:"external-athlete"}]);
  });

  it("rejects false precision, invalid confidence, duplicates and orphan relationships", async () => {
    await expect(db.exec("insert into moments(title,date_precision,occurred_on) values('Missing year','day','2006-10-01')")).rejects.toThrow();
    await expect(db.exec("insert into moments(title,date_precision,occurred_on,occurred_year) values('False precision','year','2006-01-01',2006)")).rejects.toThrow();
    await expect(db.exec("insert into moments(title,confidence) values('Invalid confidence',1.1)")).rejects.toThrow();
    await expect(db.exec("insert into moments(title,confidence) values('NaN confidence','NaN'::numeric)")).rejects.toThrow();
    await expect(db.exec("insert into moments(title,confidence) values('Infinite confidence','Infinity'::numeric)")).rejects.toThrow();
    await expect(db.exec(`insert into moment_athletes(moment_id,player_id,relationship_type) values('${moment}','${player}','participant')`)).rejects.toThrow();
    await expect(db.exec(`insert into moment_athletes(moment_id,player_id,relationship_type) values('${moment}','00000000-0000-4000-8000-000000000099','participant')`)).rejects.toThrow();
  });

  it("retains year-only uncertainty without inventing a date", async () => {
    await db.exec("insert into moments(title,date_precision,occurred_year) values('Year-only award','year',2001)");
    const row = (await db.query("select occurred_on,status,confidence from moments where title='Year-only award'")).rows[0];
    expect(row).toEqual({occurred_on:null,status:"candidate",confidence:null});
  });

  it("enforces matching source provenance and immutable raw ingestion", async () => {
    await expect(db.exec(`insert into intelligence_evidence(player_id,source_id,ingestion_id,fact_type,statement)
      values('${player}','${otherSource}','${ingestion}','identity','Wrong source')`)).rejects.toThrow();
    await expect(db.exec(`update intelligence_ingestions set raw_payload='{}' where id='${ingestion}'`)).rejects.toThrow("ingestion provenance is immutable");
    await expect(db.exec(`update intelligence_ingestions set source_id='${otherSource}' where id='${ingestion}'`)).rejects.toThrow("ingestion provenance is immutable");
    await db.exec(`update intelligence_ingestions set normalization_status='needs_review' where id='${ingestion}'`);
  });

  it("rejects evidence for unrelated athletes and association identity rewrites", async () => {
    const unrelated = '00000000-0000-4000-8000-000000000098';
    await db.exec(`insert into players values('${unrelated}')`);
    await expect(db.exec(`insert into intelligence_evidence(player_id,moment_id,source_id,fact_type,statement)
      values('${unrelated}','${moment}','${source}','performance','Unrelated athlete')`)).rejects.toThrow("evidence requires explicit moment athlete association");
    await expect(db.exec(`update moment_athletes set player_id='${unrelated}' where moment_id='${moment}'`)).rejects.toThrow("moment athlete identity is immutable");
    await expect(db.exec(`update intelligence_evidence set player_id='${unrelated}' where moment_id='${moment}'`)).rejects.toThrow("evidence requires explicit moment athlete association");
  });

  it("blocks every browser role from reading or writing graph and raw payloads", async () => {
    const tables = ["intelligence_sources", "intelligence_ingestions", "moments", "moment_athletes", "intelligence_evidence"];
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      try {
        for (const table of tables) {
          await expect(db.query(`select * from ${table}`)).rejects.toThrow(/permission denied/);
          await expect(db.exec(`delete from ${table}`)).rejects.toThrow(/permission denied/);
          await expect(db.exec(`update ${table} set updated_at=now()`)).rejects.toThrow(/permission denied/);
          await expect(db.exec(`insert into ${table} default values`)).rejects.toThrow(/permission denied/);
        }
        await expect(db.exec("insert into moments(title) values('Unauthorized')")).rejects.toThrow(/permission denied/);
      } finally { await db.exec("reset role"); }
    }
    const rls = (await db.query<{relrowsecurity:boolean}>("select relrowsecurity from pg_class where relname='intelligence_ingestions'")).rows[0];
    expect(rls.relrowsecurity).toBe(true);
  });

  it("permits service insert/read/update with no delete privilege", async () => {
    // Supabase service_role bypasses RLS; role assignment in the harness mirrors that infrastructure setting.
    await db.exec("alter role service_role bypassrls; set role service_role");
    try {
      await db.exec("insert into moments(title) values('Service-owned candidate')");
      expect((await db.query("select * from moments where title='Service-owned candidate'")).rows).toHaveLength(1);
      await db.exec("update moments set status='rejected' where title='Service-owned candidate'");
      await expect(db.exec("delete from moments where title='Service-owned candidate'")).rejects.toThrow(/permission denied/);
    } finally { await db.exec("reset role"); }
  });

  it("does not rewrite cohort identity, provider mappings, public media or onboarding", () => {
    expect(migration).not.toMatch(/(?:alter|update|delete from)\s+(?:table\s+)?public\.(?:players|player_external_ids|player_stat_ingestions|preview_lockers|player_lockers|media|videos)\b/i);
    expect(migration).not.toMatch(/create table public\.(?:athletes|rights_records|campaigns|revenue_records|intelligence_signals|intelligence_opportunities)/i);
  });
});
