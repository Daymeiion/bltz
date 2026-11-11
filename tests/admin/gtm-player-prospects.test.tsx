import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/gtm/players",
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/admin/gtm/players/actions", () => ({
  promotePlayerMasterProspects: vi.fn(),
}));

import { GtmPlayerProspectsWorkspace } from "@/components/admin/gtm/GtmPlayerProspectsWorkspace";
import { parseGtmPlayerProspectFilters } from "@/lib/gtm/player-prospect-contract";

describe("GTM Player Master prospecting", () => {
  it("normalizes server-side prospect filters and rejects arbitrary sort columns", () => {
    expect(parseGtmPlayerProspectFilters({
      search: "  Jordan,() ",
      college: " California ",
      team: "lac",
      position: "wr",
      sort: "drop_table",
      direction: "desc",
      page: "3",
    })).toEqual({
      search: "Jordan",
      college: "California",
      team: "LAC",
      position: "WR",
      status: "",
      sort: "name",
      direction: "desc",
      page: 3,
    });
  });

  it("renders filterable Player Master results with bulk and individual promotion controls", () => {
    const markup = renderToStaticMarkup(<GtmPlayerProspectsWorkspace data={{
      state: "ready",
      total: 1,
      page: 1,
      pageSize: 50,
      pageCount: 1,
      filters: parseGtmPlayerProspectFilters({ college: "California" }),
      rows: [{
        gsisId: "00-0000001",
        displayName: "Jordan Example",
        firstName: "Jordan",
        lastName: "Example",
        collegeName: "California",
        collegeConference: "Pac-12",
        latestTeam: "LAC",
        position: "WR",
        status: "ACT",
        rookieSeason: 2018,
        lastSeason: 2025,
        yearsOfExperience: 8,
        headshotUrl: null,
        contactId: null,
      }],
    }} />);

    for (const text of ["Player prospecting", "College contains", "California", "Select available players", "Add to GTM", "Jordan Example"]) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain('href="/admin/gtm/players"');
  });

  it("promotes by stable source identity without creating public Player or Locker rows", () => {
    const migration = readFileSync("supabase/migrations/20260826151448_promote_player_master_prospects.sql", "utf8").toLowerCase();
    expect(migration).toContain("public.promote_player_master_prospects");
    expect(migration).toContain("not (select public.is_internal_admin())");
    expect(migration).toContain("insert into public.gtm_contacts");
    expect(migration).toContain("'player_master'");
    expect(migration).toContain("on conflict (source, source_record_id)");
    expect(migration).toContain("do_not_automate");
    expect(migration).toContain("revoke all on function");
    expect(migration).not.toContain("insert into public.players");
    expect(migration).not.toContain("insert into public.player_lockers");
  });

  it("re-authorizes and validates the bulk Server Action", () => {
    const action = readFileSync("app/admin/gtm/players/actions.ts", "utf8");
    expect(action).toContain("await requireInternalAdmin()");
    expect(action).toContain(".min(1).max(100)");
    expect(action).toContain('gtm.rpc("promote_player_master_prospects"');
    expect(action).toContain('revalidatePath("/admin/gtm/contacts")');
  });
});
