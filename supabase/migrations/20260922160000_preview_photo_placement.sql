-- Optional presentation settings on existing private preview photos; preserve ACLs.
begin;
do $migration$
declare definition text := pg_get_functiondef('private.preview_items_valid(text,jsonb)'::regprocedure);
begin
  if strpos(definition,$s$array['id','title','url','credits','sourceUrl','level','season','storagePath','mimeType','isHeadshot','inHeroSlideshow']$s$)>0 then return; end if;
  if strpos(definition,$s$array['id','title','url','credits','sourceUrl','level','season','storagePath','mimeType']$s$)=0 or strpos(definition,$s$if not k = any(allowed) or jsonb_typeof(v) not in ('string','null') then return false; end if;$s$)=0 then
    raise exception 'Unexpected preview validator; review before migration';
  end if;
  definition := replace(definition,$s$array['id','title','url','credits','sourceUrl','level','season','storagePath','mimeType']$s$,$s$array['id','title','url','credits','sourceUrl','level','season','storagePath','mimeType','isHeadshot','inHeroSlideshow']$s$);
  definition := replace(definition,$s$if not k = any(allowed) or jsonb_typeof(v) not in ('string','null') then return false; end if;$s$,$s$if not k = any(allowed) then return false; end if;
      if kind = 'photo' and k in ('isHeadshot','inHeroSlideshow') then
        if jsonb_typeof(v) <> 'boolean' then return false; end if;
      elsif jsonb_typeof(v) not in ('string','null') then return false; end if;$s$);
  definition := replace(definition,'  return true;',$s$  if kind = 'photo' and (select count(*) from jsonb_array_elements(items) as p(value) where p.value->>'isHeadshot' = 'true') > 1 then return false; end if;
  return true;$s$);
  execute definition;
end;
$migration$;
commit;
