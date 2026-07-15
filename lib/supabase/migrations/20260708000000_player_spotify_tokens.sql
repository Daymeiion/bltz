-- =============================================================================
-- 20260708000000_player_spotify_tokens.sql
-- Per-athlete Spotify OAuth tokens (Authorization Code + refresh flow).
--
-- Each BLTZ athlete can link their own Spotify account so their fan-facing
-- locker hero shows what they're currently listening to. We store the OAuth
-- access + refresh tokens here and refresh them server-side (service role)
-- when they expire.
--
-- SECURITY: these rows hold live account credentials. RLS is locked to the
-- owning athlete for all client access (players.user_id = auth.uid()); the
-- public locker "now playing" endpoint reads/refreshes exclusively through the
-- service role, which bypasses RLS. No anon/public SELECT policy exists.
--
-- All statements are idempotent so this migration can be re-run safely.
-- =============================================================================

create table if not exists player_spotify_tokens (
  player_id        uuid primary key references players(id) on delete cascade,
  spotify_user_id  text,
  display_name     text,
  access_token     text not null,
  refresh_token    text not null,
  scope            text,
  token_type       text not null default 'Bearer',
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Keep updated_at fresh on every token refresh (reuses the shared trigger fn
-- defined in 20260505000000_onboarding_and_wireup.sql).
drop trigger if exists player_spotify_tokens_set_updated_at on player_spotify_tokens;
create trigger player_spotify_tokens_set_updated_at
  before update on player_spotify_tokens
  for each row execute function set_updated_at_now();

-- --- RLS ---------------------------------------------------------------------
alter table player_spotify_tokens enable row level security;

-- Only the athlete who owns the player row may read their own token record
-- (used by the dashboard "connected?" status check). The public locker path
-- never uses this — it goes through the service role.
drop policy if exists "player_spotify_tokens_owner_select" on player_spotify_tokens;
create policy "player_spotify_tokens_owner_select"
  on player_spotify_tokens for select
  using (
    exists (
      select 1 from players p
      where p.id = player_spotify_tokens.player_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "player_spotify_tokens_owner_insert" on player_spotify_tokens;
create policy "player_spotify_tokens_owner_insert"
  on player_spotify_tokens for insert
  with check (
    exists (
      select 1 from players p
      where p.id = player_spotify_tokens.player_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "player_spotify_tokens_owner_update" on player_spotify_tokens;
create policy "player_spotify_tokens_owner_update"
  on player_spotify_tokens for update
  using (
    exists (
      select 1 from players p
      where p.id = player_spotify_tokens.player_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "player_spotify_tokens_owner_delete" on player_spotify_tokens;
create policy "player_spotify_tokens_owner_delete"
  on player_spotify_tokens for delete
  using (
    exists (
      select 1 from players p
      where p.id = player_spotify_tokens.player_id and p.user_id = auth.uid()
    )
  );

-- No service-role policy needed: the service role key bypasses RLS entirely.
-- Token refresh + the public now-playing read both run with that key.
