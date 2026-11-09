-- =============================================================================
-- 20261110120000_crm_pilot_dismissals.sql
-- Enterprise CRM pilot: a school hides signals and Moments it does not want to
-- act on. Dismissals belong to the school only: nothing in BLTZ's shared
-- Intelligence graph changes. BLTZ reads them as feedback (for example, a
-- Moment dismissed as "wrong date" is worth reviewing in the Lab).
--
-- A "this year" signal dismissal names one dated signal; "always" names the
-- signal without its date, so it stays hidden every year. Restoring keeps the
-- row with restored_at set.
--
-- Requires 20261102120000_crm_pilot_school_permissions.sql. Server-only.
-- =============================================================================

create table if not exists public.organization_dismissals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  player_id uuid references public.players(id) on delete restrict,
  target_type text not null check (target_type in ('signal', 'moment')),
  target_key text not null check (char_length(target_key) between 1 and 300),
  scope text not null default 'always' check (scope in ('this_year', 'always')),
  -- What staff saw, so admin can read the dismissal without the engine.
  label text check (label is null or char_length(label) <= 200),
  reason text check (reason is null or char_length(reason) <= 300),
  dismissed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  restored_at timestamptz
);

create index if not exists organization_dismissals_org_idx
  on public.organization_dismissals (organization_id, player_id)
  where restored_at is null;
create index if not exists organization_dismissals_created_idx
  on public.organization_dismissals (created_at desc);

create or replace trigger organization_dismissals_prevent_hard_delete
  before delete on public.organization_dismissals
  for each row execute function private.prevent_hard_delete();

alter table public.organization_dismissals enable row level security;
revoke all on table public.organization_dismissals from public, anon, authenticated, service_role;
grant select, insert, update on table public.organization_dismissals to service_role;
