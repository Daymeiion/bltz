import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260825150037_complete_gtm_foundation_v1.sql"),
  "utf8",
).toLowerCase().replace(/\s+/g, " ");

describe("GTM Foundation V1 completion migration", () => {
  it("creates structured discovery with nullable unknown answers", () => {
    expect(migration).toContain("create table if not exists public.gtm_customer_discovery");
    expect(migration).toContain("contact_id uuid not null references public.gtm_contacts(id)");
    expect(migration).toContain("interaction_id uuid");
    expect(migration).toContain("organization_id uuid references public.gtm_organizations(id)");
    expect(migration).toContain("would_use boolean");
    expect(migration).toContain("would_pilot boolean");
    expect(migration).toContain("would_pay boolean");
    expect(migration).toContain("pain_level is null or pain_level between 1 and 5");
    expect(migration).toContain("gtm_customer_discovery_has_finding_check");
    expect(migration).not.toContain("would_pay boolean not null");
  });

  it("extends V1 records without duplicating canonical entities", () => {
    expect(migration).toContain("alter table public.gtm_contact_players add column if not exists updated_at");
    expect(migration).toContain("alter table public.gtm_interactions add column if not exists updated_at");
    expect(migration).toContain("'opportunity', 'discovery'");
    expect(migration).not.toContain("create table if not exists public.gtm_players");
    expect(migration).not.toContain("create table if not exists public.gtm_schools");
    expect(migration).not.toContain("create table if not exists public.gtm_teams");
  });

  it("persists preview and explicit approval before commit", () => {
    expect(migration).toContain("create or replace function public.prepare_gtm_import_job(");
    expect(migration).toContain("'preview_ready'");
    expect(migration).toContain("approved_by uuid");
    expect(migration).toContain("approved_at timestamptz");
    expect(migration).toContain("potential_matches integer");
    expect(migration).toContain("if not found or p_duplicate_count < 0");
    expect(migration).toContain("v_job.status <> 'preview_ready'");
    expect(migration).toContain("approved_by = v_actor, approved_at = now()");
    expect(migration).not.toContain("raw_csv");
    expect(migration).not.toContain("raw_rows");
  });

  it("deduplicates by strong signals and never by name", () => {
    const functionStart = migration.indexOf("create or replace function public.import_gtm_contacts(");
    const functionEnd = migration.indexOf("-- signature is unchanged", functionStart);
    const importer = migration.slice(functionStart, functionEnd);
    const matching = importer.slice(importer.indexOf("if nullif(v_row->>'linkedinurl'"), importer.indexOf("v_contact_id := coalesce"));
    expect(importer.indexOf("linkedin_url")).toBeLessThan(importer.indexOf("lower(btrim(contact.email))"));
    expect(importer.indexOf("lower(btrim(contact.email))")).toBeLessThan(importer.indexOf("contact.source_record_id"));
    expect(matching).not.toContain("display_name");
    expect(matching).not.toContain("first_name");
    expect(matching).not.toContain("last_name");
  });

  it("keeps discovery and metrics behind internal-admin RLS and RPC checks", () => {
    expect(migration).toContain("alter table public.gtm_customer_discovery enable row level security");
    expect(migration).toContain("on public.gtm_customer_discovery for select to authenticated");
    expect(migration).toContain("(select public.is_internal_admin())");
    expect(migration).toContain("create or replace function public.get_gtm_foundation_metrics(");
    expect(migration).toContain("if (select auth.uid()) is null or not (select public.is_internal_admin())");
    expect(migration).not.toMatch(/grant [^;]+ to anon/);
  });

  it("audits private child records without copying their freeform text", () => {
    const auditStart = migration.indexOf("create or replace function private.audit_gtm_foundation_child_change()");
    const auditEnd = migration.indexOf("create or replace trigger gtm_notes_write_audit", auditStart);
    const audit = migration.slice(auditStart, auditEnd);
    expect(audit).toContain("insert into public.audit_logs");
    expect(audit).toContain("set search_path = ''");
    expect(audit).not.toContain("new.body");
    expect(audit).not.toContain("new.summary");
    expect(audit).not.toContain("new.problem_discussed");
    expect(audit).not.toContain("new.additional_context");
  });
});
