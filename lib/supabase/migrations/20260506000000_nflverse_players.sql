-- =============================================================================
-- 20260506000000_nflverse_players.sql
-- nflverse player reference table.
--
-- Caches the public nflverse `players.csv` release as a queryable table so the
-- onboarding scraper can match an athlete by name/college without hitting the
-- network on every run. We store *only* the headshot URL — never rehost the
-- image.
--
-- Source: https://github.com/nflverse/nflverse-data/releases/tag/players
-- Sync:   lib/pipeline/nflverse/sync.ts (manual trigger via
--         app/api/dev/nflverse-sync, eligible for cron later).
-- =============================================================================

create table if not exists nfl_players (
  gsis_id              text primary key,
  display_name         text not null,
  first_name           text,
  last_name            text,
  birth_date           date,
  position             text,
  position_group       text,
  height_in            smallint,
  weight_lbs           smallint,
  headshot_url         text,
  college_name         text,
  college_conference   text,
  jersey_number        smallint,
  rookie_season        smallint,
  last_season          smallint,
  latest_team          text,
  status               text,
  years_of_experience  smallint,
  draft_year           smallint,
  draft_round          smallint,
  draft_pick           smallint,
  draft_team           text,
  espn_id              text,
  pfr_id               text,
  nfl_id               text,
  pff_id               text,
  smart_id             text,
  last_synced_at       timestamptz not null default now()
);

-- Match-by-name (case-insensitive) is the primary lookup for the scraper.
create index if not exists nfl_players_display_name_idx
  on nfl_players (lower(display_name));

-- Disambiguation by college — used when multiple players share a name.
create index if not exists nfl_players_name_college_idx
  on nfl_players (lower(display_name), lower(college_name));

-- Cross-reference indexes (cheap, used when we already have an external ID).
create index if not exists nfl_players_espn_id_idx on nfl_players (espn_id) where espn_id is not null;
create index if not exists nfl_players_pfr_id_idx  on nfl_players (pfr_id)  where pfr_id  is not null;

-- Track when each row was last refreshed so the sync job can prune stale rows.
create index if not exists nfl_players_last_synced_idx on nfl_players (last_synced_at);

-- Link an authenticated BLTZ player back to their nflverse record. Optional —
-- only set when the scraper finds a confident match during onboarding.
alter table players
  add column if not exists gsis_id text references nfl_players(gsis_id) on delete set null;

create index if not exists players_gsis_id_idx on players (gsis_id) where gsis_id is not null;

-- --- RLS --------------------------------------------------------------------
-- nfl_players is public reference data: anyone can read, only service role writes.
alter table nfl_players enable row level security;

drop policy if exists "nfl_players_public_select" on nfl_players;
create policy "nfl_players_public_select"
  on nfl_players for select
  using (true);

-- No insert/update/delete policies => writes are blocked for anon + authenticated.
-- The sync job runs with the service role key, which bypasses RLS.
