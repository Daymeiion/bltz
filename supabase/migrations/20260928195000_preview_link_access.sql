begin;

-- Link access is opt-in for each preview. The server checks this flag before
-- using its service client to render a Locker to an anonymous visitor.
alter table public.preview_locker_short_links
  add column public_access_enabled boolean not null default false;

comment on column public.preview_locker_short_links.public_access_enabled is
  'Admin-approved link-only viewing of this specific preview. Publication rights must be confirmed before enabling.';

create function private.audit_preview_link_access() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.public_access_enabled is distinct from new.public_access_enabled then
    insert into public.audit_logs (
      actor_user_id, action, entity_type, entity_id, actor_role_scope,
      risk_level, previous_values, new_values, request_metadata
    ) values (
      auth.uid(),
      case when new.public_access_enabled then 'preview.link_access_enabled'
           else 'preview.link_access_disabled' end,
      'preview_locker', new.preview_id::text, 'platform', 'high',
      jsonb_build_object('public_access_enabled', old.public_access_enabled),
      jsonb_build_object('public_access_enabled', new.public_access_enabled),
      jsonb_build_object('source', 'preview_link_access_trigger')
    );
  end if;
  return new;
end;
$$;

revoke all on function private.audit_preview_link_access() from public, anon, authenticated, service_role;
create trigger preview_link_access_audit after update on public.preview_locker_short_links
  for each row execute function private.audit_preview_link_access();

-- Visitors who choose to submit the claim modal can leave contact details.
-- The browser has no table privileges; only the server service role inserts.
create table public.preview_link_inquiries (
  id uuid primary key default gen_random_uuid(),
  preview_id uuid not null references public.preview_lockers(id) on delete cascade,
  email text not null check (length(email) between 3 and 254),
  feature_requests text check (length(feature_requests) <= 2000),
  consent_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  unique (preview_id, email)
);
create index preview_link_inquiries_created_idx on public.preview_link_inquiries(preview_id, created_at desc);
alter table public.preview_link_inquiries enable row level security;
revoke all on public.preview_link_inquiries from public, anon, authenticated, service_role;
grant select on public.preview_link_inquiries to authenticated;
grant select, insert on public.preview_link_inquiries to service_role;
create policy preview_link_inquiries_admin_read on public.preview_link_inquiries
  for select to authenticated using ((select public.is_internal_admin()));

commit;
