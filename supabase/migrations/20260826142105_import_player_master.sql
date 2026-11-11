-- Canonical Player Master import for the existing nfl_players reference table.
--
-- This deliberately does not create public.players rows or GTM contacts.
-- Stable GSIS identifiers are required, the import is preview-bound and
-- idempotent, and the set-based upsert plus job completion are one transaction.

create or replace function public.import_player_master(
  p_content_sha256 text,
  p_idempotency_key uuid,
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
  v_row_count integer;
  v_existing integer;
begin
  if v_actor is null or not (select public.is_internal_admin()) then
    raise exception 'Player Master import access denied' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Player Master rows must be an array' using errcode = '22023';
  end if;

  v_row_count := jsonb_array_length(p_rows);
  if v_row_count > 25000 or p_duplicate_count < 0 or p_invalid_count < 0 then
    raise exception 'Player Master import limits are invalid' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) item
    where nullif(btrim(item->>'gsis_id'), '') is null
       or nullif(btrim(item->>'display_name'), '') is null
  ) then
    raise exception 'Every Player Master row requires GSIS ID and display name' using errcode = '22023';
  end if;
  if (select count(distinct lower(btrim(item->>'gsis_id'))) from jsonb_array_elements(p_rows) item) <> v_row_count then
    raise exception 'Player Master rows contain duplicate GSIS IDs' using errcode = '22023';
  end if;

  select * into v_job
  from public.gtm_import_jobs
  where idempotency_key = p_idempotency_key
  for update;

  if found and v_job.status in ('completed', 'completed_with_errors') then
    if v_job.import_type <> 'player_master'
       or v_job.content_sha256 <> lower(p_content_sha256) then
      raise exception 'Player Master idempotency key does not match the completed import' using errcode = '22023';
    end if;
    return v_job;
  end if;

  if not found
     or v_job.import_type <> 'player_master'
     or v_job.uploaded_by <> v_actor
     or v_job.status <> 'preview_ready'
     or v_job.content_sha256 <> lower(p_content_sha256)
     or v_job.rows_found <> v_row_count + p_duplicate_count + p_invalid_count
     or v_job.rows_duplicated <> p_duplicate_count
     or v_job.rows_failed <> p_invalid_count then
    raise exception 'Player Master commit does not match its approved preview' using errcode = '22023';
  end if;

  select count(*) into v_existing
  from public.nfl_players player
  where player.gsis_id in (
    select item->>'gsis_id' from jsonb_array_elements(p_rows) item
  );

  update public.gtm_import_jobs
  set status = 'committing', approved_by = v_actor, approved_at = now()
  where id = v_job.id;

  insert into public.nfl_players (
    gsis_id, display_name, first_name, last_name, birth_date, position,
    position_group, height_in, weight_lbs, headshot_url, college_name,
    college_conference, jersey_number, rookie_season, last_season,
    latest_team, status, years_of_experience, draft_year, draft_round,
    draft_pick, draft_team, espn_id, pfr_id, nfl_id, pff_id, smart_id,
    last_synced_at
  )
  select
    source.gsis_id, source.display_name, source.first_name, source.last_name,
    source.birth_date, source.position, source.position_group, source.height_in,
    source.weight_lbs, source.headshot_url, source.college_name,
    source.college_conference, source.jersey_number, source.rookie_season,
    source.last_season, source.latest_team, source.status,
    source.years_of_experience, source.draft_year, source.draft_round,
    source.draft_pick, source.draft_team, source.espn_id, source.pfr_id,
    source.nfl_id, source.pff_id, source.smart_id, now()
  from jsonb_to_recordset(p_rows) as source (
    gsis_id text,
    display_name text,
    first_name text,
    last_name text,
    birth_date date,
    position text,
    position_group text,
    height_in smallint,
    weight_lbs smallint,
    headshot_url text,
    college_name text,
    college_conference text,
    jersey_number smallint,
    rookie_season smallint,
    last_season smallint,
    latest_team text,
    status text,
    years_of_experience smallint,
    draft_year smallint,
    draft_round smallint,
    draft_pick smallint,
    draft_team text,
    espn_id text,
    pfr_id text,
    nfl_id text,
    pff_id text,
    smart_id text
  )
  on conflict (gsis_id) do update set
    display_name = excluded.display_name,
    first_name = coalesce(excluded.first_name, nfl_players.first_name),
    last_name = coalesce(excluded.last_name, nfl_players.last_name),
    birth_date = coalesce(excluded.birth_date, nfl_players.birth_date),
    position = coalesce(excluded.position, nfl_players.position),
    position_group = coalesce(excluded.position_group, nfl_players.position_group),
    height_in = coalesce(excluded.height_in, nfl_players.height_in),
    weight_lbs = coalesce(excluded.weight_lbs, nfl_players.weight_lbs),
    headshot_url = coalesce(excluded.headshot_url, nfl_players.headshot_url),
    college_name = coalesce(excluded.college_name, nfl_players.college_name),
    college_conference = coalesce(excluded.college_conference, nfl_players.college_conference),
    jersey_number = coalesce(excluded.jersey_number, nfl_players.jersey_number),
    rookie_season = coalesce(excluded.rookie_season, nfl_players.rookie_season),
    last_season = coalesce(excluded.last_season, nfl_players.last_season),
    latest_team = coalesce(excluded.latest_team, nfl_players.latest_team),
    status = coalesce(excluded.status, nfl_players.status),
    years_of_experience = coalesce(excluded.years_of_experience, nfl_players.years_of_experience),
    draft_year = coalesce(excluded.draft_year, nfl_players.draft_year),
    draft_round = coalesce(excluded.draft_round, nfl_players.draft_round),
    draft_pick = coalesce(excluded.draft_pick, nfl_players.draft_pick),
    draft_team = coalesce(excluded.draft_team, nfl_players.draft_team),
    espn_id = coalesce(excluded.espn_id, nfl_players.espn_id),
    pfr_id = coalesce(excluded.pfr_id, nfl_players.pfr_id),
    nfl_id = coalesce(excluded.nfl_id, nfl_players.nfl_id),
    pff_id = coalesce(excluded.pff_id, nfl_players.pff_id),
    smart_id = coalesce(excluded.smart_id, nfl_players.smart_id),
    last_synced_at = now();

  update public.gtm_import_jobs
  set status = case when p_invalid_count > 0 then 'completed_with_errors' else 'completed' end,
      rows_created = v_row_count - v_existing,
      rows_updated = v_existing,
      rows_duplicated = p_duplicate_count,
      rows_failed = p_invalid_count,
      completed_at = now()
  where id = v_job.id
  returning * into v_job;

  return v_job;
end;
$$;

revoke all on function public.import_player_master(text, uuid, jsonb, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.import_player_master(text, uuid, jsonb, integer, integer)
  to authenticated, service_role;

comment on function public.import_player_master(text, uuid, jsonb, integer, integer) is
  'Atomically imports an approved Player Master preview into canonical nfl_players using GSIS ID. It never creates GTM contacts or public.players rows.';

-- Recovery: dropping this function removes the import endpoint without
-- changing nfl_players or completed import history. Imported rows are
-- idempotent and can be refreshed safely by a later canonical snapshot.
