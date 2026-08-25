import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const intake = readFileSync(resolve("components/admin/gtm/GtmContactIntake.tsx"), "utf8");
const workspace = readFileSync(resolve("components/admin/gtm/GtmContactsWorkspace.tsx"), "utf8");
const actions = readFileSync(resolve("app/admin/gtm/actions.ts"), "utf8");

describe("GTM Phase 2 form and filter contracts", () => {
  it("shows investor inputs only inside the investor contact branch", () => {
    const investorBranch = intake.slice(
      intake.indexOf('contactType === "investor"'),
      intake.indexOf('contactType === "athlete"'),
    );
    expect(investorBranch).toContain('name="investorType"');
    expect(investorBranch).toContain('name="investorRelationshipStage"');
    expect(investorBranch).toContain('name="whatTheyNeedToSee"');
    expect(investorBranch).toContain('name="investorThesisFeedback"');
    expect(investorBranch).toContain('name="historicalSignal"');
    expect(investorBranch).toContain('name="futureTrigger"');
    expect(investorBranch).toContain('name="priorOutcome"');
    expect(investorBranch).toContain('name="relationshipSource"');
  });

  it("uses the universal next trigger and multi-outcome conversation form", () => {
    expect(intake).toContain('name="nextTrigger"');
    expect(workspace).toContain('name="outcomes"');
    expect(workspace).toContain('name="nextTrigger"');
    expect(workspace).toContain("GTM_CONVERSATION_OUTCOMES.map");
    expect(workspace).toContain("conversationOutcome");
  });

  it("routes new writes through permission-checked V2 database calls", () => {
    expect(actions).toContain('rpc("create_gtm_contact_v2"');
    expect(actions).toContain('rpc("log_gtm_interaction_v2"');
    expect(actions).toContain("GTM_INVESTOR_TYPES");
    expect(actions).toContain("GTM_CONVERSATION_OUTCOMES");
  });
});
