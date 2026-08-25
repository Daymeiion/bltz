import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("supabase/migrations/20260825045748_gtm_contact_intake.sql"), "utf8").toLowerCase().replace(/\s+/g, " ");

describe("GTM contact intake migration", () => {
  it("creates atomic security-invoker contact and import functions", () => {
    expect(migration).toContain("create or replace function public.create_gtm_contact(");
    expect(migration).toContain("create or replace function public.import_gtm_contacts(");
    expect(migration.match(/security invoker/g)).toHaveLength(2);
    expect(migration.match(/if v_actor is null or not \(select public\.is_internal_admin\(\)\)/g)).toHaveLength(2);
  });

  it("links only canonical players and records verified manual provenance", () => {
    expect(migration).toContain("insert into public.gtm_contact_players");
    expect(migration).toContain("p_contact_type <> 'athlete'");
    expect(migration).toContain("'manual', 1, true, v_actor, now(), v_actor");
    expect(migration).not.toContain("insert into public.players");
  });

  it("uses database-level idempotency and never persists raw CSV", () => {
    expect(migration).toContain("where idempotency_key = p_idempotency_key");
    expect(migration).toContain("on conflict (source, source_record_id) do update");
    expect(migration).toContain("insert into public.gtm_import_jobs");
    expect(migration).not.toContain("raw_csv");
    expect(migration).not.toContain("raw_rows");
  });

  it("preserves manual enrichment and creates only unverified potential Player links", () => {
    expect(migration).toContain("do_not_automate = public.gtm_contacts.do_not_automate or excluded.do_not_automate");
    expect(migration).toContain("coalesce(excluded.current_company, public.gtm_contacts.current_company)");
    expect(migration).toContain("when excluded.contact_type = 'unclassified' then public.gtm_contacts.contact_type");
    expect(migration).toContain("insert into public.gtm_contact_players");
    expect(migration).toContain("'name_only', 0.8000, false, v_actor");
  });

  it("keeps browser execution authenticated and explicitly granted", () => {
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated, service_role");
    expect(migration).not.toMatch(/grant execute[^;]+to anon/);
  });
});
