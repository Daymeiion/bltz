begin;

-- Extend the existing invoker validator in place. Do not grant private-schema
-- access or introduce a SECURITY DEFINER function for input validation.
do $migration$
declare definition text; prefix text := $jerseys$
begin
  if kind = 'team' then
    if items is null or jsonb_typeof(items) <> 'array' then return false; end if;
    if octet_length(items::text) > 100000 then return false; end if;
    for item in select value from jsonb_array_elements(items) loop
      if jsonb_typeof(item) <> 'object' then return false; end if;
      if item ? 'jerseyNumbers' then
        if jsonb_typeof(item->'jerseyNumbers') <> 'array' then return false; end if;
        if jsonb_array_length(item->'jerseyNumbers') > 10 then return false; end if;
        if exists (select 1 from jsonb_array_elements(item->'jerseyNumbers') n where jsonb_typeof(n) <> 'string' or n #>> '{}' !~ '^(\d|[1-9]\d|00)$') then return false; end if;
        if (select count(*) <> count(distinct value) from jsonb_array_elements(item->'jerseyNumbers')) then return false; end if;
      end if;
      if item ? 'jerseySourceUrl' and jsonb_typeof(item->'jerseySourceUrl') not in ('string','null') then return false; end if;
      if item->>'jerseySourceUrl' is not null then
        if not (length(item->>'jerseySourceUrl') <= 2048 and item->>'jerseySourceUrl' !~ '[[:space:][:cntrl:]\\]'
          and item->>'jerseySourceUrl' ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}([/?#]|$)'
          and item->>'jerseySourceUrl' !~* '^https://[^/?#]*\.(localhost|local|internal|test|invalid)([/?#]|$)') then return false; end if;
      end if;
      if item ? 'jerseySources' then
        if jsonb_typeof(item->'jerseySources') <> 'array' then return false; end if;
        if jsonb_array_length(item->'jerseySources') > 16 then return false; end if;
        for v in select value from jsonb_array_elements(item->'jerseySources') loop
          if jsonb_typeof(v) <> 'string' then return false; end if;
          if not (length(v #>> '{}') <= 2048 and v #>> '{}' !~ '[[:space:][:cntrl:]\\]'
            and v #>> '{}' ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}([/?#]|$)'
            and v #>> '{}' !~* '^https://[^/?#]*\.(localhost|local|internal|test|invalid)([/?#]|$)') then return false; end if;
        end loop;
      end if;
      if item ? 'jerseyStatus' and (jsonb_typeof(item->'jerseyStatus') <> 'string' or item->>'jerseyStatus' not in ('single_source','corroborated','conflict','reviewed')) then return false; end if;
      foreach k in array array['jerseyColor','jerseyBorderColor'] loop
        if item ? k and (jsonb_typeof(item->k) <> 'string' or item->>k !~ '^#[0-9a-fA-F]{6}$') then return false; end if;
      end loop;
    end loop;
    select coalesce(jsonb_agg(value - 'jerseyNumbers' - 'jerseySourceUrl' - 'jerseySources' - 'jerseyStatus' - 'jerseyColor' - 'jerseyBorderColor'), '[]'::jsonb) into items from jsonb_array_elements(items);
  end if;
$jerseys$;
begin
  definition := replace(pg_get_functiondef('private.preview_items_valid(text,jsonb)'::regprocedure), chr(13), '');
  if position('jerseyNumbers' in definition) > 0 then raise exception 'Jersey validator already installed'; end if;
  if position(E'begin\n' in definition) = 0 then raise exception 'Unexpected preview validator definition'; end if;
  execute replace(definition, E'begin\n', ltrim(prefix, E'\n'));
end;
$migration$;
commit;
