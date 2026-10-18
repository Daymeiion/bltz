-- Optional private image overrides. Keep the scraped/default imageUrl intact.
begin;

do $migration$
declare definition text;
begin
  definition := pg_get_functiondef('private.preview_editorial_valid(text,jsonb)'::regprocedure);
  if position('if not k=any(required) then return false; end if;' in definition)=0
    or position('if k=''visible'' then' in definition)=0 then
    raise exception 'preview editorial validator changed; inspect before applying';
  end if;
  definition := replace(definition,
    'if not k=any(required) then return false; end if;',
    'if not k=any(required) and not (kind=''merchandise'' and k=''imageStoragePath'') then return false; end if;');
  definition := replace(definition, 'if k=''visible'' then', $body$
      if k='imageStoragePath' then
        if jsonb_typeof(v) not in ('string','null') then return false; end if;
        if jsonb_typeof(v)='string' and (length(item->>k)>240 or item->>k !~ '^[0-9a-f-]{36}/photos/[0-9a-f-]{36}\.(jpg|png|webp)$') then return false; end if;
        continue;
      end if;
      if k='visible' then$body$);
  execute definition;
end;
$migration$;

create function private.preview_merchandise_images_owned(preview_id uuid, items jsonb)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select not exists (
    select 1 from jsonb_array_elements(items) item
    where item->>'imageStoragePath' is not null
      and left(item->>'imageStoragePath',length(preview_id::text)+8) <> preview_id::text || '/photos/'
  );
$$;
revoke all on function private.preview_merchandise_images_owned(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.preview_merchandise_images_owned(uuid,jsonb) to authenticated,service_role;

alter table public.preview_lockers add constraint preview_merchandise_images_owned
  check (private.preview_merchandise_images_owned(id,merchandise)) not valid;
alter table public.preview_lockers validate constraint preview_merchandise_images_owned;

comment on function private.preview_merchandise_images_owned(uuid,jsonb) is
  'Merchandise uploads must use this preview''s existing private photo storage. No public access or photo-gallery placement is granted.';
commit;
