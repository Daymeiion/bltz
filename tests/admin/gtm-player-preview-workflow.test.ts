import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("GTM cohort private preview workflow", () => {
  it("keeps preview actions separate from cohort and contact promotion", () => {
    const workspace = readFileSync("components/admin/gtm/GtmPlayerProspectsWorkspace.tsx", "utf8");
    expect(workspace).toContain("Create preview Locker");
    expect(workspace).toContain("Open preview draft");
    expect(workspace).toContain("Preview complete");
    expect(workspace).toContain("Draft / incomplete");
    expect(workspace).toContain("Add to Contacts");
    expect(workspace).toContain("pageHref(data");
  });

  it("loads preview state in a bounded batch and derives completion from the current revision", () => {
    const reader = readFileSync("lib/gtm/player-prospects.ts", "utf8");
    expect(reader).toContain('.from("gtm_player_preview_lockers")');
    expect(reader).toContain('select("gsis_id,completed_revision,preview_lockers!inner(id,slug,revision)")');
    expect(reader).toContain('Number(relationship.completed_revision) === revision ? "complete" : "draft"');
  });

  it("creates or reopens through the audited server RPC and catches transport failures", () => {
    const actions = readFileSync("app/admin/gtm/players/actions.ts", "utf8");
    const workspace = readFileSync("components/admin/gtm/GtmPlayerProspectsWorkspace.tsx", "utf8");
    expect(actions).toContain('rpc("open_or_create_gtm_player_preview"');
    expect(actions).toContain("await requireInternalAdmin()");
    expect(workspace).toContain("} catch {");
    expect(workspace).toContain("no canonical Player or claim was created");
  });
});
