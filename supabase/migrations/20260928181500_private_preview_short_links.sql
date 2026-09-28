begin;

-- A presentation-only alias for a private preview. This does not create an
-- Athlete Career ID or grant access to the preview itself.
create table public.preview_locker_short_links (
  preview_id uuid primary key references public.preview_lockers(id) on delete cascade,
  alias text not null unique check (length(alias) between 3 and 70 and alias ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.preview_locker_short_links is 'Public URL aliases only; preview content remains private and requires its existing viewer authorization.';
alter table public.preview_locker_short_links enable row level security;
revoke all on public.preview_locker_short_links from public, anon, authenticated, service_role;
grant select, insert, update on public.preview_locker_short_links to authenticated;
grant select on public.preview_locker_short_links to service_role;
create policy preview_short_links_admin_select on public.preview_locker_short_links
  for select to authenticated using ((select public.is_internal_admin()));
create policy preview_short_links_admin_insert on public.preview_locker_short_links
  for insert to authenticated with check ((select public.is_internal_admin()) and created_by = (select auth.uid()));
create policy preview_short_links_admin_update on public.preview_locker_short_links
  for update to authenticated using ((select public.is_internal_admin())) with check ((select public.is_internal_admin()));

create function private.stamp_preview_short_link() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_internal_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := clock_timestamp();
  else
    new.preview_id := old.preview_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.stamp_preview_short_link() from public, anon, authenticated, service_role;
create trigger preview_short_link_stamp before insert or update on public.preview_locker_short_links
  for each row execute function private.stamp_preview_short_link();

create function private.audit_preview_short_link() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_internal_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, actor_role_scope, risk_level, previous_values, new_values, request_metadata)
  values (auth.uid(), case when tg_op = 'INSERT' then 'preview.short_link_created' else 'preview.short_link_updated' end,
    'preview_locker', new.preview_id::text, 'platform', 'medium',
    case when tg_op = 'UPDATE' then jsonb_build_object('alias', old.alias) else null end,
    jsonb_build_object('alias', new.alias), jsonb_build_object('source', 'preview_short_link_trigger'));
  return new;
end;
$$;
revoke all on function private.audit_preview_short_link() from public, anon, authenticated, service_role;
create trigger preview_short_link_audit after insert or update on public.preview_locker_short_links
  for each row execute function private.audit_preview_short_link();

commit;
