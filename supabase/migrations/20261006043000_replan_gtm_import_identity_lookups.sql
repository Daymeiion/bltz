-- Re-plan only the three per-row identity lookups as the import relation grows.
-- ANALYZE on an empty contact table can cache a zero-cost sequential scan that
-- remains in the row loop after thousands of inserts, despite valid indexes.
-- Constant SQL and USING bind values without interpolation or predicate changes.
-- Preserve the signature, SECURITY DEFINER, empty search_path, collision checks,
-- preview bindings, audit triggers, exception handling and existing function ACLs.
-- No role settings, timeouts, grants, data or public API definitions change.
-- Reviewed previous normalized body MD5: c17054ebf22e4acd185df3d9003b5052.
-- Recovery requires a reviewed forward migration; retain import and audit history.

do $preflight$
begin
  if not exists (
    select 1
    from pg_catalog.pg_proc routine
    where routine.oid = pg_catalog.to_regprocedure(
      'gtm_private.import_gtm_contacts_v2_impl(text,text,uuid,jsonb,jsonb,jsonb,integer,integer)'
    )
      and md5(btrim(regexp_replace(routine.prosrc, '[[:space:]]+', ' ', 'g')))
        = 'c17054ebf22e4acd185df3d9003b5052'
      and routine.prosecdef
      and routine.prolang = (select oid from pg_catalog.pg_language where lanname = 'plpgsql')
      and routine.proconfig = array['search_path=""']::text[]
      and routine.prorettype = pg_catalog.to_regtype('public.gtm_import_jobs')
  ) then
    raise exception 'GTM importer baseline changed; stop and review the forward migration';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_index lookup_index
    join pg_catalog.pg_class index_relation on index_relation.oid = lookup_index.indexrelid
    join pg_catalog.pg_am access_method on access_method.oid = index_relation.relam
    where lookup_index.indexrelid = pg_catalog.to_regclass(
      'public.gtm_contacts_active_email_normalized_idx'
    )
      and lookup_index.indrelid = pg_catalog.to_regclass('public.gtm_contacts')
      and lookup_index.indisvalid and lookup_index.indisready
      and not lookup_index.indisunique
      and lookup_index.indnkeyatts = 1
      and access_method.amname = 'btree'
      and pg_catalog.pg_get_expr(lookup_index.indexprs, lookup_index.indrelid)
        = 'lower(btrim(email))'
      and pg_catalog.pg_get_expr(lookup_index.indpred, lookup_index.indrelid)
        = '(archived = false)'
  ) then
    raise exception 'Reviewed GTM email lookup index is missing or changed; stop and review';
  end if;
end;
$preflight$;

create or replace function gtm_private.import_gtm_contacts_v2_impl(
  p_filename text,
  p_content_sha256 text,
  p_idempotency_key uuid,
  p_field_mapping jsonb,
  p_preview_summary jsonb,
  p_rows jsonb,
  p_duplicate_count integer default 0,
  p_invalid_count integer default 0
)
returns public.gtm_import_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_job public.gtm_import_jobs;
  v_row jsonb;
  v_contact public.gtm_contacts;
  v_contact_id uuid;
  v_linkedin_id uuid;
  v_email_id uuid;
  v_source_id uuid;
  v_email_count integer;
  v_source_count integer;
  v_signal_count integer;
  v_locks text[];
  v_created integer := 0;
  v_updated integer := 0;
  v_failed integer := greatest(p_invalid_count, 0);
begin
  if v_actor is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 10000 then
    raise exception 'import rows must be an array of at most 10000 records' using errcode = '22023';
  end if;

  select * into v_job
  from public.gtm_import_jobs
  where idempotency_key = p_idempotency_key
  for update;

  if found and v_job.status in ('completed', 'completed_with_errors') then
    return v_job;
  end if;
  if not found
     or p_duplicate_count < 0 or p_invalid_count < 0
     or v_job.status <> 'preview_ready'
     or v_job.uploaded_by <> v_actor
     or v_job.rows_sha256 <> public.gtm_import_rows_sha256(p_rows)
     or v_job.content_sha256 <> lower(p_content_sha256)
     or v_job.filename <> btrim(p_filename)
     or v_job.field_mapping <> p_field_mapping
     or v_job.preview_summary <> p_preview_summary
     or v_job.rows_found <> jsonb_array_length(p_rows) + p_duplicate_count + p_invalid_count then
    raise exception 'GTM import commit does not match its approved preview' using errcode = '22023';
  end if;

  update public.gtm_import_jobs
  set status = 'committing', approved_by = v_actor, approved_at = now()
  where id = v_job.id
  returning * into v_job;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    begin
      v_contact_id := null;
      v_linkedin_id := null;
      v_email_id := null;
      v_source_id := null;
      v_email_count := 0;
      v_source_count := 0;

      if nullif(v_row->>'linkedinUrl', '') is not null then
        execute $lookup$
          select contact.id
          from public.gtm_contacts contact
          where contact.archived = false
            and lower(btrim(contact.linkedin_url)) = lower(btrim($1))
        $lookup$ into v_linkedin_id using v_row->>'linkedinUrl';
      end if;
      if nullif(v_row->>'email', '') is not null then
        execute $lookup$
          select min(contact.id::text)::uuid, count(*)
          from public.gtm_contacts contact
          where contact.archived = false
            and lower(btrim(contact.email)) = lower(btrim($1))
        $lookup$ into v_email_id, v_email_count using v_row->>'email';
      end if;
      if nullif(v_row->>'sourceRecordId', '') is not null then
        execute $lookup$
          select min(contact.id::text)::uuid, count(*)
          from public.gtm_contacts contact
          where contact.source in ('linkedin_connections', 'contacts_csv')
            and contact.source_record_id = $1
        $lookup$ into v_source_id, v_source_count using v_row->>'sourceRecordId';
      end if;

      select count(distinct candidate) into v_signal_count
      from unnest(array[v_linkedin_id, v_email_id, v_source_id]) candidate
      where candidate is not null;
      if v_signal_count > 1
         or (v_linkedin_id is null and v_source_id is null and v_email_count > 1)
         or (v_linkedin_id is null and v_email_id is null and v_source_count > 1) then
        v_failed := v_failed + 1;
        continue;
      end if;
      v_contact_id := coalesce(v_linkedin_id, v_email_id, v_source_id);

      if v_contact_id is null then
        insert into public.gtm_contacts (
          display_name, first_name, last_name, email, linkedin_url,
          current_company, current_title, contact_type, segment, personas,
          sport, league_level, do_not_automate, pipeline_stage, source,
          source_record_id, linkedin_connected_on, player_master_gsis_id,
          classification_source, classification_confidence,
          classification_status, classification_reasons,
          relationship_strength, bltz_relevance, buying_authority,
          network_leverage, timing_score, priority_score_explanation,
          identity_review_status, identity_review_reason, created_by, updated_by
        ) values (
          v_row->>'displayName', nullif(v_row->>'firstName', ''),
          nullif(v_row->>'lastName', ''), nullif(lower(v_row->>'email'), ''),
          nullif(lower(v_row->>'linkedinUrl'), ''),
          nullif(v_row->>'currentCompany', ''), nullif(v_row->>'currentTitle', ''),
          v_row->>'contactType', nullif(v_row->>'segment', ''),
          coalesce(array(select jsonb_array_elements_text(v_row->'personas')), '{}'::text[]),
          nullif(v_row->>'sport', ''), nullif(v_row->>'leagueLevel', ''),
          coalesce((v_row->>'doNotAutomate')::boolean, false), 'identified',
          'linkedin_connections', v_row->>'sourceRecordId',
          nullif(v_row->>'connectedOn', '')::date,
          nullif(v_row->>'playerMasterGsisId', ''),
          nullif(v_row->>'classificationSource', ''),
          nullif(v_row->>'classificationConfidence', '')::numeric,
          coalesce(nullif(v_row->>'classificationStatus', ''), 'unclassified'),
          coalesce(array(select jsonb_array_elements_text(v_row->'classificationReasons')), '{}'::text[]),
          nullif(v_row->>'relationshipStrength', '')::smallint,
          nullif(v_row->>'bltzRelevance', '')::smallint,
          nullif(v_row->>'buyingAuthority', '')::smallint,
          nullif(v_row->>'networkLeverage', '')::smallint,
          nullif(v_row->>'timingScore', '')::smallint,
          nullif(v_row->'priorityScoreExplanation', 'null'::jsonb),
          coalesce(nullif(v_row->>'identityReviewStatus', ''), 'clear'),
          nullif(v_row->>'identityReviewReason', ''), v_actor, v_actor
        ) returning * into v_contact;
        v_contact_id := v_contact.id;
        v_created := v_created + 1;
      else
        select * into v_contact from public.gtm_contacts where id = v_contact_id for update;
        if v_contact.player_master_gsis_id is not null
           and nullif(v_row->>'playerMasterGsisId', '') is not null
           and v_contact.player_master_gsis_id <> v_row->>'playerMasterGsisId' then
          v_failed := v_failed + 1;
          continue;
        end if;
        v_locks := coalesce(v_contact.manual_field_locks, '{}'::text[]);

        update public.gtm_contacts contact set
          display_name = case when 'display_name' = any(v_locks) then contact.display_name else coalesce(nullif(v_row->>'displayName', ''), contact.display_name) end,
          first_name = case when 'first_name' = any(v_locks) then contact.first_name else coalesce(nullif(v_row->>'firstName', ''), contact.first_name) end,
          last_name = case when 'last_name' = any(v_locks) then contact.last_name else coalesce(nullif(v_row->>'lastName', ''), contact.last_name) end,
          email = case when 'email' = any(v_locks) then contact.email else coalesce(nullif(lower(v_row->>'email'), ''), contact.email) end,
          linkedin_url = case when 'linkedin_url' = any(v_locks) then contact.linkedin_url else coalesce(nullif(lower(v_row->>'linkedinUrl'), ''), contact.linkedin_url) end,
          current_company = case when 'current_company' = any(v_locks) then contact.current_company else coalesce(nullif(v_row->>'currentCompany', ''), contact.current_company) end,
          current_title = case when 'current_title' = any(v_locks) then contact.current_title else coalesce(nullif(v_row->>'currentTitle', ''), contact.current_title) end,
          contact_type = case when contact.classification_locked or 'contact_type' = any(v_locks) then contact.contact_type else coalesce(nullif(v_row->>'contactType', ''), contact.contact_type) end,
          segment = case when contact.classification_locked or 'segment' = any(v_locks) then contact.segment else coalesce(nullif(v_row->>'segment', ''), contact.segment) end,
          personas = case when contact.classification_locked then contact.personas else coalesce(array(select jsonb_array_elements_text(v_row->'personas')), contact.personas) end,
          sport = case when 'sport' = any(v_locks) then contact.sport else coalesce(nullif(v_row->>'sport', ''), contact.sport) end,
          league_level = case when 'league_level' = any(v_locks) then contact.league_level else coalesce(nullif(v_row->>'leagueLevel', ''), contact.league_level) end,
          do_not_automate = contact.do_not_automate or coalesce((v_row->>'doNotAutomate')::boolean, false),
          linkedin_connected_on = coalesce(nullif(v_row->>'connectedOn', '')::date, contact.linkedin_connected_on),
          player_master_gsis_id = coalesce(contact.player_master_gsis_id, nullif(v_row->>'playerMasterGsisId', '')),
          classification_source = case when contact.classification_locked then contact.classification_source else nullif(v_row->>'classificationSource', '') end,
          classification_confidence = case when contact.classification_locked then contact.classification_confidence else nullif(v_row->>'classificationConfidence', '')::numeric end,
          classification_status = case when contact.classification_locked then contact.classification_status else coalesce(nullif(v_row->>'classificationStatus', ''), 'unclassified') end,
          classification_reasons = case when contact.classification_locked then contact.classification_reasons else coalesce(array(select jsonb_array_elements_text(v_row->'classificationReasons')), '{}'::text[]) end,
          relationship_strength = case when 'relationship_strength' = any(v_locks) then contact.relationship_strength else coalesce(contact.relationship_strength, nullif(v_row->>'relationshipStrength', '')::smallint) end,
          bltz_relevance = case when 'bltz_relevance' = any(v_locks) then contact.bltz_relevance else coalesce(contact.bltz_relevance, nullif(v_row->>'bltzRelevance', '')::smallint) end,
          buying_authority = case when 'buying_authority' = any(v_locks) then contact.buying_authority else coalesce(contact.buying_authority, nullif(v_row->>'buyingAuthority', '')::smallint) end,
          network_leverage = case when 'network_leverage' = any(v_locks) then contact.network_leverage else coalesce(contact.network_leverage, nullif(v_row->>'networkLeverage', '')::smallint) end,
          timing_score = case when 'timing_score' = any(v_locks) then contact.timing_score else coalesce(contact.timing_score, nullif(v_row->>'timingScore', '')::smallint) end,
          priority_score_explanation = case when contact.classification_locked then contact.priority_score_explanation else coalesce(nullif(v_row->'priorityScoreExplanation', 'null'::jsonb), contact.priority_score_explanation) end,
          identity_review_status = coalesce(nullif(v_row->>'identityReviewStatus', ''), contact.identity_review_status),
          identity_review_reason = coalesce(nullif(v_row->>'identityReviewReason', ''), contact.identity_review_reason),
          updated_by = v_actor
        where contact.id = v_contact_id
        returning * into v_contact;
        v_updated := v_updated + 1;
      end if;

      if nullif(v_row->>'playerId', '') is not null and v_contact.contact_type = 'athlete' then
        insert into public.gtm_contact_players (
          contact_id, player_id, match_type, match_confidence, verified,
          verified_by, verified_at, created_by
        ) values (
          v_contact_id, (v_row->>'playerId')::uuid,
          coalesce(nullif(v_row->>'playerMatchType', ''), 'name_only'),
          coalesce(nullif(v_row->>'playerMatchConfidence', '')::numeric, 0.65),
          coalesce((v_row->>'playerMatchVerified')::boolean, false),
          case when coalesce((v_row->>'playerMatchVerified')::boolean, false) then v_actor else null end,
          case when coalesce((v_row->>'playerMatchVerified')::boolean, false) then now() else null end,
          v_actor
        ) on conflict (contact_id, player_id) do update set
          match_type = excluded.match_type,
          match_confidence = excluded.match_confidence,
          verified = public.gtm_contact_players.verified or excluded.verified,
          verified_by = coalesce(public.gtm_contact_players.verified_by, excluded.verified_by),
          verified_at = coalesce(public.gtm_contact_players.verified_at, excluded.verified_at);
      end if;
    exception
      when unique_violation or check_violation or invalid_text_representation or foreign_key_violation then
        v_failed := v_failed + 1;
    end;
  end loop;

  update public.gtm_import_jobs set
    status = case when v_failed > 0 then 'completed_with_errors' else 'completed' end,
    rows_created = v_created,
    rows_updated = v_updated,
    rows_duplicated = greatest(p_duplicate_count, 0),
    rows_failed = v_failed,
    error_summary = case when v_failed > 0 then v_failed || ' row(s) failed or remained ambiguous during database validation.' else null end,
    completed_at = now()
  where id = v_job.id
  returning * into v_job;
  return v_job;
end;
$$;
