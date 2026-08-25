import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const drawer = readFileSync(resolve("components/admin/gtm/GtmContactDrawer.tsx"), "utf8");
const workspace = readFileSync(resolve("components/admin/gtm/GtmContactsWorkspace.tsx"), "utf8");
const actions = readFileSync(resolve("app/admin/gtm/actions.ts"), "utf8");
const server = readFileSync(resolve("lib/gtm/server.ts"), "utf8");

describe("GTM Prompt 3 workflow contracts", () => {
  it("keeps every primary and secondary contact action inside the drawer", () => {
    for (const action of [
      "Add Note", "Log Interaction", "Set Next Action", "Change Stage",
      "Edit Contact", "Match Player", "Mark Priority", "Open LinkedIn", "Archive",
    ]) expect(drawer).toContain(action);
  });

  it("captures every nullable structured discovery field", () => {
    for (const field of [
      "problemDiscussed", "currentSolution", "painLevel", "primaryBltzUseCase",
      "featureRequested", "wouldUse", "wouldPilot", "wouldPay", "expectedBuyer",
      "expectedBudgetRange", "primaryObjection", "introductionOffered",
      "introductionTarget", "additionalContext",
    ]) expect(drawer).toContain(`name="${field}"`);
    expect(drawer).toContain("Unknown / not discussed");
    expect(actions).toContain("Record at least one discovery finding.");
    expect(actions).toContain('rpc("create_gtm_customer_discovery"');
  });

  it("persists all editable contact workflow fields through authorized actions", () => {
    for (const action of [
      "editGtmContact", "archiveGtmContact", "setGtmPipelineStage",
      "setGtmNextAction", "setGtmPriority", "matchGtmContactPlayer",
    ]) expect(actions).toContain(`function ${action}`);
    expect(actions).toContain("await getAuthorizedClient()");
    expect(actions).toContain('rpc("update_gtm_contact_v1"');
    expect(actions).toContain('rpc("match_gtm_contact_player"');
  });

  it("shows the complete source-derived GTM metrics and discovery signals", () => {
    for (const label of [
      "Total contacts", "Tier A", "Tier B", "Priority", "Active conversations",
      "Needs follow-up", "Discovery conversations", "Player-linked",
      "Demo candidates", "Pilot candidates", "Active pilots", "Conversions",
      "Reported problems", "BLTZ use cases", "Requested features", "Objections",
    ]) expect(workspace).toContain(label);
    expect(server).toContain('rpc("get_gtm_metrics_v1"');
  });

  it("never writes or edits canonical Player fields", () => {
    expect(actions).toContain('.from("players").select(');
    expect(actions).not.toContain('.from("players").update(');
    expect(actions).not.toContain('.from("players").insert(');
  });
});
