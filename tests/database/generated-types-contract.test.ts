import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const generated = readFileSync(resolve("types/database.generated.ts"), "utf8");
const normalizedGenerated = generated.replace(/\r\n/g, "\n");
const facade = readFileSync(resolve("types/database.ts"), "utf8");

describe("authoritative generated database contract", () => {
  it("is a full Supabase CLI schema snapshot", () => {
    expect(generated).toContain("export type Database = {");
    expect(generated).toContain("__InternalSupabase:");
    expect(generated).toContain('PostgrestVersion: "14.15"');
    expect(generated).toContain("export type Tables<");
    expect(generated).toContain("export type TablesInsert<");
    expect(generated).toContain("export type TablesUpdate<");
  });

  it.each([
    "organizations",
    "organization_memberships",
    "platform_role_assignments",
    "audit_logs",
    "seasons",
    "team_seasons",
    "athlete_team_seasons",
    "athlete_season_stats",
    "sports_events",
    "sports_event_teams",
    "sports_event_athletes",
  ])("contains the deployed Phase 2 %s table", (table) => {
    expect(generated).toMatch(new RegExp(`^      ${table}: \\{`, "m"));
  });

  it("captures nullable team tenancy and tenant-safe composite relationships", () => {
    expect(generated).toMatch(
      /teams: \{[\s\S]*?Row: \{[\s\S]*?organization_id: string \| null[\s\S]*?Relationships:/,
    );
    expect(generated).toContain('foreignKeyName: "team_seasons_team_fkey"');
    expect(generated).toContain('columns: ["organization_id", "team_id"]');
    expect(generated).toContain('foreignKeyName: "sports_event_teams_team_season_fkey"');
    expect(generated).toContain(
      'columns: ["organization_id", "team_season_id", "team_id"]',
    );
    expect(generated).toContain('foreignKeyName: "sports_event_athletes_roster_stint_fkey"');
    expect(generated).toContain(
      'columns: ["organization_id", "player_id", "athlete_team_season_id"]',
    );
  });

  it("contains the server authorization and analytics RPC signatures", () => {
    expect(normalizedGenerated).toContain(
      "consume_analytics_rate_limit: {\n        Args: { p_key_hash: string; p_limit: number; p_window_seconds?: number }",
    );
    expect(generated).toContain("get_beta_intelligence_dashboard: {");
    expect(generated).toContain("is_internal_admin: { Args: never; Returns: boolean }");
  });

  it("contains schema shape only, without project binding or credential values", () => {
    expect(generated).not.toContain("yevihzsgqagvuulymqum");
    expect(generated).not.toMatch(/https:\/\/[^\s"']+\.supabase\.co/i);
    expect(generated).not.toMatch(/(?:service_role|sb_secret)\s*[=:]\s*["'][^"']+/i);
  });

  it("uses the generated snapshot as schema truth while preserving app aliases", () => {
    expect(facade).toContain('from "./database.generated"');
    expect(facade).toContain("export type Json = GeneratedJson;");
    expect(facade).not.toContain("export interface Database {");
    expect(facade).toContain("export interface AnalyticsEvent {");
    expect(facade).toContain("export interface Organization {");
  });
});
