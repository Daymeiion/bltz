-- Optional placement on existing preview videos; legacy Film Room-only records stay valid.
-- No rows, storage objects, grants, policies, or public schema are changed.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $migration$
declare
  definition text := pg_get_functiondef('private.preview_items_valid(text,jsonb)'::regprocedure);
  old_fields text := $fields$array['id','title','url','thumb','storagePath','mimeType','heroDevice','level']$fields$;
  new_fields text := $fields$array['id','title','url','thumb','storagePath','mimeType','heroDevice','level','lockerPlacement']$fields$;
  video_rule text := $rule$if kind = 'video' and item ? 'level' and coalesce(item->>'level','') not in ('pro','cfb','hs','off-field') then return false; end if;$rule$;
  placement_rule text := $rule$if kind = 'video' and item ? 'lockerPlacement' and coalesce(item->>'lockerPlacement','') not in ('podcast','social','both') then return false; end if;$rule$;
begin
  if strpos(definition,new_fields)>0 and strpos(definition,placement_rule)>0 then return; end if;
  if strpos(definition,old_fields)=0 or strpos(definition,video_rule)=0 then
    raise exception 'Unexpected preview video validator; review before migration';
  end if;
  definition := replace(definition,old_fields,new_fields);
  definition := replace(definition,video_rule,video_rule || E'\n    ' || placement_rule);
  execute definition;
end;
$migration$;
commit;
