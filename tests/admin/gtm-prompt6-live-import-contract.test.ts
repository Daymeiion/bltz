import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Prompt 6 live import contract", () => {
  const actions = readFileSync("app/admin/gtm/actions.ts", "utf8");
  const contacts = readFileSync("components/admin/gtm/GtmContactsWorkspace.tsx", "utf8");
  const drawer = readFileSync("components/admin/gtm/GtmContactDrawer.tsx", "utf8");

  it("classifies and matches before the preview is approved", () => {
    expect(actions).toContain("get_gtm_player_match_candidates");
    expect(actions).toContain("prepareImportRows(parsed.rows, playerReviews)");
    expect(actions).toContain("automaticClassifications");
    expect(actions).toContain("import_gtm_contacts_v2");
  });

  it("requires review for non-strong Player matches", () => {
    expect(actions).toContain('review.strength !== "strong"');
    expect(actions).toContain("Review or reject the possible Player match");
    expect(actions).toContain("manual_player_match");
  });

  it("does not block repeat imports on Player reviews for skipped duplicate rows", () => {
    expect(actions).toContain("acceptedReviews.values()");
    expect(actions).toContain("acceptedSourceIds.has(sourceRecordId)");
  });

  it("surfaces the focused review queues and strategic cohorts", () => {
    for (const view of [
      "Needs Classification", "Ambiguous Identity", "High Priority",
      "Strategic Player Network", "Enterprise Decision Makers", "Multipliers",
      "Top 50 Overall", "Top 25 Enterprise Prospects",
      "Top 25 Athlete / Locker Prospects", "Top 20 Multipliers",
      "Top 20 Potential Introduction Sources", "High-confidence Player Matches",
      "Ambiguous Player Matches", "Potential Pilot Organizations",
    ]) expect(contacts).toContain(view);
  });

  it("shows evidence and score provenance in the contact drawer", () => {
    expect(drawer).toContain("Classification evidence");
    expect(drawer).toContain("Deterministic import evidence");
    expect(drawer).toContain("Why this score changed");
  });
});
