-- =============================================================================
-- GTM Foundation V1 completion.
--
-- This migration is additive to the existing GTM relationship-intelligence
-- foundation. It keeps public.players as canonical athlete identity,
-- public.organizations as canonical BLTZ tenant identity, and gtm_organizations
-- as the smallest external-account extension for brands, agencies, collectives,
-- media companies, investors, and other non-tenant GTM accounts.
-- =============================================================================

-- Complete timestamp and note-type contracts without rewriting existing rows.
alter table public.gtm_contact_players
  add column if not exists updated_at timestamptz not null default now();

alter table public.gtm_interactions
  add column if not exists updated_at timestamptz not null default now();

alter table public.gtm_import_jobs
  add column if not exists potential_matches integer not null default 0
    check (potential_matches >= 0),
  add column if not exists approved_by uuid
    references auth.users(id) on delete restrict,
  add column if not exists approved_at timestamptz;

alter table public.gtm_import_jobs
  drop constraint if exists gtm_import_jobs_import_type_check;

alter table public.gtm_import_jobs
  add constraint gtm_import_jobs_import_type_check
  check (import_type in ('linkedin_connections', 'contacts_csv', 'player_master'));

alter table public.gtm_import_jobs
  add constraint gtm_import_jobs_approval_check
  check (
    (approved_by is null and approved_at is null)
    or (approved_by is not null and approved_at is not null)
  );

alter table public.gtm_notes
  drop constraint if exists gtm_notes_note_type_check;

alter table public.gtm_notes
  add constraint gtm_notes_note_type_check
  check (note_type in (
    'general', 'call', 'meeting', 'linkedin', 'email', 'introduction',
    'research', 'personal_context', 'opportunity', 'discovery'
  ));

create or replace trigger gtm_contact_players_set_updated_at
  before update on public.gtm_contact_players
  for each row execute function public.set_updated_at();

create or replace trigger gtm_interactions_set_updated_at
  before update on public.gtm_interactions
  for each row execute function public.set_updated_at();

-- Structured customer-discovery evidence remains separate from freeform notes.
-- Nullable answers preserve an explicit unknown state instead of manufacturing
-- negative or zero answers.
create table if not exists public.gtm_customer_discovery (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.gtm_contacts(id) on delete restrict,
  interaction_id uuid,
  organization_id uuid references public.gtm_organizations(id) on delete set null,
  problem_discussed text
    check (problem_discussed is null or char_length(btrim(problem_discussed)) between 1 and 10000),
  current_solution text
    check (current_solution is null or char_length(btrim(current_solution)) between 1 and 10000),
  pain_level smallint check (pain_level is null or pain_level between 1 and 5),
  primary_bltz_use_case text
    check (primary_bltz_use_case is null or char_length(btrim(primary_bltz_use_case)) between 1 and 5000),
  feature_requested text
    check (feature_requested is null or char_length(btrim(feature_requested)) between 1 and 10000),
  would_use boolean,
  would_pilot boolean,
  would_pay boolean,
  expected_buyer text
    check (expected_buyer is null or char_length(btrim(expected_buyer)) between 1 and 1000),
  expected_budget_range text
    check (expected_budget_range is null or char_length(btrim(expected_budget_range)) between 1 and 500),
  primary_objection text
    check (primary_objection is null or char_length(btrim(primary_objection)) between 1 and 10000),
  introduction_offered boolean,
  introduction_target text
    check (introduction_target is null or char_length(btrim(introduction_target)) between 1 and 2000),
  additional_context text
    check (additional_context is null or char_length(btrim(additional_context)) between 1 and 20000),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gtm_customer_discovery_interaction_contact_fkey
    foreign key (interaction_id, contact_id)
    references public.gtm_interactions(id, contact_id) on delete restrict,
  constraint gtm_customer_discovery_introduction_check
    check (introduction_target is null or introduction_offered is not false),
  constraint gtm_customer_discovery_has_finding_check
    check (num_nonnulls(
      problem_discussed,
      current_solution,
      pain_level,
      primary_bltz_use_case,
      feature_requested,
      would_use,
      would_pilot,
      would_pay,
      expected_buyer,
      expected_budget_range,
      primary_objection,
      introduction_offered,
      introduction_target,
      additional_context
    ) > 0)
);

comment on table public.gtm_customer_discovery is
  'Structured, private customer-discovery evidence linked to a GTM contact and optionally the interaction and external/canonical account context.';
comment on column public.gtm_customer_discovery.pain_level is
  'Nullable founder-entered 1-5 signal. Null means unknown or not discussed.';
comment on column public.gtm_customer_discovery.would_pay is
  'Nullable answer. False is an explicit no; null means unknown or not discussed.';

create index if not exists gtm_customer_discovery_contact_recent_idx
  on public.gtm_customer_discovery (contact_id, created_at desc);
create index if not exists gtm_customer_discovery_interaction_id_idx
  on public.gtm_customer_discovery (interaction_id)
  where interaction_id is not null;
create index if not exists gtm_customer_discovery_organization_recent_idx
  on public.gtm_customer_discovery (organization_id, created_at desc)
  where organization_id is not null;
create index if not exists gtm_customer_discovery_created_by_idx
  on public.gtm_customer_discovery (created_by, created_at desc);

create or replace trigger gtm_customer_discovery_protect_provenance
  before update on public.gtm_customer_discovery
  for each row execute function private.protect_gtm_record_provenance();

create or replace trigger gtm_customer_discovery_stamp_updated_by
  before update on public.gtm_customer_discovery
  for each row execute function private.stamp_gtm_updated_by();

create or replace trigger gtm_customer_discovery_set_updated_at
  before update on public.gtm_customer_discovery
  for each row execute function public.set_updated_at();

alter table public.gtm_customer_discovery enable row level security;

create policy "Internal admins read GTM customer discovery"
  on public.gtm_customer_discovery for select to authenticated
  using ((select public.is_internal_admin()));
create policy "Internal admins create GTM customer discovery"
  on public.gtm_customer_discovery for insert to authenticated
  with check (
    (select public.is_internal_admin())
    and created_by = (select auth.uid())
  );
create policy "Internal admins update GTM customer discovery"
  on public.gtm_customer_discovery for update to authenticated
  using ((select public.is_internal_admin()))
  with check ((select public.is_internal_admin()));

revoke all on table public.gtm_customer_discovery
  from public, anon, authenticated, service_role;
grant select, insert, update on table public.gtm_customer_discovery
  to authenticated, service_role;

-- Audit child records without copying private note, interaction-summary, or
-- discovery text into the shared audit log.
create or replace function private.audit_gtm_foundation_child_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_contact_id uuid;
  v_gtm_organization_id uuid;
  v_canonical_organization_id uuid;
  v_entity_type text;
  v_new_values jsonb;
  v_previous_values jsonb;
begin
  if tg_table_name = 'gtm_import_jobs' then
    v_entity_type := 'gtm_import_job';
    v_new_values := jsonb_build_object(
      'import_type', new.import_type,
      'status', new.status,
      'rows_found', new.rows_found,
      'rows_created', new.rows_created,
      'rows_updated', new.rows_updated,
      'rows_duplicated', new.rows_duplicated,
      'rows_failed', new.rows_failed,
      'potential_matches', new.potential_matches,
      'approved', new.approved_at is not null
    );
    if tg_op = 'UPDATE' then
      v_previous_values := jsonb_build_object(
        'status', old.status,
        'rows_found', old.rows_found,
        'rows_created', old.rows_created,
        'rows_updated', old.rows_updated,
        'rows_duplicated', old.rows_duplicated,
        'rows_failed', old.rows_failed,
        'potential_matches', old.potential_matches,
        'approved', old.approved_at is not null
      );
    end if;
  else
    v_contact_id := new.contact_id;
    select contact.organization_id
      into v_gtm_organization_id
    from public.gtm_contacts contact
    where contact.id = v_contact_id;

    if tg_table_name in ('gtm_interactions', 'gtm_customer_discovery')
       and new.organization_id is not null then
      v_gtm_organization_id := new.organization_id;
    end if;

    if v_gtm_organization_id is not null then
      select account.canonical_organization_id
        into v_canonical_organization_id
      from public.gtm_organizations account
      where account.id = v_gtm_organization_id;
    end if;

    if tg_table_name = 'gtm_notes' then
      v_entity_type := 'gtm_note';
      v_new_values := jsonb_build_object(
        'contact_id', new.contact_id,
        'interaction_id', new.interaction_id,
        'note_type', new.note_type
      );
      if tg_op = 'UPDATE' then
        v_previous_values := jsonb_build_object(
          'contact_id', old.contact_id,
          'interaction_id', old.interaction_id,
          'note_type', old.note_type
        );
      end if;
    elsif tg_table_name = 'gtm_interactions' then
      v_entity_type := 'gtm_interaction';
      v_new_values := jsonb_build_object(
        'contact_id', new.contact_id,
        'organization_id', new.organization_id,
        'opportunity_id', new.opportunity_id,
        'interaction_type', new.interaction_type,
        'direction', new.direction,
        'interaction_at', new.interaction_at
      );
    elsif tg_table_name = 'gtm_contact_players' then
      v_entity_type := 'gtm_contact_player';
      v_new_values := jsonb_build_object(
        'contact_id', new.contact_id,
        'player_id', new.player_id,
        'match_type', new.match_type,
        'match_confidence', new.match_confidence,
        'verified', new.verified
      );
      if tg_op = 'UPDATE' then
        v_previous_values := jsonb_build_object(
          'match_type', old.match_type,
          'match_confidence', old.match_confidence,
          'verified', old.verified
        );
      end if;
    elsif tg_table_name = 'gtm_customer_discovery' then
      v_entity_type := 'gtm_customer_discovery';
      v_new_values := jsonb_build_object(
        'contact_id', new.contact_id,
        'interaction_id', new.interaction_id,
        'organization_id', new.organization_id,
        'pain_level', new.pain_level,
        'would_use', new.would_use,
        'would_pilot', new.would_pilot,
        'would_pay', new.would_pay,
        'introduction_offered', new.introduction_offered
      );
      if tg_op = 'UPDATE' then
        v_previous_values := jsonb_build_object(
          'interaction_id', old.interaction_id,
          'organization_id', old.organization_id,
          'pain_level', old.pain_level,
          'would_use', old.would_use,
          'would_pilot', old.would_pilot,
          'would_pay', old.would_pay,
          'introduction_offered', old.introduction_offered
        );
      end if;
    end if;
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    actor_role,
    actor_role_scope,
    risk_level,
    previous_values,
    new_values,
    request_metadata
  ) values (
    v_canonical_organization_id,
    v_actor,
    'gtm.' || replace(v_entity_type, 'gtm_', '') || '.'
      || case when tg_op = 'INSERT' then 'created' else 'updated' end,
    v_entity_type,
    new.id::text,
    case when v_actor is null then 'system' else 'super_admin' end,
    case when v_actor is null then 'system' else 'platform' end,
    case when tg_table_name in ('gtm_customer_discovery', 'gtm_contact_players')
      then 'high' else 'medium' end,
    v_previous_values,
    v_new_values,
    jsonb_build_object('source', 'gtm_foundation_child_trigger')
  );

  return new;
end;
$$;

revoke all on function private.audit_gtm_foundation_child_change()
  from public, anon, authenticated, service_role;

create or replace trigger gtm_notes_write_audit
  after insert or update on public.gtm_notes
  for each row execute function private.audit_gtm_foundation_child_change();
create or replace trigger gtm_interactions_write_audit
  after insert or update on public.gtm_interactions
  for each row execute function private.audit_gtm_foundation_child_change();
create or replace trigger gtm_contact_players_write_audit
  after insert or update on public.gtm_contact_players
  for each row execute function private.audit_gtm_foundation_child_change();
create or replace trigger gtm_customer_discovery_write_audit
  after insert or update on public.gtm_customer_discovery
  for each row execute function private.audit_gtm_foundation_child_change();
create or replace trigger gtm_import_jobs_write_audit
  after insert or update on public.gtm_import_jobs
  for each row execute function private.audit_gtm_foundation_child_change();

-- Persist the preview/approval boundary without retaining raw CSV rows.
create or replace function public.prepare_gtm_import_job(
  p_filename text,
  p_import_type text,
  p_content_sha256 text,
  p_idempotency_key uuid,
  p_field_mapping jsonb,
  p_preview_summary jsonb,
  p_rows_found integer,
  p_rows_duplicated integer default 0,
  p_rows_failed integer default 0,
  p_potential_matches integer default 0
)
returns public.gtm_import_jobs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_job public.gtm_import_jobs;
begin
  if v_actor is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;
  if p_import_type not in ('linkedin_connections', 'contacts_csv') then
    raise exception 'unsupported GTM import type' using errcode = '22023';
  end if;
  if p_rows_found < 0
     or p_rows_duplicated < 0
     or p_rows_failed < 0
     or p_potential_matches < 0
     or p_rows_duplicated + p_rows_failed > p_rows_found then
    raise exception 'invalid GTM import preview counts' using errcode = '22023';
  end if;

  select * into v_job
  from public.gtm_import_jobs
  where idempotency_key = p_idempotency_key;

  if found then
    if v_job.content_sha256 <> lower(p_content_sha256)
       or v_job.filename <> btrim(p_filename)
       or v_job.field_mapping <> p_field_mapping then
      raise exception 'GTM import idempotency key does not match preview'
        using errcode = '22023';
    end if;
    return v_job;
  end if;

  insert into public.gtm_import_jobs (
    import_type,
    filename,
    content_sha256,
    idempotency_key,
    status,
    field_mapping,
    preview_summary,
    rows_found,
    rows_duplicated,
    rows_failed,
    potential_matches,
    uploaded_by,
    started_at
  ) values (
    p_import_type,
    btrim(p_filename),
    lower(p_content_sha256),
    p_idempotency_key,
    'preview_ready',
    p_field_mapping,
    p_preview_summary,
    p_rows_found,
    p_rows_duplicated,
    p_rows_failed,
    p_potential_matches,
    v_actor,
    now()
  ) returning * into v_job;

  return v_job;
end;
$$;

revoke all on function public.prepare_gtm_import_job(
  text, text, text, uuid, jsonb, jsonb, integer, integer, integer, integer
) from public, anon, authenticated, service_role;
grant execute on function public.prepare_gtm_import_job(
  text, text, text, uuid, jsonb, jsonb, integer, integer, integer, integer
) to authenticated, service_role;

comment on function public.prepare_gtm_import_job(
  text, text, text, uuid, jsonb, jsonb, integer, integer, integer, integer
) is
  'Persists a validated GTM CSV preview and its counts without storing raw CSV content. Contact writes require a later approved commit call.';

-- Replace the intake RPC with a preview-bound commit that matches contacts by
-- normalized LinkedIn URL, then unique normalized email, then source-specific
-- stable ID. It never merges on name alone.
create or replace function public.import_gtm_contacts(
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
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_job public.gtm_import_jobs;
  v_row jsonb;
  v_contact_id uuid;
  v_linkedin_id uuid;
  v_email_id uuid;
  v_source_id uuid;
  v_email_count integer;
  v_source_count integer;
  v_signal_count integer;
  v_contact_type text;
  v_created integer := 0;
  v_updated integer := 0;
  v_failed integer := greatest(p_invalid_count, 0);
begin
  if v_actor is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 2000 then
    raise exception 'import rows must be an array of at most 2000 records'
      using errcode = '22023';
  end if;

  select * into v_job
  from public.gtm_import_jobs
  where idempotency_key = p_idempotency_key
  for update;

  if found and v_job.status in ('completed', 'completed_with_errors') then
    return v_job;
  end if;

  if not found
     or p_duplicate_count < 0
     or p_invalid_count < 0
     or v_job.status <> 'preview_ready'
     or v_job.content_sha256 <> lower(p_content_sha256)
     or v_job.filename <> btrim(p_filename)
     or v_job.field_mapping <> p_field_mapping
     or v_job.preview_summary <> p_preview_summary
     or v_job.rows_found <> jsonb_array_length(p_rows)
        + p_duplicate_count + p_invalid_count then
    raise exception 'GTM import commit does not match its approved preview'
      using errcode = '22023';
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
        select min(contact.id::text)::uuid, count(*)
          into v_email_id, v_email_count
        from public.gtm_contacts contact
        where contact.archived = false
          and lower(btrim(contact.email)) = lower(btrim(v_row->>'email'));
      end if;

      if nullif(v_row->>'sourceRecordId', '') is not null then
        select min(contact.id::text)::uuid, count(*)
          into v_source_id, v_source_count
        from public.gtm_contacts contact
        where contact.source in ('linkedin_connections', 'contacts_csv')
          and contact.source_record_id = v_row->>'sourceRecordId';
      end if;

      select count(distinct candidate)
        into v_signal_count
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
          current_company, current_title, contact_type, sport, league_level,
          do_not_automate, pipeline_stage, source, source_record_id,
          linkedin_connected_on, created_by, updated_by
        ) values (
          v_row->>'displayName', nullif(v_row->>'firstName', ''),
          nullif(v_row->>'lastName', ''), nullif(lower(v_row->>'email'), ''),
          nullif(lower(v_row->>'linkedinUrl'), ''),
          nullif(v_row->>'currentCompany', ''), nullif(v_row->>'currentTitle', ''),
          v_row->>'contactType', nullif(v_row->>'sport', ''),
          nullif(v_row->>'leagueLevel', ''),
          coalesce((v_row->>'doNotAutomate')::boolean, false), 'identified',
          'linkedin_connections', v_row->>'sourceRecordId',
          nullif(v_row->>'connectedOn', '')::date, v_actor, v_actor
        ) returning id, contact_type into v_contact_id, v_contact_type;
        v_created := v_created + 1;
      else
        update public.gtm_contacts contact set
          display_name = coalesce(nullif(v_row->>'displayName', ''), contact.display_name),
          first_name = coalesce(nullif(v_row->>'firstName', ''), contact.first_name),
          last_name = coalesce(nullif(v_row->>'lastName', ''), contact.last_name),
          email = coalesce(nullif(lower(v_row->>'email'), ''), contact.email),
          linkedin_url = coalesce(nullif(lower(v_row->>'linkedinUrl'), ''), contact.linkedin_url),
          current_company = coalesce(nullif(v_row->>'currentCompany', ''), contact.current_company),
          current_title = coalesce(nullif(v_row->>'currentTitle', ''), contact.current_title),
          contact_type = case
            when v_row->>'contactType' = 'unclassified' then contact.contact_type
            else v_row->>'contactType'
          end,
          sport = coalesce(nullif(v_row->>'sport', ''), contact.sport),
          league_level = coalesce(nullif(v_row->>'leagueLevel', ''), contact.league_level),
          do_not_automate = contact.do_not_automate
            or coalesce((v_row->>'doNotAutomate')::boolean, false),
          linkedin_connected_on = coalesce(
            nullif(v_row->>'connectedOn', '')::date,
            contact.linkedin_connected_on
          ),
          updated_by = v_actor
        where contact.id = v_contact_id
        returning contact_type into v_contact_type;
        v_updated := v_updated + 1;
      end if;

      if nullif(v_row->>'playerId', '') is not null
         and v_contact_type = 'athlete' then
        insert into public.gtm_contact_players (
          contact_id, player_id, match_type, match_confidence,
          verified, created_by
        ) values (
          v_contact_id,
          (v_row->>'playerId')::uuid,
          coalesce(nullif(v_row->>'playerMatchType', ''), 'name_only'),
          coalesce(nullif(v_row->>'playerMatchConfidence', '')::numeric, 0.6500),
          false,
          v_actor
        ) on conflict (contact_id, player_id) do nothing;
      end if;
    exception
      when unique_violation or check_violation or invalid_text_representation then
        v_failed := v_failed + 1;
    end;
  end loop;

  update public.gtm_import_jobs set
    status = case when v_failed > 0 then 'completed_with_errors' else 'completed' end,
    rows_created = v_created,
    rows_updated = v_updated,
    rows_duplicated = greatest(p_duplicate_count, 0),
    rows_failed = v_failed,
    error_summary = case
      when v_failed > 0 then v_failed || ' row(s) failed or were ambiguous during database validation.'
      else null
    end,
    completed_at = now()
  where id = v_job.id
  returning * into v_job;

  return v_job;
end;
$$;

-- Signature is unchanged from the prior intake migration; reassert least
-- privilege after replacing the implementation.
revoke all on function public.import_gtm_contacts(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) from public, anon, authenticated, service_role;
grant execute on function public.import_gtm_contacts(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) to authenticated, service_role;

-- Atomic structured-discovery creation. RLS remains active because the
-- function is security invoker.
create or replace function public.create_gtm_customer_discovery(
  p_contact_id uuid,
  p_interaction_id uuid default null,
  p_organization_id uuid default null,
  p_problem_discussed text default null,
  p_current_solution text default null,
  p_pain_level smallint default null,
  p_primary_bltz_use_case text default null,
  p_feature_requested text default null,
  p_would_use boolean default null,
  p_would_pilot boolean default null,
  p_would_pay boolean default null,
  p_expected_buyer text default null,
  p_expected_budget_range text default null,
  p_primary_objection text default null,
  p_introduction_offered boolean default null,
  p_introduction_target text default null,
  p_additional_context text default null
)
returns public.gtm_customer_discovery
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_discovery public.gtm_customer_discovery;
begin
  if v_actor is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;

  insert into public.gtm_customer_discovery (
    contact_id, interaction_id, organization_id, problem_discussed,
    current_solution, pain_level, primary_bltz_use_case, feature_requested,
    would_use, would_pilot, would_pay, expected_buyer,
    expected_budget_range, primary_objection, introduction_offered,
    introduction_target, additional_context, created_by
  ) values (
    p_contact_id, p_interaction_id, p_organization_id,
    nullif(btrim(p_problem_discussed), ''),
    nullif(btrim(p_current_solution), ''), p_pain_level,
    nullif(btrim(p_primary_bltz_use_case), ''),
    nullif(btrim(p_feature_requested), ''), p_would_use, p_would_pilot,
    p_would_pay, nullif(btrim(p_expected_buyer), ''),
    nullif(btrim(p_expected_budget_range), ''),
    nullif(btrim(p_primary_objection), ''), p_introduction_offered,
    nullif(btrim(p_introduction_target), ''),
    nullif(btrim(p_additional_context), ''), v_actor
  ) returning * into v_discovery;

  return v_discovery;
end;
$$;

revoke all on function public.create_gtm_customer_discovery(
  uuid, uuid, uuid, text, text, smallint, text, text, boolean, boolean,
  boolean, text, text, text, boolean, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.create_gtm_customer_discovery(
  uuid, uuid, uuid, text, text, smallint, text, text, boolean, boolean,
  boolean, text, text, text, boolean, text, text
) to authenticated, service_role;

-- Basic instrumentation is a permission-checked projection, not a second
-- source-of-truth metrics table.
create or replace function public.get_gtm_foundation_metrics(
  p_since timestamptz default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_since timestamptz := coalesce(p_since, now() - interval '30 days');
  v_result jsonb;
begin
  if (select auth.uid()) is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generatedAt', now(),
    'since', v_since,
    'activeContacts', count(*) filter (where contact.archived = false),
    'linkedinContacts', count(*) filter (
      where contact.archived = false
        and contact.source in ('linkedin_connections', 'contacts_csv')
    ),
    'classifiedContacts', count(*) filter (
      where contact.archived = false and contact.contact_type <> 'unclassified'
    ),
    'priorityContacts', count(*) filter (
      where contact.archived = false
        and (contact.is_priority or contact.priority_tier in ('A', 'B'))
    ),
    'engagedContacts', count(*) filter (
      where contact.archived = false and contact.last_interaction_at >= v_since
    ),
    'overdueNextActions', count(*) filter (
      where contact.archived = false
        and contact.next_action_at < now()
        and contact.pipeline_stage not in ('won', 'lost')
    ),
    'stageCounts', coalesce((
      select jsonb_object_agg(stage.pipeline_stage, stage.stage_count)
      from (
        select pipeline_stage, count(*) as stage_count
        from public.gtm_contacts
        where archived = false
        group by pipeline_stage
      ) stage
    ), '{}'::jsonb),
    'discoveryRecords', (
      select count(*)
      from public.gtm_customer_discovery discovery
      where discovery.created_at >= v_since
    ),
    'interactions', (
      select count(*)
      from public.gtm_interactions interaction
      where interaction.interaction_at >= v_since
    )
  ) into v_result
  from public.gtm_contacts contact;

  return v_result;
end;
$$;

revoke all on function public.get_gtm_foundation_metrics(timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.get_gtm_foundation_metrics(timestamptz)
  to authenticated, service_role;

comment on function public.get_gtm_foundation_metrics(timestamptz) is
  'RLS-protected GTM Foundation V1 counts with an explicit reporting window. Values are derived from canonical GTM records.';
