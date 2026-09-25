-- Preview presentation only; existing row policies and revision triggers remain in force.
begin;
do $migration$
declare definition text := pg_get_functiondef('private.preview_items_valid(text,jsonb)'::regprocedure);
begin
 if strpos(definition,$s$array['year','label','sourceUrl','description','imageUrl','photoId']$s$)=0 then
  if strpos(definition,$s$array['year','label','sourceUrl','description']$s$)=0 then raise exception 'Unexpected award validator'; end if;
  definition := replace(definition,$s$array['year','label','sourceUrl','description']$s$,$s$array['year','label','sourceUrl','description','imageUrl','photoId']$s$);
  definition := replace(definition,$s$'url','thumb','logo','sourceUrl'$s$,$s$'url','thumb','logo','sourceUrl','imageUrl'$s$);
  definition := replace(definition,'  return true;',$s$  if kind = 'award' and exists(select 1 from jsonb_array_elements(items) p where p->>'photoId' is not null and p->>'photoId' !~ '^[A-Za-z0-9_-]{1,80}$') then return false; end if;
  return true;$s$);
  execute definition;
 end if;
end;
$migration$;

create or replace function private.preview_social_valid(items jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; k text; v jsonb; ids text[] := array[]::text[]; host text;
begin
 if items is null or jsonb_typeof(items) <> 'array' then return false; end if;
 if jsonb_array_length(items)>40 or octet_length(items::text)>100000 then return false; end if;
 for item in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(item)<>'object' or not item ?& array['id','title','platform','kind','format','sourceUrl','caption','handle'] then return false; end if;
  for k,v in select key,value from jsonb_each(item) loop
   if k not in ('id','title','platform','kind','format','sourceUrl','caption','handle','photoId','videoId') or jsonb_typeof(v) not in ('string','null') then return false; end if;
   if k not in ('photoId','videoId') and jsonb_typeof(v)<>'string' then return false; end if;
   if translate(coalesce(item->>k,''), E'\t\n\r', '') ~ '[[:cntrl:]]' then return false; end if;
   if length(coalesce(item->>k,'')) > (case k when 'caption' then 2000 when 'sourceUrl' then 2048 when 'handle' then 120 when 'id' then 80 when 'photoId' then 80 when 'videoId' then 80 else 160 end) then return false; end if;
  end loop;
  if coalesce(item->>'id','') !~ '^[A-Za-z0-9_-]{1,80}$' or coalesce(length(btrim(item->>'title')),0) not between 1 and 160 then return false; end if;
  if (item->>'id')=any(ids) then return false; end if;
  ids := array_append(ids,item->>'id');
  if item->>'kind' not in ('short','post') or item->>'format' not in ('portrait','square') then return false; end if;
  if (item->>'photoId' is not null and item->>'photoId' !~ '^[A-Za-z0-9_-]{1,80}$') or (item->>'videoId' is not null and item->>'videoId' !~ '^[A-Za-z0-9_-]{1,80}$') then return false; end if;
  if item->>'sourceUrl' ~ '[[:space:][:cntrl:]\\]' or item->>'sourceUrl' !~ '^https://[A-Za-z0-9.-]+/[^/?#]' then return false; end if;
  host := lower(split_part(split_part(item->>'sourceUrl','/',3),':',1));
  if not (case item->>'platform'
    when 'Instagram' then host in ('instagram.com','www.instagram.com')
    when 'Facebook' then host in ('facebook.com','www.facebook.com','m.facebook.com','fb.watch')
    when 'LinkedIn' then host in ('linkedin.com','www.linkedin.com')
    when 'X' then host in ('x.com','www.x.com','twitter.com','www.twitter.com')
    else false end) then return false; end if;
 end loop;
 return true;
end;
$$;
revoke all on function private.preview_social_valid(jsonb) from public, anon, authenticated, service_role;
grant execute on function private.preview_social_valid(jsonb) to authenticated;
alter table public.preview_lockers add column if not exists social jsonb not null default '[]'::jsonb;
alter table public.preview_lockers drop constraint if exists preview_social_valid;
alter table public.preview_lockers add constraint preview_social_valid check(private.preview_social_valid(social));
grant select(social), insert(social), update(social) on public.preview_lockers to authenticated;
comment on column public.preview_lockers.social is 'Private preview shorts and social posts. Existing admin-write and assigned-viewer read policies apply. Media IDs reference this preview only.';

-- Include social in atomic enrollment, saved-create retry comparisons, and inserts.
do $migration$
declare definition text := pg_get_functiondef('public.preview_conversion_create(uuid,jsonb,jsonb)'::regprocedure);
begin
 if strpos(definition,'awards,social,career_stats')>0 then return; end if;
 if strpos(definition,'awards,career_stats')=0 or strpos(definition,'r.awards,r.career_stats')=0 then raise exception 'Unexpected preview enrollment function'; end if;
 definition := replace(definition,'awards,career_stats','awards,social,career_stats');
 definition := replace(definition,'r.awards,r.career_stats',$s$r.awards,coalesce(r.social,'[]'::jsonb),r.career_stats$s$);
 execute definition;
end;
$migration$;
notify pgrst, 'reload schema';
commit;
