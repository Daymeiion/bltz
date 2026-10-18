begin;

-- Preserve scraped logo URLs; an optional private upload overrides display only.
do $migration$
declare definition text; prefix text := $logos$
begin
  if kind = 'team' then
    if items is null or jsonb_typeof(items) <> 'array' then return false; end if;
    if octet_length(items::text) > 100000 then return false; end if;
    for item in select value from jsonb_array_elements(items) loop
      if jsonb_typeof(item) <> 'object' then return false; end if;
      if item ? 'logoStoragePath' then
        if jsonb_typeof(item->'logoStoragePath') not in ('string','null') then return false; end if;
        if jsonb_typeof(item->'logoStoragePath') = 'string' and
          (length(item->>'logoStoragePath') > 240 or item->>'logoStoragePath' !~ '^[0-9a-f-]{36}/photos/[0-9a-f-]{36}\.(jpg|png|webp)$') then return false; end if;
      end if;
    end loop;
    select coalesce(jsonb_agg(value - 'logoStoragePath'), '[]'::jsonb) into items from jsonb_array_elements(items);
  end if;
$logos$;
begin
  definition := replace(pg_get_functiondef('private.preview_items_valid(text,jsonb)'::regprocedure), chr(13), '');
  if position('logoStoragePath' in definition) > 0 or position(E'begin\n' in definition) = 0 then
    raise exception 'Preview team validator changed; inspect before applying';
  end if;
  -- Prepend once; replacing every BEGIN would alter unrelated nested blocks.
  definition := overlay(definition placing ltrim(prefix,E'\n') from position(E'begin\n' in definition) for 6);
  execute definition;
end;
$migration$;

create function private.preview_school_logos_owned(preview_id uuid, items jsonb)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select not exists (
    select 1 from jsonb_array_elements(items) item
    where item->>'logoStoragePath' is not null
      and left(item->>'logoStoragePath',length(preview_id::text)+8) <> preview_id::text || '/photos/'
  );
$$;
revoke all on function private.preview_school_logos_owned(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.preview_school_logos_owned(uuid,jsonb) to authenticated,service_role;

alter table public.preview_lockers add constraint preview_school_logos_owned
  check (private.preview_school_logos_owned(id,schools) and private.preview_school_logos_owned(id,pro_teams)) not valid;
alter table public.preview_lockers validate constraint preview_school_logos_owned;

comment on function private.preview_school_logos_owned(uuid,jsonb) is
  'Logo uploads are scoped to this preview in existing private photo storage; scraped logos remain the defaults.';
commit;
