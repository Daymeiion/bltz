-- =============================================================================
-- GTM relationship intelligence addendum.
--
-- Extends the existing private contact model without changing canonical Player,
-- pipeline, scoring, RBAC, or RLS architecture. All new contact attributes are
-- nullable so existing GTM rows remain valid without a backfill.
-- =============================================================================

alter table public.gtm_contacts
  drop constraint if exists gtm_contacts_contact_type_check;

alter table public.gtm_contacts
  add column if not exists contact_type_other text,
  add column if not exists potential_roles text[],
  add column if not exists relationship_objective text,
  add column if not exists relationship_priority text,
  add column if not exists relationship_context text;

alter table public.gtm_contacts
  add constraint gtm_contacts_contact_type_check
  check (contact_type in (
    -- Legacy V1 values remain valid for backward compatibility.
    'enterprise', 'multiplier', 'unclassified',
    -- Relationship-intelligence taxonomy.
    'athlete', 'former_athlete', 'agent_manager', 'nil_staff',
    'university_athletics', 'player_development',
    'athletic_administration', 'coach', 'sports_executive',
    'media_content', 'photographer_videographer', 'brand_marketing',
    'creative_brand_builder', 'investor', 'founder_operator',
    'strategic_partner', 'general_network', 'other'
  )),
  add constraint gtm_contacts_contact_type_other_check
  check (
    contact_type_other is null
    or (
      contact_type = 'other'
      and char_length(btrim(contact_type_other)) between 1 and 240
    )
  ),
  add constraint gtm_contacts_potential_roles_check
  check (
    potential_roles is null
    or (
      array_position(potential_roles, null) is null
      and cardinality(potential_roles) <= 20
      and potential_roles <@ array[
        'potential_user', 'pilot_champion', 'buyer', 'decision_maker',
        'decision_influencer', 'internal_connector', 'referral_source',
        'distribution_partner', 'strategic_partner', 'product_discovery',
        'product_validator', 'industry_expert', 'content_partner',
        'media_rights_partner', 'brand_partner', 'investor',
        'investor_connector', 'advisor', 'athlete_recruiter',
        'university_connector'
      ]::text[]
    )
  ),
  add constraint gtm_contacts_relationship_objective_check
  check (
    relationship_objective is null
    or relationship_objective in (
      'customer_discovery', 'user_acquisition', 'pilot_development',
      'product_validation', 'institutional_discovery',
      'partnership_development', 'distribution', 'investor_relationship',
      'fundraising_discovery', 'referral_generation',
      'media_rights_discovery', 'brand_relationship', 'strategic_learning',
      'relationship_building', 're_engagement'
    )
  ),
  add constraint gtm_contacts_relationship_priority_check
  check (
    relationship_priority is null
    or relationship_priority in ('critical', 'high', 'medium', 'low')
  ),
  add constraint gtm_contacts_relationship_context_check
  check (
    relationship_context is null
    or char_length(btrim(relationship_context)) between 1 and 5000
  );

comment on column public.gtm_contacts.contact_type_other is
  'Optional clarification used only when contact_type is other.';
comment on column public.gtm_contacts.potential_roles is
  'Zero or more ways this relationship could help BLTZ; separate from who the contact is.';
comment on column public.gtm_contacts.relationship_objective is
  'Primary current objective for the relationship; separate from outcomes and pipeline stage.';
comment on column public.gtm_contacts.relationship_priority is
  'Founder relationship priority. This does not replace the existing scored priority tier.';
comment on column public.gtm_contacts.relationship_context is
  'Concise strategic context for why the relationship matters to BLTZ.';

create index if not exists gtm_contacts_potential_roles_gin_idx
  on public.gtm_contacts using gin (potential_roles)
  where potential_roles is not null and archived = false;
create index if not exists gtm_contacts_relationship_objective_idx
  on public.gtm_contacts (relationship_objective, relationship_priority)
  where archived = false;
create index if not exists gtm_contacts_relationship_priority_idx
  on public.gtm_contacts (relationship_priority, updated_at desc)
  where relationship_priority is not null and archived = false;

-- Versioned creation keeps create_gtm_contact_v2 available for in-flight and
-- older clients while allowing the Admin workflow to persist the new metadata.
create or replace function public.create_gtm_contact_v3(
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
  p_player_id uuid default null,
  p_investor_type text default null,
  p_investor_relationship_stage text default null,
  p_what_they_need_to_see text default null,
  p_investor_thesis_feedback text default null,
  p_historical_signal text default null,
  p_future_trigger text default null,
  p_prior_outcome text default null,
  p_relationship_source text default null,
  p_next_trigger text default null,
  p_contact_type_other text default null,
  p_potential_roles text[] default null,
  p_relationship_objective text default null,
  p_relationship_priority text default null,
  p_relationship_context text default null
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
  if p_player_id is not null and p_contact_type <> 'athlete' then
    raise exception 'canonical Player links require an athlete contact'
      using errcode = '23514';
  end if;

  insert into public.gtm_contacts (
    display_name, first_name, last_name, email, linkedin_url,
    current_company, current_title, contact_type, contact_type_other,
    sport, league_level, do_not_automate, pipeline_stage, investor_type,
    investor_relationship_stage, what_they_need_to_see,
    investor_thesis_feedback, historical_signal, future_trigger,
    prior_outcome, relationship_source, next_trigger, potential_roles,
    relationship_objective, relationship_priority, relationship_context,
    created_by, updated_by
  ) values (
    btrim(p_display_name), nullif(btrim(p_first_name), ''),
    nullif(btrim(p_last_name), ''), nullif(lower(btrim(p_email)), ''),
    nullif(lower(btrim(p_linkedin_url)), ''),
    nullif(btrim(p_current_company), ''), nullif(btrim(p_current_title), ''),
    p_contact_type, nullif(btrim(p_contact_type_other), ''),
    nullif(btrim(p_sport), ''), nullif(btrim(p_league_level), ''),
    p_do_not_automate, 'identified', p_investor_type,
    p_investor_relationship_stage, nullif(btrim(p_what_they_need_to_see), ''),
    nullif(btrim(p_investor_thesis_feedback), ''),
    nullif(btrim(p_historical_signal), ''), nullif(btrim(p_future_trigger), ''),
    nullif(btrim(p_prior_outcome), ''), nullif(btrim(p_relationship_source), ''),
    nullif(btrim(p_next_trigger), ''), p_potential_roles,
    p_relationship_objective, p_relationship_priority,
    nullif(btrim(p_relationship_context), ''), v_actor, v_actor
  ) returning * into v_contact;

  if p_player_id is not null then
    insert into public.gtm_contact_players (
      contact_id, player_id, match_type, match_confidence, verified,
      verified_by, verified_at, created_by
    ) values (
      v_contact.id, p_player_id, 'manual', 1, true, v_actor, now(), v_actor
    );
  end if;

  return v_contact;
end;
$$;

revoke all on function public.create_gtm_contact_v3(
  text, text, text, text, text, text, text, text, text, text, boolean, uuid,
  text, text, text, text, text, text, text, text, text, text, text[], text,
  text, text
) from public, anon, authenticated, service_role;
grant execute on function public.create_gtm_contact_v3(
  text, text, text, text, text, text, text, text, text, text, boolean, uuid,
  text, text, text, text, text, text, text, text, text, text, text[], text,
  text, text
) to authenticated, service_role;

create or replace function public.update_gtm_contact_v2(
  p_contact_id uuid,
  p_display_name text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_linkedin_url text,
  p_current_company text,
  p_current_title text,
  p_contact_type text,
  p_segment text,
  p_sport text,
  p_league_level text,
  p_geography text,
  p_relationship_strength smallint,
  p_bltz_relevance smallint,
  p_buying_authority smallint,
  p_network_leverage smallint,
  p_timing_score smallint,
  p_do_not_automate boolean,
  p_investor_type text,
  p_investor_relationship_stage text,
  p_what_they_need_to_see text,
  p_investor_thesis_feedback text,
  p_historical_signal text,
  p_future_trigger text,
  p_prior_outcome text,
  p_relationship_source text,
  p_contact_type_other text,
  p_potential_roles text[],
  p_relationship_objective text,
  p_relationship_priority text,
  p_relationship_context text
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

  update public.gtm_contacts contact
  set
    display_name = btrim(p_display_name),
    first_name = nullif(btrim(p_first_name), ''),
    last_name = nullif(btrim(p_last_name), ''),
    email = nullif(lower(btrim(p_email)), ''),
    phone = nullif(btrim(p_phone), ''),
    linkedin_url = nullif(lower(btrim(p_linkedin_url)), ''),
    current_company = nullif(btrim(p_current_company), ''),
    current_title = nullif(btrim(p_current_title), ''),
    contact_type = p_contact_type,
    contact_type_other = nullif(btrim(p_contact_type_other), ''),
    segment = nullif(btrim(p_segment), ''),
    sport = nullif(btrim(p_sport), ''),
    league_level = nullif(btrim(p_league_level), ''),
    geography = nullif(btrim(p_geography), ''),
    relationship_strength = p_relationship_strength,
    bltz_relevance = p_bltz_relevance,
    buying_authority = p_buying_authority,
    network_leverage = p_network_leverage,
    timing_score = p_timing_score,
    do_not_automate = p_do_not_automate,
    investor_type = p_investor_type,
    investor_relationship_stage = p_investor_relationship_stage,
    what_they_need_to_see = nullif(btrim(p_what_they_need_to_see), ''),
    investor_thesis_feedback = nullif(btrim(p_investor_thesis_feedback), ''),
    historical_signal = nullif(btrim(p_historical_signal), ''),
    future_trigger = nullif(btrim(p_future_trigger), ''),
    prior_outcome = nullif(btrim(p_prior_outcome), ''),
    relationship_source = nullif(btrim(p_relationship_source), ''),
    potential_roles = p_potential_roles,
    relationship_objective = p_relationship_objective,
    relationship_priority = p_relationship_priority,
    relationship_context = nullif(btrim(p_relationship_context), ''),
    updated_by = v_actor
  where contact.id = p_contact_id and contact.archived = false
  returning * into v_contact;

  if not found then
    raise exception 'Active GTM contact not found' using errcode = 'P0002';
  end if;

  if p_contact_type <> 'athlete' then
    update public.gtm_contact_players
    set verified = false
    where contact_id = p_contact_id and verified = true;
  end if;

  return v_contact;
end;
$$;

revoke all on function public.update_gtm_contact_v2(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  text, text, smallint, smallint, smallint, smallint, smallint, boolean,
  text, text, text, text, text, text, text, text, text, text[], text, text,
  text
) from public, anon, authenticated, service_role;
grant execute on function public.update_gtm_contact_v2(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  text, text, smallint, smallint, smallint, smallint, smallint, boolean,
  text, text, text, text, text, text, text, text, text, text[], text, text,
  text
) to authenticated, service_role;

comment on function public.create_gtm_contact_v3(
  text, text, text, text, text, text, text, text, text, text, boolean, uuid,
  text, text, text, text, text, text, text, text, text, text, text[], text,
  text, text
) is 'Creates a private GTM contact with optional relationship intelligence while preserving canonical Player linkage.';
comment on function public.update_gtm_contact_v2(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  text, text, smallint, smallint, smallint, smallint, smallint, boolean,
  text, text, text, text, text, text, text, text, text, text[], text, text,
  text
) is 'Atomically edits a private GTM contact and its nullable relationship intelligence metadata.';

