import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260828233000_close_gtm_prompt6_p1_gaps.sql",
  "utf8",
);

describe("Prompt 6 P1 GTM hardening migration", () => {
  it("stores classification provenance, confidence, review state, personas, and manual locks", () => {
    for (const column of [
      "classification_source", "classification_confidence",
      "classification_status", "classification_locked",
      "classification_reasons", "personas", "manual_field_locks",
      "identity_review_status", "priority_score_explanation",
    ]) expect(migration).toContain(column);
    expect(migration).toContain("'auto_classified', 'manual_verified', 'needs_review', 'unclassified'");
  });

  it("matches through stable Player Master identities without copying Player fields", () => {
    expect(migration).toContain("from public.nfl_players master");
    expect(migration).toContain("where player.gsis_id = master.gsis_id");
    expect(migration).toContain("regexp_replace(lower(master.display_name)");
    expect(migration).toContain("player_master_gsis_id");
    expect(migration).not.toMatch(/insert into public\.players/i);
    expect(migration).not.toMatch(/insert into public\.nfl_players/i);
  });

  it("preserves founder-locked fields and never replaces relationship strength", () => {
    expect(migration).toContain("'display_name' = any(v_locks)");
    expect(migration).toContain("'current_company' = any(v_locks)");
    expect(migration).toContain("contact.classification_locked");
    expect(migration).toContain("coalesce(contact.relationship_strength");
    expect(migration).toContain("mark_gtm_contact_manual_verification");
    expect(migration).toContain("from unnest(p_fields)");
    expect(migration).toContain("classification_locked = 'contact_type' = any(p_fields)");
  });

  it("keeps privileged implementations private and wrappers authorization checked", () => {
    expect(migration).toContain("create or replace function gtm_private.import_gtm_contacts_v2_impl");
    expect(migration).toContain("security definer");
    expect(migration).toContain("v_actor is null or not (select public.is_internal_admin())");
    expect(migration).toContain("revoke all on function public.import_gtm_contacts_v2");
    expect(migration).toContain("grant execute on function public.import_gtm_contacts_v2");
  });

  it("adds internal-only network metrics and review indexes", () => {
    expect(migration).toContain("get_gtm_network_metrics_v1");
    expect(migration).toContain("autoClassifiedContacts");
    expect(migration).toContain("manuallyVerifiedContacts");
    expect(migration).toContain("gtm_contacts_classification_queue_idx");
    expect(migration).toContain("gtm_contacts_identity_review_queue_idx");
    expect(migration).toContain("identity_review_status in ('possible', 'ambiguous')");
  });
});
