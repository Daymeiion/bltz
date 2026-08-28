import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    "supabase/migrations/20260825000000_gtm_relationship_intelligence_foundation.sql",
  ),
  "utf8",
).toLowerCase();

const normalized = migration.replace(/\s+/g, " ");
const statements = migration
  .split(";")
  .map((value) => value.replace(/\s+/g, " ").trim())
  .filter(Boolean);

const GTM_TABLES = [
  "gtm_organizations",
  "gtm_contacts",
  "gtm_contact_players",
  "gtm_opportunities",
  "gtm_interactions",
  "gtm_notes",
  "gtm_relationships",
  "gtm_import_jobs",
] as const;

describe("GTM relationship intelligence migration contract", () => {
  it.each(GTM_TABLES)("creates and enables RLS for %s", (table) => {
    expect(normalized).toContain(`create table if not exists public.${table}`);
    expect(normalized).toContain(
      `alter table public.${table} enable row level security`,
    );
  });

  it("reuses canonical players rather than creating athlete identity", () => {
    expect(normalized).toContain(
      "player_id uuid not null references public.players(id) on delete restrict",
    );
    expect(normalized).toContain(
      "constraint gtm_contact_players_contact_player_key unique (contact_id, player_id)",
    );
    expect(normalized).not.toContain("create table if not exists public.gtm_players");
    expect(normalized).not.toMatch(/gtm_contacts[\s\S]*\bgsis_id\b/);
    expect(normalized).not.toMatch(/gtm_contacts[\s\S]*\besb_id\b/);
    expect(normalized).not.toMatch(/gtm_contacts[\s\S]*\bsmart_id\b/);
  });

  it("separates external GTM accounts from canonical tenant identity", () => {
    expect(normalized).toContain(
      "canonical_organization_id uuid unique references public.organizations(id) on delete restrict",
    );
    expect(normalized).toContain("gtm_organizations_identity_source_check");
    expect(normalized).toContain("canonical_organization_id is not null and name is null");
    expect(normalized).toContain("canonical_organization_id is null and char_length(btrim(name))");
    expect(normalized).toContain("gtm_organizations_external_name_key");
    expect(normalized).not.toMatch(/create table if not exists public\.organizations\b/);
    expect(normalized).not.toMatch(/create table if not exists public\.schools\b/);
  });

  it("stores contact classifications, safety, scoring, and follow-up state", () => {
    expect(normalized).toContain(
      "contact_type in ('enterprise', 'athlete', 'multiplier', 'unclassified')",
    );
    expect(normalized).toContain("do_not_automate boolean not null default false");
    expect(normalized).toContain("relationship_strength smallint");
    expect(normalized).toContain("network_leverage smallint");
    expect(normalized).toContain("bltz_relevance smallint");
    expect(normalized).toContain("buying_authority smallint");
    expect(normalized).toContain("timing_score smallint");
    expect(normalized).toContain("priority_model = 'enterprise_v1'");
    expect(normalized).toContain("next_action_at timestamptz");
    expect(normalized).toContain("constraint gtm_contacts_next_action_pair_check");
    expect(normalized).toContain("gtm_contacts_follow_up_idx");
  });

  it("applies only the approved enterprise scoring model", () => {
    expect(normalized).toContain("new.contact_type <> 'enterprise'");
    expect(normalized).toContain("new.relationship_strength * 0.25");
    expect(normalized).toContain("new.bltz_relevance * 0.25");
    expect(normalized).toContain("new.buying_authority * 0.20");
    expect(normalized).toContain("new.network_leverage * 0.15");
    expect(normalized).toContain("new.timing_score * 0.15");
    expect(normalized).toContain("new.priority_model := null");
  });

  it("keeps notes as records and enforces interaction/contact consistency", () => {
    expect(normalized).toContain(
      "'general', 'call', 'meeting', 'linkedin', 'email', 'introduction', 'research', 'personal_context', 'opportunity'",
    );
    expect(normalized).toContain(
      "foreign key (interaction_id, contact_id) references public.gtm_interactions(id, contact_id) on delete restrict",
    );
    expect(normalized).toContain("gtm_notes_contact_recent_idx");
    expect(normalized).not.toContain("notes text" + " not null");
  });

  it("models directed, unique relationship graph edges", () => {
    expect(normalized).toContain("source_contact_id <> target_contact_id");
    expect(normalized).toContain(
      "unique (source_contact_id, target_contact_id, relationship_type)",
    );
    expect(normalized).toContain("directed relationship edges");
  });

  it("uses non-colliding names for multi-column follow-up invariants", () => {
    expect(normalized).toContain("constraint gtm_contacts_next_action_pair_check");
    expect(normalized).toContain("constraint gtm_opportunities_next_step_pair_check");
  });

  it("persists safe import history and idempotency without raw CSV rows", () => {
    expect(normalized).toContain("content_sha256 text not null");
    expect(normalized).toContain("idempotency_key uuid not null unique");
    expect(normalized).toContain("field_mapping jsonb not null");
    expect(normalized).toContain("preview_summary jsonb not null");
    expect(normalized).toContain("rows_created integer not null default 0");
    expect(normalized).toContain("rows_updated integer not null default 0");
    expect(normalized).toContain("rows_duplicated integer not null default 0");
    expect(normalized).toContain("rows_failed integer not null default 0");
    expect(normalized).not.toContain("create table if not exists public.gtm_import_rows");
  });

  it("authorizes browser access only through the active internal-admin predicate", () => {
    for (const table of GTM_TABLES) {
      const policies = statements.filter(
        (statement) =>
          statement.startsWith("create policy") &&
          statement.includes(`on public.${table}`),
      );
      expect(policies.length).toBeGreaterThan(0);
      expect(policies.every((policy) => policy.includes("to authenticated"))).toBe(
        true,
      );
      expect(
        policies.every((policy) =>
          policy.includes("(select public.is_internal_admin())"),
        ),
      ).toBe(true);
    }

    expect(normalized).toContain(
      "from public, anon, authenticated, service_role",
    );
    expect(normalized).not.toMatch(/grant [^;]+ to anon/);
    expect(normalized).not.toContain("profiles.role");
  });

  it("keeps interaction logging atomic and security-invoker scoped", () => {
    expect(normalized).toContain(
      "create or replace function public.log_gtm_interaction(",
    );
    expect(normalized).toContain("returns public.gtm_interactions");
    expect(normalized).toContain("security invoker");
    expect(normalized).toContain("if v_actor is null or not (select public.is_internal_admin())");
    expect(normalized).toContain("insert into public.gtm_interactions");
    expect(normalized).toContain("update public.gtm_contacts");
    expect(normalized).toContain("last_interaction_at = greatest(");
    expect(normalized).toContain("updated_by = v_actor");
  });

  it("preserves provenance and writes immutable contact audit events", () => {
    expect(normalized).toContain("gtm record provenance is immutable");
    expect(normalized).toContain("gtm import provenance is immutable");
    expect(normalized).toContain(
      "create or replace function private.audit_gtm_contact_change()",
    );
    expect(normalized).toContain("security definer");
    expect(normalized).toContain("set search_path = ''");
    expect(normalized).toContain("insert into public.audit_logs");
    expect(normalized).toContain("'gtm.contact.created'");
    expect(normalized).toContain("'gtm.contact.updated'");
    expect(normalized).toContain("'gtm.opportunity.created'");
    expect(normalized).toContain("'gtm.opportunity.updated'");
    expect(normalized).toContain("gtm player verification provenance is immutable");
    expect(normalized).toContain(
      "revoke all on function private.audit_gtm_contact_change() from public, anon, authenticated, service_role",
    );
  });

  it("indexes every foreign key used by first-slice access paths", () => {
    expect(normalized).toContain("gtm_contacts_organization_id_idx");
    expect(normalized).toContain("gtm_contact_players_player_id_idx");
    expect(normalized).toContain("gtm_opportunities_organization_id_idx");
    expect(normalized).toContain("gtm_opportunities_primary_contact_id_idx");
    expect(normalized).toContain("gtm_interactions_contact_recent_idx");
    expect(normalized).toContain("gtm_interactions_organization_recent_idx");
    expect(normalized).toContain("gtm_interactions_opportunity_recent_idx");
    expect(normalized).toContain("gtm_notes_interaction_id_idx");
    expect(normalized).toContain("gtm_relationships_target_contact_id_idx");
  });
});
