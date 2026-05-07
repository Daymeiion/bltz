-- =============================================================================
-- 20260507000001_cfb_teams.sql
-- College Football team reference table.
--
-- Caches the public ESPN site API team list as a queryable table so the
-- onboarding pipeline + locker page can match an athlete's school to its
-- official colors and logo without hitting the network on every render.
-- Stores only the URL to ESPN's CDN — never rehosts logos (trademark-safe).
--
-- Source: https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams
-- Sync:   lib/pipeline/cfbverse/sync.ts (manual trigger via
--         app/api/dev/cfbverse-sync, eligible for cron later).
-- =============================================================================

create table if not exists cfb_teams (
  espn_id          text primary key,
  abbreviation     text,
  display_name     text not null,
  location         text,
  mascot           text,
  slug             text,
  primary_color    text,
  alt_color        text,
  logo_url         text,
  logo_dark_url    text,
  is_active        boolean default true,
  last_synced_at   timestamptz not null default now()
);

-- Match-by-name (case-insensitive) is the primary lookup. The school field
-- on `players` is free-form text; we match against display_name and
-- location to handle both "Alabama Crimson Tide" and "Alabama".
create index if not exists cfb_teams_display_name_idx
  on cfb_teams (lower(display_name));

create index if not exists cfb_teams_location_idx
  on cfb_teams (lower(location)) where location is not null;

create index if not exists cfb_teams_slug_idx
  on cfb_teams (slug) where slug is not null;

create index if not exists cfb_teams_last_synced_idx
  on cfb_teams (last_synced_at);

-- Link an authenticated BLTZ player to their college team. Optional — only
-- set when the onboarding pipeline matches the athlete's school field
-- against the cfb_teams reference. Does not duplicate `players.school`,
-- which stays a free-form string for high-school / non-D1 athletes.
alter table players
  add column if not exists cfb_team_id text references cfb_teams(espn_id) on delete set null;

create index if not exists players_cfb_team_id_idx
  on players (cfb_team_id) where cfb_team_id is not null;

-- --- RLS --------------------------------------------------------------------
-- cfb_teams is public reference data: anyone can read, only service role writes.
alter table cfb_teams enable row level security;

drop policy if exists "cfb_teams_public_select" on cfb_teams;
create policy "cfb_teams_public_select"
  on cfb_teams for select
  using (true);

-- No insert/update/delete policies => writes are blocked for anon + authenticated.
-- The sync job runs with the service role key, which bypasses RLS.
