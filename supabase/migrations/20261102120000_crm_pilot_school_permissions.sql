-- =============================================================================
-- 20261102120000_crm_pilot_school_permissions.sql
-- Enterprise CRM pilot: organization-wide permission grants and the exact
-- school -> "Colleges" directory link used for school branding.
--
-- Simplified from Proposal 0004 by founder decision (2026-11-02): grants are
-- organization-wide only. Team-scoped grants are deferred; nothing here blocks
-- adding them later as a separate table.
--
-- Additive and empty by default: no user receives a permission, and no school
-- is linked to a directory row. Grants are written only through the
-- service-only functions below, each of which appends an audit log row and
-- bumps the membership's authorization_version in the same transaction.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Membership authorization version + tenant-coherent composite key
-- ---------------------------------------------------------------------------
alter table public.organization_memberships
  add column if not exists authorization_version bigint not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'organization_memberships_organization_id_id_key'
  ) then
    alter table public.organization_memberships
      add constraint organization_memberships_organization_id_id_key
      unique (organization_id, id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permission definitions (must match EXECUTIVE_PERMISSION_KEYS)
-- ---------------------------------------------------------------------------
create table if not exists public.enterprise_permission_definitions (
  permission_key text primary key
    check (permission_key ~ '^[a-z][a-z0-9_.]*$'),
  domain text not null check (char_length(btrim(domain)) between 1 and 80),
  financial boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.enterprise_permission_definitions (permission_key, domain, financial)
values
  ('executive.overview.read', 'executive', false),
  ('athlete.read', 'athlete', false),
  ('opportunity.read', 'opportunity', false),
  ('opportunity.manage', 'opportunity', false),
  ('opportunity.approve', 'opportunity', false),
  ('activation.read', 'activation', false),
  ('activation.manage', 'activation', false),
  ('rights.read', 'rights', false),
  ('rights.review', 'rights', false),
  ('assignment.create', 'assignment', false),
  ('assignment.manage', 'assignment', false),
  ('workload.read', 'workload', false),
  ('financial.summary.read', 'financial', true),
  ('financial.exception.read', 'financial', true),
  ('intelligence.read', 'intelligence', false),
  ('member.read', 'organization', false),
  ('theme.administer', 'organization', false)
on conflict (permission_key) do nothing;

-- ---------------------------------------------------------------------------
-- Organization-wide permission grants (history is never deleted)
-- ---------------------------------------------------------------------------
create table if not exists public.organization_permission_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  membership_id uuid not null,
  permission_key text not null
    references public.enterprise_permission_definitions(permission_key) on delete restrict,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  assignment_reason text not null
    check (char_length(btrim(assignment_reason)) between 1 and 2000),
  revoked_by uuid references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  revocation_reason text
    check (revocation_reason is null or char_length(btrim(revocation_reason)) between 1 and 2000),
  constraint organization_permission_grants_membership_fkey
    foreign key (organization_id, membership_id)
    references public.organization_memberships(organization_id, id) on delete restrict,
  constraint organization_permission_grants_revocation_complete check (
    (revoked_at is null and revoked_by is null and revocation_reason is null) or
    (revoked_at is not null and revoked_by is not null and revocation_reason is not null)
  ),
  constraint organization_permission_grants_revoked_after_assigned check (
    revoked_at is null or revoked_at >= assigned_at
  )
);

create unique index if not exists organization_permission_grants_one_active_idx
  on public.organization_permission_grants (membership_id, permission_key)
  where revoked_at is null;
create index if not exists organization_permission_grants_org_idx
  on public.organization_permission_grants (organization_id, membership_id)
  where revoked_at is null;

comment on table public.organization_permission_grants is
  'Explicit organization-wide Enterprise CRM permission grants. Server-only; '
  'written via private.grant_enterprise_permission / revoke_enterprise_permission.';

-- Only the one-way active -> revoked transition is allowed.
create or replace function private.guard_permission_grant_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
     or new.organization_id <> old.organization_id
     or new.membership_id <> old.membership_id
     or new.permission_key <> old.permission_key
     or new.assigned_by <> old.assigned_by
     or new.assigned_at <> old.assigned_at
     or new.assignment_reason <> old.assignment_reason
     or old.revoked_at is not null
     or new.revoked_at is null then
    raise exception 'permission grants are immutable except for one-way revocation'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_permission_grant_update()
  from public, anon, authenticated, service_role;

create or replace trigger organization_permission_grants_guard_update
  before update on public.organization_permission_grants
  for each row execute function private.guard_permission_grant_update();

create or replace trigger organization_permission_grants_prevent_hard_delete
  before delete on public.organization_permission_grants
  for each row execute function private.prevent_hard_delete();

-- Audit + version bump on every assign/revoke, in the writing transaction.
create or replace function private.record_permission_grant_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_action text;
  v_actor uuid;
  v_reason text;
begin
  if tg_op = 'INSERT' then
    v_action := 'executive.permission_grant.assigned';
    v_actor := new.assigned_by;
    v_reason := new.assignment_reason;
  else
    v_action := 'executive.permission_grant.revoked';
    v_actor := new.revoked_by;
    v_reason := new.revocation_reason;
  end if;

  update public.organization_memberships
     set authorization_version = authorization_version + 1
   where id = new.membership_id;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id,
    actor_role_scope, reason, risk_level, new_values
  ) values (
    new.organization_id, v_actor, v_action, 'organization_permission_grant', new.id::text,
    'platform', v_reason, 'medium',
    jsonb_build_object(
      'membership_id', new.membership_id,
      'permission_key', new.permission_key
    )
  );
  return new;
end;
$$;

revoke all on function private.record_permission_grant_change()
  from public, anon, authenticated, service_role;

create or replace trigger organization_permission_grants_record_change
  after insert or update on public.organization_permission_grants
  for each row execute function private.record_permission_grant_change();

-- ---------------------------------------------------------------------------
-- Exact school -> "Colleges" directory link (branding only)
-- ---------------------------------------------------------------------------
alter table public.schools
  add column if not exists college_directory_id bigint
    references public."Colleges"(id) on delete set null;

create unique index if not exists schools_college_directory_id_key
  on public.schools (college_directory_id)
  where college_directory_id is not null;

revoke update (college_directory_id) on table public.schools from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Access snapshot: one statement, one consistent read for the server adapter
-- ---------------------------------------------------------------------------
create or replace function public.enterprise_access_snapshot(
  p_user_id uuid,
  p_organization_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'membership_id', membership.id,
    'user_id', membership.user_id,
    'organization_id', membership.organization_id,
    'status', membership.status,
    'authorization_version', membership.authorization_version,
    'permissions', coalesce((
      select jsonb_agg(grant_row.permission_key order by grant_row.permission_key)
        from public.organization_permission_grants grant_row
        join public.enterprise_permission_definitions definition
          on definition.permission_key = grant_row.permission_key
       where grant_row.membership_id = membership.id
         and grant_row.organization_id = membership.organization_id
         and grant_row.revoked_at is null
         and definition.active
    ), '[]'::jsonb)
  )
    from public.organization_memberships membership
   where membership.user_id = p_user_id
     and membership.organization_id = p_organization_id;
$$;

-- ---------------------------------------------------------------------------
-- Service-only write paths
-- ---------------------------------------------------------------------------
create or replace function public.grant_enterprise_permission(
  p_membership_id uuid,
  p_permission_key text,
  p_actor_user_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_grant_id uuid;
begin
  select organization_id into v_organization_id
    from public.organization_memberships
   where id = p_membership_id and status = 'active';
  if v_organization_id is null then
    raise exception 'active membership not found' using errcode = 'P0002';
  end if;

  select id into v_grant_id
    from public.organization_permission_grants
   where membership_id = p_membership_id
     and permission_key = p_permission_key
     and revoked_at is null;
  if v_grant_id is not null then
    return v_grant_id;
  end if;

  insert into public.organization_permission_grants (
    organization_id, membership_id, permission_key, assigned_by, assignment_reason
  ) values (
    v_organization_id, p_membership_id, p_permission_key, p_actor_user_id, p_reason
  )
  returning id into v_grant_id;
  return v_grant_id;
end;
$$;

create or replace function public.revoke_enterprise_permission(
  p_membership_id uuid,
  p_permission_key text,
  p_actor_user_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.organization_permission_grants
     set revoked_at = now(),
         revoked_by = p_actor_user_id,
         revocation_reason = p_reason
   where membership_id = p_membership_id
     and permission_key = p_permission_key
     and revoked_at is null;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS + grants: server-only
-- ---------------------------------------------------------------------------
alter table public.enterprise_permission_definitions enable row level security;
alter table public.organization_permission_grants enable row level security;

revoke all on table public.enterprise_permission_definitions
  from public, anon, authenticated, service_role;
revoke all on table public.organization_permission_grants
  from public, anon, authenticated, service_role;

grant select on table public.enterprise_permission_definitions to service_role;
grant select, insert, update on table public.organization_permission_grants to service_role;

revoke all on function public.enterprise_access_snapshot(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.grant_enterprise_permission(uuid, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.revoke_enterprise_permission(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.enterprise_access_snapshot(uuid, uuid) to service_role;
grant execute on function public.grant_enterprise_permission(uuid, text, uuid, text) to service_role;
grant execute on function public.revoke_enterprise_permission(uuid, text, uuid, text) to service_role;
