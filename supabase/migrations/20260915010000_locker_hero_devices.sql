-- Device-specific hero selection reuses existing video records and private upload signing.
begin;

create or replace function private.preview_items_valid(kind text, items jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; k text; v jsonb; allowed text[]; required text[]; max_items int; ids text[] := array[]::text[]; stored boolean;
begin
  if items is null or jsonb_typeof(items) <> 'array' then return false; end if;
  case kind
    when 'team' then allowed := array['label','color','logo']; required := allowed; max_items := 12;
    when 'award' then allowed := array['year','label','sourceUrl','description']; required := array['year','label']; max_items := 40;
    when 'video' then allowed := array['id','title','url','thumb','storagePath','mimeType','heroDevice']; required := array['id','title','thumb']; max_items := 24;
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
    if kind = 'video' and item ? 'heroDevice' and coalesce(item->>'heroDevice','') not in ('mobile','desktop') then return false; end if;
    if kind = 'video' and item ? 'heroDevice' and not stored and coalesce(item->>'url','') !~* '\.(mp4|webm|mov|m4v|ogg)([?#].*)?$' then return false; end if;
    if kind = 'photo' and coalesce(item->>'level','') not in ('hs','cfb','pro','off-field') then return false; end if;
  end loop;
  if kind = 'video' and exists (select 1 from jsonb_array_elements(items) as hero_entry(value) where hero_entry.value ? 'heroDevice' group by hero_entry.value->>'heroDevice' having count(*) > 1) then return false; end if;
  return true;
end;
$$;


alter table public.player_lockers
  add column hero_videos_configured boolean not null default false,
  add column hero_video_mobile_id uuid references public.videos(id) on delete set null,
  add column hero_video_desktop_id uuid references public.videos(id) on delete set null;
create index player_lockers_hero_mobile_idx on public.player_lockers(hero_video_mobile_id) where hero_video_mobile_id is not null;
create index player_lockers_hero_desktop_idx on public.player_lockers(hero_video_desktop_id) where hero_video_desktop_id is not null;

-- Validate even direct PostgREST writes; preserve existing locker ownership RLS.
create function private.validate_locker_hero_videos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and new.hero_video_mobile_id is not distinct from old.hero_video_mobile_id
    and new.hero_video_desktop_id is not distinct from old.hero_video_desktop_id and new.hero_videos_configured = old.hero_videos_configured and new.player_id = old.player_id then return new; end if;
  if exists (
    select 1 from unnest(array[new.hero_video_mobile_id,new.hero_video_desktop_id]) selected(id)
    where selected.id is not null and not exists (
      select 1 from public.videos v where v.id=selected.id and v.player_id=new.player_id
      and v.visibility='public' and v.playback_url ~* '^https://[^/]+/.*\.(mp4|webm|mov|m4v|ogg)([?#].*)?$'
    )
  ) then raise exception 'Choose a public playable video belonging to this athlete' using errcode='23514'; end if;
  if new.hero_video_mobile_id is not null or new.hero_video_desktop_id is not null or TG_OP='UPDATE' then
    insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,new_values)
    values(auth.uid(),'locker.hero_videos.updated','player_locker',new.id::text,null,'low',
      jsonb_build_object('mobile_video_id',new.hero_video_mobile_id,'desktop_video_id',new.hero_video_desktop_id));
  end if;
  return new;
end;
$$;
revoke all on function private.validate_locker_hero_videos() from public,anon,authenticated;
create trigger validate_locker_hero_videos before insert or update on public.player_lockers
for each row execute function private.validate_locker_hero_videos();
commit;
