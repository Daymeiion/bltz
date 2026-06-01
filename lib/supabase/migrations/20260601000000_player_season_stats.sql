-- =============================================================================
-- 20260601000000_player_season_stats.sql
-- Per-season statistical lines for a BLTZ player.
--
-- The roster tables (nfl_players, cfb_players) cache *bio* data only. This
-- table holds the *stat* lines that drive the locker's hero numbers, season
-- chips and full-stats modal. One row per (player, source, season, season_type),
-- with the actual numbers in a flexible `stats` jsonb so a single schema serves
-- every position and both data sources without a 50-column wide table.
--
-- Stat keys are normalised across sources (see lib/position-stats.ts for the
-- canonical key list, e.g. rushing_yards, interceptions, pass_defended). Values
-- are season TOTALS (already aggregated from nflverse weekly rows / CFBD season
-- rows by the sync jobs).
--
-- Join keys (the IDs we already store on `players`):
--   pro      → players.gsis_id      → nflverse weekly stats player_id
--   college  → players.cfb_team_id  → cfb_players.espn_id → CFBD playerId
--
-- Source: nflverse-data `player_stats` release / CFBD /stats/player/season
-- Sync:   lib/pipeline/nflverse/sync_stats.ts  (app/api/dev/nflverse-stats-sync)
--         lib/pipeline/cfbverse/sync_stats.ts  (app/api/dev/cfbverse-stats-sync)
-- =============================================================================

create table if not exists player_season_stats (
  id             bigserial primary key,
  player_id      uuid not null references players(id) on delete cascade,
  -- 'nflverse' | 'cfbverse' — where the line came from.
  source         text not null,
  -- 'pro' | 'college' — which career chapter this season belongs to.
  level          text not null check (level in ('pro', 'college')),
  season         smallint not null,
  -- 'REG' | 'POST' | 'ALL'. nflverse splits regular/post; CFBD is season-total
  -- so it lands as 'REG'. Kept in the key so a player can have both without
  -- collisions.
  season_type    text not null default 'REG',
  -- Team for the season (franchise abbr for pro, school name for college).
  team           text,
  -- Normalised stat totals: { "rushing_yards": 1563, "rushing_tds": 14, ... }.
  stats          jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),

  -- One line per player/season/type. Re-running a sync upserts in place.
  unique (player_id, source, season, season_type)
);

create index if not exists player_season_stats_player_idx
  on player_season_stats (player_id);

create index if not exists player_season_stats_player_level_idx
  on player_season_stats (player_id, level);

-- --- RLS --------------------------------------------------------------------
-- Stat lines are public reference data attached to a published locker. Anyone
-- can read; only the service role (sync jobs) writes.
alter table player_season_stats enable row level security;

drop policy if exists "player_season_stats_public_select" on player_season_stats;
create policy "player_season_stats_public_select"
  on player_season_stats for select
  using (true);

-- No insert/update/delete policies — the sync jobs run with the service role,
-- which bypasses RLS.
