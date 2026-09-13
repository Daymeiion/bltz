-- One authenticated, read-only viewer per private preview.
-- This is demo access only: no player, Locker claim, canonical identity, or email-delivery link.
begin;

create table public.preview_locker_viewer_grants (
  preview_locker_id uuid primary key
    references public.preview_lockers(id) on delete cascade,
  viewer_user_id uuid not null
    references auth.users(id) on delete cascade,
  assigned_by uuid
    references auth.users(id) on delete set null,
  assigned_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

comment on table public.preview_locker_viewer_grants is
  'Current private-preview viewer grants. Exactly one authenticated viewer per preview; no athlete identity or claim linkage.';

create index preview_locker_viewer_grants_viewer_idx
  on public.preview_locker_viewer_grants(viewer_user_id, preview_locker_id);

alter table public.preview_locker_viewer_grants enable row level security;
revoke all on table public.preview_locker_viewer_grants
  from public, anon, authenticated, service_role;

-- RLS uses an OID-bound private helper so browser roles never receive table
-- privileges or a grant-listing endpoint. The auth identity check is mandatory.
create function private.can_view_preview_locker(p_preview_locker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.preview_locker_viewer_grants grant_row
      where grant_row.preview_locker_id = p_preview_locker_id
        and grant_row.viewer_user_id = (select auth.uid())
    );
$$;

revoke all on function private.can_view_preview_locker(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.can_view_preview_locker(uuid)
  to authenticated;

create policy preview_assigned_viewer_read
  on public.preview_lockers
  for select
  to authenticated
  using ((select private.can_view_preview_locker(id)));

-- Exact-email lookup is deliberately confined to this admin-only definer.
-- It returns status only; no email address or user directory is exposed.
create function private.assign_preview_locker_viewer(
  p_preview_locker_id uuid,
  p_email text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_email text := lower(btrim(p_email));
  target_user_id uuid;
  previous_user_id uuid;
  action_name text;
begin
  if actor is null or not public.is_internal_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if normalized_email is null
    or length(normalized_email) not between 3 and 254
    or normalized_email ~ '[[:cntrl:][:space:]]'
    or normalized_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  perform 1
  from public.preview_lockers
  where id = p_preview_locker_id
  for update;
  if not found then
    raise exception 'preview not found' using errcode = 'P0002';
  end if;

  select user_row.id
  into target_user_id
  from auth.users user_row
  where lower(user_row.email) = normalized_email
    and user_row.deleted_at is null;

  if target_user_id is null then
    return 'account_not_found';
  end if;

  select grant_row.viewer_user_id
  into previous_user_id
  from public.preview_locker_viewer_grants grant_row
  where grant_row.preview_locker_id = p_preview_locker_id
  for update;

  if previous_user_id = target_user_id then
    return 'unchanged';
  end if;

  insert into public.preview_locker_viewer_grants as current_grant (
    preview_locker_id,
    viewer_user_id,
    assigned_by,
    assigned_at,
    updated_at
  ) values (
    p_preview_locker_id,
    target_user_id,
    actor,
    clock_timestamp(),
    clock_timestamp()
  )
  on conflict (preview_locker_id) do update
  set viewer_user_id = excluded.viewer_user_id,
      assigned_by = excluded.assigned_by,
      assigned_at = excluded.assigned_at,
      updated_at = excluded.updated_at;

  action_name := case
    when previous_user_id is null then 'preview.viewer.assigned'
    else 'preview.viewer.reassigned'
  end;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    actor_role_scope,
    risk_level,
    previous_values,
    new_values,
    request_metadata
  ) values (
    actor,
    action_name,
    'preview_locker',
    p_preview_locker_id::text,
    'platform',
    'high',
    case when previous_user_id is null then null
      else jsonb_build_object('viewer_user_id', previous_user_id) end,
    jsonb_build_object('viewer_user_id', target_user_id),
    jsonb_build_object('source', 'private_preview_viewer_function', 'demo_only', true)
  );

  return case when previous_user_id is null then 'assigned' else 'reassigned' end;
end;
$$;

revoke all on function private.assign_preview_locker_viewer(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function private.assign_preview_locker_viewer(uuid, text)
  to authenticated;

create function private.revoke_preview_locker_viewer(p_preview_locker_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  previous_user_id uuid;
begin
  if actor is null or not public.is_internal_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select grant_row.viewer_user_id
  into previous_user_id
  from public.preview_locker_viewer_grants grant_row
  where grant_row.preview_locker_id = p_preview_locker_id
  for update;

  if previous_user_id is null then
    return false;
  end if;

  delete from public.preview_locker_viewer_grants
  where preview_locker_id = p_preview_locker_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    actor_role_scope,
    risk_level,
    previous_values,
    new_values,
    request_metadata
  ) values (
    actor,
    'preview.viewer.revoked',
    'preview_locker',
    p_preview_locker_id::text,
    'platform',
    'high',
    jsonb_build_object('viewer_user_id', previous_user_id),
    jsonb_build_object('viewer_assigned', false),
    jsonb_build_object('source', 'private_preview_viewer_function', 'demo_only', true)
  );

  return true;
end;
$$;

revoke all on function private.revoke_preview_locker_viewer(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.revoke_preview_locker_viewer(uuid)
  to authenticated;

create function private.preview_locker_has_viewer(p_preview_locker_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_internal_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return exists (
    select 1
    from public.preview_locker_viewer_grants
    where preview_locker_id = p_preview_locker_id
  );
end;
$$;

revoke all on function private.preview_locker_has_viewer(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.preview_locker_has_viewer(uuid)
  to authenticated;

-- Public wrappers are invokers and expose only bounded status results.
create function public.assign_preview_locker_viewer(
  p_preview_locker_id uuid,
  p_email text
)
returns text
language sql
security invoker
set search_path = ''
begin atomic;
  select private.assign_preview_locker_viewer(p_preview_locker_id, p_email);
end;

create function public.revoke_preview_locker_viewer(p_preview_locker_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
begin atomic;
  select private.revoke_preview_locker_viewer(p_preview_locker_id);
end;

create function public.preview_locker_has_viewer(p_preview_locker_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
begin atomic;
  select private.preview_locker_has_viewer(p_preview_locker_id);
end;

revoke all on function public.assign_preview_locker_viewer(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.revoke_preview_locker_viewer(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.preview_locker_has_viewer(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.assign_preview_locker_viewer(uuid, text)
  to authenticated;
grant execute on function public.revoke_preview_locker_viewer(uuid)
  to authenticated;
grant execute on function public.preview_locker_has_viewer(uuid)
  to authenticated;

commit;
