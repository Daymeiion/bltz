begin;
-- Atomic batches share the existing preview -> review lock order and audit triggers.
create function public.restore_preview_news_articles(p_preview_id uuid,p_revision integer,p_version integer,p_identity_key text,p_urls text[])
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_revision integer; saved public.preview_enrichments%rowtype;
begin
 if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501';end if;
 if p_urls is null or cardinality(p_urls)<1 or cardinality(p_urls)>200 or array_position(p_urls,null) is not null
  or cardinality(p_urls)<>(select count(distinct u) from unnest(p_urls) u) then raise exception 'invalid_articles' using errcode='22023';end if;
 select revision into current_revision from public.preview_lockers where id=p_preview_id for update;
 if not found then raise exception 'preview_not_found' using errcode='P0002';end if;
 if current_revision is distinct from p_revision then raise exception 'preview_changed' using errcode='PT409';end if;
 select * into saved from public.preview_enrichments where preview_id=p_preview_id for update;
 if not found or saved.news_review_version is distinct from p_version or saved.identity_key is distinct from p_identity_key then raise exception 'review_changed' using errcode='PT409';end if;
 perform 1 from public.player_articles where preview_id=p_preview_id and identity_key=p_identity_key and status='rejected' and article_url=any(p_urls) order by id for update;
 if (select count(distinct article_url) from public.player_articles where preview_id=p_preview_id and identity_key=p_identity_key and status='rejected' and article_url=any(p_urls))<>cardinality(p_urls)
  then raise exception 'invalid_article' using errcode='22023';end if;
 if (select count(*) from public.player_articles where preview_id=p_preview_id and identity_key=p_identity_key and status='review')+cardinality(p_urls)>200
  then raise exception 'news_review_full' using errcode='PT422';end if;
 update public.player_articles set status='review',updated_at=clock_timestamp() where preview_id=p_preview_id and identity_key=p_identity_key and status='rejected' and article_url=any(p_urls);
 update public.preview_enrichments set news_review_version=news_review_version+1 where preview_id=p_preview_id returning * into saved;
 return jsonb_build_object('version',saved.news_review_version);
end; $$;
revoke all on function public.restore_preview_news_articles(uuid,integer,integer,text,text[]) from public,anon,authenticated;
grant execute on function public.restore_preview_news_articles(uuid,integer,integer,text,text[]) to authenticated;

create function public.restore_preview_merchandise_results(p_preview_id uuid,p_revision integer,p_version integer,p_identity_key text,p_urls text[])
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_revision integer; saved public.preview_merchandise_searches%rowtype; item jsonb;
 restored_keys text[]:='{}'; pending_items jsonb:='[]'; archived_items jsonb:='[]';
begin
 if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501';end if;
 if p_urls is null or cardinality(p_urls)<1 or cardinality(p_urls)>200 or array_position(p_urls,null) is not null
  or cardinality(p_urls)<>(select count(distinct u) from unnest(p_urls) u) then raise exception 'invalid_listings' using errcode='22023';end if;
 select revision into current_revision from public.preview_lockers where id=p_preview_id for update;
 if not found then raise exception 'preview_not_found' using errcode='P0002';end if;
 if current_revision is distinct from p_revision then raise exception 'preview_changed' using errcode='PT409';end if;
 select * into saved from public.preview_merchandise_searches where preview_id=p_preview_id for update;
 if not found or saved.version is distinct from p_version or saved.identity_key is distinct from p_identity_key then raise exception 'review_changed' using errcode='PT409';end if;
 if exists(select 1 from unnest(p_urls) u where not u=any(saved.dismissed_urls)
  or not exists(select 1 from jsonb_array_elements((saved.result->'items')||saved.dismissed_items) i where i->>'productUrl'=u))
  then raise exception 'invalid_listing' using errcode='22023';end if;
 for item in select i from jsonb_array_elements((saved.result->'items')||saved.dismissed_items) i loop
  if item->>'productUrl'=any(p_urls) then restored_keys:=restored_keys||public.preview_merchandise_listing_keys(item);end if;
  if not item->>'productUrl'=any(p_urls) and item->>'productUrl'=any(saved.dismissed_urls) then archived_items:=archived_items||jsonb_build_array(item);
  else pending_items:=pending_items||jsonb_build_array(item);end if;
 end loop;
 if jsonb_array_length(pending_items)>200 or octet_length(((saved.result-'items')||jsonb_build_object('items',pending_items))::text)>2000000
  or jsonb_array_length(archived_items)>2000 or octet_length(archived_items::text)>2000000 then raise exception 'review_queue_full' using errcode='PT422';end if;
 update public.preview_merchandise_searches set result=(saved.result-'items')||jsonb_build_object('items',pending_items),dismissed_items=archived_items,
  dismissed_urls=array(select u from unnest(saved.dismissed_urls) u where not u=any(p_urls)),
  dismissed_keys=array(select k from unnest(saved.dismissed_keys) k where not k=any(restored_keys)),version=version+1,updated_at=clock_timestamp()
  where preview_id=p_preview_id returning * into saved;
 return to_jsonb(saved);
end; $$;
revoke all on function public.restore_preview_merchandise_results(uuid,integer,integer,text,text[]) from public,anon,authenticated;
grant execute on function public.restore_preview_merchandise_results(uuid,integer,integer,text,text[]) to authenticated;

create or replace function public.restore_preview_news_article(p_preview_id uuid,p_revision integer,p_version integer,p_identity_key text,p_url text)
returns jsonb language sql security invoker set search_path='' as $$
 select public.restore_preview_news_articles(p_preview_id,p_revision,p_version,p_identity_key,array[p_url]);
$$;
create or replace function public.restore_preview_merchandise_result(p_preview_id uuid,p_revision integer,p_version integer,p_identity_key text,p_url text)
returns jsonb language sql security invoker set search_path='' as $$
 select public.restore_preview_merchandise_results(p_preview_id,p_revision,p_version,p_identity_key,array[p_url]);
$$;
notify pgrst,'reload schema';
commit;
