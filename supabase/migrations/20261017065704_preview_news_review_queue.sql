begin;
-- Reuse existing discovery records: accepted=legacy Locker, review=pending,
-- rejected=dismissed. No scraped result is automatically published.
alter table public.player_articles add column review_keys text[] not null default '{}'
  check (cardinality(review_keys)<=64 and octet_length(array_to_string(review_keys,','))<=140000);
alter table public.preview_enrichments add column news_review_version integer not null default 1 check(news_review_version>0),
  add column news_searched_at timestamptz;
create index player_articles_review_queue_idx on public.player_articles(preview_id,identity_key,status,created_at)
  where status in ('review','rejected');
create policy preview_articles_admin_review_read on public.player_articles for select to authenticated
  using ((select public.is_internal_admin()));
-- Narrow invoker dismissal privileges: no publication, metadata or identity updates.
grant update(status,updated_at) on public.player_articles to authenticated;
create policy preview_articles_admin_dismiss on public.player_articles for update to authenticated
  using ((select public.is_internal_admin()) and status in ('review','rejected'))
  with check ((select public.is_internal_admin()) and status='rejected');
grant update(news_review_version) on public.preview_enrichments to authenticated;
create policy preview_enrichment_admin_review_version on public.preview_enrichments for update to authenticated
  using ((select public.is_internal_admin())) with check ((select public.is_internal_admin()));

create function public.preview_news_article_keys(p_article jsonb) returns text[]
language plpgsql immutable security invoker set search_path='' as $$
declare raw text; parts text[]; host text; path text; query text; title text; keys text[]:='{}';
begin
  if p_article ? 'review_keys' then
    if jsonb_typeof(p_article->'review_keys') is distinct from 'array' or jsonb_array_length(p_article->'review_keys')>64
      or exists(select 1 from jsonb_array_elements(p_article->'review_keys') v where jsonb_typeof(v)<>'string' or length(v#>>'{}')>2100)
      then raise exception 'invalid_article_keys' using errcode='22023'; end if;
    keys:=array(select jsonb_array_elements_text(p_article->'review_keys'));
  end if;
  foreach raw in array array[p_article->>'article_url',p_article->>'canonical_url'] loop
    if raw is null then continue; end if;
    if length(raw)>2048 or raw ~ '[[:space:]]' then raise exception 'invalid_article_url' using errcode='22023'; end if;
    parts:=regexp_match(raw,'^https://([^/?#]+)([^?#]*)(?:\?([^#]*))?(?:#.*)?$','i');
    if parts is null then raise exception 'invalid_article_url' using errcode='22023'; end if;
    host:=regexp_replace(lower(parts[1]),'^www\.','');
    if host !~ '^[a-z0-9.-]+\.[a-z]{2,}$' then raise exception 'invalid_article_url' using errcode='22023'; end if;
    path:=coalesce(nullif(rtrim(parts[2],'/'),''),'/');
    query:=(select string_agg(q,'&' order by q collate "C") from unnest(string_to_array(parts[3],'&')) q
      where q<>'' and split_part(q,'=',1) !~* '^(utm_.*|fbclid|gclid|mc_cid|mc_eid)$');
    keys:=array_append(keys,'url:https://'||host||path||case when query is null then '' else '?'||query end);
  end loop;
  title:=regexp_replace(lower(p_article->>'headline_key'),'^www\.','');
  if nullif(title,'') is not null then keys:=array_append(keys,'headline:'||title); end if;
  return array(select distinct k from unnest(keys) k order by k);
end; $$;
revoke all on function public.preview_news_article_keys(jsonb) from public,anon,authenticated;
grant execute on function public.preview_news_article_keys(jsonb) to authenticated;

create function private.audit_preview_news_review() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501'; end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,new_values)
    values(auth.uid(),'preview.news_review','preview_locker',new.preview_id::text,'platform',
      jsonb_build_object('article_id',new.id,'status',new.status,'source_revision',new.source_revision,'alias_count',cardinality(new.review_keys)));
  return new;
end; $$;
revoke all on function private.audit_preview_news_review() from public,anon,authenticated,service_role;
create trigger preview_news_review_audit after insert or update on public.player_articles
for each row execute function private.audit_preview_news_review();

create or replace function public.save_preview_enrichment(p_preview_id uuid, p_revision integer, p_identity_key text,
  p_started_at timestamptz, p_awards jsonb, p_articles jsonb, p_report jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target public.preview_lockers%rowtype; item jsonb; prior public.preview_enrichments%rowtype;
  fingerprint text; saved_report jsonb; linked integer := 0; retired integer := 0; field text;
  article_keys text[]; matches uuid[]; matched record; keeper public.player_articles%rowtype; changed boolean; touched integer;
begin
  if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501'; end if;
  select * into target from public.preview_lockers where id=p_preview_id for update;
  if not found then raise exception 'preview_not_found' using errcode='P0002'; end if;
  if p_revision is null or target.revision <> p_revision then raise exception 'preview_changed' using errcode='PT409'; end if;
  if p_started_at is null or not isfinite(p_started_at) or p_started_at > clock_timestamp()+interval '1 minute'
    or p_identity_key is null or p_identity_key !~ '^[a-f0-9]{64}$'
    or p_report is null or jsonb_typeof(p_report)<>'object' or octet_length(p_report::text)>16000
    or (p_awards is not null and (jsonb_typeof(p_awards)<>'array' or jsonb_array_length(p_awards)>40))
    or (p_articles is not null and (jsonb_typeof(p_articles)<>'array' or jsonb_array_length(p_articles)>12))
    then raise exception 'invalid_enrichment' using errcode='22023'; end if;
  fingerprint := md5(jsonb_build_array(p_revision,p_identity_key,p_awards,p_articles,p_report)::text);
  select * into prior from public.preview_enrichments where preview_id=p_preview_id;
  if prior.started_at = p_started_at and prior.request_fingerprint = fingerprint then return prior.report; end if;
  if prior.started_at >= p_started_at then raise exception 'newer_enrichment_exists' using errcode='PT409'; end if;
  -- Latest attempt and last usable news discovery are distinct diagnostics.
  saved_report := (p_report - 'last_news_success') || jsonb_build_object('last_news_success',
    case when p_articles is not null then p_report - 'last_news_success'
      when prior.identity_key=p_identity_key then prior.report->'last_news_success' else null end);
  for item in select value from jsonb_array_elements(coalesce(p_awards,'[]')) loop
    foreach field in array array['raw_label','year','edition','source_type'] loop
      if jsonb_typeof(item->field) is distinct from 'string' then raise exception 'invalid_award_field' using errcode='22023'; end if;
    end loop;
    if jsonb_typeof(item)<>'object' or nullif(btrim(item->>'raw_label'),'') is null
      or length(item->>'raw_label')>200 or length(item->>'year')>20 or length(item->>'edition')>80
      or item->>'source_type' not in ('source_reference','admin_input')
      or jsonb_typeof(item->'metadata') is distinct from 'object' or octet_length((item->'metadata')::text)>4096
      or coalesce((item->>'verified')::boolean,false)
      then raise exception 'invalid_award' using errcode='22023'; end if;
    if item->>'source_url' is not null and (item->>'source_url' !~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' or length(item->>'source_url')>2048)
      then raise exception 'invalid_award_url' using errcode='22023'; end if;
    insert into public.preview_award_links(preview_id,player_id,award_id,source_revision,raw_label,year,edition,source_url,source_type,confidence,metadata)
    values(p_preview_id,target.player_id,(item->>'award_id')::uuid,p_revision,item->>'raw_label',item->>'year',item->>'edition',item->>'source_url',item->>'source_type',(item->>'confidence')::numeric,item->'metadata')
    on conflict(preview_id,source_revision,raw_label,year,edition) do update set
      award_id=excluded.award_id,player_id=excluded.player_id,source_url=excluded.source_url,source_type=excluded.source_type,
      confidence=excluded.confidence,metadata=excluded.metadata,updated_at=now();
    -- Link only an already-existing achievement for this reviewed Career ID.
    -- Never insert/verify canonical achievements merely from scraped mentions.
    if target.player_id is not null and item->>'award_id' is not null and item->>'year' ~ '^[0-9]{4}$' then
      update public.player_awards set award_id=(item->>'award_id')::uuid,edition=nullif(item->>'edition',''),updated_at=now()
      where player_id=target.player_id and (lower(btrim(name))=lower(btrim(item->>'raw_label'))
        or exists(select 1 from public.award_catalog c where c.id=(item->>'award_id')::uuid
          and (lower(btrim(public.player_awards.name))=lower(c.name)
            or lower(btrim(public.player_awards.name)) in (select lower(alias) from unnest(c.aliases) alias))))
        and year=(item->>'year')::integer and award_id is null;
      linked := linked + found::integer;
    end if;
  end loop;
  for item in select value from jsonb_array_elements(coalesce(p_articles,'[]')) loop
    if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'metadata') is distinct from 'object'
      or octet_length((item->'metadata')::text)>4096 then raise exception 'invalid_article' using errcode='22023'; end if;
    foreach field in array array['headline','headline_key','publisher','source_domain','discovery_source'] loop
      if jsonb_typeof(item->field) is distinct from 'string' or nullif(btrim(item->>field),'') is null
        or length(item->>field)>(case when field='headline_key' then 600 else 300 end)
        then raise exception 'invalid_article_field' using errcode='22023'; end if;
    end loop;
    if (item->>'author' is not null and (jsonb_typeof(item->'author')<>'string' or length(item->>'author')>300))
      or jsonb_typeof(item->'summary') is distinct from 'string'
      then raise exception 'invalid_article_text' using errcode='22023'; end if;
    foreach field in array array['article_url','canonical_url','thumbnail_url'] loop
      if (field<>'thumbnail_url' and item->>field is null) or (item->>field is not null and
        (item->>field !~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' or length(item->>field)>2048))
        then raise exception 'invalid_article_url' using errcode='22023'; end if;
    end loop;
    article_keys:=public.preview_news_article_keys(item); matches:='{}'; changed:=true;
    -- Row lock on the preview serializes saves and dismissals. Follow all alias
    -- bridges, retaining published data first, then dismissals, then oldest work.
    while changed loop
      changed:=false;
      for matched in select a.* from public.player_articles a where a.preview_id=p_preview_id and a.identity_key=p_identity_key
        and a.status in ('accepted','review','rejected') and not a.id=any(matches) loop
        if article_keys && public.preview_news_article_keys(to_jsonb(matched)) then
          matches:=array_append(matches,matched.id);
          article_keys:=array(select distinct k from unnest(article_keys||public.preview_news_article_keys(to_jsonb(matched))) k order by k);
          changed:=true;
        end if;
      end loop;
    end loop;
    if cardinality(article_keys)>64 then raise exception 'news_review_full' using errcode='PT422'; end if;
    if cardinality(matches)>0 then
      select * into keeper from public.player_articles where id=any(matches)
        order by case status when 'accepted' then 0 when 'rejected' then 1 else 2 end,created_at,id limit 1;
      update public.player_articles set status='inactive',updated_at=clock_timestamp() where id=any(matches) and id<>keeper.id;
      get diagnostics touched = row_count; retired:=retired+touched;
      update public.player_articles set review_keys=article_keys,source_revision=p_revision,player_id=target.player_id,updated_at=clock_timestamp() where id=keeper.id;
    else
      insert into public.player_articles(preview_id,player_id,identity_key,source_revision,headline,headline_key,publisher,article_url,canonical_url,
        thumbnail_url,published_at,author,summary,source_domain,discovery_source,discovered_at,relevance_score,confidence,metadata,status,review_keys)
      values(p_preview_id,target.player_id,p_identity_key,p_revision,item->>'headline',item->>'headline_key',item->>'publisher',item->>'article_url',item->>'canonical_url',
        item->>'thumbnail_url',(item->>'published_at')::timestamptz,item->>'author',item->>'summary',item->>'source_domain',item->>'discovery_source',
        (item->>'discovered_at')::timestamptz,(item->>'relevance_score')::numeric,(item->>'confidence')::numeric,item->'metadata','review',article_keys);
    end if;
  end loop;
  if (select count(*) from public.player_articles where preview_id=p_preview_id and identity_key=p_identity_key and status='review')>200
    then raise exception 'news_review_full' using errcode='PT422'; end if;
  -- Revision changes and empty/failed searches never erase pending or published
  -- articles. Identity filters keep different athletes' evidence separate.
  update public.player_articles set source_revision=p_revision,player_id=target.player_id,updated_at=clock_timestamp()
    where preview_id=p_preview_id and identity_key=p_identity_key and status in ('accepted','review') and source_revision<>p_revision;
  insert into public.preview_enrichments(preview_id,source_revision,identity_key,started_at,report,request_fingerprint,news_review_version,news_searched_at)
    values(p_preview_id,p_revision,p_identity_key,p_started_at,saved_report,fingerprint,
      coalesce(prior.news_review_version,0)+case when p_articles is not null or prior.identity_key is distinct from p_identity_key then 1 else 0 end,
      case when p_articles is not null then p_started_at when prior.identity_key=p_identity_key then prior.news_searched_at else null end)
    on conflict(preview_id) do update set source_revision=excluded.source_revision,identity_key=excluded.identity_key,
      started_at=excluded.started_at,report=excluded.report,request_fingerprint=excluded.request_fingerprint,updated_at=now(),
      news_review_version=excluded.news_review_version,news_searched_at=excluded.news_searched_at;
  insert into public.audit_logs(action,entity_type,entity_id,actor_user_id,new_values)
    values('preview.enrichment','preview_locker',p_preview_id::text,auth.uid(),
      jsonb_build_object('revision',p_revision,'report',saved_report,'articles_retired',retired,'existing_player_awards_linked',linked));
  return saved_report;
end $$;

create function public.dismiss_preview_news_article(p_preview_id uuid,p_revision integer,p_version integer,p_url text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_revision integer; saved public.preview_enrichments%rowtype; article public.player_articles%rowtype;
begin
  if auth.uid() is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode='42501'; end if;
  select revision into current_revision from public.preview_lockers where id=p_preview_id for update;
  if not found then raise exception 'preview_not_found' using errcode='P0002'; end if;
  if current_revision is distinct from p_revision then raise exception 'preview_changed' using errcode='PT409'; end if;
  select * into saved from public.preview_enrichments where preview_id=p_preview_id for update;
  if not found or saved.news_review_version is distinct from p_version then raise exception 'review_changed' using errcode='PT409'; end if;
  select * into article from public.player_articles where preview_id=p_preview_id and identity_key=saved.identity_key
    and status in ('review','rejected') and article_url=p_url order by created_at,id limit 1 for update;
  if not found then raise exception 'invalid_article' using errcode='22023'; end if;
  if article.status='review' then
    update public.player_articles set status='rejected',updated_at=clock_timestamp() where id=article.id;
    update public.preview_enrichments set news_review_version=news_review_version+1 where preview_id=p_preview_id returning * into saved;
  end if;
  return jsonb_build_object('version',saved.news_review_version);
end; $$;
revoke all on function public.dismiss_preview_news_article(uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.dismiss_preview_news_article(uuid,integer,integer,text) to authenticated;
notify pgrst,'reload schema';
commit;
