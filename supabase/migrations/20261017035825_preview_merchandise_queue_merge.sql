begin;
-- Queue growth is independent of the twelve-result limit for each search.
alter table public.preview_merchandise_searches drop constraint preview_merchandise_searches_result_check;
alter table public.preview_merchandise_searches add constraint preview_merchandise_searches_result_check
  check (jsonb_typeof(result)='object' and octet_length(result::text)<=2000000
    and jsonb_typeof(result->'items') is not distinct from 'array' and jsonb_array_length(result->'items')<=200);
alter table public.preview_merchandise_searches drop constraint preview_merchandise_searches_dismissed_urls_check;
alter table public.preview_merchandise_searches add constraint preview_merchandise_searches_dismissed_urls_check check (cardinality(dismissed_urls)<=200);
alter table public.preview_merchandise_searches add column dismissed_keys text[] not null default '{}'
  check (cardinality(dismissed_keys)<=2000 and octet_length(array_to_string(dismissed_keys,','))<=2000000);

-- Pure, bounded URL keys; no data access, outbound requests or inferred identity.
create function public.preview_merchandise_listing_keys(p_item jsonb) returns text[]
language plpgsql immutable security invoker set search_path='' as $$
declare raw text; parts text[]; host text; first_host text; path text; query text; matched text[]; keys text[]:='{}';
begin
  if p_item ? 'listingKeys' then
    if jsonb_typeof(p_item->'listingKeys') is distinct from 'array' or jsonb_array_length(p_item->'listingKeys')>64
      or exists(select 1 from jsonb_array_elements(p_item->'listingKeys') v where jsonb_typeof(v)<>'string' or length(v#>>'{}')>2100)
      then raise exception 'invalid_listing_keys' using errcode='22023'; end if;
    keys:=array(select jsonb_array_elements_text(p_item->'listingKeys'));
  end if;
  foreach raw in array array[p_item->>'productUrl',p_item->>'canonicalUrl'] loop
    if raw is null then continue; end if;
    if length(raw)>2048 or raw ~ '[[:space:]]' then raise exception 'invalid_listing_url' using errcode='22023'; end if;
    parts:=regexp_match(raw,'^https://([^/?#]+)([^?#]*)(?:\?([^#]*))?(?:#.*)?$','i');
    if parts is null then raise exception 'invalid_listing_url' using errcode='22023'; end if;
    host:=regexp_replace(lower(parts[1]),'^www\.','');
    if host !~ '^[a-z0-9.-]+\.[a-z]{2,}$' then raise exception 'invalid_listing_url' using errcode='22023'; end if;
    if first_host is null then first_host:=host; elsif first_host<>host then continue; end if;
    path:=coalesce(nullif(rtrim(parts[2],'/'),''),'/');
    query:=(select string_agg(q,'&' order by q collate "C") from unnest(string_to_array(parts[3],'&')) q
      where q<>'' and split_part(q,'=',1) !~* '^(utm_.*|fbclid|gclid|mc_cid|mc_eid)$');
    keys:=array_append(keys,'url:https://'||host||path||case when query is null then '' else '?'||query end);
    if host ~ '^amazon\.[a-z.]+$' then
      matched:=regexp_match(path,'/(?:dp|gp/product)/([a-z0-9]{10})(?:/|$)','i');
      if matched is not null then keys:=array_append(keys,'id:'||host||':amazon:'||upper(matched[1])); end if;
    elsif host ~ '^ebay\.[a-z.]+$' then
      matched:=regexp_match(path,'/itm/(?:[^/]+/)?([0-9]+)(?:/|$)','i');
      if matched is not null then keys:=array_append(keys,'id:'||host||':ebay:'||matched[1]); end if;
    elsif host='nflauction.nfl.com' then
      matched:=regexp_match(path,'/isynmv1/aucd/([0-9]+)(?:/|$)','i');
      if matched is not null then keys:=array_append(keys,'id:'||host||':auction:'||matched[1]); end if;
    else
      matched:=regexp_match(path,'(?:^|[/+_-])p-([0-9]+)','i');
      if matched is not null then keys:=array_append(keys,'id:'||host||':product:'||matched[1]); end if;
    end if;
  end loop;
  return array(select distinct k from unnest(keys) k order by k);
end; $$;
revoke all on function public.preview_merchandise_listing_keys(jsonb) from public,anon,authenticated;
grant execute on function public.preview_merchandise_listing_keys(jsonb) to authenticated;

create or replace function public.save_preview_merchandise_search(p_preview_id uuid, p_revision integer, p_identity_key text, p_started_at timestamptz, p_result jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_revision integer; saved public.preview_merchandise_searches%rowtype; old_items jsonb:='[]'; merged jsonb:='[]'; next_items jsonb;
  pending_items jsonb:='[]'; item jsonb; entry record; keeper jsonb; keeper_index integer; matching integer[]; keys text[]; removed_keys text[]:='{}'; changed boolean; queue_result jsonb;
begin
  if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501'; end if;
  select revision into current_revision from public.preview_lockers where id=p_preview_id for update;
  if not found then raise exception 'preview_not_found' using errcode='P0002'; end if;
  if current_revision is distinct from p_revision then raise exception 'preview_changed' using errcode='PT409'; end if;
  if p_started_at is null or not isfinite(p_started_at) or p_started_at>clock_timestamp()+interval '1 minute'
    or p_identity_key is null or p_identity_key !~ '^[a-f0-9]{64}$' or p_result is null or jsonb_typeof(p_result)<>'object'
    or octet_length(p_result::text)>100000 or jsonb_typeof(p_result->'items') is distinct from 'array' or jsonb_array_length(p_result->'items')>12
    or (p_result->>'status') is null or p_result->>'status' not in ('complete','partial')
    or (p_result->>'status'='partial' and jsonb_array_length(p_result->'items')=0)
    then raise exception 'invalid_result' using errcode='22023'; end if;
  select * into saved from public.preview_merchandise_searches where preview_id=p_preview_id for update;
  if saved.searched_at>=p_started_at then raise exception 'newer_search_exists' using errcode='PT409'; end if;
  if saved.identity_key=p_identity_key then
    old_items:=saved.result->'items'; removed_keys:=saved.dismissed_keys;
    for item in select value from jsonb_array_elements(old_items) loop
      if item->>'productUrl'=any(saved.dismissed_urls) then removed_keys:=removed_keys||public.preview_merchandise_listing_keys(item); end if;
    end loop;
  end if;
  -- Oldest saved metadata wins. Persist aliases, including canonical bridges,
  -- so later searches cannot reintroduce the same listing under another URL.
  for item in select value from jsonb_array_elements(old_items||(p_result->'items')) loop
    keys:=public.preview_merchandise_listing_keys(item); matching:='{}'; keeper_index:=null; changed:=true;
    if cardinality(keys)=0 then raise exception 'invalid_listing' using errcode='22023'; end if;
    while changed loop
      changed:=false;
      for entry in select value,ordinality::integer as n from jsonb_array_elements(merged) with ordinality loop
        if not entry.n=any(matching) and keys && public.preview_merchandise_listing_keys(entry.value) then
          matching:=array_append(matching,entry.n); keys:=array(select distinct k from unnest(keys||public.preview_merchandise_listing_keys(entry.value)) k order by k); changed:=true;
        end if;
      end loop;
    end loop;
    if cardinality(keys)>64 then raise exception 'review_queue_full' using errcode='PT422'; end if;
    keeper_index:=(select min(n) from unnest(matching) n);
    keeper:=coalesce(merged->(keeper_index-1),item)||jsonb_build_object('listingKeys',to_jsonb(keys)); next_items:='[]';
    for entry in select value,ordinality::integer as n from jsonb_array_elements(merged) with ordinality loop
      if entry.n=keeper_index then next_items:=next_items||jsonb_build_array(keeper);
      elsif not entry.n=any(matching) then next_items:=next_items||jsonb_build_array(entry.value); end if;
    end loop;
    if keeper_index is null then next_items:=next_items||jsonb_build_array(keeper); end if;
    merged:=next_items;
  end loop;
  for item in select value from jsonb_array_elements(merged) loop
    keys:=public.preview_merchandise_listing_keys(item);
    if keys && removed_keys then removed_keys:=removed_keys||keys;
    else pending_items:=pending_items||jsonb_build_array(item); end if;
  end loop;
  removed_keys:=array(select distinct k from unnest(removed_keys) k order by k);
  queue_result:=(p_result-'items')||jsonb_build_object('items',pending_items);
  if jsonb_array_length(pending_items)>200 or octet_length(queue_result::text)>2000000 or cardinality(removed_keys)>2000
    or octet_length(array_to_string(removed_keys,','))>2000000 then raise exception 'review_queue_full' using errcode='PT422'; end if;
  insert into public.preview_merchandise_searches(preview_id,source_revision,identity_key,result,searched_at,dismissed_keys)
    values(p_preview_id,p_revision,p_identity_key,queue_result,p_started_at,removed_keys)
  on conflict(preview_id) do update set source_revision=excluded.source_revision,identity_key=excluded.identity_key,result=excluded.result,
    searched_at=excluded.searched_at,updated_at=clock_timestamp(),version=public.preview_merchandise_searches.version+1,dismissed_urls='{}',dismissed_keys=excluded.dismissed_keys
  returning * into saved;
  return to_jsonb(saved);
end; $$;

create or replace function public.dismiss_preview_merchandise_result(p_preview_id uuid, p_revision integer, p_version integer, p_url text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_revision integer; saved public.preview_merchandise_searches%rowtype; listing jsonb; removed_keys text[];
begin
  if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501'; end if;
  select revision into current_revision from public.preview_lockers where id=p_preview_id for update;
  if not found then raise exception 'preview_not_found' using errcode='P0002'; end if;
  if current_revision is distinct from p_revision then raise exception 'preview_changed' using errcode='PT409'; end if;
  select * into saved from public.preview_merchandise_searches where preview_id=p_preview_id for update;
  if not found or saved.version is distinct from p_version then raise exception 'review_changed' using errcode='PT409'; end if;
  select item into listing from jsonb_array_elements(saved.result->'items') item where item->>'productUrl'=p_url;
  if listing is null then raise exception 'invalid_listing' using errcode='22023'; end if;
  if not p_url=any(saved.dismissed_urls) then
    removed_keys:=array(select distinct k from unnest(saved.dismissed_keys||public.preview_merchandise_listing_keys(listing)) k order by k);
    if cardinality(removed_keys)>2000 or octet_length(array_to_string(removed_keys,','))>2000000 then raise exception 'review_queue_full' using errcode='PT422'; end if;
    update public.preview_merchandise_searches set dismissed_urls=array_append(dismissed_urls,p_url),dismissed_keys=removed_keys,updated_at=clock_timestamp(),version=version+1
      where preview_id=p_preview_id returning * into saved;
  end if;
  return to_jsonb(saved);
end; $$;
notify pgrst,'reload schema';
commit;
