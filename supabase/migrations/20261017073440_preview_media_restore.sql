begin;
-- Saved metadata for dismissed merchandise, separate from the pending result.
-- Historical keys are preserved even when older metadata has already been pruned.
alter table public.preview_merchandise_searches add column dismissed_items jsonb not null default '[]'
 check(jsonb_typeof(dismissed_items)='array' and jsonb_array_length(dismissed_items)<=2000 and octet_length(dismissed_items::text)<=2000000);
alter table public.preview_merchandise_searches drop constraint preview_merchandise_searches_dismissed_urls_check;
alter table public.preview_merchandise_searches add constraint preview_merchandise_searches_dismissed_urls_check check(cardinality(dismissed_urls)<=2000);
drop policy preview_articles_admin_dismiss on public.player_articles;
create policy preview_articles_admin_dismiss on public.player_articles for update to authenticated
 using ((select public.is_internal_admin()) and status in ('review','rejected'))
 with check ((select public.is_internal_admin()) and status in ('review','rejected'));
create or replace function public.save_preview_merchandise_search(p_preview_id uuid, p_revision integer, p_identity_key text, p_started_at timestamptz, p_result jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_revision integer; saved public.preview_merchandise_searches%rowtype; old_items jsonb:='[]'; merged jsonb:='[]'; next_items jsonb;
  pending_items jsonb:='[]'; archived_items jsonb:='[]'; item jsonb; entry record; keeper jsonb; keeper_index integer; matching integer[]; keys text[]; removed_keys text[]:='{}'; changed boolean; queue_result jsonb;
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
    old_items:=(saved.result->'items')||saved.dismissed_items; removed_keys:=saved.dismissed_keys;
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
    if keys && removed_keys then removed_keys:=removed_keys||keys; archived_items:=archived_items||jsonb_build_array(item);
    else pending_items:=pending_items||jsonb_build_array(item); end if;
  end loop;
  removed_keys:=array(select distinct k from unnest(removed_keys) k order by k);
  queue_result:=(p_result-'items')||jsonb_build_object('items',pending_items);
  if jsonb_array_length(archived_items)>2000 or octet_length(archived_items::text)>2000000 or jsonb_array_length(pending_items)>200 or octet_length(queue_result::text)>2000000 or cardinality(removed_keys)>2000
    or octet_length(array_to_string(removed_keys,','))>2000000 then raise exception 'review_queue_full' using errcode='PT422'; end if;
  insert into public.preview_merchandise_searches(preview_id,source_revision,identity_key,result,searched_at,dismissed_keys,dismissed_items,dismissed_urls)
    values(p_preview_id,p_revision,p_identity_key,queue_result,p_started_at,removed_keys,archived_items,array(select i->>'productUrl' from jsonb_array_elements(archived_items) i))
  on conflict(preview_id) do update set source_revision=excluded.source_revision,identity_key=excluded.identity_key,result=excluded.result,
    searched_at=excluded.searched_at,updated_at=clock_timestamp(),version=public.preview_merchandise_searches.version+1,dismissed_urls=excluded.dismissed_urls,dismissed_keys=excluded.dismissed_keys,dismissed_items=excluded.dismissed_items
  returning * into saved;
  return to_jsonb(saved);
end; $$;


create function public.restore_preview_merchandise_result(p_preview_id uuid,p_revision integer,p_version integer,p_identity_key text,p_url text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_revision integer; saved public.preview_merchandise_searches%rowtype; listing jsonb; item jsonb;
 restored_keys text[]; pending_items jsonb:='[]'; archived_items jsonb:='[]';
begin
 if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501';end if;
 select revision into current_revision from public.preview_lockers where id=p_preview_id for update;
 if not found then raise exception 'preview_not_found' using errcode='P0002';end if;
 if current_revision is distinct from p_revision then raise exception 'preview_changed' using errcode='PT409';end if;
 select * into saved from public.preview_merchandise_searches where preview_id=p_preview_id for update;
 if not found or saved.version is distinct from p_version or saved.identity_key is distinct from p_identity_key then raise exception 'review_changed' using errcode='PT409';end if;
 select i into listing from jsonb_array_elements((saved.result->'items')||saved.dismissed_items) i where i->>'productUrl'=p_url limit 1;
 if listing is null or not p_url=any(saved.dismissed_urls) then raise exception 'invalid_listing' using errcode='22023';end if;
 restored_keys:=public.preview_merchandise_listing_keys(listing);
 for item in select i from jsonb_array_elements((saved.result->'items')||saved.dismissed_items) i loop
   if item->>'productUrl'<>p_url and item->>'productUrl'=any(saved.dismissed_urls) then archived_items:=archived_items||jsonb_build_array(item);
   else pending_items:=pending_items||jsonb_build_array(item);end if;
 end loop;
 if jsonb_array_length(pending_items)>200 or octet_length(((saved.result-'items')||jsonb_build_object('items',pending_items))::text)>2000000
  then raise exception 'review_queue_full' using errcode='PT422';end if;
 update public.preview_merchandise_searches set result=(saved.result-'items')||jsonb_build_object('items',pending_items),dismissed_items=archived_items,
  dismissed_urls=array_remove(saved.dismissed_urls,p_url),dismissed_keys=array(select k from unnest(saved.dismissed_keys) k where not k=any(restored_keys)),
  version=version+1,updated_at=clock_timestamp() where preview_id=p_preview_id returning * into saved;
 return to_jsonb(saved);
end; $$;
revoke all on function public.restore_preview_merchandise_result(uuid,integer,integer,text,text) from public,anon,authenticated;
grant execute on function public.restore_preview_merchandise_result(uuid,integer,integer,text,text) to authenticated;

create function public.restore_preview_news_article(p_preview_id uuid,p_revision integer,p_version integer,p_identity_key text,p_url text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_revision integer; saved public.preview_enrichments%rowtype; article_id uuid;
begin
 if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501';end if;
 select revision into current_revision from public.preview_lockers where id=p_preview_id for update;
 if not found then raise exception 'preview_not_found' using errcode='P0002';end if;
 if current_revision is distinct from p_revision then raise exception 'preview_changed' using errcode='PT409';end if;
 select * into saved from public.preview_enrichments where preview_id=p_preview_id for update;
 if not found or saved.news_review_version is distinct from p_version or saved.identity_key is distinct from p_identity_key then raise exception 'review_changed' using errcode='PT409';end if;
 select id into article_id from public.player_articles where preview_id=p_preview_id and identity_key=p_identity_key and article_url=p_url and status='rejected' for update;
 if not found then raise exception 'invalid_article' using errcode='22023';end if;
 if (select count(*) from public.player_articles where preview_id=p_preview_id and identity_key=p_identity_key and status='review')>=200
  then raise exception 'news_review_full' using errcode='PT422';end if;
 update public.player_articles set status='review',updated_at=clock_timestamp() where id=article_id;
 update public.preview_enrichments set news_review_version=news_review_version+1 where preview_id=p_preview_id returning * into saved;
 return jsonb_build_object('version',saved.news_review_version);
end; $$;
revoke all on function public.restore_preview_news_article(uuid,integer,integer,text,text) from public,anon,authenticated;
grant execute on function public.restore_preview_news_article(uuid,integer,integer,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
