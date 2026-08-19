import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildTeamMappingRows,
  duplicateValues,
  toCsv,
} from "../../scripts/phase2-deployment-preflight.mjs";

const script = readFileSync(
  resolve("scripts/phase2-deployment-preflight.mjs"),
  "utf8",
);
const stagingVerifier = readFileSync(
  resolve("scripts/verify-staging-beta-rls.mjs"),
  "utf8",
);

describe("Phase 2 deployment readiness", () => {
  it("keeps the remote preflight implementation read-only", () => {
    expect(script).toContain(".select(");
    expect(script).not.toMatch(/\.(?:insert|update|upsert|delete)\s*\(/);
    expect(script).not.toContain("auth.admin");
    expect(script).not.toContain("db push");
    expect(script).not.toContain("db reset");
  });

  it("requires an explicit project and reviewed administrator", () => {
    expect(script).toContain('required(env, "PHASE2_EXPECTED_PROJECT_REF")');
    expect(script).toContain('required(env, "PHASE2_EXPECTED_SUPER_ADMIN_USER_ID")');
    expect(script).toContain("does not match PHASE2_EXPECTED_PROJECT_REF");
    expect(script).toContain("unexpected active super_admin assignments exist");
    expect(script).toContain("expected super_admin backfill audit is missing");
    expect(script).toContain(
      "expected admin has revoked super_admin history and migration 00002 will not reactivate it",
    );
    expect(script).toContain("projectedActiveAfterMigration: 1");
    expect(script).toContain("backfillAuditRequired");
    expect(script).toContain("audit.entity_id === expectedAssignment.id");
    expect(script).toContain('audit.new_values?.role === "super_admin"');
    expect(script).toContain("20260818000002_phase2_legacy_admin_super_admin_transition");
  });

  it("uses a one-time admin session without a password and fails on cleanup errors", () => {
    const generatedSession = stagingVerifier.indexOf("admin.auth.admin.generateLink");
    const testSpawn = stagingVerifier.indexOf("spawnSync(process.execPath");
    expect(generatedSession).toBeGreaterThan(-1);
    expect(testSpawn).toBeGreaterThan(generatedSession);
    expect(stagingVerifier).toContain("browser.auth.verifyOtp");
    expect(stagingVerifier).toContain('admin.auth.admin.signOut(platformAdminJwt, "local")');
    expect(stagingVerifier).toContain("PHASE2_EXPECTED_SUPER_ADMIN_USER_ID");
    expect(stagingVerifier).not.toContain("RLS_TEST_PLATFORM_ADMIN_PASSWORD");
    expect(stagingVerifier).not.toContain(
      "process.env.RLS_TEST_PLATFORM_ADMIN_EMAIL",
    );
    expect(stagingVerifier).toContain("cleanupErrors");
    expect(stagingVerifier).toContain("evidence.cleanupErrors.length !== 0");
    expect(stagingVerifier).toContain("profile cleanup verification");
    expect(stagingVerifier).toContain("Auth cleanup verification");
    expect(stagingVerifier).toContain("userCheck.error?.status === 404");
    expect(stagingVerifier).not.toContain("/not found/i");
  });

  it("keeps administrator email addresses out of retained preflight evidence", () => {
    expect(script).toContain('"id,role"');
    expect(script).toContain("legacyAdminIds");
    expect(script).not.toContain("profile.email");
    expect(script).not.toContain("maskEmail");
  });

  it("builds deterministic team mapping rows with player counts", () => {
    const rows = buildTeamMappingRows(
      [
        { id: "team-b", name: "B Team", slug: "b-team", school_id: null },
        {
          id: "team-a",
          name: "A Team",
          slug: "a-team",
          school_id: "school-a",
          organization_id: "org-a",
        },
      ],
      [
        { id: "player-1", team_id: "team-a" },
        { id: "player-2", team_id: "team-a" },
        { id: "player-3", team_id: null },
      ],
    );

    expect(rows.map((row: { team_id: string }) => row.team_id)).toEqual([
      "team-a",
      "team-b",
    ]);
    expect(rows[0]).toMatchObject({
      current_organization_id: "org-a",
      current_player_count: 2,
      proposed_organization_id: "",
    });
    expect(rows[1].current_player_count).toBe(0);
  });

  it("reports normalized duplicate names and slugs", () => {
    const rows = [
      { id: "a", name: "Falcons", slug: "falcons" },
      { id: "b", name: " falcons ", slug: "falcons-2" },
    ];
    expect(duplicateValues(rows, "name")).toEqual([
      { value: "falcons", ids: ["a", "b"] },
    ]);
    expect(duplicateValues(rows, "slug")).toEqual([]);
  });

  it("emits reviewable CSV and neutralizes spreadsheet formulas", () => {
    const csv = toCsv([
      { team_id: "team-a", team_name: "=HYPERLINK(\"bad\")" },
    ]);
    expect(csv).toContain('"team_id","team_name"');
    expect(csv).toContain("'=HYPERLINK");
  });
});
