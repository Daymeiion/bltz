-- Preserve optional scraped/manual award article references. Existing rows remain valid.
begin;

create or replace function private.preview_items_valid(kind text, items jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; k text; v jsonb; allowed text[]; required text[]; max_items int; ids text[] := array[]::text[]; stored boolean;
begin
  if items is null or jsonb_typeof(items) <> 'array' then return false; end if;
  case kind
    when 'team' then allowed := array['label','color','logo']; required := allowed; max_items := 12;
    when 'award' then allowed := array['year','label','sourceUrl']; required := array['year','label']; max_items := 40;
    when 'video' then allowed := array['id','title','url','thumb','storagePath','mimeType']; required := array['id','title','thumb']; max_items := 24;
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
    if kind = 'photo' and coalesce(item->>'level','') not in ('hs','cfb','pro','off-field') then return false; end if;
  end loop;
  return true;
end;
$$;


commit;
