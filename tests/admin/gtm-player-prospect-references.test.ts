import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseGtmPlayerProspectFilters } from "@/lib/gtm/player-prospect-contract";

describe("reference-only GTM Player prospects", () => {
  it("keeps Player Master identity canonical", () => {
    const migration = readFileSync("supabase/migrations/20260828120000_gtm_player_prospect_references.sql", "utf8");
    const action = readFileSync("app/admin/gtm/players/actions.ts", "utf8");

    expect(migration).toContain("references public.nfl_players(gsis_id)");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("public.is_internal_admin()");
    expect(migration).not.toContain("insert into public.gtm_contacts");
    expect(action).toContain('.from("gtm_player_prospects")');
    expect(action).not.toContain("display_name");
    expect(action).not.toContain("first_name");
    expect(action).not.toContain("last_name");
  });

  it("sanitizes raw PostgREST OR-filter syntax while preserving useful search", () => {
    const filters = parseGtmPlayerProspectFilters({
      search: "O'Neal,).or(id.eq.anything",
      college: "California (Berkeley)",
      page: "2",
    });

    expect(filters.search).toBe("ONealorideqanything");
    expect(filters.college).toBe("California Berkeley");
    expect(filters.page).toBe(2);
  });

  it("supports separate Player Master, selected cohort, and promoted contact views", () => {
    expect(parseGtmPlayerProspectFilters({ view: "selected" }).view).toBe("selected");
    expect(parseGtmPlayerProspectFilters({ view: "contacts" }).view).toBe("contacts");
    expect(parseGtmPlayerProspectFilters({ view: "not-a-view" }).view).toBe("all");
  });
});
