-- =============================================================================
-- 20261110130000_crm_pilot_briefs.sql
-- Enterprise CRM pilot: partnership briefs. A school drafts a brief about one
-- former player for an outside brand (reach, brands already attached, Locker
-- placements and planned activations, with AI-written pitch sections), then
-- shares a private link. The brief is a snapshot taken when it is shared, so
-- the brand sees the numbers as sent.
--
-- The link carries a random token; only its SHA-256 hash is stored. Links
-- expire and can be revoked. Opens are counted for the school and BLTZ.
-- Staff must confirm the athlete approved sharing before a link is created.
--
-- Requires 20261102120000_crm_pilot_school_permissions.sql. Server-only.
-- =============================================================================

create table if not exists public.organization_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  player_id uuid not null references public.players(id) on delete restrict,
  brand_name text not null check (char_length(btrim(brand_name)) between 1 and 120),
  contact_name text check (contact_name is null or char_length(contact_name) <= 120),
  contact_email text check (contact_email is null or (char_length(contact_email) <= 254 and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  goal text check (goal is null or char_length(goal) <= 1000),
  budget text check (budget is null or char_length(budget) <= 120),
  -- The full brief as shared: facts, AI-written sections as edited, partners.
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  origin text not null default 'ai' check (origin in ('ai', 'manual')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  status text not null default 'shared' check (status in ('shared', 'revoked')),
  consent_confirmed_by uuid not null references auth.users(id) on delete restrict,
  consent_confirmed_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  view_count integer not null default 0 check (view_count >= 0),
  last_viewed_at timestamptz
);

create index if not exists organization_briefs_org_idx
  on public.organization_briefs (organization_id, player_id, created_at desc);
create index if not exists organization_briefs_created_idx
  on public.organization_briefs (created_at desc);

create or replace trigger organization_briefs_prevent_hard_delete
  before delete on public.organization_briefs
  for each row execute function private.prevent_hard_delete();

-- Counts one open of a live brief and returns its content; null when the link
-- is unknown, revoked or expired. One round trip, no row data for dead links.
create or replace function public.open_organization_brief(p_token_hash text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result jsonb;
begin
  update public.organization_briefs
     set view_count = view_count + 1, last_viewed_at = now()
   where token_hash = p_token_hash and status = 'shared' and expires_at > now()
  returning content into result;
  return result;
end;
$$;

alter table public.organization_briefs enable row level security;
revoke all on table public.organization_briefs from public, anon, authenticated, service_role;
grant select, insert, update on table public.organization_briefs to service_role;

revoke all on function public.open_organization_brief(text) from public, anon, authenticated;
grant execute on function public.open_organization_brief(text) to service_role;
