begin;
set local statement_timeout='15s';
set local lock_timeout='5s';

-- One user-approved data repair. No general reset permission or API is added.
-- Keep this receipt permanently: a later replay must never reset a new window.
do $rearm_keith$
declare
  v_preview constant uuid := '556ca192-d9b7-494f-93d6-a498af76ba5a';
  v_request constant text := 'f5cf7a9d-c2ac-4daa-ab56-10ba8447267f';
  v_before jsonb;
  v_after jsonb;
  v_identity record;
  v_count integer;
begin
  if current_user <> 'postgres' then
    raise exception 'Keith re-arm requires the reviewed migration role' using errcode='42501';
  end if;

  select full_name,slug,player_id into v_identity
  from public.preview_lockers where id=v_preview for share;
  select to_jsonb(l) into v_before
  from public.preview_locker_short_links l where preview_id=v_preview for update;
  if not found then
    -- Fresh/local environments need not contain this production identity.
    raise notice 'Keith invitation not present; no data changed';
    return;
  end if;

  select count(*) into v_count from public.audit_logs
  where action='preview.link_access_rearmed' and entity_type='preview_locker'
    and entity_id=v_preview::text and request_metadata->>'request_id'=v_request;
  if v_count=1 then return; end if;
  if v_count<>0 then raise exception 'Unexpected duplicate re-arm receipts'; end if;

  if v_identity.full_name is distinct from 'Keith Rivers'
    or v_identity.slug is distinct from 'keith-rivers-3a92b4f331f083552d05'
    or v_identity.player_id is distinct from 'c5dae871-a277-4256-9a0c-17a40940ad3f'::uuid then
    raise exception 'Keith identity changed; stop and rerun read-only preflight';
  end if;
  if v_before->>'alias' is distinct from 'keith-rivers'
    or (v_before->>'public_access_enabled')::boolean is not true
    or (v_before->>'access_started_at')::timestamptz is distinct from timestamptz '2026-10-13 22:56:51.811674+00'
    or (v_before->>'access_expires_at')::timestamptz is distinct from timestamptz '2026-10-15 22:56:51.811674+00'
    or v_before->>'access_extended_at' is not null
    or (v_before->>'access_expires_at')::timestamptz > clock_timestamp() then
    raise exception 'Keith invitation changed; stop and rerun read-only preflight';
  end if;

  update public.preview_locker_short_links l
  set access_started_at=null,access_expires_at=null,access_extended_at=null
  where preview_id=v_preview returning to_jsonb(l) into v_after;
  get diagnostics v_count=row_count;
  if v_count<>1 or
    (v_after-array['access_started_at','access_expires_at','access_extended_at','updated_at'])
      is distinct from (v_before-array['access_started_at','access_expires_at','access_extended_at','updated_at'])
    or public.preview_public_link_status(v_preview)->>'state' is distinct from 'pending' then
    raise exception 'Keith re-arm postcondition failed';
  end if;

  -- NULL actor identifies a migration, not an impersonated Admin. Approval and
  -- the exact previous window/identity bindings remain in the protected audit.
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,previous_values,new_values,request_metadata)
  values(null,'preview.link_access_rearmed','preview_locker',v_preview::text,'platform','high',
    v_before||jsonb_build_object('state','expired'),
    v_after||jsonb_build_object('state','pending','next_window_hours',48),
    jsonb_build_object('request_id',v_request,'source','approved_one_time_migration',
      'migration','20261016174524','executed_by',current_user,
      'reason','User-approved re-arm after mobile QA. Preserve the expired window and start fresh only on the next eligible visible visitor open.',
      'approval_date','2026-10-16','full_name',v_identity.full_name,'slug',v_identity.slug,
      'player_id',v_identity.player_id,'prior_history_preserved',true));
end;
$rearm_keith$;

commit;
