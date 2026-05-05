-- =============================================================================
-- 20260505000000_onboarding_and_wireup.sql
-- Onboarding pipeline + production wire-up.
--
-- Adds: athlete bio/stats columns on `players`, `onboarding_pipeline_runs`,
-- `claim_tokens`, `media`, `headshots` storage bucket, RLS for player-owned
-- mutations, and a `confirmed_fields` JSON map (T1 hallucination-gate UI).
--
-- All statements are idempotent so this migration can be re-run safely.
-- =============================================================================

-- --- Extensions -------------------------------------------------------------
create extension if not exists "pgcrypto";

-- --- Players: athlete bio + stats columns -----------------------------------
alter table players
  add column if not exists dob date,
  add column if not exists height_in smallint,
  add column if not exists weight_lbs smallint,
  add column if not exists games_played integer,
  add column if not exists position text,
  add column if not exists level text,
  add column if not exists current_status text,
  add column if not exists confirmed_fields jsonb default '{}'::jsonb,
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Normalize any existing values that pre-date our vocabulary.
update players
   set level = lower(level)
 where level is not null
   and level <> lower(level);

-- Restrict `level` to the founder-spec vocabulary.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_level_check'
  ) then
    alter table players
      add constraint players_level_check
      check (level is null or level in ('hs','college','pro','former'));
  end if;
end $$;

create index if not exists players_user_id_idx on players(user_id);
create index if not exists players_visibility_idx on players(visibility);

-- --- Onboarding pipeline runs ----------------------------------------------
create table if not exists onboarding_pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','scraping','generating','complete','error','manual')),
  identity jsonb not null default '{}'::jsonb,
  events jsonb not null default '[]'::jsonb,
  draft jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists pipeline_runs_user_idx on onboarding_pipeline_runs(user_id);
create index if not exists pipeline_runs_player_idx on onboarding_pipeline_runs(player_id);
create index if not exists pipeline_runs_status_idx on onboarding_pipeline_runs(status);

-- Bump updated_at on every change so the SSE poller can use it for cache hints.
create or replace function set_updated_at_now()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pipeline_runs_set_updated_at on onboarding_pipeline_runs;
create trigger pipeline_runs_set_updated_at
  before update on onboarding_pipeline_runs
  for each row execute function set_updated_at_now();

-- --- Claim tokens (magic-link claim flow) -----------------------------------
create table if not exists claim_tokens (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  token text not null unique,
  email text,
  expires_at timestamptz not null default (now() + interval '30 days'),
  claimed_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists claim_tokens_player_idx on claim_tokens(player_id);
create index if not exists claim_tokens_token_idx on claim_tokens(token);

-- --- Media (photos with provenance) -----------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'media_provenance') then
    create type media_provenance as enum (
      'founder_archive',
      'cal_archive',
      'athlete_uploaded',
      'fan_uploaded'
    );
  end if;
end $$;

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  url text not null,
  title text,
  credits text,
  width integer,
  height integer,
  display_order integer default 0,
  provenance media_provenance not null default 'athlete_uploaded',
  created_at timestamptz default now()
);

create index if not exists media_player_idx on media(player_id);
create index if not exists media_player_order_idx on media(player_id, display_order);

-- --- Storage bucket: headshots ----------------------------------------------
insert into storage.buckets (id, name, public)
values ('headshots', 'headshots', true)
on conflict (id) do nothing;

-- --- RLS ---------------------------------------------------------------------
alter table onboarding_pipeline_runs enable row level security;
alter table claim_tokens enable row level security;
alter table media enable row level security;

-- onboarding_pipeline_runs: readable + writable only by the user who owns the run.
drop policy if exists "pipeline_runs_owner_select" on onboarding_pipeline_runs;
create policy "pipeline_runs_owner_select"
  on onboarding_pipeline_runs for select
  using (auth.uid() = user_id);

drop policy if exists "pipeline_runs_owner_insert" on onboarding_pipeline_runs;
create policy "pipeline_runs_owner_insert"
  on onboarding_pipeline_runs for insert
  with check (auth.uid() = user_id);

drop policy if exists "pipeline_runs_owner_update" on onboarding_pipeline_runs;
create policy "pipeline_runs_owner_update"
  on onboarding_pipeline_runs for update
  using (auth.uid() = user_id);

-- claim_tokens: only the assigned user (after claim) or anon validating the token
-- can SELECT a single row. We keep token reads open via service_role only — the
-- public-facing claim API uses a service-role server client so we don't open
-- broad reads here.
drop policy if exists "claim_tokens_self_select" on claim_tokens;
create policy "claim_tokens_self_select"
  on claim_tokens for select
  using (claimed_by = auth.uid());

-- media: athletes can manage their own player's media; world-readable for
-- visible players (locker pages render media without auth).
drop policy if exists "media_public_select" on media;
create policy "media_public_select"
  on media for select
  using (
    exists (
      select 1 from players p
      where p.id = media.player_id and p.visibility = true
    )
  );

drop policy if exists "media_owner_insert" on media;
create policy "media_owner_insert"
  on media for insert
  with check (
    exists (
      select 1 from players p
      where p.id = media.player_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "media_owner_update" on media;
create policy "media_owner_update"
  on media for update
  using (
    exists (
      select 1 from players p
      where p.id = media.player_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "media_owner_delete" on media;
create policy "media_owner_delete"
  on media for delete
  using (
    exists (
      select 1 from players p
      where p.id = media.player_id and p.user_id = auth.uid()
    )
  );

-- Players: ensure RLS is on; allow athletes to update their own row. Visibility
-- and slug fields are protected at the API layer (publish endpoint) so the
-- write policy here is intentionally simple.
alter table players enable row level security;

drop policy if exists "players_public_select" on players;
create policy "players_public_select"
  on players for select
  using (visibility = true or user_id = auth.uid());

drop policy if exists "players_owner_update" on players;
create policy "players_owner_update"
  on players for update
  using (user_id = auth.uid());

drop policy if exists "players_owner_insert" on players;
create policy "players_owner_insert"
  on players for insert
  with check (user_id = auth.uid());

-- --- Storage RLS for headshots ----------------------------------------------
-- Users can only write to their own folder: headshots/<auth.uid()>/...
drop policy if exists "headshots_owner_insert" on storage.objects;
create policy "headshots_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'headshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "headshots_owner_update" on storage.objects;
create policy "headshots_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'headshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "headshots_owner_delete" on storage.objects;
create policy "headshots_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'headshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "headshots_public_read" on storage.objects;
create policy "headshots_public_read"
  on storage.objects for select
  using (bucket_id = 'headshots');
