import { describe, expect, it } from "vitest";
import { developmentWorkflowsEnabled, getIntelligenceWorkflowEnvironment, intelligenceWorkflowsEnabled, workflowCommandSchema } from "@/lib/intelligence/workflows/contracts";
import { resolveMediaPermissions, type LegacyPermissionAsset } from "@/lib/intelligence/workflows/permissions";

const asset: LegacyPermissionAsset = { model: "legacy_media", associationReviewed: true, athleteRelationshipVerified: true,
  kind: "photo", licenseStatus: "approved", publicLockerApproved: true, licenseKind: "legacy_display" };

describe("server-selected review environment gates", () => {
  const production: Partial<NodeJS.ProcessEnv> = { BLTZ_INTELLIGENCE_WORKFLOWS_ENABLED: "true", BLTZ_INTELLIGENCE_WORKFLOWS_ENVIRONMENT: "production", BLTZ_INTELLIGENCE_WORKFLOWS_PRODUCTION_ENABLED: "true", VERCEL_ENV: "production" };
  it("is disabled by default and requires a separate explicit production opt-in", () => {
    expect(getIntelligenceWorkflowEnvironment({})).toBeNull();
    expect(getIntelligenceWorkflowEnvironment({ ...production, BLTZ_INTELLIGENCE_WORKFLOWS_PRODUCTION_ENABLED: undefined })).toBeNull();
    expect(getIntelligenceWorkflowEnvironment({ ...production, BLTZ_INTELLIGENCE_WORKFLOWS_PRODUCTION_ENABLED: "false" })).toBeNull();
    expect(getIntelligenceWorkflowEnvironment({ ...production, BLTZ_INTELLIGENCE_WORKFLOWS_ENABLED: "false" })).toBeNull();
    expect(getIntelligenceWorkflowEnvironment(production)).toBe("production");
    expect(intelligenceWorkflowsEnabled(production)).toBe(true);
    expect(developmentWorkflowsEnabled(production)).toBe(false);
  });
  it.each([undefined, "preview", "development"])("cannot select production on %s runtime", runtime => {
    expect(getIntelligenceWorkflowEnvironment({ ...production, VERCEL_ENV: runtime })).toBeNull();
  });
  it("keeps development available only outside the production runtime and refuses other scopes", () => {
    const env = { ...production, BLTZ_INTELLIGENCE_WORKFLOWS_ENVIRONMENT: "development", VERCEL_ENV: "preview" };
    expect(getIntelligenceWorkflowEnvironment(env)).toBe("development");
    expect(developmentWorkflowsEnabled(env)).toBe(true);
    expect(getIntelligenceWorkflowEnvironment({ ...env, VERCEL_ENV: "production" })).toBeNull();
    for (const scope of ["synthetic", "preview", "", "Production"]) expect(getIntelligenceWorkflowEnvironment({ ...env, BLTZ_INTELLIGENCE_WORKFLOWS_ENVIRONMENT: scope })).toBeNull();
  });
});

describe("central workflow intended-use permission boundary", () => {
  it("limits legacy compatibility to internal review and eligible public display", () => {
    expect(resolveMediaPermissions(asset, "internal_review")).toMatchObject({ allowed: true, basis: "legacy_display_compatibility" });
    expect(resolveMediaPermissions(asset, "public_display").allowed).toBe(true);
    for (const context of ["social_publication", "license", "print", "commercial_campaign"] as const) {
      expect(resolveMediaPermissions(asset, context)).toMatchObject({ allowed: false, reason: "intended_use_rights_adapter_unavailable" });
    }
  });
  it("does not infer permission from provider access, reviewed links or legacy video visibility", () => {
    expect(resolveMediaPermissions({ ...asset, model: "legacy_video" }, "internal_review").allowed).toBe(false);
    expect(resolveMediaPermissions({ ...asset, athleteRelationshipVerified: false }, "public_display").allowed).toBe(false);
    expect(resolveMediaPermissions({ ...asset, associationReviewed: false }, "public_display").allowed).toBe(false);
    expect(resolveMediaPermissions({ ...asset, licenseStatus: "revoked" }, "internal_review").allowed).toBe(false);
    expect(resolveMediaPermissions({ ...asset, publicLockerApproved: false }, "public_display").allowed).toBe(false);
  });
  it("rejects unqualified/ambiguous asset and fabricated outcome command payloads", () => {
    const command = { action: "review_asset_link", commandId: "00000000-0000-4000-8000-000000000001", reason: "Review",
      playerId: "00000000-0000-4000-8000-000000000002", momentId: "00000000-0000-4000-8000-000000000003",
      status: "verified", evidenceIds: ["00000000-0000-4000-8000-000000000004"] };
    expect(workflowCommandSchema.safeParse(command).success).toBe(false);
    expect(workflowCommandSchema.safeParse({ ...command, legacyMediaId: command.playerId, legacyVideoId: command.playerId }).success).toBe(false);
    expect(workflowCommandSchema.safeParse({ ...command, legacyMediaId: command.playerId, id: command.momentId }).success).toBe(false);
  });
});
