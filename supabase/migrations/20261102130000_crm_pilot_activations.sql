-- =============================================================================
-- 20261102130000_crm_pilot_activations.sql
-- Enterprise CRM pilot: school activations (posts, campaigns, events) planned
-- from Intelligence signals, the reach staff record after posting, Locker
-- visits from each activation's tracked link, and athlete social reach.
--
-- Requires 20261102120000_crm_pilot_school_permissions.sql. Server-only: every
-- read and write goes through the authorized workspace API.
-- =============================================================================

create table if not exists public.organization_activations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  player_id uuid not null references public.players(id) on delete restrict,
  kind text not null check (kind in ('post', 'video', 'article', 'campaign', 'event')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  brief text check (brief is null or char_length(brief) <= 4000),
  signal_key text check (signal_key is null or char_length(signal_key) <= 300),
  moment_id uuid,
  due_on date,
  status text not null default 'planned' check (status in ('planned', 'posted', 'cancelled')),
  channel text check (channel is null or channel in ('instagram', 'x', 'facebook', 'linkedin', 'tiktok', 'youtube', 'email', 'website', 'in_person', 'other')),
  post_url text check (post_url is null or (char_length(post_url) <= 2048 and post_url ~ '^https://')),
  posted_at timestamptz,
  impressions integer check (impressions is null or impressions >= 0),
  engagements integer check (engagements is null or engagements >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_activations_posted_complete check (status <> 'posted' or posted_at is not null)
);

create index if not exists organization_activations_org_idx
  on public.organization_activations (organization_id, created_at desc);
create index if not exists organization_activations_player_idx
  on public.organization_activations (organization_id, player_id, created_at desc);

create or replace trigger organization_activations_prevent_hard_delete
  before delete on public.organization_activations
  for each row execute function private.prevent_hard_delete();

-- One row per fan visit through an activation's tracked Locker link.
create table if not exists public.organization_activation_visits (
  id bigint generated always as identity primary key,
  activation_id uuid not null references public.organization_activations(id) on delete restrict,
  visited_at timestamptz not null default now(),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 255)
);

create index if not exists organization_activation_visits_activation_idx
  on public.organization_activation_visits (activation_id, visited_at desc);

-- Follower counts staff record for an athlete, newest first per platform.
create table if not exists public.organization_athlete_social_reach (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  player_id uuid not null references public.players(id) on delete restrict,
  platform text not null check (platform in ('instagram', 'x', 'facebook', 'linkedin', 'tiktok', 'youtube')),
  handle text check (handle is null or char_length(btrim(handle)) between 1 and 120),
  followers integer not null check (followers >= 0),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now()
);

create index if not exists organization_athlete_social_reach_player_idx
  on public.organization_athlete_social_reach (organization_id, player_id, platform, recorded_at desc);

create or replace trigger organization_athlete_social_reach_prevent_hard_delete
  before delete on public.organization_athlete_social_reach
  for each row execute function private.prevent_hard_delete();

-- Visit totals per activation without shipping visit rows to the app.
create or replace function public.organization_activation_visit_counts(p_organization_id uuid)
returns table (activation_id uuid, visits bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select visit.activation_id, count(*)::bigint
    from public.organization_activation_visits visit
    join public.organization_activations activation on activation.id = visit.activation_id
   where activation.organization_id = p_organization_id
   group by visit.activation_id;
$$;

alter table public.organization_activations enable row level security;
alter table public.organization_activation_visits enable row level security;
alter table public.organization_athlete_social_reach enable row level security;

revoke all on table public.organization_activations from public, anon, authenticated, service_role;
revoke all on table public.organization_activation_visits from public, anon, authenticated, service_role;
revoke all on table public.organization_athlete_social_reach from public, anon, authenticated, service_role;

grant select, insert, update on table public.organization_activations to service_role;
grant select, insert on table public.organization_activation_visits to service_role;
grant select, insert on table public.organization_athlete_social_reach to service_role;

revoke all on function public.organization_activation_visit_counts(uuid) from public, anon, authenticated;
grant execute on function public.organization_activation_visit_counts(uuid) to service_role;
