-- Add private preview uploads and explicit, user-entered career statistics.
-- This remains presentation-only and creates no canonical athlete or Media Graph records.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('preview-locker-photos', 'preview-locker-photos', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('preview-locker-videos', 'preview-locker-videos', false, 262144000, array['video/mp4','video/webm','video/quicktime']);

-- Assigned viewers can read only objects referenced by the current persisted
-- preview JSON. Unsaved, removed, or abandoned uploads remain admin-only.
create function private.can_read_preview_media(p_bucket_id text, p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare actor uuid := auth.uid(); folders text[] := storage.foldername(p_object_name); preview_id uuid; kind text;
begin
  if actor is null or array_length(folders,1) <> 2
    or folders[1] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false; end if;
  preview_id := folders[1]::uuid; kind := folders[2];
  if (p_bucket_id = 'preview-locker-photos' and kind <> 'photos')
    or (p_bucket_id = 'preview-locker-videos' and kind <> 'videos')
    or p_bucket_id not in ('preview-locker-photos','preview-locker-videos') then return false; end if;
  return exists (
    select 1
    from public.preview_lockers preview
    join public.preview_locker_viewer_grants grant_row on grant_row.preview_locker_id = preview.id
    where preview.id = preview_id and grant_row.viewer_user_id = actor
      and exists (
        select 1 from jsonb_array_elements(case when kind='photos' then preview.photos else preview.videos end) item
        where item->>'storagePath' = p_object_name
      )
  );
end;
$$;
revoke all on function private.can_read_preview_media(text,text) from public, anon, authenticated, service_role;
grant execute on function private.can_read_preview_media(text,text) to authenticated;

create policy preview_media_admin_insert on storage.objects
for insert to authenticated
with check (
  bucket_id in ('preview-locker-photos','preview-locker-videos')
  and (select public.is_internal_admin())
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and ((bucket_id = 'preview-locker-photos' and (storage.foldername(name))[2] = 'photos')
    or (bucket_id = 'preview-locker-videos' and (storage.foldername(name))[2] = 'videos'))
  and exists (
    select 1 from public.preview_lockers preview
    where preview.id::text = (storage.foldername(name))[1]
  )
);

create policy preview_media_authorized_select on storage.objects
for select to authenticated
using (
  bucket_id in ('preview-locker-photos','preview-locker-videos')
  and (
    (select public.is_internal_admin())
    or (select private.can_read_preview_media(bucket_id,name))
  )
);

create function private.preview_stats_valid(items jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; stat_key text; stat_value numeric; keys text[] := array[]::text[];
begin
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 16 or octet_length(items::text) > 10000 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) <> 'object' or not item ?& array['key','value']
      or exists (select 1 from jsonb_object_keys(item) key where key not in ('key','value'))
      or jsonb_typeof(item->'key') <> 'string' or jsonb_typeof(item->'value') <> 'number' then return false; end if;
    stat_key := item->>'key'; stat_value := (item->>'value')::numeric;
    if stat_key not in ('games_started','tackles','solo_tackles','tackles_for_loss','sacks','interceptions','pass_breakups','forced_fumbles','receptions','receiving_yards','receiving_touchdowns','rushing_yards','rushing_touchdowns','passing_yards','passing_touchdowns','total_touchdowns')
      or stat_value < 0 or stat_value > 1000000 or (stat_key <> 'sacks' and stat_value <> trunc(stat_value)) or stat_key = any(keys) then return false; end if;
    keys := array_append(keys, stat_key);
  end loop;
  return true;
end;
$$;
revoke all on function private.preview_stats_valid(jsonb) from public, anon, authenticated, service_role;
grant execute on function private.preview_stats_valid(jsonb) to authenticated;

alter table public.preview_lockers
  add column career_stats jsonb not null default '[]'::jsonb
  check (private.preview_stats_valid(career_stats));

grant select (career_stats) on public.preview_lockers to authenticated;
grant insert (career_stats) on public.preview_lockers to authenticated;
grant update (career_stats) on public.preview_lockers to authenticated;

create or replace function private.preview_items_valid(kind text, items jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; k text; v jsonb; allowed text[]; required text[]; max_items int; ids text[] := array[]::text[]; stored boolean;
begin
  if items is null or jsonb_typeof(items) <> 'array' then return false; end if;
  case kind
    when 'team' then allowed := array['label','color','logo']; required := allowed; max_items := 12;
    when 'award' then allowed := array['year','label']; required := allowed; max_items := 40;
    when 'video' then allowed := array['id','title','url','thumb','storagePath','mimeType']; required := array['id','title','thumb']; max_items := 24;
    when 'photo' then allowed := array['id','title','url','credits','sourceUrl','level','season','storagePath','mimeType']; required := array['id','title','credits','sourceUrl','level','season']; max_items := 40;
    else return false;
  end case;
  if jsonb_array_length(items) > max_items or octet_length(items::text) > 100000 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) <> 'object' or not item ?& required then return false; end if;
    stored := item ? 'storagePath';
    if kind in ('video','photo') and (stored = (item ? 'url') or stored <> (item ? 'mimeType')) then return false; end if;
    for k,v in select key,value from jsonb_each(item) loop
      if not k = any(allowed) or jsonb_typeof(v) not in ('string','null') then return false; end if;
      if translate(coalesce(item->>k,''), E'\t\n\r', '') ~ '[[:cntrl:]]' then return false; end if;
      if k in ('url','thumb','logo','sourceUrl') and item->>k is not null then
        if not (length(item->>k) <= 2048 and item->>k !~ '[[:space:][:cntrl:]\\]' and item->>k ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}([/?#]|$)' and item->>k !~* '^https://[^/?#]*\.(localhost|local|internal|test|invalid)([/?#]|$)') then return false; end if;
      elsif k = 'storagePath' and coalesce(item->>k,'') !~ '^[0-9a-f-]{36}/(photos|videos)/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm|mov)$' then return false;
      elsif k = 'mimeType' and coalesce(item->>k,'') not in ('image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime') then return false;
      elsif k not in ('url','thumb','logo','sourceUrl','storagePath','mimeType') and length(coalesce(item->>k,'')) > (case k when 'credits' then 300 when 'label' then 200 when 'year' then 20 when 'season' then 20 else 160 end) then return false;
      end if;
    end loop;
    if kind = 'team' and (coalesce(length(btrim(item->>'label')),0) not between 1 and 80 or coalesce(item->>'color','') !~ '^#[0-9A-Fa-f]{6}$') then return false; end if;
    if kind = 'award' and coalesce(length(btrim(item->>'label')),0) not between 1 and 200 then return false; end if;
    if kind in ('video','photo') then
      if coalesce(item->>'id','') !~ '^[A-Za-z0-9_-]{1,80}$' or coalesce(length(btrim(item->>'title')),0) not between 1 and 160 then return false; end if;
      if stored and ((kind='photo' and item->>'mimeType' not like 'image/%') or (kind='video' and item->>'mimeType' not like 'video/%') or (storage.foldername(item->>'storagePath'))[2] <> (kind || 's')) then return false; end if;
      if (item->>'id') = any(ids) then return false; end if;
      ids := array_append(ids,item->>'id');
    end if;
    if kind = 'photo' and coalesce(item->>'level','') not in ('hs','cfb','pro','off-field') then return false; end if;
  end loop;
  return true;
end;
$$;

commit;
