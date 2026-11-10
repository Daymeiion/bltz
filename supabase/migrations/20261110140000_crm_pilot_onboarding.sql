-- =============================================================================
-- 20261110140000_crm_pilot_onboarding.sql
-- Enterprise CRM pilot onboarding:
--   1. organization_applications: a school or NIL agency applies on /pilot;
--      BLTZ approves in admin. Approval turns on the workspace.
--   2. organization_athletes: each organization's roster. Schools get every
--      player in the master list (nfl_players) whose college matches, with or
--      without a Locker, plus players staff add themselves.
--   3. organization_athlete_invites: personal, tracked Locker signup links a
--      school sends to a player (BLTZ email or a link staff copy). Only a
--      SHA-256 hash of each link's token is stored.
--
-- Requires 20261102120000_crm_pilot_school_permissions.sql. Server-only.
-- =============================================================================

create table if not exists public.organization_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete restrict,
  organization_kind text not null check (organization_kind in ('school_athletics', 'nil_agency')),
  -- The college directory row a school picked; null for agencies.
  college_directory_id bigint references public."Colleges"(id) on delete set null,
  -- The college name as the master player list spells it; set at approval and used to build the roster.
  master_list_college text check (master_list_college is null or char_length(master_list_college) <= 200),
  applicant_name text not null check (char_length(btrim(applicant_name)) between 2 and 120),
  applicant_email text not null check (char_length(applicant_email) <= 254 and applicant_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  applicant_title text check (applicant_title is null or char_length(applicant_title) <= 120),
  message text check (message is null or char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  review_note text check (review_note is null or char_length(review_note) <= 500),
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists organization_applications_status_idx
  on public.organization_applications (status, created_at desc);
create index if not exists organization_applications_email_idx
  on public.organization_applications (lower(applicant_email));

create table if not exists public.organization_athletes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  -- The master-list player, when the athlete is in it.
  gsis_id text references public.nfl_players(gsis_id) on delete set null,
  -- The BLTZ player record, once there is one.
  player_id uuid references public.players(id) on delete set null,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  position text check (position is null or char_length(position) <= 40),
  years text check (years is null or char_length(years) <= 40),
  sport text check (sport is null or char_length(sport) <= 60),
  -- Where staff can reach the player to invite them. Never shown outside the organization.
  contact_email text check (contact_email is null or (char_length(contact_email) <= 254 and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  relationship text not null default 'alumni' check (relationship in ('alumni', 'representation')),
  source text not null check (source in ('master_list', 'staff_added')),
  status text not null default 'active' check (status in ('active', 'removed')),
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists organization_athletes_gsis_key
  on public.organization_athletes (organization_id, gsis_id) where gsis_id is not null;
create index if not exists organization_athletes_org_idx
  on public.organization_athletes (organization_id, status, display_name);
create index if not exists organization_athletes_player_idx
  on public.organization_athletes (player_id) where player_id is not null;

create or replace trigger organization_athletes_prevent_hard_delete
  before delete on public.organization_athletes
  for each row execute function private.prevent_hard_delete();

create table if not exists public.organization_athlete_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  organization_athlete_id uuid not null references public.organization_athletes(id) on delete restrict,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  channel text not null check (channel in ('email', 'link')),
  email text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  status text not null default 'created' check (status in ('created', 'sent', 'send_failed', 'opened', 'signed_up', 'revoked')),
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  signed_up_at timestamptz,
  signed_up_user_id uuid references auth.users(id) on delete set null
);

create index if not exists organization_athlete_invites_org_idx
  on public.organization_athlete_invites (organization_id, created_at desc);
create index if not exists organization_athlete_invites_athlete_idx
  on public.organization_athlete_invites (organization_athlete_id, created_at desc);

create or replace trigger organization_athlete_invites_prevent_hard_delete
  before delete on public.organization_athlete_invites
  for each row execute function private.prevent_hard_delete();

-- The account that already uses an email address, if any. Lets approval attach
-- an applicant's existing account without listing users.
create or replace function public.pilot_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users
   where lower(email) = lower(btrim(p_email)) and email_confirmed_at is not null
   order by created_at
   limit 1;
$$;

-- Opens a live invite: marks it opened (first time) and returns what the
-- landing page shows. Null for unknown, expired or revoked links.
create or replace function public.open_organization_invite(p_token_hash text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result jsonb;
begin
  update public.organization_athlete_invites invite
     set opened_at = coalesce(invite.opened_at, now()),
         status = case when invite.status in ('created', 'sent') then 'opened' else invite.status end
   where invite.token_hash = p_token_hash
     and invite.status <> 'revoked'
     and invite.expires_at > now()
  returning jsonb_build_object('invite_id', invite.id, 'organization_id', invite.organization_id,
                               'organization_athlete_id', invite.organization_athlete_id, 'status', invite.status)
    into result;
  return result;
end;
$$;

-- Accounts created from the pilot application are organization staff, not athletes.
-- Everyone else still starts as a player, exactly as before. The flag comes from the
-- sign-up form, so it can only ever lower what a new account starts with.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer
as $$
BEGIN
  INSERT INTO public.profiles (id, role, email, display_name)
  VALUES (
    NEW.id,
    CASE WHEN NEW.raw_user_meta_data->>'account_kind' = 'organization' THEN 'fan' ELSE 'player' END,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

alter table public.organization_applications enable row level security;
alter table public.organization_athletes enable row level security;
alter table public.organization_athlete_invites enable row level security;

revoke all on table public.organization_applications from public, anon, authenticated, service_role;
revoke all on table public.organization_athletes from public, anon, authenticated, service_role;
revoke all on table public.organization_athlete_invites from public, anon, authenticated, service_role;

grant select, insert, update on table public.organization_applications to service_role;
grant select, insert, update on table public.organization_athletes to service_role;
grant select, insert, update on table public.organization_athlete_invites to service_role;

revoke all on function public.pilot_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.pilot_user_id_by_email(text) to service_role;
revoke all on function public.open_organization_invite(text) from public, anon, authenticated;
grant execute on function public.open_organization_invite(text) to service_role;
