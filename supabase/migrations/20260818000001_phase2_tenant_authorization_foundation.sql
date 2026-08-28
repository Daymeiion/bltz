-- =============================================================================
-- 20260818000001_phase2_tenant_authorization_foundation.sql
-- Phase 2B: tenant identity and authorization foundation.
--
-- This migration intentionally does not create seasons, sports events, roster
-- relationships, or Media Graph entities. Existing teams keep their identifiers
-- and receive a nullable organization link so deployed data can be mapped in a
-- reviewed follow-up migration.
-- =============================================================================

create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete set null,
  name text not null
    check (char_length(btrim(name)) between 1 and 200),
  organization_type text not null
    check (char_length(btrim(organization_type)) between 1 and 80),
  status text not null default 'draft'
    check (status in (
      'draft',
      'pending_review',
      'approved',
      'rejected',
      'suspended',
      'restricted',
      'closed'
    )),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'Tenant organizations. Schools remain directory records and may be referenced by more than one organization.';
comment on column public.organizations.organization_type is
  'Configurable normalized organization category. It is intentionally text rather than a PostgreSQL enum.';

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  user_id uuid not null
    references auth.users(id) on delete restrict,
  role text not null
    check (role in (
      'owner',
      'organization_admin',
      'media_manager',
      'rights_manager',
      'analyst',
      'viewer'
    )),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'removed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_organization_user_key
    unique (organization_id, user_id)
);

comment on table public.organization_memberships is
  'Organization-scoped authorization. A membership row is retained and transitions through status changes rather than being deleted.';

create table if not exists public.platform_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users(id) on delete restrict,
  role text not null
    check (role in (
      'support_admin',
      'organization_admin',
      'identity_admin',
      'rights_admin',
      'trust_safety_admin',
      'finance_admin',
      'technical_admin',
      'super_admin'
    )),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  assignment_reason text not null
    check (char_length(btrim(assignment_reason)) between 1 and 2000),
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revocation_reason text
    check (
      revocation_reason is null
      or char_length(btrim(revocation_reason)) between 1 and 2000
    ),
  constraint platform_role_assignments_revocation_check
    check (
      (revoked_at is null and revoked_by is null and revocation_reason is null)
      or
      (revoked_at is not null and revoked_by is not null and revocation_reason is not null)
    ),
  constraint platform_role_assignments_revoked_after_assigned_check
    check (revoked_at is null or revoked_at >= assigned_at)
);

comment on table public.platform_role_assignments is
  'Historical platform-admin role assignments. Active assignments have revoked_at IS NULL; profiles.role is not the forward authorization source.';

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid
    references public.organizations(id) on delete set null,
  actor_user_id uuid
    references auth.users(id) on delete set null,
  action text not null
    check (char_length(action) between 1 and 120)
    check (action ~ '^[a-z][a-z0-9_.:-]*$'),
  entity_type text not null
    check (char_length(entity_type) between 1 and 120)
    check (entity_type ~ '^[a-z][a-z0-9_.:-]*$'),
  entity_id text
    check (entity_id is null or char_length(entity_id) <= 255),
  actor_role text
    check (actor_role is null or char_length(btrim(actor_role)) between 1 and 80),
  actor_role_scope text
    check (actor_role_scope is null or actor_role_scope in ('organization', 'platform', 'system')),
  reason text
    check (reason is null or char_length(reason) <= 4000),
  risk_level text not null default 'low'
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  correlation_id uuid,
  previous_values jsonb
    check (previous_values is null or jsonb_typeof(previous_values) = 'object'),
  new_values jsonb
    check (new_values is null or jsonb_typeof(new_values) = 'object'),
  request_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(request_metadata) = 'object'),
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only audit foundation. Application roles receive no UPDATE or DELETE privilege.';

alter table public.teams
  add column if not exists organization_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teams_organization_id_fkey'
      and conrelid = 'public.teams'::regclass
  ) then
    alter table public.teams
      add constraint teams_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete restrict;
  end if;
end
$$;

comment on column public.teams.organization_id is
  'Nullable Phase 2 tenant link. Existing teams require an explicit reviewed backfill before this can become required.';

-- Foreign-key, authorization, and common tenant-filter indexes.
create index if not exists organizations_school_id_idx
  on public.organizations (school_id)
  where school_id is not null;
create index if not exists organizations_created_by_idx
  on public.organizations (created_by)
  where created_by is not null;
create index if not exists organizations_status_idx
  on public.organizations (status, name);

create index if not exists organization_memberships_user_status_org_idx
  on public.organization_memberships (user_id, status, organization_id);
create index if not exists organization_memberships_created_by_idx
  on public.organization_memberships (created_by)
  where created_by is not null;

create unique index if not exists platform_role_assignments_active_key
  on public.platform_role_assignments (user_id, role)
  where revoked_at is null;
create index if not exists platform_role_assignments_user_id_idx
  on public.platform_role_assignments (user_id);
create index if not exists platform_role_assignments_role_user_active_idx
  on public.platform_role_assignments (role, user_id)
  where revoked_at is null;
create index if not exists platform_role_assignments_assigned_by_idx
  on public.platform_role_assignments (assigned_by)
  where assigned_by is not null;
create index if not exists platform_role_assignments_revoked_by_idx
  on public.platform_role_assignments (revoked_by)
  where revoked_by is not null;

create index if not exists audit_logs_organization_created_idx
  on public.audit_logs (organization_id, created_at desc)
  where organization_id is not null;
create index if not exists audit_logs_actor_created_idx
  on public.audit_logs (actor_user_id, created_at desc)
  where actor_user_id is not null;
create index if not exists audit_logs_entity_created_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_correlation_id_idx
  on public.audit_logs (correlation_id)
  where correlation_id is not null;

create index if not exists teams_organization_id_idx
  on public.teams (organization_id)
  where organization_id is not null;

create or replace trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create or replace trigger organization_memberships_set_updated_at
  before update on public.organization_memberships
  for each row execute function public.set_updated_at();

-- Once an organization has an active owner, an UPDATE/DELETE cannot remove its
-- final active owner. Initial organization + owner creation remains a single
-- server transaction responsibility.
create or replace function private.protect_final_active_organization_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'owner'
     and old.status = 'active'
     and (
       tg_op = 'DELETE'
       or new.role <> 'owner'
       or new.status <> 'active'
     )
     and not exists (
       select 1
       from public.organization_memberships other_owner
       where other_owner.organization_id = old.organization_id
         and other_owner.id <> old.id
         and other_owner.role = 'owner'
         and other_owner.status = 'active'
     ) then
    raise exception 'cannot remove the final active organization owner'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_final_active_organization_owner()
  from public, anon, authenticated, service_role;

create or replace trigger organization_memberships_protect_final_owner
  before update of role, status or delete
  on public.organization_memberships
  for each row execute function private.protect_final_active_organization_owner();

create or replace function private.prevent_hard_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'hard delete is not permitted for %', tg_table_name
    using errcode = '23514';
end;
$$;

revoke all on function private.prevent_hard_delete()
  from public, anon, authenticated, service_role;

create or replace trigger organizations_prevent_hard_delete
  before delete on public.organizations
  for each row execute function private.prevent_hard_delete();

create or replace function private.enforce_append_only_audit_log()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit logs are append-only'
    using errcode = '23514';
end;
$$;

revoke all on function private.enforce_append_only_audit_log()
  from public, anon, authenticated, service_role;

create or replace trigger audit_logs_enforce_append_only
  before update or delete on public.audit_logs
  for each row execute function private.enforce_append_only_audit_log();

-- This private helper owns the raw platform-role lookup. It has no Data API
-- surface and is not directly executable by browser roles.
create or replace function private.has_active_platform_role(
  p_user_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and exists (
      select 1
      from public.platform_role_assignments pra
      where pra.user_id = p_user_id
        and pra.revoked_at is null
        and pra.role = any (p_roles)
    );
$$;

revoke all on function private.has_active_platform_role(uuid, text[])
  from public, anon, authenticated, service_role;

-- Compatibility contract for existing beta policies. `super_admin` is the
-- least-surprising forward equivalent of the legacy all-powerful `admin` role.
-- The profiles fallback is intentionally transitional and is not expanded or
-- written by this migration.
create or replace function public.is_internal_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_active_platform_role(
      (select auth.uid()),
      array['super_admin']::text[]
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    );
$$;

revoke all on function public.is_internal_admin()
  from public, anon, authenticated, service_role;
grant execute on function public.is_internal_admin()
  to authenticated, service_role;

comment on function public.is_internal_admin() is
  'Compatibility predicate for existing internal policies. Uses active super_admin assignments, with profiles.role=admin retained only as the Phase 2 transition fallback.';

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.platform_role_assignments enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Members can read active organizations" on public.organizations;
create policy "Members can read active organizations"
  on public.organizations
  for select
  to authenticated
  using (
    (
      status in ('approved', 'restricted')
      and exists (
        select 1
        from public.organization_memberships membership
        where membership.organization_id = organizations.id
          and membership.user_id = (select auth.uid())
          and membership.status = 'active'
      )
    )
    or (select public.is_internal_admin())
  );

drop policy if exists "Users can read current memberships" on public.organization_memberships;
create policy "Users can read current memberships"
  on public.organization_memberships
  for select
  to authenticated
  using (
    (
      user_id = (select auth.uid())
      and status in ('active', 'suspended')
    )
    or (select public.is_internal_admin())
  );

-- Grants are explicit because Data API exposure and RLS are separate controls.
-- Browser roles can read their own current memberships and active organizations;
-- every mutation remains server-only.
revoke all on table public.organizations
  from public, anon, authenticated, service_role;
revoke all on table public.organization_memberships
  from public, anon, authenticated, service_role;
revoke all on table public.platform_role_assignments
  from public, anon, authenticated, service_role;
revoke all on table public.audit_logs
  from public, anon, authenticated, service_role;

grant select on table public.organizations
  to authenticated;
grant select on table public.organization_memberships
  to authenticated;

grant select, insert, update on table public.organizations
  to service_role;
grant select, insert, update on table public.organization_memberships
  to service_role;
grant select, insert, update on table public.platform_role_assignments
  to service_role;
grant select, insert on table public.audit_logs
  to service_role;

-- Teams remain public directory records during compatibility, but tenant
-- assignment is server-only. The baseline's broad table grants must not make
-- organization_id browser-writable.
revoke all on table public.teams
  from public, anon, authenticated;
grant select on table public.teams
  to anon, authenticated;

revoke all on sequence public.audit_logs_id_seq
  from public, anon, authenticated, service_role;
grant usage, select on sequence public.audit_logs_id_seq
  to service_role;
