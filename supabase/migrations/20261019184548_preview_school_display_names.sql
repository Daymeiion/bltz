begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Presentation overrides only. Keep the school identity and all existing checks.
do $migration$
declare definition text; prefix text := $names$
begin
  if kind = 'team' then
    if items is null or jsonb_typeof(items) <> 'array' then return false; end if;
    if octet_length(items::text) > 100000 then return false; end if;
    for item in select value from jsonb_array_elements(items) loop
      if jsonb_typeof(item) <> 'object' then return false; end if;
      for k, v in select key, value from jsonb_each(item) where key in ('desktopName','mobileName') loop
        if jsonb_typeof(v) not in ('string','null') then return false; end if;
        if jsonb_typeof(v) = 'string' and (
          length(v #>> '{}') > case when k = 'desktopName' then 80 else 40 end
          or regexp_replace(v #>> '{}', E'[\t\n\r]', '', 'g') ~ '[[:cntrl:]]'
        ) then return false; end if;
      end loop;
    end loop;
    select coalesce(jsonb_agg(value - 'desktopName' - 'mobileName'), '[]'::jsonb)
      into items from jsonb_array_elements(items);
  end if;
$names$;
begin
  definition := replace(pg_get_functiondef('private.preview_items_valid(text,jsonb)'::regprocedure), chr(13), '');
  if position('desktopName' in definition) > 0 or position('logoStoragePath' in definition) = 0
    or position(E'begin\n' in definition) = 0 then
    raise exception 'Preview team validator changed; inspect before applying';
  end if;
  definition := overlay(definition placing ltrim(prefix,E'\n') from position(E'begin\n' in definition) for 6);
  execute definition;
end;
$migration$;
commit;
