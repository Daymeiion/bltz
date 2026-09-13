-- Production-readiness hardening for the LinkedIn GTM import.
--
-- Supports the founder's real export (6,381 rows), cryptographically binds the
-- normalized commit rows to the approved preview, prevents direct provenance
-- rewrites, and keeps the privileged implementation outside exposed schemas.

alter table public.gtm_import_jobs
  add column if not exists rows_sha256 text
  check (rows_sha256 is null or rows_sha256 ~ '^[a-f0-9]{64}$');

create schema if not exists gtm_private;
revoke all on schema gtm_private from public, anon, authenticated, service_role;
grant usage on schema gtm_private to authenticated, service_role;

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
        coalesce(
          (
            select jsonb_agg(
              item.value
                - 'playerId'
                - 'playerMatchType'
                - 'playerMatchConfidence'
              order by item.value->>'sourceRecordId'
            )
            from jsonb_array_elements(p_rows) as item(value)
          ),
          '[]'::jsonb
        )::text,
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

create or replace function public.prepare_gtm_import_job_v2(
  p_filename text,
  p_import_type text,
  p_content_sha256 text,
  p_idempotency_key uuid,
  p_field_mapping jsonb,
  p_preview_summary jsonb,
  p_rows jsonb,
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
  v_rows_sha256 text;
begin
  if v_actor is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;
  if p_import_type not in ('linkedin_connections', 'contacts_csv') then
    raise exception 'unsupported GTM import type' using errcode = '22023';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 10000 then
    raise exception 'preview rows must be an array of at most 10000 records'
      using errcode = '22023';
  end if;
  if p_rows_found < 0
     or p_rows_duplicated < 0
     or p_rows_failed < 0
     or p_potential_matches < 0
     or p_rows_duplicated + p_rows_failed > p_rows_found
     or p_rows_found <> jsonb_array_length(p_rows)
       + p_rows_duplicated + p_rows_failed then
    raise exception 'invalid GTM import preview counts' using errcode = '22023';
  end if;

  v_rows_sha256 := public.gtm_import_rows_sha256(p_rows);

  select * into v_job
  from public.gtm_import_jobs
  where idempotency_key = p_idempotency_key;

  if found then
    if v_job.uploaded_by <> v_actor
       or v_job.content_sha256 <> lower(p_content_sha256)
       or v_job.filename <> btrim(p_filename)
       or v_job.field_mapping <> p_field_mapping
       or v_job.preview_summary <> p_preview_summary
       or v_job.rows_sha256 <> v_rows_sha256 then
      raise exception 'GTM import idempotency key does not match preview'
        using errcode = '22023';
    end if;
    return v_job;
  end if;

  insert into public.gtm_import_jobs (
    import_type, filename, content_sha256, rows_sha256, idempotency_key,
    status, field_mapping, preview_summary, rows_found, rows_duplicated,
    rows_failed, potential_matches, uploaded_by, started_at
  ) values (
    p_import_type, btrim(p_filename), lower(p_content_sha256), v_rows_sha256,
    p_idempotency_key, 'preview_ready', p_field_mapping, p_preview_summary,
    p_rows_found, p_rows_duplicated, p_rows_failed, p_potential_matches,
    v_actor, now()
  ) returning * into v_job;

  return v_job;
end;
$$;

revoke all on function public.prepare_gtm_import_job_v2(
  text, text, text, uuid, jsonb, jsonb, jsonb, integer, integer, integer, integer
) from public, anon, authenticated, service_role;
grant execute on function public.prepare_gtm_import_job_v2(
  text, text, text, uuid, jsonb, jsonb, jsonb, integer, integer, integer, integer
) to authenticated, service_role;

revoke update on table public.gtm_import_jobs from authenticated;

create or replace function gtm_private.import_gtm_contacts_impl(
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
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 10000 then
    raise exception 'import rows must be an array of at most 10000 records'
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
     or v_job.uploaded_by <> v_actor
     or v_job.rows_sha256 <> public.gtm_import_rows_sha256(p_rows)
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

revoke all on function gtm_private.import_gtm_contacts_impl(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) from public, anon, authenticated, service_role;
grant execute on function gtm_private.import_gtm_contacts_impl(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) to authenticated, service_role;

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
language sql
security invoker
set search_path = ''
as $$
  select gtm_private.import_gtm_contacts_impl(
    p_filename,
    p_content_sha256,
    p_idempotency_key,
    p_field_mapping,
    p_preview_summary,
    p_rows,
    p_duplicate_count,
    p_invalid_count
  );
$$;

revoke all on function public.import_gtm_contacts(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) from public, anon, authenticated, service_role;
grant execute on function public.import_gtm_contacts(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) to authenticated, service_role;

comment on function public.prepare_gtm_import_job_v2(
  text, text, text, uuid, jsonb, jsonb, jsonb, integer, integer, integer, integer
) is 'Stores a normalized-row hash with the approved GTM import preview without retaining raw CSV rows.';

comment on function public.import_gtm_contacts(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) is 'Commits a preview-bound GTM import through a private authorization-checked implementation.';

-- Recovery: restore the prior public.import_gtm_contacts implementation and
-- authenticated update grant only if rolling the application back. Preserve
-- rows_sha256 values and completed jobs for audit continuity.

