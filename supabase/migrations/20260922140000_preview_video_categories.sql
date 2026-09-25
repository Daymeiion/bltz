-- Add categories without replacing unrelated live validation rules or permissions.
begin;
do $migration$
declare
  definition text := pg_get_functiondef('private.preview_items_valid(text,jsonb)'::regprocedure);
  old_fields text := $fields$array['id','title','url','thumb','storagePath','mimeType','heroDevice']$fields$;
  new_fields text := $fields$array['id','title','url','thumb','storagePath','mimeType','heroDevice','level']$fields$;
  photo_rule text := $rule$if kind = 'photo' and coalesce(item->>'level','') not in ('hs','cfb','pro','off-field') then return false; end if;$rule$;
  video_rule text := $rule$if kind = 'video' and item ? 'level' and coalesce(item->>'level','') not in ('pro','cfb','hs','off-field') then return false; end if;$rule$;
begin
  if strpos(definition,new_fields)>0 and strpos(definition,video_rule)>0 then return; end if;
  if strpos(definition,old_fields)=0 or strpos(definition,photo_rule)=0 then
    raise exception 'Unexpected preview validator; review before migration';
  end if;
  definition := replace(definition,old_fields,new_fields);
  definition := replace(definition,photo_rule,video_rule || E'\n    ' || photo_rule);
  execute definition;
end;
$migration$;
commit;
