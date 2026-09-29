-- Optional linked banner for the private preview Photo Room.
begin;

alter table public.preview_lockers
  add column photo_room_banner_url text check (private.preview_url_valid(photo_room_banner_url)),
  add column photo_room_banner_link text check (private.preview_url_valid(photo_room_banner_link));

grant select (photo_room_banner_url, photo_room_banner_link),
  insert (photo_room_banner_url, photo_room_banner_link),
  update (photo_room_banner_url, photo_room_banner_link)
  on public.preview_lockers to authenticated;

comment on column public.preview_lockers.photo_room_banner_url is 'Optional manually entered HTTPS image URL for the private Photo Room banner.';
comment on column public.preview_lockers.photo_room_banner_link is 'Optional manually entered HTTPS destination URL for the private Photo Room banner.';

-- Keep atomic preview creation and enrollment in sync with normal saves.
do $migration$
declare definition text := pg_get_functiondef('public.preview_conversion_create(uuid,jsonb,jsonb)'::regprocedure);
begin
  if strpos(definition, 'photo_room_banner_url') > 0 then return; end if;
  if strpos(definition, 'hero_video_url,bio') = 0 or strpos(definition, 'r.hero_video_url,r.bio') = 0 then
    raise exception 'Unexpected preview enrollment function; review before migration';
  end if;
  definition := replace(definition, 'hero_video_url,bio', 'hero_video_url,photo_room_banner_url,photo_room_banner_link,bio');
  definition := replace(definition, 'r.hero_video_url,r.bio', 'r.hero_video_url,r.photo_room_banner_url,r.photo_room_banner_link,r.bio');
  execute definition;
end;
$migration$;

notify pgrst, 'reload schema';
commit;
