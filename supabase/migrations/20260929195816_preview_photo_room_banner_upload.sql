-- Keep uploaded ad creative in the existing private preview photo bucket.
begin;
alter table public.preview_lockers
  add column photo_room_banner_storage_path text
  check (photo_room_banner_storage_path is null or (
    photo_room_banner_storage_path ~ '^[0-9a-f-]{36}/photos/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and split_part(photo_room_banner_storage_path, '/', 1) = id::text
  ));

grant select (photo_room_banner_storage_path), insert (photo_room_banner_storage_path),
  update (photo_room_banner_storage_path) on public.preview_lockers to authenticated;

comment on column public.preview_lockers.photo_room_banner_storage_path is
  'Private preview photo bucket path for uploaded ad creative; destination remains photo_room_banner_link.';

do $migration$
declare definition text := pg_get_functiondef('public.preview_conversion_create(uuid,jsonb,jsonb)'::regprocedure);
begin
  if strpos(definition, 'photo_room_banner_storage_path') > 0 then return; end if;
  if strpos(definition, 'photo_room_banner_link,bio') = 0
    or strpos(definition, 'r.photo_room_banner_link,r.bio') = 0 then
    raise exception 'Unexpected preview enrollment function; review before migration';
  end if;
  definition := replace(definition, 'photo_room_banner_link,bio',
    'photo_room_banner_link,photo_room_banner_storage_path,bio');
  definition := replace(definition, 'r.photo_room_banner_link,r.bio',
    'r.photo_room_banner_link,r.photo_room_banner_storage_path,r.bio');
  execute definition;
end;
$migration$;
notify pgrst, 'reload schema';
commit;
