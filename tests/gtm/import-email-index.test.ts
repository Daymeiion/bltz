// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const migration = readFileSync("supabase/migrations/20261006033000_index_gtm_import_email_lookup.sql", "utf8");
const indexName = "gtm_contacts_active_email_normalized_idx";
// Exact email lookup used by the current SECURITY DEFINER importer. The fixture
// runs as the table owner, matching its owner context rather than caller RLS.
const lookup = `select min(contact.id::text)::uuid as id, count(*) as matches
  from public.gtm_contacts contact
  where contact.archived = false
    and lower(btrim(contact.email)) = lower(btrim($1))`;
type Plan = { "Node Type"?: string; "Index Name"?: string; Plans?: Plan[] };
function usedIndex(plan: Plan): boolean {
  return plan["Index Name"] === indexName || (plan.Plans ?? []).some(usedIndex);
}

beforeAll(async () => {
  await db.exec(`create table public.gtm_contacts (
    id uuid primary key, email text, archived boolean not null default false
  );
  alter table public.gtm_contacts enable row level security;
  insert into public.gtm_contacts values
    ('10000000-0000-4000-8000-000000000001', ' Shared@Example.invalid ', false),
    ('10000000-0000-4000-8000-000000000002', 'shared@example.invalid', false),
    ('10000000-0000-4000-8000-000000000003', ' SHARED@example.invalid ', true),
    ('10000000-0000-4000-8000-000000000004', null, false),
    ('10000000-0000-4000-8000-000000000005', 'archived@example.invalid', true);
  insert into public.gtm_contacts
    select ('20000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
      'filler-' || n || '@example.invalid', false
    from generate_series(1, 1000) n;`);
  await db.exec(migration);
  await db.exec("analyze public.gtm_contacts");
}, 30_000);

afterAll(async () => db.close());

describe("GTM active normalized email lookup index", () => {
  it("keeps shared emails non-unique and ambiguous after case and space normalization", async () => {
    const result = (await db.query<{ id: string; matches: number }>(lookup, ["  sHaReD@Example.invalid  "])).rows[0];
    expect(result).toEqual({ id: "10000000-0000-4000-8000-000000000001", matches: 2 });
    const index = (await db.query<{ indisunique: boolean; predicate: string }>(
      "select indisunique,pg_get_expr(indpred,indrelid) predicate from pg_index where indexrelid=$1::regclass",
      [`public.${indexName}`],
    )).rows[0];
    expect(index.indisunique).toBe(false);
    expect(index.predicate).toContain("archived = false");
  });

  it("ignores archived-only and absent identities and never matches a null email", async () => {
    for (const email of ["archived@example.invalid", "missing@example.invalid", null]) {
      expect((await db.query<{ id: null; matches: number }>(lookup, [email])).rows[0])
        .toEqual({ id: null, matches: 0 });
    }
    expect((await db.query<{ count: number }>("select count(*) from public.gtm_contacts")).rows[0].count).toBe(1005);
  });

  it("uses the index for the exact importer lookup in the definer-owner context", async () => {
    const role = (await db.query<{ owner: boolean; rls: boolean }>(
      "select relowner=(select oid from pg_roles where rolname=current_user) owner,relrowsecurity rls from pg_class where oid='public.gtm_contacts'::regclass",
    )).rows[0];
    expect(role).toEqual({ owner: true, rls: true });
    const plan = (await db.query<{ "QUERY PLAN": { Plan: Plan }[] }>(`explain(format json) ${lookup}`, [" SHARED@example.invalid "])).rows[0]["QUERY PLAN"][0].Plan;
    expect(usedIndex(plan)).toBe(true);
  });

  it("does not change normalized stored values or shared-email cardinality", async () => {
    const before = (await db.query("select id,email,archived from public.gtm_contacts where id::text like '10000000%' order by id")).rows;
    for (let repeat = 0; repeat < 3; repeat += 1) {
      expect((await db.query<{ matches: number }>(lookup, ["shared@example.invalid"])).rows[0].matches).toBe(2);
    }
    expect((await db.query("select id,email,archived from public.gtm_contacts where id::text like '10000000%' order by id")).rows).toEqual(before);
  });
});
