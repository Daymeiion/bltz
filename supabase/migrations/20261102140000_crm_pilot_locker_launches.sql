-- =============================================================================
-- 20261102140000_crm_pilot_locker_launches.sql
-- Enterprise CRM pilot: schools launch Lockers for former players and connect
-- media (highlights, images, archive) and the players' businesses.
--
-- A launch is a request to BLTZ: BLTZ builds the Locker with the existing
-- one-click builder, clears the media, and sends the claim invite. School-added
-- media and businesses stay "pending" until BLTZ approves them for the Locker.
-- Dated items also drive school-side signals (anniversaries).
--
-- Requires 20261102120000_crm_pilot_school_permissions.sql. Server-only.
-- =============================================================================

create table if not exists public.organization_locker_launches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  -- Set when the athlete already has a BLTZ player record; null for a new build.
  player_id uuid references public.players(id) on delete restrict,
  player_name text not null check (char_length(btrim(player_name)) between 2 and 120),
  position text check (position is null or char_length(btrim(position)) between 1 and 40),
  years text check (years is null or char_length(btrim(years)) between 1 and 40),
  contact_email text check (contact_email is null or (char_length(contact_email) <= 254 and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  message text check (message is null or char_length(message) <= 2000),
  status text not null default 'requested' check (status in ('requested', 'building', 'invited', 'live', 'declined')),
  status_note text check (status_note is null or char_length(status_note) <= 500),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_locker_launches_org_idx
  on public.organization_locker_launches (organization_id, created_at desc);
create index if not exists organization_locker_launches_status_idx
  on public.organization_locker_launches (status, created_at);

create or replace trigger organization_locker_launches_prevent_hard_delete
  before delete on public.organization_locker_launches
  for each row execute function private.prevent_hard_delete();

create table if not exists public.organization_athlete_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  player_id uuid references public.players(id) on delete restrict,
  launch_id uuid references public.organization_locker_launches(id) on delete restrict,
  kind text not null check (kind in ('highlight', 'image', 'archive', 'business')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  url text check (url is null or (char_length(url) <= 2048 and url ~ '^https://')),
  description text check (description is null or char_length(description) <= 1000),
  -- Founded, released or recorded date; anniversaries become school signals.
  occurred_on date,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint organization_athlete_media_subject check (player_id is not null or launch_id is not null)
);

create index if not exists organization_athlete_media_player_idx
  on public.organization_athlete_media (organization_id, player_id, created_at desc);
create index if not exists organization_athlete_media_launch_idx
  on public.organization_athlete_media (launch_id);

create or replace trigger organization_athlete_media_prevent_hard_delete
  before delete on public.organization_athlete_media
  for each row execute function private.prevent_hard_delete();

alter table public.organization_locker_launches enable row level security;
alter table public.organization_athlete_media enable row level security;

revoke all on table public.organization_locker_launches from public, anon, authenticated, service_role;
revoke all on table public.organization_athlete_media from public, anon, authenticated, service_role;

grant select, insert, update on table public.organization_locker_launches to service_role;
grant select, insert, update on table public.organization_athlete_media to service_role;
