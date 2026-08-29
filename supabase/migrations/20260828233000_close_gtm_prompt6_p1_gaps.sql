-- Prompt 6 live-data safety: deterministic classification, Player Master
-- matching, founder-data precedence, explainable scoring, and review metrics.

alter table public.gtm_contacts
  add column if not exists classification_source text,
  add column if not exists classification_confidence numeric(5,4),
  add column if not exists classification_status text not null default 'unclassified',
  add column if not exists classification_locked boolean not null default false,
  add column if not exists classification_reasons text[] not null default '{}'::text[],
  add column if not exists personas text[] not null default '{}'::text[],
  add column if not exists manual_field_locks text[] not null default '{}'::text[],
  add column if not exists priority_score_explanation jsonb,
  add column if not exists identity_review_status text not null default 'clear',
  add column if not exists identity_review_reason text;

alter table public.gtm_contacts
  add constraint gtm_contacts_classification_confidence_check
    check (classification_confidence is null or classification_confidence between 0 and 1),
  add constraint gtm_contacts_classification_status_check
    check (classification_status in ('auto_classified', 'manual_verified', 'needs_review', 'unclassified')),
  add constraint gtm_contacts_classification_reasons_check
    check (array_position(classification_reasons, null) is null and cardinality(classification_reasons) <= 20),
  add constraint gtm_contacts_personas_check
    check (array_position(personas, null) is null and cardinality(personas) <= 30),
  add constraint gtm_contacts_manual_field_locks_check
    check (
      array_position(manual_field_locks, null) is null
      and cardinality(manual_field_locks) <= 40
      and manual_field_locks <@ array[
        'display_name', 'first_name', 'last_name', 'email', 'phone',
        'linkedin_url', 'current_company', 'current_title', 'contact_type',
        'segment', 'sport', 'league_level', 'geography',
        'relationship_strength', 'bltz_relevance', 'buying_authority',
        'network_leverage', 'timing_score'
      ]::text[]
    ),
  add constraint gtm_contacts_priority_explanation_check
    check (priority_score_explanation is null or jsonb_typeof(priority_score_explanation) = 'object'),
  add constraint gtm_contacts_identity_review_status_check
    check (identity_review_status in ('clear', 'possible', 'ambiguous', 'rejected', 'manual_verified'));

create index if not exists gtm_contacts_classification_queue_idx
  on public.gtm_contacts (classification_status, classification_confidence, updated_at desc)
  where archived = false;
create index if not exists gtm_contacts_identity_review_queue_idx
  on public.gtm_contacts (identity_review_status, updated_at desc)
  where archived = false and identity_review_status <> 'clear';
create index if not exists gtm_contacts_personas_gin_idx
  on public.gtm_contacts using gin (personas)
  where archived = false;

comment on column public.gtm_contacts.manual_field_locks is
  'Founder-verified fields that lower-precedence CSV imports may enrich only when empty and must never overwrite.';
comment on column public.gtm_contacts.priority_score_explanation is
  'Deterministic enterprise_v1 factors, inferred inputs, reasons, score, and tier used to explain an automatic score.';

-- A Player Master reference can coexist with LinkedIn relationship identity.
-- Only player_master-sourced contacts must remain reference-only.
alter table public.gtm_contacts
  drop constraint if exists gtm_contacts_identity_reference_check,
  drop constraint if exists gtm_contacts_player_master_source_check;

alter table public.gtm_contacts
  add constraint gtm_contacts_identity_reference_check check (
    (
      source = 'player_master'
      and player_master_gsis_id is not null
      and display_name is null
      and first_name is null
      and last_name is null
      and contact_type = 'athlete'
    )
    or (
      source is distinct from 'player_master'
      and display_name is not null
      and char_length(btrim(display_name)) between 1 and 240
    )
  ),
  add constraint gtm_contacts_player_master_source_check check (
    source is distinct from 'player_master'
    or (player_master_gsis_id is not null and source_record_id = player_master_gsis_id)
  );

create or replace function private.enforce_gtm_player_master_identity_reference()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.source = 'player_master' and new.player_master_gsis_id is not null then
    new.display_name := null;
    new.first_name := null;
    new.last_name := null;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_gtm_player_master_identity_reference()
  from public, anon, authenticated, service_role;

create or replace function public.get_gtm_player_match_candidates(p_display_names text[])
returns table (
  gsis_id text,
  player_id uuid,
  display_name text,
  college_name text,
  latest_team text,
  player_position text,
  status text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;
  if p_display_names is null or cardinality(p_display_names) not between 1 and 250 then
    raise exception 'Choose between 1 and 250 names' using errcode = '22023';
  end if;

  return query
  select master.gsis_id,
         canonical.id,
         master.display_name,
         master.college_name,
         master.latest_team,
         master.position,
         master.status
  from public.nfl_players master
  left join lateral (
    select player.id
    from public.players player
    where player.gsis_id = master.gsis_id
    order by player.id
    limit 1
  ) canonical on true
  where regexp_replace(lower(master.display_name), '[^a-z0-9]+', '', 'g') = any (
    select regexp_replace(lower(name), '[^a-z0-9]+', '', 'g')
    from unnest(p_display_names) as input(name)
  )
  order by master.display_name, master.gsis_id;
end;
$$;

revoke all on function public.get_gtm_player_match_candidates(text[])
  from public, anon, authenticated, service_role;
grant execute on function public.get_gtm_player_match_candidates(text[])
  to authenticated, service_role;

create or replace function public.mark_gtm_contact_manual_verification(
  p_contact_id uuid,
  p_fields text[]
)
returns public.gtm_contacts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_contact public.gtm_contacts;
  v_allowed constant text[] := array[
    'display_name', 'first_name', 'last_name', 'email', 'phone',
    'linkedin_url', 'current_company', 'current_title', 'contact_type',
    'segment', 'sport', 'league_level', 'geography',
    'relationship_strength', 'bltz_relevance', 'buying_authority',
    'network_leverage', 'timing_score'
  ];
begin
  if (select auth.uid()) is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;
  if p_fields is null or array_position(p_fields, null) is not null
     or not (p_fields <@ v_allowed) then
    raise exception 'Unsupported founder-data lock field' using errcode = '22023';
  end if;

  update public.gtm_contacts contact
  set manual_field_locks = coalesce(array(
        select distinct field_name
        from unnest(p_fields) as lock(field_name)
        order by field_name
      ), '{}'::text[]),
      classification_source = case when 'contact_type' = any(p_fields) then 'manual_admin' else contact.classification_source end,
      classification_confidence = case when 'contact_type' = any(p_fields) then 1 else contact.classification_confidence end,
      classification_status = case
        when 'contact_type' = any(p_fields) then 'manual_verified'
        when contact.contact_type = 'unclassified' then 'unclassified'
        else contact.classification_status
      end,
      classification_locked = 'contact_type' = any(p_fields),
      updated_by = (select auth.uid())
  where contact.id = p_contact_id and contact.archived = false
  returning * into v_contact;

  if not found then
    raise exception 'Active GTM contact not found' using errcode = 'P0002';
  end if;
  return v_contact;
end;
$$;

revoke all on function public.mark_gtm_contact_manual_verification(uuid, text[])
  from public, anon, authenticated, service_role;
grant execute on function public.mark_gtm_contact_manual_verification(uuid, text[])
  to authenticated, service_role;

-- The preview binds normalized source data. Deterministic classification and
-- founder-reviewed Player decisions are recomputed server-side at commit.
create or replace function public.gtm_import_rows_sha256(p_rows jsonb)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select encode(
    extensions.digest(
      convert_to(
        coalesce((
          select jsonb_agg(
            item.value
              - 'contactType' - 'segment' - 'personas'
              - 'classificationSource' - 'classificationConfidence'
              - 'classificationStatus' - 'classificationReasons'
              - 'relationshipStrength' - 'bltzRelevance'
              - 'buyingAuthority' - 'networkLeverage' - 'timingScore'
              - 'priorityScoreExplanation' - 'playerMasterGsisId'
              - 'playerId' - 'playerMatchType' - 'playerMatchConfidence'
              - 'playerMatchVerified' - 'identityReviewStatus'
              - 'identityReviewReason'
            order by item.value->>'sourceRecordId'
          ) from jsonb_array_elements(p_rows) as item(value)
        ), '[]'::jsonb)::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function public.gtm_import_rows_sha256(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.gtm_import_rows_sha256(jsonb)
  to authenticated, service_role;

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
        select contact.id into v_linkedin_id
        from public.gtm_contacts contact
        where contact.archived = false
          and lower(btrim(contact.linkedin_url)) = lower(btrim(v_row->>'linkedinUrl'));
      end if;
      if nullif(v_row->>'email', '') is not null then
        select min(contact.id::text)::uuid, count(*) into v_email_id, v_email_count
        from public.gtm_contacts contact
        where contact.archived = false
          and lower(btrim(contact.email)) = lower(btrim(v_row->>'email'));
      end if;
      if nullif(v_row->>'sourceRecordId', '') is not null then
        select min(contact.id::text)::uuid, count(*) into v_source_id, v_source_count
        from public.gtm_contacts contact
        where contact.source in ('linkedin_connections', 'contacts_csv')
          and contact.source_record_id = v_row->>'sourceRecordId';
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

revoke all on function gtm_private.import_gtm_contacts_v2_impl(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) from public, anon, authenticated, service_role;
grant execute on function gtm_private.import_gtm_contacts_v2_impl(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) to authenticated, service_role;

create or replace function public.import_gtm_contacts_v2(
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
language sql
security invoker
set search_path = ''
as $$
  select gtm_private.import_gtm_contacts_v2_impl(
    p_filename, p_content_sha256, p_idempotency_key, p_field_mapping,
    p_preview_summary, p_rows, p_duplicate_count, p_invalid_count
  );
$$;

revoke all on function public.import_gtm_contacts_v2(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) from public, anon, authenticated, service_role;
grant execute on function public.import_gtm_contacts_v2(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) to authenticated, service_role;

create or replace function public.get_gtm_network_metrics_v1()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;
  with active as (
    select * from public.gtm_contacts where archived = false
  ), classification_counts as (
    select classification_status as key, count(*) as value
    from active group by classification_status
  )
  select jsonb_build_object(
    'classificationCounts', coalesce((select jsonb_object_agg(key, value) from classification_counts), '{}'::jsonb),
    'autoClassifiedContacts', (select count(*) from active where classification_status = 'auto_classified'),
    'manuallyVerifiedContacts', (select count(*) from active where classification_status = 'manual_verified'),
    'needsClassificationContacts', (select count(*) from active where classification_status = 'needs_review'),
    'unclassifiedContacts', (select count(*) from active where classification_status = 'unclassified'),
    'playersInFounderNetwork', (select count(*) from active where player_master_gsis_id is not null),
    'ambiguousIdentityContacts', (select count(*) from active where identity_review_status in ('possible', 'ambiguous'))
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_gtm_network_metrics_v1()
  from public, anon, authenticated, service_role;
grant execute on function public.get_gtm_network_metrics_v1()
  to authenticated, service_role;

comment on function public.import_gtm_contacts_v2(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) is 'Commits preview-bound LinkedIn enrichment with deterministic classification, Player Master linkage, founder-field precedence, and explainable scoring.';

-- Deployment: apply after 20260828215242_promote_player_prospects_to_gtm_contacts.sql,
-- then deploy the matching application build. Existing rows backfill to an
-- explicit unclassified/clear state; no contact or Player records are created.
-- Recovery: return the app to import_gtm_contacts, drop the v2 functions and
-- added indexes/constraints/columns only after exporting classification and
-- score explanations needed for audit continuity.
