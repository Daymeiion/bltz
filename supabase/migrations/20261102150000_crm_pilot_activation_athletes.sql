-- =============================================================================
-- 20261102150000_crm_pilot_activation_athletes.sql
-- Enterprise CRM pilot: more than one former player can be featured in an
-- activation (a reunion event, a team campaign). The activation's own
-- player_id stays the lead athlete; this table lists everyone else featured.
--
-- Requires 20261102130000_crm_pilot_activations.sql. Server-only.
-- =============================================================================

create table if not exists public.organization_activation_athletes (
  activation_id uuid not null references public.organization_activations(id) on delete restrict,
  player_id uuid not null references public.players(id) on delete restrict,
  added_by uuid not null references auth.users(id) on delete restrict,
  added_at timestamptz not null default now(),
  primary key (activation_id, player_id)
);

create index if not exists organization_activation_athletes_player_idx
  on public.organization_activation_athletes (player_id);

alter table public.organization_activation_athletes enable row level security;
revoke all on table public.organization_activation_athletes from public, anon, authenticated, service_role;
grant select, insert on table public.organization_activation_athletes to service_role;
