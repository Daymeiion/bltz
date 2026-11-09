-- =============================================================================
-- 20261109140000_crm_pilot_school_signals.sql
-- Enterprise CRM pilot: schools add their own signals (a date worth featuring
-- a former player on), described in plain words and drafted with AI, with the
-- sources that back them. BLTZ tracks every school-added signal in admin.
--
-- Requires 20261102120000_crm_pilot_school_permissions.sql. Server-only.
-- =============================================================================

create table if not exists public.organization_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  -- Null for a program-wide date (a reunion, a stadium anniversary).
  player_id uuid references public.players(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 2 and 160),
  kind text not null check (kind in ('anniversary', 'birthday', 'milestone', 'event', 'business', 'other')),
  target_date date not null,
  -- Yearly dates come back every year (anniversaries, birthdays); once is a single date.
  recurrence text not null default 'yearly' check (recurrence in ('yearly', 'once')),
  why text check (why is null or char_length(why) <= 1000),
  -- Up to 10 { label, url } references the school confirmed.
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) <= 10),
  -- What staff typed, kept so BLTZ can see how schools describe dates.
  request text check (request is null or char_length(request) <= 2000),
  origin text not null default 'manual' check (origin in ('ai', 'manual')),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_signals_org_idx
  on public.organization_signals (organization_id, status, target_date);
create index if not exists organization_signals_created_idx
  on public.organization_signals (created_at desc);

create or replace trigger organization_signals_prevent_hard_delete
  before delete on public.organization_signals
  for each row execute function private.prevent_hard_delete();

alter table public.organization_signals enable row level security;
revoke all on table public.organization_signals from public, anon, authenticated, service_role;
grant select, insert, update on table public.organization_signals to service_role;
