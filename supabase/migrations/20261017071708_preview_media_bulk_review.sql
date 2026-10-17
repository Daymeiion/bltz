begin;
-- Both bulk operations validate the complete batch before mutating review state.
-- Preview locks serialize these changes with existing searches and single dismissals.
create function public.dismiss_preview_merchandise_results(p_preview_id uuid,p_revision integer,p_version integer,p_urls text[])
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_revision integer; saved public.preview_merchandise_searches%rowtype; listing jsonb;
  removed_keys text[]; removed_urls text[];
begin
  if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501'; end if;
  if p_urls is null or cardinality(p_urls)<1 or cardinality(p_urls)>200 or array_position(p_urls,null) is not null
    or cardinality(p_urls)<>(select count(distinct u) from unnest(p_urls) u)
    then raise exception 'invalid_listings' using errcode='22023'; end if;
  select revision into current_revision from public.preview_lockers where id=p_preview_id for update;
  if not found then raise exception 'preview_not_found' using errcode='P0002'; end if;
  if current_revision is distinct from p_revision then raise exception 'preview_changed' using errcode='PT409'; end if;
  select * into saved from public.preview_merchandise_searches where preview_id=p_preview_id for update;
  if not found or saved.version is distinct from p_version then raise exception 'review_changed' using errcode='PT409'; end if;
  if exists(select 1 from unnest(p_urls) u where not exists(select 1 from jsonb_array_elements(saved.result->'items') i where i->>'productUrl'=u))
    then raise exception 'invalid_listing' using errcode='22023'; end if;
  removed_urls:=array(select distinct u from unnest(saved.dismissed_urls||p_urls) u order by u);
  if cardinality(removed_urls)>cardinality(saved.dismissed_urls) then
    removed_keys:=saved.dismissed_keys;
    for listing in select i from jsonb_array_elements(saved.result->'items') i where i->>'productUrl'=any(p_urls) loop
      removed_keys:=removed_keys||public.preview_merchandise_listing_keys(listing);
    end loop;
    removed_keys:=array(select distinct k from unnest(removed_keys) k order by k);
    if cardinality(removed_keys)>2000 or octet_length(array_to_string(removed_keys,','))>2000000
      then raise exception 'review_queue_full' using errcode='PT422'; end if;
    update public.preview_merchandise_searches set dismissed_urls=removed_urls,dismissed_keys=removed_keys,updated_at=clock_timestamp(),version=version+1
      where preview_id=p_preview_id returning * into saved;
  end if;
  return to_jsonb(saved);
end; $$;
revoke all on function public.dismiss_preview_merchandise_results(uuid,integer,integer,text[]) from public,anon,authenticated;
grant execute on function public.dismiss_preview_merchandise_results(uuid,integer,integer,text[]) to authenticated;

create or replace function public.dismiss_preview_merchandise_result(p_preview_id uuid,p_revision integer,p_version integer,p_url text)
returns jsonb language sql security invoker set search_path='' as $$
  select public.dismiss_preview_merchandise_results(p_preview_id,p_revision,p_version,array[p_url]);
$$;

create function public.dismiss_preview_news_articles(p_preview_id uuid,p_revision integer,p_version integer,p_urls text[])
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_revision integer; saved public.preview_enrichments%rowtype; dismissed integer;
begin
  if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501'; end if;
  if p_urls is null or cardinality(p_urls)<1 or cardinality(p_urls)>200 or array_position(p_urls,null) is not null
    or cardinality(p_urls)<>(select count(distinct u) from unnest(p_urls) u)
    then raise exception 'invalid_articles' using errcode='22023'; end if;
  select revision into current_revision from public.preview_lockers where id=p_preview_id for update;
  if not found then raise exception 'preview_not_found' using errcode='P0002'; end if;
  if current_revision is distinct from p_revision then raise exception 'preview_changed' using errcode='PT409'; end if;
  select * into saved from public.preview_enrichments where preview_id=p_preview_id for update;
  if not found or saved.news_review_version is distinct from p_version then raise exception 'review_changed' using errcode='PT409'; end if;
  perform 1 from public.player_articles where preview_id=p_preview_id and identity_key=saved.identity_key and status in ('review','rejected')
    and article_url=any(p_urls) order by id for update;
  if (select count(distinct article_url) from public.player_articles where preview_id=p_preview_id and identity_key=saved.identity_key
    and status in ('review','rejected') and article_url=any(p_urls))<>cardinality(p_urls)
    then raise exception 'invalid_article' using errcode='22023'; end if;
  update public.player_articles set status='rejected',updated_at=clock_timestamp() where preview_id=p_preview_id and identity_key=saved.identity_key
    and status='review' and article_url=any(p_urls);
  get diagnostics dismissed = row_count;
  if dismissed>0 then
    update public.preview_enrichments set news_review_version=news_review_version+1 where preview_id=p_preview_id returning * into saved;
  end if;
  return jsonb_build_object('version',saved.news_review_version);
end; $$;
revoke all on function public.dismiss_preview_news_articles(uuid,integer,integer,text[]) from public,anon,authenticated;
grant execute on function public.dismiss_preview_news_articles(uuid,integer,integer,text[]) to authenticated;

create or replace function public.dismiss_preview_news_article(p_preview_id uuid,p_revision integer,p_version integer,p_url text)
returns jsonb language sql security invoker set search_path='' as $$
  select public.dismiss_preview_news_articles(p_preview_id,p_revision,p_version,array[p_url]);
$$;
notify pgrst,'reload schema';
commit;
