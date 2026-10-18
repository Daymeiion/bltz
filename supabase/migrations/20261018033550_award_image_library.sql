begin;

-- Shared reference illustrations only; not athlete media or a rights engine.
create table public.award_image_assets (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(btrim(title)) between 1 and 160 and title !~ '[[:cntrl:]]'),
 storage_path text unique check(storage_path ~ '^images/[a-f0-9]{64}\.(png|jpg|webp)$'),
 external_url text unique check(private.preview_url_valid(external_url)),
 sha256 text unique check(sha256 ~ '^[a-f0-9]{64}$'),
 mime_type text check(mime_type in ('image/png','image/jpeg','image/webp')),
 byte_size integer check(byte_size between 1 and 10485760),
 image_source_url text check(private.preview_url_valid(image_source_url)),
 image_license text check(length(image_license)<=500 and image_license !~ '[[:cntrl:]]'),
 attribution text check(length(attribution)<=500 and attribution !~ '[[:cntrl:]]'),
 asset_status text not null default 'placeholder' check(asset_status in ('placeholder','approved')),
 active boolean not null default true,
 revision integer not null default 1,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint award_image_location check((storage_path is not null and external_url is null and sha256 is not null and mime_type is not null and byte_size is not null) or (storage_path is null and external_url is not null)),
 constraint award_image_approved check(asset_status<>'approved' or (image_source_url is not null and image_license is not null and attribution is not null and length(btrim(image_license))>0 and length(btrim(attribution))>0))
);
create index award_images_created_idx on public.award_image_assets(created_at desc,id);
alter table public.award_image_assets enable row level security;
revoke all on public.award_image_assets from public,anon,authenticated;
grant select on public.award_image_assets to authenticated;
grant insert(title,storage_path,external_url,sha256,mime_type,byte_size,image_source_url,image_license,attribution,asset_status,active) on public.award_image_assets to authenticated;
grant update(title,image_source_url,image_license,attribution,asset_status,active) on public.award_image_assets to authenticated;
grant all on public.award_image_assets to service_role;
create policy award_images_admin_read on public.award_image_assets for select to authenticated using((select public.is_internal_admin()));
create policy award_images_admin_insert on public.award_image_assets for insert to authenticated with check((select public.is_internal_admin()) and created_by=(select auth.uid()));
create policy award_images_admin_update on public.award_image_assets for update to authenticated using((select public.is_internal_admin())) with check((select public.is_internal_admin()));

create function private.audit_award_image_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if tg_op='UPDATE' then new.id:=old.id; new.created_by:=old.created_by; new.created_at:=old.created_at; new.revision:=old.revision+1;
 else new.revision:=1; end if;
 new.updated_at:=clock_timestamp();
 insert into public.audit_logs(action,entity_type,entity_id,actor_user_id,previous_values,new_values)
 values('award_image.'||lower(tg_op),'award_image',new.id::text,auth.uid(),case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end; $$;
revoke all on function private.audit_award_image_change() from public,anon,authenticated,service_role;
create trigger award_image_audit before insert or update on public.award_image_assets for each row execute function private.audit_award_image_change();

alter table public.award_catalog add column image_asset_id uuid references public.award_image_assets(id);
create index award_catalog_image_asset_idx on public.award_catalog(image_asset_id) where image_asset_id is not null;
grant insert(slug,name,sport,league,level,award_type,organization,description,aliases,image_asset_id) on public.award_catalog to authenticated;
grant update(aliases,image_asset_id) on public.award_catalog to authenticated;
create policy award_catalog_admin_insert on public.award_catalog for insert to authenticated with check((select public.is_internal_admin()));
create policy award_catalog_admin_update on public.award_catalog for update to authenticated using((select public.is_internal_admin())) with check((select public.is_internal_admin()));
create or replace function private.audit_award_catalog_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 new.updated_at:=clock_timestamp();
 insert into public.audit_logs(action,entity_type,entity_id,actor_user_id,previous_values,new_values)
 values('award_catalog.'||lower(tg_op),'award_catalog',new.id::text,auth.uid(),case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end; $$;
revoke all on function private.audit_award_catalog_change() from public,anon,authenticated,service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('award-library','award-library',false,10485760,array['image/png','image/jpeg','image/webp']);
create policy award_library_admin_insert on storage.objects for insert to authenticated with check(bucket_id='award-library' and name ~ '^images/[a-f0-9]{64}\.(png|jpg|webp)$' and (select public.is_internal_admin()));
create policy award_library_admin_read on storage.objects for select to authenticated using(bucket_id='award-library' and (select public.is_internal_admin()));

-- Extend the existing immutable JSON validator without granting private access.
do $migration$
declare definition text; prefix text := $fields$
begin
 if kind='award' then
  if items is null or jsonb_typeof(items)<>'array' then return false; end if;
  if jsonb_array_length(items)>40 or octet_length(items::text)>100000 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
   if jsonb_typeof(item)<>'object' then return false; end if;
   foreach k in array array['catalogAwardId','imageAssetId'] loop
    if item ? k and jsonb_typeof(item->k) not in ('string','null') then return false; end if;
    if item->>k is not null and item->>k !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return false; end if;
   end loop;
   if item ? 'imageMode' and (jsonb_typeof(item->'imageMode')<>'string' or item->>'imageMode' not in ('auto','custom','none')) then return false; end if;
  end loop;
  select coalesce(jsonb_agg(value-'catalogAwardId'-'imageAssetId'-'imageMode'),'[]'::jsonb) into items from jsonb_array_elements(items);
 end if;
$fields$;
begin
 definition:=replace(pg_get_functiondef('private.preview_items_valid(text,jsonb)'::regprocedure),chr(13),'');
 if position('catalogAwardId' in definition)>0 or position(E'begin\n' in definition)=0 then raise exception 'Unexpected award validator definition'; end if;
 execute replace(definition,E'begin\n',ltrim(prefix,E'\n'));
end; $migration$;
notify pgrst,'reload schema';
commit;
