import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const inventory = readFileSync(
  resolve("supabase/tests/phase2_deployment_inventory.sql"),
  "utf8",
).toLowerCase();

const executableSql = inventory
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/--.*$/gm, " ")
  .replace(/\s+/g, " ")
  .trim();

const statements = executableSql
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

describe("Phase 2 deployment inventory SQL", () => {
  it("is a SELECT-only staging report", () => {
    expect(inventory).toContain("run read-only on staging after migrations");
    expect(inventory).toContain("20260818000000 through");
    expect(inventory).toContain("20260818000003");
    expect(statements.length).toBeGreaterThan(5);
    expect(statements.every((statement) => /^(select|with)\b/.test(statement))).toBe(true);
    expect(executableSql).not.toMatch(
      /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|call|execute|copy|do|set|reset)\b/,
    );
  });

  it.each([
    "phase2_migration_history",
    "legacy_profile_admins",
    "platform_role_assignments",
    "organization_membership_counts",
    "team_organization_inventory",
    "school_team_groupings",
    "player_counts_by_team",
    "unmapped_operational_team_candidates",
    "duplicate_name_slug_signals",
    "career_table_counts",
  ])("contains the %s report", (reportName) => {
    expect(executableSql).toContain(`'${reportName}' as report_name`);
  });

  it("reports active and revoked authorization state without claims or secrets", () => {
    expect(executableSql).toContain("where profile.role = 'admin'");
    expect(executableSql).toContain("assignment.revoked_at is null");
    expect(executableSql).toContain("assignment.revoked_at is not null");
    expect(executableSql).not.toMatch(
      /service_role|secret|access_token|refresh_token|password|email|display_name|assignment_reason|revocation_reason/,
    );
  });

  it("uses player references as evidence without inferring a team backfill", () => {
    expect(executableSql).toContain("where team.organization_id is null");
    expect(executableSql).toContain("player_counts.player_count > 0");
    expect(inventory).toContain("must not drive an automatic");
    expect(executableSql).not.toMatch(/update\s+public\.teams/);
  });

  it("covers every Phase 2D career table", () => {
    for (const table of [
      "seasons",
      "team_seasons",
      "athlete_team_seasons",
      "athlete_season_stats",
      "sports_events",
      "sports_event_teams",
      "sports_event_athletes",
    ]) {
      expect(executableSql).toContain(`from public.${table}`);
    }
  });
});
