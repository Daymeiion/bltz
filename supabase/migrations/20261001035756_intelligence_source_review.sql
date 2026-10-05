-- Reviewed, transactional promotion. No provider calls, athlete creation or
-- cohort writes. Existing verified external athlete mappings remain canonical.
begin;

-- Cloud default ACLs may already grant service_role ALL to new tables. Explicitly
-- remove DELETE/TRUNCATE etc before restoring the exact foundational privileges.
revoke all on table public.intelligence_sources, public.intelligence_ingestions,
  public.moments, public.moment_athletes, public.intelligence_evidence from service_role;
grant select, insert, update on table public.intelligence_sources, public.intelligence_ingestions,
  public.moments, public.moment_athletes, public.intelligence_evidence to service_role;

create function public.review_intelligence_observation(p_packet jsonb, p_actor_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  athlete_id uuid; source_id uuid; ingestion_id uuid; v_moment_id uuid;
  evidence_id uuid; evidence_ids jsonb := '[]'::jsonb;
  item jsonb; source_input jsonb; moment_input jsonb; review_input jsonb;
  existing public.intelligence_ingestions; canonical_name text; occurrence_date date;
  fetched_at timestamptz; reviewed_at timestamptz; packet_fingerprint text;
  receipt jsonb; source_row public.intelligence_sources;
begin
  if p_actor_id is null or not exists (
    select 1 from public.platform_role_assignments pra
    where pra.user_id = p_actor_id and pra.role = 'super_admin' and pra.revoked_at is null
  ) then raise exception 'active platform reviewer required' using errcode = '42501'; end if;
  if jsonb_typeof(p_packet) is distinct from 'object' or p_packet->>'schemaVersion' is distinct from '1'
    or octet_length(p_packet::text) > 2000000 then
    raise exception 'invalid review packet' using errcode = '22023';
  end if;
  if p_packet::text ~* '"(api[_-]?key|authorization|cookie|password|secret|access[_-]?token|refresh[_-]?token|credentials)"\s*:'
    or p_packet::text ~* 'bearer\s+[^ ]+' then
    raise exception 'transport credentials rejected' using errcode = '22023';
  end if;
  source_input := p_packet->'source'; review_input := p_packet->'review'; moment_input := p_packet->'moment';
  if jsonb_typeof(source_input) is distinct from 'object' or jsonb_typeof(review_input) is distinct from 'object'
    or jsonb_typeof(p_packet->'rawObservation') is distinct from 'object'
    or jsonb_typeof(p_packet->'normalizedCandidate') is distinct from 'object'
    or jsonb_typeof(p_packet->'evidence') is distinct from 'array'
    or jsonb_array_length(p_packet->'evidence') not between 1 and 40
    or length(btrim(coalesce(p_packet->>'idempotencyKey',''))) not between 1 and 240
    or length(btrim(coalesce(review_input->>'reason',''))) not between 1 and 4000
    or p_packet->'identityReview'->>'status' is distinct from 'verified'
    or length(btrim(coalesce(p_packet->'identityReview'->>'matchMethod',''))) not between 1 and 400
    or (p_packet->'identityReview'->>'confidence')::numeric not between 0 and 1
    or p_packet->'identityReview'->>'confidence' is null then
    raise exception 'incomplete review packet' using errcode = '22023';
  end if;
  if source_input->>'locator' is null or source_input->>'locator' !~ '^(https://[^/?#[:space:]]+(/[^?#[:space:]]*)?|/[^/?#[:space:]][^?#[:space:]]*)$'
    or source_input->>'locator' ~ '^https://[^/]*@' then
    raise exception 'unsafe source locator' using errcode = '22023';
  end if;
  fetched_at := (source_input->>'fetchedAt')::timestamptz;
  reviewed_at := (review_input->>'reviewedAt')::timestamptz;
  if fetched_at is null or reviewed_at is null or reviewed_at < fetched_at
    or fetched_at > now()+interval '1 minute' or reviewed_at > now()+interval '1 minute' then
    raise exception 'invalid observation review time' using errcode = '22023';
  end if;
  athlete_id := (p_packet->>'athleteId')::uuid;
  select coalesce(nullif(btrim(full_name),''),name) into canonical_name
    from public.players where id=athlete_id;
  if not found or lower(btrim(canonical_name)) is distinct from lower(btrim(p_packet->>'expectedAthleteName')) then
    raise exception 'canonical athlete identity mismatch' using errcode = '23503';
  end if;
  -- The fingerprint is a replay equality check, not a security signature.
  packet_fingerprint := md5(p_packet::text);
  perform pg_advisory_xact_lock(hashtextextended('intelligence_review:'||(p_packet->>'idempotencyKey'),0));
  select * into existing from public.intelligence_ingestions where idempotency_key=p_packet->>'idempotencyKey' for update;
  if found then
    if existing.normalized_candidate->'_review'->>'packetFingerprint' is distinct from packet_fingerprint
      or existing.normalized_candidate->'_review'->>'reviewerId' is distinct from p_actor_id::text then
      raise exception 'review idempotency conflict' using errcode = '23505';
    end if;
    return (existing.normalized_candidate->'_receipt') || jsonb_build_object('replay',true);
  end if;
  insert into public.intelligence_sources(source_key,name,provider)
    values(source_input->>'key',source_input->>'name',source_input->>'provider') on conflict(source_key) do nothing;
  select * into strict source_row from public.intelligence_sources where source_key=source_input->>'key';
  if source_row.provider is distinct from source_input->>'provider' or source_row.name is distinct from source_input->>'name' then
    raise exception 'source identity conflict' using errcode = '23505';
  end if;
  source_id := source_row.id;
  insert into public.intelligence_ingestions(source_id,namespace,external_id,locator,fetched_at,normalizer_version,
    idempotency_key,raw_payload,normalized_candidate,normalization_status)
  values(source_id,source_input->>'namespace',source_input->>'externalId',source_input->>'locator',fetched_at,
    source_input->>'normalizerVersion',p_packet->>'idempotencyKey',p_packet->'rawObservation',p_packet->'normalizedCandidate','normalized')
    returning id into ingestion_id;
  if moment_input is not null and moment_input <> 'null'::jsonb then
    if moment_input->>'mode' = 'create' then
      if not exists (select 1 from jsonb_array_elements(p_packet->'evidence') e
        where e->>'factType'='moment_occurrence' and e->>'attachToMoment'='true'
          and e->'data'->>'dateBasis'='described_event'
          and (e->'data'->>'occurredOn') is not distinct from moment_input->>'occurredOn') then
        raise exception 'independent event occurrence evidence required' using errcode = '22023';
      end if;
      insert into public.moments(title,occurred_on,occurred_year,date_precision,sport,status,confidence)
      values(moment_input->>'title',(moment_input->>'occurredOn')::date,(moment_input->>'occurredYear')::smallint,
        moment_input->>'datePrecision',moment_input->>'sport','verified',(moment_input->>'confidence')::numeric) returning id into v_moment_id;
      if moment_input->>'confidence' is null then raise exception 'reviewed moment confidence required'; end if;
      insert into public.moment_athletes(moment_id,player_id,relationship_type,status,confidence)
        values(v_moment_id,athlete_id,moment_input->>'relationshipType','verified',(p_packet->'identityReview'->>'confidence')::numeric);
    elsif moment_input->>'mode' = 'link' then
      v_moment_id := (moment_input->>'id')::uuid;
      if not exists(select 1 from public.moments m join public.moment_athletes ma on ma.moment_id=m.id
        where m.id=v_moment_id and ma.player_id=athlete_id and m.status='verified' and ma.status='verified') then
        raise exception 'reviewed existing moment association required' using errcode = '23503';
      end if;
    else raise exception 'invalid moment review mode' using errcode = '22023'; end if;
    select occurred_on into occurrence_date from public.moments where id=v_moment_id;
  end if;
  for item in select value from jsonb_array_elements(p_packet->'evidence') loop
    if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'data') is distinct from 'object'
      or jsonb_typeof(item->'attachToMoment') is distinct from 'boolean' or item->>'confidence' is null then
      raise exception 'invalid reviewed evidence' using errcode = '22023';
    end if;
    if item->>'attachToMoment'='true' and v_moment_id is null then raise exception 'missing moment target'; end if;
    if item->>'factType'='content_item' and (item->>'attachToMoment'='true'
      or coalesce(item->'data'->>'careerContext','') not in ('career_era','postcareer','unknown')) then
      raise exception 'content date cannot establish sports occurrence' using errcode = '22023';
    end if;
    if item->>'factType'='moment_occurrence' and (item->>'attachToMoment' is distinct from 'true'
      or item->'data'->>'dateBasis' is distinct from 'described_event'
      or (item->'data'->>'occurredOn')::date is distinct from occurrence_date) then
      raise exception 'event date conflicts with reviewed occurrence' using errcode = '22023';
    end if;
    insert into public.intelligence_evidence(player_id,moment_id,source_id,ingestion_id,fact_type,statement,structured_data,status,confidence)
      values(athlete_id,case when item->>'attachToMoment'='true' then v_moment_id else null end,source_id,ingestion_id,
        item->>'factType',item->>'statement',item->'data' || jsonb_build_object('_review',jsonb_build_object(
          'reviewerId',p_actor_id,'reviewedAt',reviewed_at,'reason',review_input->>'reason','version',1)),
        'verified',(item->>'confidence')::numeric) returning id into evidence_id;
    evidence_ids := evidence_ids || jsonb_build_array(evidence_id);
  end loop;
  receipt := jsonb_build_object('ingestionId',ingestion_id,'momentId',v_moment_id,'evidenceIds',evidence_ids,'reviewerId',p_actor_id,'replay',false);
  update public.intelligence_ingestions set normalized_candidate=normalized_candidate || jsonb_build_object(
    '_review',jsonb_build_object('packetFingerprint',packet_fingerprint,'reviewerId',p_actor_id,'reviewedAt',reviewed_at,
      'reason',review_input->>'reason','identityReview',p_packet->'identityReview'), '_receipt',receipt)
    where id=ingestion_id;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,new_values,request_metadata)
    values(p_actor_id,'intelligence.source_review','intelligence_ingestion',ingestion_id::text,
      jsonb_build_object('athleteId',athlete_id,'momentId',v_moment_id,'sourceId',source_id,'evidenceIds',evidence_ids,
        'reviewedAt',reviewed_at,'reason',review_input->>'reason','identityReview',p_packet->'identityReview'),
      jsonb_build_object('writer','review_intelligence_observation_v1','idempotencyKey',p_packet->>'idempotencyKey','packetFingerprint',packet_fingerprint));
  return receipt;
end $$;

revoke all on function public.review_intelligence_observation(jsonb,uuid) from public, anon, authenticated, service_role;
grant execute on function public.review_intelligence_observation(jsonb,uuid) to service_role;
comment on function public.review_intelligence_observation(jsonb,uuid) is
  'Trusted server/CLI reviewer only. Caller obtains actual reviewer identity; active existing super_admin assignment checked. Atomic source/raw/evidence/Moment promotion and audit. Publication does not establish a sports occurrence.';
commit;
