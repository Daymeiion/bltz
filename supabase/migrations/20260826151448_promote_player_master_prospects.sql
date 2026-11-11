-- Promote selected Player Master rows into private GTM athlete contacts.
--
-- nfl_players remains the authoritative imported reference. The GTM row stores
-- only the operational contact identity required by GTM and the stable GSIS
-- source key. This function never creates public.players or player_lockers.

create index if not exists nfl_players_college_name_filter_idx
  on public.nfl_players (lower(college_name))
  where college_name is not null;

create index if not exists nfl_players_latest_team_filter_idx
  on public.nfl_players (latest_team)
  where latest_team is not null;

create index if not exists nfl_players_position_filter_idx
  on public.nfl_players (position)
  where position is not null;

create or replace function public.promote_player_master_prospects(
  p_gsis_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_requested_count integer;
  v_source_count integer;
  v_created_count integer;
  v_contact_ids jsonb;
begin
  if v_actor is null or not (select public.is_internal_admin()) then
    raise exception 'Player prospect access denied' using errcode = '42501';
  end if;

  if p_gsis_ids is null then
    raise exception 'Choose at least one Player Master prospect' using errcode = '22023';
  end if;

  select count(*) into v_requested_count
  from (
    select distinct btrim(value) as gsis_id
    from unnest(p_gsis_ids) as value
    where nullif(btrim(value), '') is not null
  ) requested;

  if v_requested_count < 1 or v_requested_count > 100 then
    raise exception 'Choose between 1 and 100 Player Master prospects' using errcode = '22023';
  end if;

  select count(*) into v_source_count
  from public.nfl_players player
  where player.gsis_id in (
    select distinct btrim(value)
    from unnest(p_gsis_ids) as value
    where nullif(btrim(value), '') is not null
  );

  if v_source_count <> v_requested_count then
    raise exception 'One or more Player Master prospects are no longer available' using errcode = '22023';
  end if;

  with requested as (
    select distinct btrim(value) as gsis_id
    from unnest(p_gsis_ids) as value
    where nullif(btrim(value), '') is not null
  ), inserted as (
    insert into public.gtm_contacts (
      display_name,
      first_name,
      last_name,
      contact_type,
      segment,
      sport,
      league_level,
      pipeline_stage,
      source,
      source_record_id,
      do_not_automate,
      created_by
    )
    select
      player.display_name,
      player.first_name,
      player.last_name,
      'athlete',
      'player_master_prospect',
      'football',
      'NFL',
      'identified',
      'player_master',
      player.gsis_id,
      true,
      v_actor
    from requested
    join public.nfl_players player on player.gsis_id = requested.gsis_id
    on conflict (source, source_record_id)
      where source_record_id is not null
      do nothing
    returning id
  )
  select count(*) into v_created_count from inserted;

  select coalesce(jsonb_agg(contact.id order by contact.display_name), '[]'::jsonb)
  into v_contact_ids
  from public.gtm_contacts contact
  where contact.source = 'player_master'
    and contact.source_record_id in (
      select distinct btrim(value)
      from unnest(p_gsis_ids) as value
      where nullif(btrim(value), '') is not null
    );

  return jsonb_build_object(
    'requested_count', v_requested_count,
    'created_count', v_created_count,
    'existing_count', v_requested_count - v_created_count,
    'contact_ids', v_contact_ids
  );
end;
$$;

revoke all on function public.promote_player_master_prospects(text[])
  from public, anon, authenticated, service_role;
grant execute on function public.promote_player_master_prospects(text[])
  to authenticated, service_role;

comment on function public.promote_player_master_prospects(text[]) is
  'Creates repeat-safe, manual-only GTM athlete prospects from selected nfl_players GSIS IDs without creating public.players or Player Locker rows.';

-- Recovery: drop the function and optional filter indexes. Existing GTM
-- contacts remain ordinary private relationship records and retain their
-- player_master source identity for auditability.
