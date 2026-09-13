-- =============================================================================
-- GTM Engine Phase 2 schema addendum.
--
-- This remains inside the existing private GTM contact/interaction model. It
-- adds investor contact context, multi-outcome conversations, and re-engagement
-- triggers without creating a fundraising feature area or a binary win/loss
-- workflow.
-- =============================================================================

alter table public.gtm_contacts
  drop constraint if exists gtm_contacts_contact_type_check;

alter table public.gtm_contacts
  add column if not exists investor_type text,
  add column if not exists investor_relationship_stage text,
  add column if not exists what_they_need_to_see text,
  add column if not exists investor_thesis_feedback text,
  add column if not exists historical_signal text,
  add column if not exists future_trigger text,
  add column if not exists prior_outcome text,
  add column if not exists relationship_source text,
  add column if not exists next_trigger text;

alter table public.gtm_contacts
  add constraint gtm_contacts_contact_type_check
  check (contact_type in (
    'enterprise', 'athlete', 'multiplier', 'investor', 'unclassified'
  )),
  add constraint gtm_contacts_investor_type_check
  check (
    investor_type is null or investor_type in (
      'angel', 'athlete_angel', 'operator_angel', 'pre_seed_vc', 'seed_vc',
      'sports_vc', 'consumer_vc', 'media_vc', 'strategic_corporate_vc',
      'family_office'
    )
  ),
  add constraint gtm_contacts_investor_relationship_stage_check
  check (
    investor_relationship_stage is null or investor_relationship_stage in (
      'existing_relationship', 'introduction', 'discovery', 'product_shown',
      'interested', 'milestone_follow_up', 'intro_offered', 'potential_check',
      'diligence', 'passed', 'future_round'
    )
  ),
  add constraint gtm_contacts_what_they_need_to_see_check
  check (
    what_they_need_to_see is null
    or char_length(btrim(what_they_need_to_see)) between 1 and 10000
  ),
  add constraint gtm_contacts_investor_thesis_feedback_check
  check (
    investor_thesis_feedback is null
    or char_length(btrim(investor_thesis_feedback)) between 1 and 10000
  ),
  add constraint gtm_contacts_historical_signal_check
  check (
    historical_signal is null
    or char_length(btrim(historical_signal)) between 1 and 5000
  ),
  add constraint gtm_contacts_future_trigger_check
  check (
    future_trigger is null
    or char_length(btrim(future_trigger)) between 1 and 2000
  ),
  add constraint gtm_contacts_prior_outcome_check
  check (
    prior_outcome is null
    or char_length(btrim(prior_outcome)) between 1 and 5000
  ),
  add constraint gtm_contacts_relationship_source_check
  check (
    relationship_source is null
    or char_length(btrim(relationship_source)) between 1 and 1000
  ),
  add constraint gtm_contacts_next_trigger_check
  check (
    next_trigger is null
    or char_length(btrim(next_trigger)) between 1 and 2000
  ),
  add constraint gtm_contacts_investor_fields_scope_check
  check (
    contact_type = 'investor'
    or num_nonnulls(
      investor_type,
      investor_relationship_stage,
      what_they_need_to_see,
      investor_thesis_feedback,
      historical_signal,
      future_trigger,
      prior_outcome,
      relationship_source
    ) = 0
  );

comment on column public.gtm_contacts.investor_type is
  'Nullable investor classification. Must remain null for non-investor contacts.';
comment on column public.gtm_contacts.investor_relationship_stage is
  'Nullable relationship context for investor contacts; it is not the universal GTM pipeline stage.';
comment on column public.gtm_contacts.next_trigger is
  'Current condition that should cause this relationship to be re-engaged. Applies to every contact type.';

create index if not exists gtm_contacts_investor_stage_idx
  on public.gtm_contacts (investor_relationship_stage, investor_type)
  where contact_type = 'investor' and archived = false;
create index if not exists gtm_contacts_next_trigger_idx
  on public.gtm_contacts (updated_at desc)
  where next_trigger is not null and archived = false;

alter table public.gtm_interactions
  add column if not exists outcomes text[] not null default '{}'::text[],
  add column if not exists next_trigger text;

alter table public.gtm_interactions
  add constraint gtm_interactions_outcomes_check
  check (
    array_position(outcomes, null) is null
    and cardinality(outcomes) <= 10
    and outcomes <@ array[
      'user_conversion', 'pilot_opportunity', 'capital', 'referral',
      'strategic_insight', 'product_validation', 'distribution_opportunity',
      'partnership', 'future_follow_up', 'no_fit'
    ]::text[]
  ),
  add constraint gtm_interactions_next_trigger_check
  check (
    next_trigger is null
    or char_length(btrim(next_trigger)) between 1 and 2000
  );

comment on column public.gtm_interactions.outcomes is
  'Zero or more non-binary outcomes produced by this GTM conversation.';
comment on column public.gtm_interactions.next_trigger is
  'Conversation-time re-engagement condition. The contact stores the current relationship projection.';

create index if not exists gtm_interactions_outcomes_gin_idx
  on public.gtm_interactions using gin (outcomes)
  where cardinality(outcomes) > 0;

-- Contact creation V2 accepts investor context while leaving the existing RPC
-- intact for compatibility with any in-flight callers.
create or replace function public.create_gtm_contact_v2(
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
  p_next_trigger text default null
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
    current_company, current_title, contact_type, sport, league_level,
    do_not_automate, pipeline_stage, investor_type,
    investor_relationship_stage, what_they_need_to_see,
    investor_thesis_feedback, historical_signal, future_trigger,
    prior_outcome, relationship_source, next_trigger, created_by, updated_by
  ) values (
    btrim(p_display_name), nullif(btrim(p_first_name), ''),
    nullif(btrim(p_last_name), ''), nullif(lower(btrim(p_email)), ''),
    nullif(lower(btrim(p_linkedin_url)), ''),
    nullif(btrim(p_current_company), ''), nullif(btrim(p_current_title), ''),
    p_contact_type, nullif(btrim(p_sport), ''),
    nullif(btrim(p_league_level), ''), p_do_not_automate, 'identified',
    p_investor_type, p_investor_relationship_stage,
    nullif(btrim(p_what_they_need_to_see), ''),
    nullif(btrim(p_investor_thesis_feedback), ''),
    nullif(btrim(p_historical_signal), ''),
    nullif(btrim(p_future_trigger), ''), nullif(btrim(p_prior_outcome), ''),
    nullif(btrim(p_relationship_source), ''),
    nullif(btrim(p_next_trigger), ''), v_actor, v_actor
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

revoke all on function public.create_gtm_contact_v2(
  text, text, text, text, text, text, text, text, text, text, boolean, uuid,
  text, text, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.create_gtm_contact_v2(
  text, text, text, text, text, text, text, text, text, text, boolean, uuid,
  text, text, text, text, text, text, text, text, text
) to authenticated, service_role;

-- Conversation logging V2 preserves multiple outcomes and both the historical
-- and current relationship trigger in the same atomic write.
create or replace function public.log_gtm_interaction_v2(
  p_contact_id uuid,
  p_interaction_type text,
  p_direction text,
  p_interaction_at timestamptz,
  p_subject text default null,
  p_summary text default null,
  p_organization_id uuid default null,
  p_opportunity_id uuid default null,
  p_next_action text default null,
  p_next_action_at timestamptz default null,
  p_outcomes text[] default '{}'::text[],
  p_next_trigger text default null
)
returns public.gtm_interactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_interaction public.gtm_interactions;
begin
  if v_actor is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;

  insert into public.gtm_interactions (
    contact_id, organization_id, opportunity_id, interaction_type,
    direction, subject, summary, interaction_at, outcomes, next_trigger,
    created_by
  ) values (
    p_contact_id, p_organization_id, p_opportunity_id, p_interaction_type,
    p_direction, nullif(btrim(p_subject), ''), nullif(btrim(p_summary), ''),
    p_interaction_at, coalesce(p_outcomes, '{}'::text[]),
    nullif(btrim(p_next_trigger), ''), v_actor
  ) returning * into v_interaction;

  update public.gtm_contacts contact set
    last_interaction_at = greatest(
      coalesce(contact.last_interaction_at, '-infinity'::timestamptz),
      p_interaction_at
    ),
    next_action = case
      when p_next_action_at is null and nullif(btrim(p_next_action), '') is null
        then contact.next_action
      else nullif(btrim(p_next_action), '')
    end,
    next_action_at = case
      when p_next_action_at is null and nullif(btrim(p_next_action), '') is null
        then contact.next_action_at
      else p_next_action_at
    end,
    next_trigger = coalesce(
      nullif(btrim(p_next_trigger), ''),
      contact.next_trigger
    ),
    updated_by = v_actor
  where contact.id = p_contact_id;

  if not found then
    raise exception 'GTM contact not found' using errcode = 'P0002';
  end if;

  return v_interaction;
end;
$$;

revoke all on function public.log_gtm_interaction_v2(
  uuid, text, text, timestamptz, text, text, uuid, uuid, text, timestamptz,
  text[], text
) from public, anon, authenticated, service_role;
grant execute on function public.log_gtm_interaction_v2(
  uuid, text, text, timestamptz, text, text, uuid, uuid, text, timestamptz,
  text[], text
) to authenticated, service_role;
