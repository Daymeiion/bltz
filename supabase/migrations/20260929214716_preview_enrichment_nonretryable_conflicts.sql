-- Business conflicts return HTTP 409; SQLSTATE 40001 can cause PostgREST retries.
begin;
create or replace function public.save_preview_enrichment(p_preview_id uuid, p_revision integer, p_identity_key text,
  p_started_at timestamptz, p_awards jsonb, p_articles jsonb, p_report jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target public.preview_lockers%rowtype; item jsonb; prior public.preview_enrichments%rowtype;
  fingerprint text; saved_report jsonb; linked integer := 0; retired integer := 0; field text;
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
  if p_articles is not null then
    update public.player_articles set status='inactive',updated_at=now() where preview_id=p_preview_id and status='accepted';
    get diagnostics retired = row_count;
  end if;
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
    insert into public.player_articles(preview_id,player_id,identity_key,source_revision,headline,headline_key,publisher,article_url,canonical_url,
      thumbnail_url,published_at,author,summary,source_domain,discovery_source,discovered_at,relevance_score,confidence,metadata)
    values(p_preview_id,target.player_id,p_identity_key,p_revision,item->>'headline',item->>'headline_key',item->>'publisher',item->>'article_url',item->>'canonical_url',
      item->>'thumbnail_url',(item->>'published_at')::timestamptz,item->>'author',item->>'summary',item->>'source_domain',item->>'discovery_source',
      (item->>'discovered_at')::timestamptz,(item->>'relevance_score')::numeric,(item->>'confidence')::numeric,item->'metadata')
    on conflict do nothing;
  end loop;
  -- Only a failed/skipped discovery carries the previous active set forward.
  update public.player_articles set source_revision=p_revision,player_id=target.player_id,updated_at=now()
    where p_articles is null and preview_id=p_preview_id and identity_key=p_identity_key and status='accepted';
  insert into public.preview_enrichments(preview_id,source_revision,identity_key,started_at,report,request_fingerprint)
    values(p_preview_id,p_revision,p_identity_key,p_started_at,saved_report,fingerprint)
    on conflict(preview_id) do update set source_revision=excluded.source_revision,identity_key=excluded.identity_key,
      started_at=excluded.started_at,report=excluded.report,request_fingerprint=excluded.request_fingerprint,updated_at=now();
  insert into public.audit_logs(action,entity_type,entity_id,actor_user_id,new_values)
    values('preview.enrichment','preview_locker',p_preview_id::text,auth.uid(),
      jsonb_build_object('revision',p_revision,'report',saved_report,'articles_retired',retired,'existing_player_awards_linked',linked));
  return saved_report;
end $$;
revoke all on function public.save_preview_enrichment(uuid,integer,text,timestamptz,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_preview_enrichment(uuid,integer,text,timestamptz,jsonb,jsonb,jsonb) to authenticated;

commit;
