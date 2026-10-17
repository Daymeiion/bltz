-- Preview presentation only. Discovery evidence remains in player_articles;
-- no Media Graph, rights, inventory, checkout or financial schemas are added.
begin;

create function private.preview_editorial_valid(kind text, items jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; k text; v jsonb; required text[]; ids text[] := '{}'; sources text[] := '{}'; max_length integer;
begin
  if items is null or jsonb_typeof(items) <> 'array' then return false; end if;
  if jsonb_array_length(items)>40 or octet_length(items::text)>100000 then return false; end if;
  if kind='article' then required := array['id','sourceUrl','visible','headline','publisher','articleUrl','imageUrl','summary','publishedAt'];
  elsif kind='merchandise' then required := array['id','title','category','productUrl','imageUrl','retailer','priceLabel','visible'];
  else return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item)<>'object' or not item ?& required then return false; end if;
    for k,v in select key,value from jsonb_each(item) loop
      if not k=any(required) then return false; end if;
      if k='visible' then
        if jsonb_typeof(v)<>'boolean' then return false; end if;
        continue;
      end if;
      if jsonb_typeof(v) not in ('string','null') then return false; end if;
      if k not in ('sourceUrl','imageUrl','publishedAt','retailer','priceLabel') and jsonb_typeof(v)<>'string' then return false; end if;
      if translate(coalesce(item->>k,''), E'\t\n\r', '') ~ '[[:cntrl:]]' then return false; end if;
      max_length := case when k in ('sourceUrl','articleUrl','imageUrl','productUrl') then 2048
        when k='headline' then 500 when k='publisher' then 200 when k='summary' then 600
        when k in ('id','priceLabel') then 80 when k='publishedAt' then 10 else 160 end;
      if length(coalesce(item->>k,''))>max_length then return false; end if;
      if k in ('sourceUrl','articleUrl','imageUrl','productUrl') and item->>k is not null then
        -- Inline validation avoids granting callers USAGE on the private schema.
        if item->>k ~ '[[:space:][:cntrl:]\\]' or item->>k !~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}([/?#]|$)'
          or item->>k ~* '^https://[^/?#]*\.(localhost|local|internal|test|invalid)([/?#]|$)' then return false; end if;
      end if;
    end loop;
    if item->>'id' !~ '^[A-Za-z0-9_-]{1,80}$' or (item->>'id')=any(ids) then return false; end if;
    ids := array_append(ids,item->>'id');
    if kind='article' then
      if length(btrim(item->>'headline'))<1 or length(btrim(item->>'publisher'))<1 then return false; end if;
      if item->>'sourceUrl' is not null then
        if (item->>'sourceUrl')=any(sources) then return false; end if;
        sources := array_append(sources,item->>'sourceUrl');
      end if;
      if item->>'publishedAt' is not null then
        if item->>'publishedAt' !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
        begin
          if to_char((item->>'publishedAt')::date,'YYYY-MM-DD')<>item->>'publishedAt' then return false; end if;
        exception when datetime_field_overflow or invalid_datetime_format then return false; end;
      end if;
    elsif length(btrim(item->>'title'))<1 or item->>'category' not in ('trading_card','jersey','apparel','memorabilia','other') then return false;
    end if;
  end loop;
  return true;
end; $$;
revoke all on function private.preview_editorial_valid(text,jsonb) from public, anon, authenticated, service_role;
grant execute on function private.preview_editorial_valid(text,jsonb) to authenticated;

alter table public.preview_lockers
  add column article_edits jsonb not null default '[]'::jsonb check (private.preview_editorial_valid('article',article_edits)),
  add column merchandise jsonb not null default '[]'::jsonb check (private.preview_editorial_valid('merchandise',merchandise));
grant select(article_edits,merchandise), insert(article_edits,merchandise), update(article_edits,merchandise)
  on public.preview_lockers to authenticated;
comment on column public.preview_lockers.article_edits is 'Admin article presentation overrides, hidden choices and manual link cards. sourceUrl binds an override to scraped evidence. Existing preview access/revision controls apply.';
comment on column public.preview_lockers.merchandise is 'Admin-curated external product references for this preview. No inventory, endorsement, license, commission or earnings is inferred.';

-- Preserve atomic enrollment and its exact-payload idempotent retry check.
do $migration$
declare definition text := pg_get_functiondef('public.preview_conversion_create(uuid,jsonb,jsonb)'::regprocedure);
begin
  if strpos(definition,'awards,social,career_stats')=0
    or strpos(definition,'coalesce(r.social,''[]''::jsonb),r.career_stats')=0 then
    raise exception 'Unexpected preview enrollment function; review before migration';
  end if;
  definition := replace(definition,'awards,social,career_stats','awards,social,article_edits,merchandise,career_stats');
  definition := replace(definition,'coalesce(r.social,''[]''::jsonb),r.career_stats',
    'coalesce(r.social,''[]''::jsonb),coalesce(r.article_edits,''[]''::jsonb),coalesce(r.merchandise,''[]''::jsonb),r.career_stats');
  execute definition;
end;
$migration$;

-- Retain before/after editorial settings, including hide/removal decisions.
-- The existing trigger remains the only writer of these audit events.
create or replace function private.audit_preview_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,previous_values,new_values,request_metadata)
  values(auth.uid(),case when tg_op='INSERT' then 'preview.created' else 'preview.updated' end,'preview_locker',new.id::text,'platform','medium',
    case when tg_op='UPDATE' then jsonb_build_object('revision',old.revision,'article_edits',old.article_edits,'merchandise',old.merchandise) else null end,
    jsonb_build_object('revision',new.revision,'photos',jsonb_array_length(new.photos),'videos',jsonb_array_length(new.videos),'article_edits',new.article_edits,'merchandise',new.merchandise),
    jsonb_build_object('source','private_preview_trigger','demo_only',true));
  return new;
end; $$;
revoke all on function private.audit_preview_change() from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';
commit;
