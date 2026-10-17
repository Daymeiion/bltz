begin;
-- Private preview review state, separate from curated Locker merchandise.
create table public.preview_merchandise_searches (
  preview_id uuid primary key references public.preview_lockers(id) on delete cascade,
  identity_key text not null check (identity_key ~ '^[a-f0-9]{64}$'),
  source_revision integer not null check (source_revision > 0),
  result jsonb not null check (jsonb_typeof(result)='object' and octet_length(result::text)<=100000
    and jsonb_typeof(result->'items') is not distinct from 'array' and jsonb_array_length(result->'items')<=12),
  dismissed_urls text[] not null default '{}' check (cardinality(dismissed_urls)<=12),
  version integer not null default 1 check (version>0),
  searched_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.preview_merchandise_searches enable row level security;
revoke all on public.preview_merchandise_searches from public, anon, authenticated;
grant select, insert, update on public.preview_merchandise_searches to authenticated;
grant all on public.preview_merchandise_searches to service_role;
create policy merchandise_review_read on public.preview_merchandise_searches for select to authenticated using ((select public.is_internal_admin()));
create policy merchandise_review_insert on public.preview_merchandise_searches for insert to authenticated with check ((select public.is_internal_admin()));
create policy merchandise_review_update on public.preview_merchandise_searches for update to authenticated using ((select public.is_internal_admin())) with check ((select public.is_internal_admin()));

create function private.audit_preview_merchandise_search() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501'; end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,new_values)
    values(auth.uid(),'preview.merchandise_review','preview_locker',new.preview_id::text,'platform',
      jsonb_build_object('version',new.version,'source_revision',new.source_revision,'candidates',jsonb_array_length(new.result->'items'),'dismissed',cardinality(new.dismissed_urls)));
  return new;
end; $$;
revoke all on function private.audit_preview_merchandise_search() from public,anon,authenticated,service_role;
create trigger preview_merchandise_search_audit after insert or update on public.preview_merchandise_searches
for each row execute function private.audit_preview_merchandise_search();

create function public.save_preview_merchandise_search(p_preview_id uuid, p_revision integer, p_identity_key text, p_started_at timestamptz, p_result jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_revision integer; saved public.preview_merchandise_searches%rowtype;
begin
  if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501'; end if;
  select revision into current_revision from public.preview_lockers where id=p_preview_id for update;
  if not found then raise exception 'preview_not_found' using errcode='P0002'; end if;
  if current_revision is distinct from p_revision then raise exception 'preview_changed' using errcode='PT409'; end if;
  if p_started_at is null or not isfinite(p_started_at) or p_started_at>clock_timestamp()+interval '1 minute'
    or p_identity_key is null or p_identity_key !~ '^[a-f0-9]{64}$'
    or p_result is null or jsonb_typeof(p_result)<>'object' or octet_length(p_result::text)>100000
    or jsonb_typeof(p_result->'items') is distinct from 'array'
    or jsonb_array_length(p_result->'items')>12
    or (p_result->>'status') is null or p_result->>'status' not in ('complete','partial')
    or (p_result->>'status'='partial' and jsonb_array_length(p_result->'items')=0)
    then raise exception 'invalid_result' using errcode='22023'; end if;
  select * into saved from public.preview_merchandise_searches where preview_id=p_preview_id;
  if saved.searched_at>=p_started_at then raise exception 'newer_search_exists' using errcode='PT409'; end if;
  insert into public.preview_merchandise_searches(preview_id,source_revision,identity_key,result,searched_at)
    values(p_preview_id,p_revision,p_identity_key,p_result,p_started_at)
  on conflict(preview_id) do update set source_revision=excluded.source_revision,identity_key=excluded.identity_key,
    result=excluded.result,searched_at=excluded.searched_at,updated_at=clock_timestamp(),version=public.preview_merchandise_searches.version+1,
    dismissed_urls=case when public.preview_merchandise_searches.identity_key=excluded.identity_key then
      array(select u from unnest(public.preview_merchandise_searches.dismissed_urls) u where exists(select 1 from jsonb_array_elements(excluded.result->'items') item where item->>'productUrl'=u)) else '{}'::text[] end
  returning * into saved;
  return to_jsonb(saved);
end; $$;
revoke all on function public.save_preview_merchandise_search(uuid,integer,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.save_preview_merchandise_search(uuid,integer,text,timestamptz,jsonb) to authenticated;

create function public.dismiss_preview_merchandise_result(p_preview_id uuid, p_revision integer, p_version integer, p_url text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_revision integer; saved public.preview_merchandise_searches%rowtype;
begin
  if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501'; end if;
  select revision into current_revision from public.preview_lockers where id=p_preview_id for update;
  if not found then raise exception 'preview_not_found' using errcode='P0002'; end if;
  if current_revision is distinct from p_revision then raise exception 'preview_changed' using errcode='PT409'; end if;
  select * into saved from public.preview_merchandise_searches where preview_id=p_preview_id for update;
  if not found or saved.version is distinct from p_version then raise exception 'review_changed' using errcode='PT409'; end if;
  if not exists(select 1 from jsonb_array_elements(saved.result->'items') item where item->>'productUrl'=p_url)
    then raise exception 'invalid_listing' using errcode='22023'; end if;
  if not p_url=any(saved.dismissed_urls) then
    update public.preview_merchandise_searches set dismissed_urls=array_append(dismissed_urls,p_url),updated_at=clock_timestamp(),version=version+1
      where preview_id=p_preview_id returning * into saved;
  end if;
  return to_jsonb(saved);
end; $$;
revoke all on function public.dismiss_preview_merchandise_result(uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.dismiss_preview_merchandise_result(uuid,integer,integer,text) to authenticated;
notify pgrst,'reload schema';
commit;
