import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260818000003_phase2_career_context_foundation.sql"),
  "utf8",
).toLowerCase();

const normalized = migration.replace(/\s+/g, " ");

describe("Phase 2 career-context migration contract", () => {
  it.each([
    "seasons",
    "team_seasons",
    "athlete_team_seasons",
    "athlete_season_stats",
    "sports_events",
    "sports_event_teams",
    "sports_event_athletes",
  ])("creates and enables RLS for %s", (table) => {
    expect(normalized).toContain(`create table if not exists public.${table}`);
    expect(normalized).toContain(`alter table public.${table} enable row level security`);
  });

  it("scopes normalized seasons by organization, sport, and code", () => {
    expect(normalized).toContain("season_code = lower(btrim(season_code))");
    expect(normalized).toContain(
      "constraint seasons_organization_sport_code_key unique (organization_id, sport, season_code)",
    );
    expect(normalized).toContain("constraint seasons_date_order_check check (ends_on >= starts_on)");
    expect(normalized).toContain("'planned', 'active', 'completed', 'archived'");
  });

  it("uses composite tenant foreign keys for teams, seasons, and roster stints", () => {
    expect(normalized).toContain("constraint teams_organization_id_id_key");
    expect(normalized).toContain(
      "foreign key (organization_id, team_id) references public.teams(organization_id, id)",
    );
    expect(normalized).toContain(
      "foreign key (organization_id, season_id) references public.seasons(organization_id, id)",
    );
    expect(normalized).toContain(
      "foreign key (organization_id, team_season_id) references public.team_seasons(organization_id, id)",
    );
    expect(normalized).toContain("athlete_team_seasons_team_season_idx");
    expect(normalized).toContain("sports_event_athletes_event_team_idx");
    expect(normalized).toContain(
      "constraint team_seasons_organization_id_id_team_key unique (organization_id, id, team_id)",
    );
  });

  it("models dated roster stints and prevents overlap for one athlete/team-season", () => {
    expect(normalized).toContain("player_id uuid not null references public.players(id)");
    expect(normalized).toContain("create extension if not exists btree_gist with schema extensions");
    expect(normalized).toContain("constraint athlete_team_seasons_no_overlapping_stints exclude using gist");
    expect(normalized).toContain("player_id with =");
    expect(normalized).toContain("team_season_id with =");
    expect(normalized).toContain(
      "daterange(starts_on, coalesce(ends_on, 'infinity'::date), '[]') with &&",
    );
    expect(normalized).toContain("roster_status text not null default 'active'");
    expect(normalized).toContain(
      "'active', 'inactive', 'practice_squad', 'injured', 'transferred', 'released', 'graduated', 'completed'",
    );
    expect(normalized).toContain("jersey_number ~ '^[0-9]{1,3}$'");
    expect(normalized).toContain(
      "position is null or char_length(btrim(position)) between 1 and 80",
    );
  });

  it("separates normalized athlete stats from legacy season stats", () => {
    expect(normalized).toContain("create table if not exists public.athlete_season_stats");
    expect(normalized).toContain("jsonb_typeof(stats) = 'object'");
    expect(normalized).toContain(
      "constraint athlete_season_stats_stint_source_phase_key unique (athlete_team_season_id, source, season_phase)",
    );
    expect(normalized).toContain(
      "foreign key (organization_id, athlete_team_season_id) references public.athlete_team_seasons(organization_id, id)",
    );
    expect(normalized).not.toMatch(/alter table public\.player_season_stats/);
    expect(normalized).not.toMatch(/update public\.player_season_stats/);
  });

  it("keeps events shared while explicitly associating teams and athletes", () => {
    expect(normalized).toContain("steward_organization_id uuid references public.organizations(id)");
    expect(normalized).toContain(
      "constraint sports_event_teams_event_team_key unique (event_id, team_id)",
    );
    expect(normalized).toContain(
      "foreign key (event_id, organization_id, team_id) references public.sports_event_teams(event_id, organization_id, team_id)",
    );
    expect(normalized).toContain(
      "constraint sports_event_athletes_event_organization_player_key unique (event_id, organization_id, player_id)",
    );
    expect(normalized).toContain("team_season_id uuid");
    expect(normalized).toContain(
      "foreign key (organization_id, team_season_id, team_id) references public.team_seasons(organization_id, id, team_id)",
    );
    expect(normalized).toContain("athlete_team_season_id uuid");
    expect(normalized).toContain(
      "foreign key (organization_id, player_id, athlete_team_season_id) references public.athlete_team_seasons(organization_id, player_id, id)",
    );
    expect(normalized).toContain("sports_event_teams_team_season_idx");
    expect(normalized).toContain("sports_event_athletes_roster_stint_idx");
  });

  it("allows only active members of operational organizations to read context", () => {
    expect(normalized).toContain("membership.user_id = (select auth.uid())");
    expect(normalized).toContain("membership.status = 'active'");
    expect(normalized).toContain("organization.status in ('approved', 'restricted')");
    expect(normalized).toContain("members can read participating sports events");
    expect(
      normalized.match(/or \(select public\.is_internal_admin\(\)\)/g),
    ).toHaveLength(7);
  });

  it("keeps optional event roster context explicitly bounded", () => {
    expect(normalized).toContain(
      "if both are present, exact team-to-stint consistency is deferred until the event workflow defines transfer-day handling",
    );
    expect(normalized).toContain("sports_event_athletes_roster_stint_fkey");
  });

  it("keeps all browser writes and anonymous access disabled", () => {
    expect(normalized).not.toMatch(/grant [^;]+ to anon/);
    expect(normalized).not.toMatch(
      /grant (?:insert|update|delete)[^;]+to authenticated/,
    );
    expect(normalized).toContain(
      "grant select, insert, update on table public.seasons, public.team_seasons, public.athlete_team_seasons, public.athlete_season_stats, public.sports_events, public.sports_event_teams, public.sports_event_athletes to service_role",
    );
  });

  it("does not modify legacy athlete identity or create deferred product domains", () => {
    expect(normalized).not.toMatch(/alter table public\.players\b/);
    expect(normalized).not.toMatch(
      /create table if not exists public\.(?:media_assets|athlete_media|rights_records|campaigns|revenue_records)\b/,
    );
    expect(normalized).not.toMatch(/alter table public\.(?:media|videos|player_lockers)\b/);
  });
});
