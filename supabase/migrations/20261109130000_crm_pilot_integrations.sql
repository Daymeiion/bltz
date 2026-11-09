-- =============================================================================
-- 20261109130000_crm_pilot_integrations.sql
-- Enterprise CRM pilot: each school connects the tools its staff already use,
-- so sharing an activation can post to a Slack or Microsoft Teams channel and
-- create a draft on the school's WordPress site.
--
-- Connections are paste-in: an incoming-webhook link for Slack or Teams, and a
-- WordPress site address with an application password. These are secrets:
-- the table is server-only, and the workspace API never returns them to the
-- browser (it shows only which tools are connected).
--
-- Requires 20261102120000_crm_pilot_school_permissions.sql. Server-only.
-- =============================================================================

create table if not exists public.organization_integrations (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  kind text not null check (kind in ('slack', 'teams', 'wordpress')),
  -- A short name staff recognize, such as the channel or the site address.
  label text check (label is null or char_length(btrim(label)) between 1 and 120),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  connected_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (organization_id, kind)
);

alter table public.organization_integrations enable row level security;
revoke all on table public.organization_integrations from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.organization_integrations to service_role;
