-- Promote an explicitly selected Player Master prospect into the operational
-- GTM contact workflow without copying canonical athlete identity fields.

alter table public.gtm_contacts
  add column if not exists player_master_gsis_id text
    references public.nfl_players(gsis_id) on update cascade on delete restrict;

alter table public.gtm_contacts
  alter column display_name drop not null,
  drop constraint if exists gtm_contacts_display_name_check,
  add constraint gtm_contacts_identity_reference_check check (
    (
      player_master_gsis_id is null
      and display_name is not null
      and char_length(btrim(display_name)) between 1 and 240
    )
    or (
      player_master_gsis_id is not null
      and display_name is null
      and first_name is null
      and last_name is null
      and contact_type = 'athlete'
    )
  );

alter table public.gtm_contacts
  add constraint gtm_contacts_player_master_source_check check (
    player_master_gsis_id is null
    or (source = 'player_master' and source_record_id = player_master_gsis_id)
  );

create unique index if not exists gtm_contacts_player_master_gsis_id_key
  on public.gtm_contacts (player_master_gsis_id)
  where player_master_gsis_id is not null;

comment on column public.gtm_contacts.player_master_gsis_id is
  'Stable reference to canonical Player Master identity. Names, college, team, position, and other Player Master fields remain in nfl_players.';

comment on table public.gtm_contacts is
  'Private founder relationship intelligence. Canonical athlete identity is referenced through player_master_gsis_id and gtm_contact_players, never duplicated into this table.';

create or replace function private.enforce_gtm_player_master_identity_reference()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.player_master_gsis_id is not null then
    new.display_name := null;
    new.first_name := null;
    new.last_name := null;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_gtm_player_master_identity_reference()
  from public, anon, authenticated, service_role;

create or replace trigger gtm_contacts_preserve_player_master_identity
  before insert or update of player_master_gsis_id, display_name, first_name, last_name
  on public.gtm_contacts
  for each row execute function private.enforce_gtm_player_master_identity_reference();

create or replace function public.promote_gtm_player_prospects(
  p_gsis_ids text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_requested_count integer;
  v_selected_count integer;
  v_created_count integer;
  v_linked_player_count integer;
  v_contacts jsonb;
begin
  if v_actor is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;

  if p_gsis_ids is null or cardinality(p_gsis_ids) not between 1 and 100 then
    raise exception 'Choose between 1 and 100 Player Master prospects'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from unnest(p_gsis_ids) as requested(gsis_id)
    where requested.gsis_id is null or btrim(requested.gsis_id) = ''
  ) then
    raise exception 'Player Master identifiers cannot be blank'
      using errcode = '22023';
  end if;

  select count(*)
  into v_requested_count
  from (select distinct btrim(gsis_id) from unnest(p_gsis_ids) as input(gsis_id)) requested;

  if v_requested_count <> cardinality(p_gsis_ids) then
    raise exception 'Choose each Player Master prospect once'
      using errcode = '22023';
  end if;

  select count(*)
  into v_selected_count
  from public.gtm_player_prospects prospect
  where prospect.gsis_id = any(p_gsis_ids)
    and prospect.archived = false;

  if v_selected_count <> v_requested_count then
    raise exception 'Only active selected prospects can be added to GTM contacts'
      using errcode = '23514';
  end if;

  with inserted as (
    insert into public.gtm_contacts (
      display_name,
      player_master_gsis_id,
      contact_type,
      sport,
      league_level,
      source,
      source_record_id,
      pipeline_stage,
      do_not_automate,
      created_by,
      updated_by
    )
    select
      null,
      prospect.gsis_id,
      'athlete',
      'football',
      'NFL',
      'player_master',
      prospect.gsis_id,
      'identified',
      true,
      v_actor,
      v_actor
    from public.gtm_player_prospects prospect
    where prospect.gsis_id = any(p_gsis_ids)
      and prospect.archived = false
    on conflict (player_master_gsis_id) where player_master_gsis_id is not null
      do nothing
    returning id
  )
  select count(*) into v_created_count from inserted;

  insert into public.gtm_contact_players (
    contact_id,
    player_id,
    match_type,
    match_confidence,
    verified,
    verified_by,
    verified_at,
    created_by
  )
  select
    contact.id,
    canonical_player.id,
    'stable_identifier',
    1,
    true,
    v_actor,
    now(),
    v_actor
  from public.gtm_contacts contact
  join lateral (
    select player.id
    from public.players player
    where player.gsis_id = contact.player_master_gsis_id
    order by player.id
    limit 1
  ) canonical_player on true
  where contact.player_master_gsis_id = any(p_gsis_ids)
  on conflict (contact_id, player_id) do update
    set match_type = excluded.match_type,
        match_confidence = excluded.match_confidence,
        verified = true,
        verified_by = excluded.verified_by,
        verified_at = excluded.verified_at;

  select count(distinct contact.id)
  into v_linked_player_count
  from public.gtm_contacts contact
  join public.gtm_contact_players link on link.contact_id = contact.id
  join public.players player on player.id = link.player_id
  where contact.player_master_gsis_id = any(p_gsis_ids)
    and link.verified = true
    and player.gsis_id = contact.player_master_gsis_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'contactId', contact.id,
        'gsisId', contact.player_master_gsis_id,
        'archived', contact.archived
      ) order by contact.player_master_gsis_id
    ),
    '[]'::jsonb
  )
  into v_contacts
  from public.gtm_contacts contact
  where contact.player_master_gsis_id = any(p_gsis_ids);

  return jsonb_build_object(
    'requestedCount', v_requested_count,
    'createdCount', v_created_count,
    'existingCount', v_requested_count - v_created_count,
    'linkedPlayerCount', v_linked_player_count,
    'contacts', v_contacts
  );
end;
$$;

revoke all on function public.promote_gtm_player_prospects(text[])
  from public, anon, authenticated, service_role;
grant execute on function public.promote_gtm_player_prospects(text[])
  to authenticated, service_role;

comment on function public.promote_gtm_player_prospects(text[]) is
  'Atomically promotes active selected Player Master prospects into internal GTM contacts using stable references and exact Player links when available.';

-- Deployment order: apply after 20260828120000_gtm_player_prospect_references.sql.
-- Existing manual and imported contacts remain valid because their display_name
-- remains required whenever no Player Master reference is present.
-- Recovery: drop promote_gtm_player_prospects, its trigger/function, the two
-- constraints/index, then player_master_gsis_id; restore display_name NOT NULL
-- only after confirming no referenced contacts remain.
