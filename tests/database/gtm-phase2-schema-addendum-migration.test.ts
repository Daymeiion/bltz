import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260825165631_extend_gtm_investor_conversation_foundation.sql"),
  "utf8",
).toLowerCase().replace(/\s+/g, " ");

describe("GTM Engine Phase 2 schema addendum", () => {
  it("adds investor to the canonical contact classification", () => {
    expect(migration).toContain("'enterprise', 'athlete', 'multiplier', 'investor', 'unclassified'");
    expect(migration).not.toContain("create table public.gtm_investors");
    expect(migration).not.toContain("create table if not exists public.gtm_investors");
  });

  it("keeps investor context nullable and scoped to investor contacts", () => {
    for (const column of [
      "investor_type", "investor_relationship_stage", "what_they_need_to_see",
      "investor_thesis_feedback", "historical_signal", "future_trigger",
      "prior_outcome", "relationship_source",
    ]) {
      expect(migration).toContain(`add column if not exists ${column} text`);
      expect(migration).not.toContain(`add column if not exists ${column} text not null`);
    }
    expect(migration).toContain("gtm_contacts_investor_fields_scope_check");
    expect(migration).toContain("contact_type = 'investor' or num_nonnulls(");
    expect(migration).toContain("'strategic_corporate_vc'");
    expect(migration).toContain("'family_office'");
    expect(migration).toContain("'milestone_follow_up'");
    expect(migration).toContain("'future_round'");
  });

  it("supports multiple non-binary outcomes on each conversation", () => {
    expect(migration).toContain("add column if not exists outcomes text[] not null default '{}'::text[]");
    expect(migration).toContain("gtm_interactions_outcomes_check");
    for (const outcome of [
      "user_conversion", "pilot_opportunity", "capital", "referral",
      "strategic_insight", "product_validation", "distribution_opportunity",
      "partnership", "future_follow_up", "no_fit",
    ]) expect(migration).toContain(`'${outcome}'`);
    expect(migration).toContain("gtm_interactions_outcomes_gin_idx");
  });

  it("preserves historical and current next-trigger context", () => {
    expect(migration.match(/add column if not exists next_trigger text/g)).toHaveLength(2);
    expect(migration).toContain("contact.next_trigger");
    expect(migration).toContain("nullif(btrim(p_next_trigger), '')");
  });

  it("adds permission-checked invoker RPCs without removing compatible V1 calls", () => {
    expect(migration).toContain("create or replace function public.create_gtm_contact_v2(");
    expect(migration).toContain("create or replace function public.log_gtm_interaction_v2(");
    expect(migration.match(/security invoker/g)).toHaveLength(2);
    expect(migration.match(/if v_actor is null or not \(select public\.is_internal_admin\(\)\)/g)).toHaveLength(2);
    expect(migration).toContain("insert into public.gtm_interactions");
    expect(migration).toContain("update public.gtm_contacts contact set");
    expect(migration).not.toContain("drop function public.create_gtm_contact(");
    expect(migration).not.toContain("drop function public.log_gtm_interaction(");
  });

  it("keeps browser execution explicit and excludes anonymous access", () => {
    expect(migration).toContain("from public, anon, authenticated, service_role");
    expect(migration).toContain("to authenticated, service_role");
    expect(migration).not.toMatch(/grant execute[^;]+to anon/);
  });
});
