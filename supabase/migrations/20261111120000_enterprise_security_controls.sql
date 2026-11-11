-- Close tenant-link and audit-coverage gaps without changing application APIs.
-- Existing inconsistent links cause this migration to fail; never silently
-- reassign or delete customer records to make validation pass.
begin;

alter table public.organization_activations
  add constraint organization_activations_org_id_key unique (organization_id, id);
alter table public.organization_locker_launches
  add constraint organization_locker_launches_org_id_key unique (organization_id, id);
alter table public.organization_athletes
  add constraint organization_athletes_org_id_key unique (organization_id, id);

alter table public.organization_athlete_media
  add constraint organization_athlete_media_tenant_activation_fkey
    foreign key (organization_id, activation_id)
    references public.organization_activations (organization_id, id) on delete restrict,
  add constraint organization_athlete_media_tenant_launch_fkey
    foreign key (organization_id, launch_id)
    references public.organization_locker_launches (organization_id, id) on delete restrict;
alter table public.organization_athlete_invites
  add constraint organization_athlete_invites_tenant_athlete_fkey
    foreign key (organization_id, organization_athlete_id)
    references public.organization_athletes (organization_id, id) on delete restrict;

-- Membership identity must never move to another tenant or user. Otherwise an
-- owner can move away without firing the role/status final-owner guard, and
-- existing permission grants could silently change their beneficiary.
create or replace function private.guard_membership_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
     or new.organization_id is distinct from old.organization_id
     or new.user_id is distinct from old.user_id then
    raise exception 'membership identity is immutable; create a new membership'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_membership_identity()
  from public, anon, authenticated, service_role;
create trigger organization_memberships_guard_identity
  before update on public.organization_memberships
  for each row execute function private.guard_membership_identity();

-- Audit selected operational fields only: never copy messages, contact email,
-- media URLs, invite tokens, integration secrets, or arbitrary JSON into logs.
-- Invoker rights are intentional: an audit failure rolls back the business
-- write in the same transaction. Service role already has INSERT on audit_logs.
create or replace function private.audit_enterprise_control_change()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_actor uuid;
  v_fields text[];
  v_before jsonb;
  v_after jsonb;
  v_reason text;
begin
  v_new := to_jsonb(new);
  if tg_op = 'UPDATE' then v_old := to_jsonb(old); end if;

  case tg_table_name
    when 'organization_memberships' then
      v_fields := array['user_id', 'role', 'status'];
      -- Service updates have no authenticated end-user claim. Record a system
      -- actor rather than incorrectly attributing them to the original creator.
      v_actor := auth.uid();
      if tg_op = 'INSERT' then
        v_actor := coalesce(v_actor, new.created_by);
      end if;
    when 'platform_role_assignments' then
      v_fields := array['user_id', 'role', 'revoked_at'];
      if tg_op = 'INSERT' then
        v_actor := new.assigned_by;
        v_reason := new.assignment_reason;
      else
        v_actor := new.revoked_by;
        v_reason := new.revocation_reason;
      end if;
    else
      v_fields := array['player_id', 'status', 'kind', 'channel', 'impressions', 'engagements'];
      if tg_op = 'INSERT' then v_actor := new.created_by;
      else v_actor := new.updated_by;
      end if;
  end case;

  select jsonb_object_agg(key, value) into v_after
    from jsonb_each(v_new) where key = any(v_fields);
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(key, value) into v_before
      from jsonb_each(v_old) where key = any(v_fields);
    -- Suppress version bumps and unchanged operational values.
    if v_before is not distinct from v_after then return new; end if;
  end if;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id,
    actor_role_scope, reason, risk_level, previous_values, new_values,
    request_metadata
  ) values (
    (v_new->>'organization_id')::uuid, v_actor,
    'security.' || tg_table_name || '.' || lower(tg_op),
    tg_table_name, v_new->>'id',
    case when v_actor is null then 'system'
         when tg_table_name = 'platform_role_assignments' then 'platform'
         else null end,
    v_reason,
    case when tg_table_name in ('organization_memberships', 'platform_role_assignments')
      then 'high' else 'medium' end,
    v_before, v_after, jsonb_build_object('source', 'database.enterprise_controls')
  );
  return new;
end;
$$;
revoke all on function private.audit_enterprise_control_change()
  from public, anon, authenticated, service_role;

create trigger organization_memberships_audit_change
  after insert or update on public.organization_memberships
  for each row execute function private.audit_enterprise_control_change();
create trigger platform_role_assignments_audit_change
  after insert or update on public.platform_role_assignments
  for each row execute function private.audit_enterprise_control_change();
create trigger organization_activations_audit_change
  after insert or update on public.organization_activations
  for each row execute function private.audit_enterprise_control_change();
create trigger organization_locker_launches_audit_change
  after insert or update on public.organization_locker_launches
  for each row execute function private.audit_enterprise_control_change();

commit;
