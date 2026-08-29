import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260828215242_promote_player_prospects_to_gtm_contacts.sql",
  "utf8",
).toLowerCase();
const normalized = migration.replace(/\s+/g, " ");

describe("Player Master prospect promotion migration", () => {
  it("references canonical Player Master identity without copying its fields", () => {
    expect(normalized).toContain(
      "player_master_gsis_id text references public.nfl_players(gsis_id)",
    );
    expect(normalized).toContain("gtm_contacts_identity_reference_check");
    expect(normalized).toContain("new.display_name := null");
    expect(normalized).toContain("new.first_name := null");
    expect(normalized).toContain("new.last_name := null");
    expect(normalized).not.toContain("prospect.display_name");
    expect(normalized).not.toContain("prospect.college_name");
    expect(normalized).not.toContain("prospect.latest_team");
  });

  it("promotes only explicitly selected active prospects and prevents duplicates", () => {
    expect(normalized).toContain("public.promote_gtm_player_prospects");
    expect(normalized).toContain("public.is_internal_admin()");
    expect(normalized).toContain("prospect.archived = false");
    expect(normalized).toContain("v_selected_count <> v_requested_count");
    expect(normalized).toContain("gtm_contacts_player_master_gsis_id_key");
    expect(normalized).toContain(
      "on conflict (player_master_gsis_id) where player_master_gsis_id is not null do nothing",
    );
  });

  it("verifies exact stable Player matches and preserves private authorization", () => {
    expect(normalized).toContain("player.gsis_id = contact.player_master_gsis_id");
    expect(normalized).toContain("'stable_identifier'");
    expect(normalized).toContain("verified_by");
    expect(normalized).toContain(
      "revoke all on function public.promote_gtm_player_prospects(text[]) from public, anon, authenticated, service_role",
    );
    expect(normalized).toContain(
      "grant execute on function public.promote_gtm_player_prospects(text[]) to authenticated, service_role",
    );
    expect(normalized).toContain("security invoker");
    expect(normalized).toContain("set search_path = ''");
  });
});
