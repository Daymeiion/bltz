import { describe, expect, it } from "vitest";
import { classifyGtmImportRow } from "@/lib/gtm/classification";
import type { NormalizedGtmImportRow } from "@/lib/gtm/import-contract";

function row(currentTitle: string, currentCompany = ""): NormalizedGtmImportRow {
  return { rowNumber: 2, displayName: "Test Person", firstName: "Test", lastName: "Person", email: "", linkedinUrl: "", currentCompany, currentTitle, connectedOn: "", contactType: "unclassified", sport: "", leagueLevel: "", doNotAutomate: false, sourceRecordId: "row-1" };
}

describe("Prompt 6 deterministic GTM classification", () => {
  it("classifies senior athletics buyers with explainable enterprise scoring", () => {
    const result = classifyGtmImportRow(row("Athletic Director", "University of California"));
    expect(result).toMatchObject({ contactType: "enterprise", segment: "Athletic Director", classificationStatus: "auto_classified" });
    expect(result.classificationConfidence).toBeGreaterThanOrEqual(0.9);
    expect(result.priorityScoreExplanation).toMatchObject({ model: "enterprise_v1", tier: expect.any(String), score: expect.any(Number) });
    expect(result.priorityScoreExplanation?.inferredFields).toContain("relationshipStrength");
  });

  it("classifies investors as multipliers without destroying multi-role personas", () => {
    const result = classifyGtmImportRow(row("Founder and Managing Partner", "Sports Ventures"));
    expect(result.contactType).toBe("multiplier");
    expect(result.personas).toEqual(expect.arrayContaining(["Investor", "Founder / Operator"]));
  });

  it("does not downgrade an explicit investor CSV value", () => {
    expect(classifyGtmImportRow({ ...row("Partner", "Fund"), contactType: "investor" })).toMatchObject({
      contactType: "investor",
      classificationSource: "csv_explicit",
      classificationStatus: "auto_classified",
    });
  });

  it("uses a strong Player Master match as authoritative athlete evidence", () => {
    const result = classifyGtmImportRow(row("Owner", "Example LLC"), { matched: true, strong: true, status: "RET" });
    expect(result).toMatchObject({ contactType: "athlete", segment: "Former Player", classificationStatus: "auto_classified", classificationConfidence: 0.98 });
  });

  it("does not treat an athlete-development staff title as an athlete", () => {
    expect(classifyGtmImportRow(row("Director of Athlete Development", "NFL Club"))).toMatchObject({
      contactType: "enterprise",
      segment: "Player Personnel",
    });
  });

  it("routes name-only Player signals to review", () => {
    const result = classifyGtmImportRow(row("", ""), { matched: true, strong: false });
    expect(result).toMatchObject({ contactType: "unclassified", classificationStatus: "needs_review" });
  });

  it("does not invent a role when deterministic evidence is absent", () => {
    expect(classifyGtmImportRow(row("Consultant", "Example LLC"))).toMatchObject({ contactType: "unclassified", classificationStatus: "unclassified", classificationConfidence: 0 });
  });
});
