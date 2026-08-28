-- =============================================================================
-- 20260818000002_phase2_legacy_admin_super_admin_transition.sql
-- Phase 2B: preserve the approved legacy administrator during the platform-role
-- cutover, then remove profiles.role from privileged authorization.
-- =============================================================================

-- A legacy administrator is promoted only when no historical super-admin
-- assignment exists. This makes replay a no-op and, critically, does not
-- reactivate a role that was explicitly revoked after the transition.
with inserted_assignments as (
  insert into public.platform_role_assignments (
    user_id,
    role,
    assigned_by,
    assignment_reason
  )
  select
    profile.id,
    'super_admin',
    null,
    'Phase 2 migration: preserve approved legacy admin access before removing profiles.role authorization.'
  from public.profiles profile
  where profile.role = 'admin'
    and not exists (
      select 1
      from public.platform_role_assignments existing_assignment
      where existing_assignment.user_id = profile.id
        and existing_assignment.role = 'super_admin'
    )
  returning id, user_id, role, assigned_at, assignment_reason
)
insert into public.audit_logs (
  actor_user_id,
  action,
  entity_type,
  entity_id,
  actor_role,
  actor_role_scope,
  reason,
  risk_level,
  new_values,
  request_metadata
)
select
  null,
  'platform_role.backfilled',
  'platform_role_assignment',
  assignment.id::text,
  'migration',
  'system',
  assignment.assignment_reason,
  'high',
  jsonb_build_object(
    'user_id', assignment.user_id,
    'role', assignment.role,
    'assigned_at', assignment.assigned_at
  ),
  jsonb_build_object(
    'migration', '20260818000002_phase2_legacy_admin_super_admin_transition'
  )
from inserted_assignments assignment;

-- Existing policies keep calling this compatibility predicate, but privileged
-- authorization now comes exclusively from active platform-role assignments.
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
  );
$$;

revoke all on function public.is_internal_admin()
  from public, anon, authenticated, service_role;
grant execute on function public.is_internal_admin()
  to authenticated, service_role;

comment on function public.is_internal_admin() is
  'Compatibility predicate for existing internal policies. Authorization comes only from an active super_admin platform-role assignment.';
