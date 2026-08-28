-- =============================================================================
-- 20260818000003_phase2_career_context_foundation.sql
-- Phase 2D: normalized season, roster-stint, statistics, and sports-event
-- context. This migration preserves public.players as the athlete identity and
-- leaves legacy players.team_id and player_season_stats unchanged.
-- =============================================================================

create extension if not exists btree_gist with schema extensions;

-- Existing team IDs are retained. This composite key lets tenant-owned child
-- rows prove that their organization and team belong together.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teams_organization_id_id_key'
      and conrelid = 'public.teams'::regclass
  ) then
    alter table public.teams
      add constraint teams_organization_id_id_key
      unique (organization_id, id);
  end if;
end
$$;

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  sport text not null
    check (char_length(sport) between 1 and 80)
    check (sport = lower(btrim(sport)))
    check (sport ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  season_code text not null
    check (char_length(season_code) between 1 and 40)
    check (season_code = lower(btrim(season_code)))
    check (season_code ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$'),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned'
    check (status in ('planned', 'active', 'completed', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_date_order_check check (ends_on >= starts_on),
  constraint seasons_organization_sport_code_key
    unique (organization_id, sport, season_code),
  constraint seasons_organization_id_id_key
    unique (organization_id, id)
);

comment on table public.seasons is
  'Organization-scoped sports seasons. season_code is a normalized identifier such as 2026 or 2025-26, not a provider ID.';

create table if not exists public.team_seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  team_id uuid not null,
  season_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_seasons_team_fkey
    foreign key (organization_id, team_id)
    references public.teams(organization_id, id)
    on delete restrict,
  constraint team_seasons_season_fkey
    foreign key (organization_id, season_id)
    references public.seasons(organization_id, id)
    on delete restrict,
  constraint team_seasons_organization_team_season_key
    unique (organization_id, team_id, season_id),
  constraint team_seasons_organization_id_id_key
    unique (organization_id, id),
  constraint team_seasons_organization_id_id_team_key
    unique (organization_id, id, team_id)
);

comment on table public.team_seasons is
  'Joins retained team identities to organization-scoped seasons without changing legacy players.team_id.';

create table if not exists public.athlete_team_seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  team_season_id uuid not null,
  player_id uuid not null
    references public.players(id) on delete restrict,
  roster_status text not null default 'active'
    check (roster_status in (
      'active',
      'inactive',
      'practice_squad',
      'injured',
      'transferred',
      'released',
      'graduated',
      'completed'
    )),
  jersey_number text
    check (
      jersey_number is null
      or jersey_number ~ '^[0-9]{1,3}$'
    ),
  position text
    check (position is null or char_length(btrim(position)) between 1 and 80),
  starts_on date not null,
  ends_on date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athlete_team_seasons_team_season_fkey
    foreign key (organization_id, team_season_id)
    references public.team_seasons(organization_id, id)
    on delete restrict,
  constraint athlete_team_seasons_date_order_check
    check (ends_on is null or ends_on >= starts_on),
  constraint athlete_team_seasons_organization_id_id_key
    unique (organization_id, id),
  constraint athlete_team_seasons_organization_player_id_key
    unique (organization_id, player_id, id),
  constraint athlete_team_seasons_no_overlapping_stints
    exclude using gist (
      player_id with =,
      team_season_id with =,
      daterange(starts_on, coalesce(ends_on, 'infinity'::date), '[]') with &&
    )
);

comment on table public.athlete_team_seasons is
  'Dated athlete roster stints. public.players.id remains the canonical athlete identifier.';
comment on constraint athlete_team_seasons_no_overlapping_stints
  on public.athlete_team_seasons is
  'Prevents overlapping inclusive date ranges for the same athlete and team-season.';

create table if not exists public.athlete_season_stats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  athlete_team_season_id uuid not null,
  source text not null
    check (char_length(source) between 1 and 80)
    check (source = lower(btrim(source)))
    check (source ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$'),
  season_phase text not null
    check (char_length(season_phase) between 1 and 80)
    check (season_phase = lower(btrim(season_phase)))
    check (season_phase ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$'),
  stats jsonb not null default '{}'::jsonb
    check (jsonb_typeof(stats) = 'object'),
  last_synced_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athlete_season_stats_roster_stint_fkey
    foreign key (organization_id, athlete_team_season_id)
    references public.athlete_team_seasons(organization_id, id)
    on delete restrict,
  constraint athlete_season_stats_stint_source_phase_key
    unique (athlete_team_season_id, source, season_phase)
);

comment on table public.athlete_season_stats is
  'Normalized stats per roster stint, source, and season phase. Legacy player_season_stats remains an unchanged compatibility source.';

-- Sports events are intentionally shared identities. Steward organization is
-- optional, and participating organizations attach through sports_event_teams.
create table if not exists public.sports_events (
  id uuid primary key default gen_random_uuid(),
  steward_organization_id uuid
    references public.organizations(id) on delete set null,
  sport text not null
    check (char_length(sport) between 1 and 80)
    check (sport = lower(btrim(sport)))
    check (sport ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  name text not null
    check (char_length(btrim(name)) between 1 and 240),
  event_type text not null
    check (char_length(event_type) between 1 and 80)
    check (event_type = lower(btrim(event_type)))
    check (event_type ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_events_time_order_check
    check (ends_at is null or ends_at >= starts_at)
);

comment on table public.sports_events is
  'Shared sports-event identity. Cross-organization participation is modeled through joins; steward organization is optional.';

create table if not exists public.sports_event_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null
    references public.sports_events(id) on delete restrict,
  organization_id uuid not null,
  team_id uuid not null,
  team_season_id uuid,
  participation_role text not null default 'participant'
    check (char_length(participation_role) between 1 and 80)
    check (participation_role = lower(btrim(participation_role)))
    check (participation_role ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_event_teams_team_fkey
    foreign key (organization_id, team_id)
    references public.teams(organization_id, id)
    on delete restrict,
  constraint sports_event_teams_team_season_fkey
    foreign key (organization_id, team_season_id, team_id)
    references public.team_seasons(organization_id, id, team_id)
    on delete restrict,
  constraint sports_event_teams_event_team_key
    unique (event_id, team_id),
  constraint sports_event_teams_event_organization_team_key
    unique (event_id, organization_id, team_id)
);

comment on table public.sports_event_teams is
  'Many-to-many participating teams for shared sports events. organization_id is repeated and composite-validated for tenant isolation.';

create table if not exists public.sports_event_athletes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null
    references public.sports_events(id) on delete restrict,
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  team_id uuid,
  player_id uuid not null
    references public.players(id) on delete restrict,
  athlete_team_season_id uuid,
  participation_role text not null default 'participant'
    check (char_length(participation_role) between 1 and 80)
    check (participation_role = lower(btrim(participation_role)))
    check (participation_role ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_event_athletes_event_team_fkey
    foreign key (event_id, organization_id, team_id)
    references public.sports_event_teams(event_id, organization_id, team_id)
    on delete restrict,
  constraint sports_event_athletes_roster_stint_fkey
    foreign key (organization_id, player_id, athlete_team_season_id)
    references public.athlete_team_seasons(organization_id, player_id, id)
    on delete restrict,
  constraint sports_event_athletes_event_organization_player_key
    unique (event_id, organization_id, player_id)
);

comment on table public.sports_event_athletes is
  'Explicit athlete participation in a shared sports event. Optional team and roster-stint links independently validate organization/team participation and organization/player identity. Events may be cross-season, individual, or unaffiliated, so both remain nullable. If both are present, exact team-to-stint consistency is deferred until the event workflow defines transfer-day handling.';

-- Foreign-key and tenant-query indexes not already covered by leading unique
-- constraints.
create index if not exists seasons_created_by_idx
  on public.seasons (created_by)
  where created_by is not null;
create index if not exists seasons_org_status_dates_idx
  on public.seasons (organization_id, status, starts_on, ends_on);

create index if not exists team_seasons_season_id_idx
  on public.team_seasons (season_id);
create index if not exists team_seasons_created_by_idx
  on public.team_seasons (created_by)
  where created_by is not null;

create index if not exists athlete_team_seasons_player_dates_idx
  on public.athlete_team_seasons (player_id, starts_on, ends_on);
create index if not exists athlete_team_seasons_team_season_idx
  on public.athlete_team_seasons (organization_id, team_season_id);
create index if not exists athlete_team_seasons_created_by_idx
  on public.athlete_team_seasons (created_by)
  where created_by is not null;

create index if not exists athlete_season_stats_org_idx
  on public.athlete_season_stats (organization_id);
create index if not exists athlete_season_stats_created_by_idx
  on public.athlete_season_stats (created_by)
  where created_by is not null;

create index if not exists sports_events_steward_start_idx
  on public.sports_events (steward_organization_id, starts_at)
  where steward_organization_id is not null;
create index if not exists sports_events_sport_start_idx
  on public.sports_events (sport, starts_at);
create index if not exists sports_events_created_by_idx
  on public.sports_events (created_by)
  where created_by is not null;

create index if not exists sports_event_teams_organization_idx
  on public.sports_event_teams (organization_id, event_id);
create index if not exists sports_event_teams_team_id_idx
  on public.sports_event_teams (team_id);
create index if not exists sports_event_teams_team_season_idx
  on public.sports_event_teams (organization_id, team_season_id, team_id)
  where team_season_id is not null;
create index if not exists sports_event_teams_created_by_idx
  on public.sports_event_teams (created_by)
  where created_by is not null;

create index if not exists sports_event_athletes_organization_event_idx
  on public.sports_event_athletes (organization_id, event_id);
create index if not exists sports_event_athletes_team_id_idx
  on public.sports_event_athletes (team_id)
  where team_id is not null;
create index if not exists sports_event_athletes_event_team_idx
  on public.sports_event_athletes (event_id, organization_id, team_id)
  where team_id is not null;
create index if not exists sports_event_athletes_player_event_idx
  on public.sports_event_athletes (player_id, event_id);
create index if not exists sports_event_athletes_roster_stint_idx
  on public.sports_event_athletes (
    organization_id,
    player_id,
    athlete_team_season_id
  )
  where athlete_team_season_id is not null;
create index if not exists sports_event_athletes_created_by_idx
  on public.sports_event_athletes (created_by)
  where created_by is not null;

create or replace trigger seasons_set_updated_at
  before update on public.seasons
  for each row execute function public.set_updated_at();
create or replace trigger team_seasons_set_updated_at
  before update on public.team_seasons
  for each row execute function public.set_updated_at();
create or replace trigger athlete_team_seasons_set_updated_at
  before update on public.athlete_team_seasons
  for each row execute function public.set_updated_at();
create or replace trigger athlete_season_stats_set_updated_at
  before update on public.athlete_season_stats
  for each row execute function public.set_updated_at();
create or replace trigger sports_events_set_updated_at
  before update on public.sports_events
  for each row execute function public.set_updated_at();
create or replace trigger sports_event_teams_set_updated_at
  before update on public.sports_event_teams
  for each row execute function public.set_updated_at();
create or replace trigger sports_event_athletes_set_updated_at
  before update on public.sports_event_athletes
  for each row execute function public.set_updated_at();

alter table public.seasons enable row level security;
alter table public.team_seasons enable row level security;
alter table public.athlete_team_seasons enable row level security;
alter table public.athlete_season_stats enable row level security;
alter table public.sports_events enable row level security;
alter table public.sports_event_teams enable row level security;
alter table public.sports_event_athletes enable row level security;

-- Tenant-owned rows are readable only through an active membership in an
-- operational organization. Browser mutations are intentionally absent.
create policy "Members can read organization seasons"
  on public.seasons for select to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships membership
      join public.organizations organization
        on organization.id = membership.organization_id
      where membership.organization_id = seasons.organization_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and organization.status in ('approved', 'restricted')
    )
    or (select public.is_internal_admin())
  );

create policy "Members can read organization team seasons"
  on public.team_seasons for select to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships membership
      join public.organizations organization
        on organization.id = membership.organization_id
      where membership.organization_id = team_seasons.organization_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and organization.status in ('approved', 'restricted')
    )
    or (select public.is_internal_admin())
  );

create policy "Members can read organization roster stints"
  on public.athlete_team_seasons for select to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships membership
      join public.organizations organization
        on organization.id = membership.organization_id
      where membership.organization_id = athlete_team_seasons.organization_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and organization.status in ('approved', 'restricted')
    )
    or (select public.is_internal_admin())
  );

create policy "Members can read organization athlete season stats"
  on public.athlete_season_stats for select to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships membership
      join public.organizations organization
        on organization.id = membership.organization_id
      where membership.organization_id = athlete_season_stats.organization_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and organization.status in ('approved', 'restricted')
    )
    or (select public.is_internal_admin())
  );

create policy "Members can read participating sports events"
  on public.sports_events for select to authenticated
  using (
    (
      steward_organization_id is not null
      and exists (
        select 1
        from public.organization_memberships membership
        join public.organizations organization
          on organization.id = membership.organization_id
        where membership.organization_id = sports_events.steward_organization_id
          and membership.user_id = (select auth.uid())
          and membership.status = 'active'
          and organization.status in ('approved', 'restricted')
      )
    )
    or (
      exists (
        select 1
        from public.sports_event_teams event_team
        join public.organization_memberships membership
          on membership.organization_id = event_team.organization_id
        join public.organizations organization
          on organization.id = membership.organization_id
        where event_team.event_id = sports_events.id
          and membership.user_id = (select auth.uid())
          and membership.status = 'active'
          and organization.status in ('approved', 'restricted')
      )
    )
    or (select public.is_internal_admin())
  );

create policy "Members can read organization event teams"
  on public.sports_event_teams for select to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships membership
      join public.organizations organization
        on organization.id = membership.organization_id
      where membership.organization_id = sports_event_teams.organization_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and organization.status in ('approved', 'restricted')
    )
    or (select public.is_internal_admin())
  );

create policy "Members can read organization event athletes"
  on public.sports_event_athletes for select to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships membership
      join public.organizations organization
        on organization.id = membership.organization_id
      where membership.organization_id = sports_event_athletes.organization_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and organization.status in ('approved', 'restricted')
    )
    or (select public.is_internal_admin())
  );

revoke all on table public.seasons
  from public, anon, authenticated, service_role;
revoke all on table public.team_seasons
  from public, anon, authenticated, service_role;
revoke all on table public.athlete_team_seasons
  from public, anon, authenticated, service_role;
revoke all on table public.athlete_season_stats
  from public, anon, authenticated, service_role;
revoke all on table public.sports_events
  from public, anon, authenticated, service_role;
revoke all on table public.sports_event_teams
  from public, anon, authenticated, service_role;
revoke all on table public.sports_event_athletes
  from public, anon, authenticated, service_role;

grant select on table
  public.seasons,
  public.team_seasons,
  public.athlete_team_seasons,
  public.athlete_season_stats,
  public.sports_events,
  public.sports_event_teams,
  public.sports_event_athletes
to authenticated;

grant select, insert, update on table
  public.seasons,
  public.team_seasons,
  public.athlete_team_seasons,
  public.athlete_season_stats,
  public.sports_events,
  public.sports_event_teams,
  public.sports_event_athletes
to service_role;
