import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260825202830_implement_gtm_core_workflows.sql"),
  "utf8",
).toLowerCase().replace(/\s+/g, " ");

describe("GTM core workflows migration", () => {
  it("adopts the exact maintainable contact pipeline and maps legacy stages", () => {
    for (const stage of [
      "identified", "connected", "engaged", "discovery", "demo_candidate",
      "pilot_candidate", "active_pilot", "converted", "nurture", "not_now",
    ]) expect(migration).toContain(`'${stage}'`);
    expect(migration).toContain("when 'won' then 'converted'");
    expect(migration).toContain("when 'lost' then 'not_now'");
    expect(migration).toContain("alter column pipeline_stage set default 'identified'");
  });

  it("persists follow-up intent through an atomic, invoker-secured interaction logger", () => {
    expect(migration).toContain("add column if not exists follow_up_required boolean not null default false");
    expect(migration).toContain("create or replace function public.log_gtm_interaction_v3(");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("if p_follow_up_required");
    expect(migration).toContain("update public.gtm_contacts contact");
  });

  it("matches only athlete contacts to canonical players without changing Player fields", () => {
    expect(migration).toContain("create or replace function public.match_gtm_contact_player(");
    expect(migration).toContain("contact.contact_type = 'athlete'");
    expect(migration).toContain("from public.players player where player.id = p_player_id");
    expect(migration).toContain("gtm_contact_players_one_verified_idx");
    expect(migration).not.toContain("alter table public.players");
    expect(migration).not.toContain("update public.players");
  });

  it("repairs table-specific child auditing without copying private text", () => {
    expect(migration).toContain("elsif tg_table_name = 'gtm_contact_players' then");
    expect(migration).toContain("elsif tg_table_name = 'gtm_customer_discovery' then");
    expect(migration).not.toContain("new.problem_discussed");
    expect(migration).not.toContain("new.additional_context");
    expect(migration).not.toContain("new.summary");
  });

  it("provides every required metric and straightforward discovery aggregation", () => {
    for (const key of [
      "totalcontacts", "contacttypecounts", "segmentcounts", "tieracontacts",
      "tierbcontacts", "prioritycontacts", "enterprisecontacts", "athletecontacts",
      "multipliercontacts", "activeconversations", "contactsneedingfollowup",
      "discoveryconversations", "democandidates", "pilotcandidates", "activepilots",
      "conversions", "playerlinkedcontacts",
    ]) expect(migration).toContain(`'${key}'`);
    expect(migration).toContain("'problems'");
    expect(migration).toContain("'usecases'");
    expect(migration).toContain("'features'");
    expect(migration).toContain("'pilotintent'");
    expect(migration).toContain("'willingnesstopay'");
    expect(migration).toContain("'objections'");
  });

  it("keeps every public workflow RPC unavailable to anon", () => {
    for (const name of [
      "log_gtm_interaction_v3", "match_gtm_contact_player",
      "update_gtm_contact_v1", "get_gtm_metrics_v1",
    ]) expect(migration).toContain(`revoke all on function public.${name}`);
    expect(migration).not.toMatch(/grant execute on function [^;]+ to anon/);
  });
});
