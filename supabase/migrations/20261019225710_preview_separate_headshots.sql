-- Independent presentation images, using the existing private preview photo bucket.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.preview_lockers
  add column headshot_storage_path text check (headshot_storage_path is null or (
    headshot_storage_path ~ '^[0-9a-f-]{36}/photos/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and split_part(headshot_storage_path,'/',1) = id::text)),
  add column bio_headshot_url text check (private.preview_url_valid(bio_headshot_url)),
  add column bio_headshot_storage_path text check (bio_headshot_storage_path is null or (
    bio_headshot_storage_path ~ '^[0-9a-f-]{36}/photos/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and split_part(bio_headshot_storage_path,'/',1) = id::text));
grant select(headshot_storage_path,bio_headshot_url,bio_headshot_storage_path),
  insert(headshot_storage_path,bio_headshot_url,bio_headshot_storage_path),
  update(headshot_storage_path,bio_headshot_url,bio_headshot_storage_path) on public.preview_lockers to authenticated;
grant select(headshot_storage_path,bio_headshot_url,bio_headshot_storage_path) on public.preview_lockers to service_role;
comment on column public.preview_lockers.headshot_storage_path is 'Independent private Hero portrait upload. Null retains legacy selected photo or headshot_url.';
comment on column public.preview_lockers.bio_headshot_url is 'Independent Bio / All image URL. Without an upload or URL, Bio follows the Hero headshot.';
comment on column public.preview_lockers.bio_headshot_storage_path is 'Independent private Bio / All image upload; does not change the Hero portrait.';

do $migration$
declare definition text;
begin
  definition := pg_get_functiondef('public.preview_conversion_create(uuid,jsonb,jsonb)'::regprocedure);
  if strpos(definition,'headshot_url,hero_video_url') = 0 or strpos(definition,'r.headshot_url,r.hero_video_url') = 0 then
    raise exception 'Unexpected preview enrollment definition; inspect before applying';
  end if;
  definition := replace(definition,'headshot_url,hero_video_url','headshot_url,headshot_storage_path,bio_headshot_url,bio_headshot_storage_path,hero_video_url');
  definition := replace(definition,'r.headshot_url,r.hero_video_url','r.headshot_url,r.headshot_storage_path,r.bio_headshot_url,r.bio_headshot_storage_path,r.hero_video_url');
  execute definition;
  definition := pg_get_functiondef('private.audit_preview_change()'::regprocedure);
  if strpos(definition,'jsonb_build_object(''revision'',old.revision') = 0 or strpos(definition,'jsonb_build_object(''revision'',new.revision') = 0 then
    raise exception 'Unexpected preview audit definition; inspect before applying';
  end if;
  definition := replace(definition,'jsonb_build_object(''revision'',old.revision','jsonb_build_object(''revision'',old.revision,''headshot_storage_path'',old.headshot_storage_path,''bio_headshot_url'',old.bio_headshot_url,''bio_headshot_storage_path'',old.bio_headshot_storage_path');
  definition := replace(definition,'jsonb_build_object(''revision'',new.revision','jsonb_build_object(''revision'',new.revision,''headshot_storage_path'',new.headshot_storage_path,''bio_headshot_url'',new.bio_headshot_url,''bio_headshot_storage_path'',new.bio_headshot_storage_path');
  execute definition;
end;
$migration$;
notify pgrst, 'reload schema';
commit;
