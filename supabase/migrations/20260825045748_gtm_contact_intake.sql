-- Additive, authenticated intake functions for the internal GTM workspace.
-- Raw CSV content is deliberately never stored; only mapping, counts, and outcomes
-- are retained in gtm_import_jobs.

alter table public.gtm_import_jobs
  drop constraint if exists gtm_import_jobs_import_type_check;

alter table public.gtm_import_jobs
  add constraint gtm_import_jobs_import_type_check
  check (import_type in ('linkedin_connections', 'player_master', 'contacts_csv'));

alter table public.gtm_contacts
  add constraint gtm_contacts_source_record_unique
  unique (source, source_record_id);

create or replace function public.create_gtm_contact(
  p_display_name text,
  p_first_name text default null,
  p_last_name text default null,
  p_email text default null,
  p_linkedin_url text default null,
  p_current_company text default null,
  p_current_title text default null,
  p_contact_type text default 'unclassified',
  p_sport text default null,
  p_league_level text default null,
  p_do_not_automate boolean default false,
  p_player_id uuid default null
)
returns public.gtm_contacts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_contact public.gtm_contacts;
begin
  if v_actor is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;

  if nullif(btrim(p_display_name), '') is null then
    raise exception 'display name is required' using errcode = '23514';
  end if;

  if p_player_id is not null and p_contact_type <> 'athlete' then
    raise exception 'canonical players can only be linked to athlete contacts'
      using errcode = '23514';
  end if;

  insert into public.gtm_contacts (
    display_name, first_name, last_name, email, linkedin_url,
    current_company, current_title, contact_type, sport, league_level,
    do_not_automate, pipeline_stage, source, source_record_id, created_by
  ) values (
    btrim(p_display_name), nullif(btrim(p_first_name), ''),
    nullif(btrim(p_last_name), ''), nullif(lower(btrim(p_email)), ''),
    nullif(lower(btrim(p_linkedin_url)), ''),
    nullif(btrim(p_current_company), ''), nullif(btrim(p_current_title), ''),
    p_contact_type, nullif(btrim(p_sport), ''),
    nullif(btrim(p_league_level), ''), p_do_not_automate, 'identified',
    'manual', gen_random_uuid()::text, v_actor
  )
  returning * into v_contact;

  if p_player_id is not null then
    insert into public.gtm_contact_players (
      contact_id, player_id, match_type, match_confidence,
      verified, verified_by, verified_at, created_by
    ) values (
      v_contact.id, p_player_id, 'manual', 1, true, v_actor, now(), v_actor
    );
  end if;

  return v_contact;
end;
$$;

revoke all on function public.create_gtm_contact(
  text, text, text, text, text, text, text, text, text, text, boolean, uuid
) from public, anon;
grant execute on function public.create_gtm_contact(
  text, text, text, text, text, text, text, text, text, text, boolean, uuid
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
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_job public.gtm_import_jobs;
  v_row jsonb;
  v_existing_id uuid;
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
  where idempotency_key = p_idempotency_key;
  if found then
    return v_job;
  end if;

  insert into public.gtm_import_jobs (
    import_type, filename, content_sha256, idempotency_key, status,
    field_mapping, preview_summary, rows_found, rows_duplicated,
    uploaded_by, started_at
  ) values (
    'contacts_csv', btrim(p_filename), lower(p_content_sha256),
    p_idempotency_key, 'committing', p_field_mapping, p_preview_summary,
    jsonb_array_length(p_rows) + greatest(p_duplicate_count, 0) + greatest(p_invalid_count, 0),
    greatest(p_duplicate_count, 0), v_actor, now()
  ) returning * into v_job;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    begin
      select id into v_existing_id
      from public.gtm_contacts
      where source = 'contacts_csv'
        and source_record_id = v_row->>'sourceRecordId';

      insert into public.gtm_contacts (
        display_name, first_name, last_name, email, linkedin_url,
        current_company, current_title, contact_type, sport, league_level,
        do_not_automate, pipeline_stage, source, source_record_id,
        created_by, updated_by
      ) values (
        v_row->>'displayName', nullif(v_row->>'firstName', ''),
        nullif(v_row->>'lastName', ''), nullif(v_row->>'email', ''),
        nullif(v_row->>'linkedinUrl', ''), nullif(v_row->>'currentCompany', ''),
        nullif(v_row->>'currentTitle', ''), v_row->>'contactType',
        nullif(v_row->>'sport', ''), nullif(v_row->>'leagueLevel', ''),
        coalesce((v_row->>'doNotAutomate')::boolean, false), 'identified',
        'contacts_csv', v_row->>'sourceRecordId', v_actor, v_actor
      )
      on conflict (source, source_record_id) do update set
        display_name = excluded.display_name,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        email = excluded.email,
        linkedin_url = excluded.linkedin_url,
        current_company = excluded.current_company,
        current_title = excluded.current_title,
        contact_type = excluded.contact_type,
        sport = excluded.sport,
        league_level = excluded.league_level,
        do_not_automate = excluded.do_not_automate,
        updated_by = v_actor;

      if v_existing_id is null then
        v_created := v_created + 1;
      else
        v_updated := v_updated + 1;
      end if;
    exception when unique_violation or check_violation or invalid_text_representation then
      v_failed := v_failed + 1;
    end;
  end loop;

  update public.gtm_import_jobs set
    status = case when v_failed > 0 then 'completed_with_errors' else 'completed' end,
    rows_created = v_created,
    rows_updated = v_updated,
    rows_failed = v_failed,
    error_summary = case when v_failed > 0 then v_failed || ' row(s) failed database validation.' else null end,
    completed_at = now()
  where id = v_job.id
  returning * into v_job;

  return v_job;
end;
$$;

revoke all on function public.import_gtm_contacts(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) from public, anon;
grant execute on function public.import_gtm_contacts(
  text, text, uuid, jsonb, jsonb, jsonb, integer, integer
) to authenticated, service_role;

comment on function public.import_gtm_contacts(text, text, uuid, jsonb, jsonb, jsonb, integer, integer) is
  'Atomically records a CSV import and idempotently creates or updates normalized GTM contacts. Raw CSV is not retained.';
