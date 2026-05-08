-- =============================================================================
-- 20260508000000_cfb_players.sql
-- College football player reference table.
--
-- Caches CollegeFootballData.com (CFBD) historical rosters as a queryable
-- table so the onboarding pipeline can match a college athlete's name to
-- their full bio (DOB, height, weight, hometown, position) without an
-- HTTP round trip per onboarding run. Same architectural pattern as
-- nfl_players + cfb_teams.
--
-- Source: https://api.collegefootballdata.com/roster?team=<name>&year=<year>
-- Sync:   lib/pipeline/cfbverse/sync_players.ts (per-team historical
--         backfill, manual trigger via app/api/dev/cfbverse-sync-players)
--
-- ID space: CFBD's `id` is the same integer as ESPN's athlete ID, so the
-- canonical key is `espn_id`. This means cfb_players.espn_id and the
-- ESPN-sourced cfb_teams.espn_id share the same ID universe — no
-- cross-mapping needed when joining a player to their school in code.
-- =============================================================================

create table if not exists cfb_players (
  espn_id          text primary key,
  first_name       text,
  last_name        text,
  display_name     text not null,
  jersey           smallint,
  position         text,
  height_in        smallint,
  weight_lbs       smallint,
  home_city        text,
  home_state       text,
  home_country     text,
  -- Most recent team we saw the player on (free-form CFBD team name).
  team             text,
  -- Optional FK to cfb_teams when the team string resolves cleanly.
  cfb_team_id      text references cfb_teams(espn_id) on delete set null,
  -- Career window. The CFBD `year` field is the player's class year
  -- (1-4), not the calendar season — we infer first_year/last_year from
  -- which seasons the player appeared on a roster. Helps disambiguate
  -- "Joe Smith 1995 Cal" vs "Joe Smith 2018 Cal" where IDs differ.
  first_season     smallint,
  last_season      smallint,
  recruit_ids      jsonb,
  last_synced_at   timestamptz not null default now()
);

-- Match-by-name (case-insensitive) is the primary lookup the scraper uses.
create index if not exists cfb_players_display_name_idx
  on cfb_players (lower(display_name));

-- Disambiguation by team when multiple players share a name.
create index if not exists cfb_players_name_team_idx
  on cfb_players (lower(display_name), cfb_team_id);

-- For maintenance queries during sync re-runs.
create index if not exists cfb_players_last_synced_idx
  on cfb_players (last_synced_at);

create index if not exists cfb_players_cfb_team_id_idx
  on cfb_players (cfb_team_id) where cfb_team_id is not null;

-- --- RLS --------------------------------------------------------------------
alter table cfb_players enable row level security;

drop policy if exists "cfb_players_public_select" on cfb_players;
create policy "cfb_players_public_select"
  on cfb_players for select
  using (true);

-- No insert/update/delete policies — sync runs with service role.
