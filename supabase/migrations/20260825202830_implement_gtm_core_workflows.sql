-- =============================================================================
-- GTM Foundation V1: core contact workflows.
--
-- This migration stays inside the existing private GTM boundary. It does not
-- alter public.players or introduce a second athlete, organization, or CRM
-- model. Existing RLS and audit triggers remain authoritative.
-- =============================================================================

-- Normalize the superseded foundation stages before adopting the coordinator-
-- approved contact pipeline. Historical meaning is preserved conservatively.
alter table public.gtm_contacts
  drop constraint if exists gtm_contacts_pipeline_stage_check;

update public.gtm_contacts
set pipeline_stage = case pipeline_stage
  when 'unqualified' then 'identified'
  when 'qualified' then 'engaged'
  when 'demo' then 'demo_candidate'
  when 'pilot' then 'pilot_candidate'
  when 'proposal' then 'pilot_candidate'
  when 'negotiation' then 'pilot_candidate'
  when 'won' then 'converted'
  when 'lost' then 'not_now'
  else pipeline_stage
end
where pipeline_stage in (
  'unqualified', 'qualified', 'demo', 'pilot', 'proposal', 'negotiation',
  'won', 'lost'
);

alter table public.gtm_contacts
  alter column pipeline_stage set default 'identified',
  add constraint gtm_contacts_pipeline_stage_check check (pipeline_stage in (
    'identified', 'connected', 'engaged', 'discovery', 'demo_candidate',
    'pilot_candidate', 'active_pilot', 'converted', 'nurture', 'not_now'
  ));

comment on column public.gtm_contacts.pipeline_stage is
  'Maintainable V1 relationship pipeline. Conversation outcomes remain independent and may be multi-valued.';

-- Follow-up intent belongs to the immutable interaction history while the
-- current action/date remain projected on the contact by the atomic logger.
alter table public.gtm_interactions
  add column if not exists follow_up_required boolean not null default false;

create index if not exists gtm_contacts_active_conversation_idx
  on public.gtm_contacts (last_interaction_at desc)
  where archived = false
    and pipeline_stage not in ('converted', 'not_now');

create index if not exists gtm_contacts_priority_active_idx
  on public.gtm_contacts (is_priority, priority_tier, priority_score desc)
  where archived = false;

-- At most one canonical Player association may be verified for a contact.
-- Potential/import matches can remain as review history.
with ranked_verified as (
  select id,
    row_number() over (
      partition by contact_id
      order by verified_at desc nulls last, created_at desc, id desc
    ) as rank
  from public.gtm_contact_players
  where verified = true
)
update public.gtm_contact_players link
set verified = false
from ranked_verified ranked
where link.id = ranked.id and ranked.rank > 1;

create unique index if not exists gtm_contact_players_one_verified_idx
  on public.gtm_contact_players (contact_id)
  where verified = true;

-- Versioned interaction logger keeps the prior V1/V2 contracts deployable.
create or replace function public.log_gtm_interaction_v3(
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
  p_next_trigger text default null,
  p_follow_up_required boolean default false
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

  if p_next_action_at is not null
     and nullif(btrim(p_next_action), '') is null then
    raise exception 'next action is required when a follow-up date is provided'
      using errcode = '23514';
  end if;

  if p_follow_up_required
     and nullif(btrim(p_next_action), '') is null then
    raise exception 'next action is required when follow-up is required'
      using errcode = '23514';
  end if;

  insert into public.gtm_interactions (
    contact_id, organization_id, opportunity_id, interaction_type, direction,
    subject, summary, interaction_at, outcomes, next_trigger,
    follow_up_required, created_by
  ) values (
    p_contact_id, p_organization_id, p_opportunity_id, p_interaction_type,
    p_direction, nullif(btrim(p_subject), ''), nullif(btrim(p_summary), ''),
    p_interaction_at, coalesce(p_outcomes, '{}'::text[]),
    nullif(btrim(p_next_trigger), ''), p_follow_up_required, v_actor
  ) returning * into v_interaction;

  update public.gtm_contacts contact
  set
    last_interaction_at = greatest(
      coalesce(contact.last_interaction_at, p_interaction_at),
      p_interaction_at
    ),
    next_action = case
      when nullif(btrim(p_next_action), '') is not null then btrim(p_next_action)
      else contact.next_action
    end,
    next_action_at = case
      when nullif(btrim(p_next_action), '') is not null then p_next_action_at
      else contact.next_action_at
    end,
    next_trigger = case
      when nullif(btrim(p_next_trigger), '') is not null then btrim(p_next_trigger)
      else contact.next_trigger
    end,
    updated_by = v_actor
  where contact.id = p_contact_id and contact.archived = false;

  if not found then
    raise exception 'Active GTM contact not found' using errcode = 'P0002';
  end if;

  return v_interaction;
end;
$$;

revoke all on function public.log_gtm_interaction_v3(
  uuid, text, text, timestamptz, text, text, uuid, uuid, text, timestamptz,
  text[], text, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.log_gtm_interaction_v3(
  uuid, text, text, timestamptz, text, text, uuid, uuid, text, timestamptz,
  text[], text, boolean
) to authenticated, service_role;

comment on function public.log_gtm_interaction_v3(
  uuid, text, text, timestamptz, text, text, uuid, uuid, text, timestamptz,
  text[], text, boolean
) is
  'Atomically logs a private GTM interaction, preserves multi-outcomes/follow-up intent, and updates current contact follow-up state.';

-- Repair the foundation child-audit dispatcher so table-specific fields are
-- never dereferenced through a generic trigger record for a different table.
-- Private note, summary, and discovery text remains excluded from audit data.
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
      'import_type', new.import_type, 'status', new.status,
      'rows_found', new.rows_found, 'rows_created', new.rows_created,
      'rows_updated', new.rows_updated, 'rows_duplicated', new.rows_duplicated,
      'rows_failed', new.rows_failed, 'potential_matches', new.potential_matches,
      'approved', new.approved_at is not null
    );
    if tg_op = 'UPDATE' then
      v_previous_values := jsonb_build_object(
        'status', old.status, 'rows_found', old.rows_found,
        'rows_created', old.rows_created, 'rows_updated', old.rows_updated,
        'rows_duplicated', old.rows_duplicated, 'rows_failed', old.rows_failed,
        'potential_matches', old.potential_matches,
        'approved', old.approved_at is not null
      );
    end if;
  elsif tg_table_name = 'gtm_notes' then
    v_contact_id := new.contact_id;
    v_entity_type := 'gtm_note';
    v_new_values := jsonb_build_object(
      'contact_id', new.contact_id, 'interaction_id', new.interaction_id,
      'note_type', new.note_type
    );
    if tg_op = 'UPDATE' then
      v_previous_values := jsonb_build_object(
        'contact_id', old.contact_id, 'interaction_id', old.interaction_id,
        'note_type', old.note_type
      );
    end if;
  elsif tg_table_name = 'gtm_interactions' then
    v_contact_id := new.contact_id;
    v_gtm_organization_id := new.organization_id;
    v_entity_type := 'gtm_interaction';
    v_new_values := jsonb_build_object(
      'contact_id', new.contact_id, 'organization_id', new.organization_id,
      'opportunity_id', new.opportunity_id,
      'interaction_type', new.interaction_type, 'direction', new.direction,
      'interaction_at', new.interaction_at,
      'follow_up_required', new.follow_up_required,
      'outcome_count', cardinality(new.outcomes)
    );
  elsif tg_table_name = 'gtm_contact_players' then
    v_contact_id := new.contact_id;
    v_entity_type := 'gtm_contact_player';
    v_new_values := jsonb_build_object(
      'contact_id', new.contact_id, 'player_id', new.player_id,
      'match_type', new.match_type, 'match_confidence', new.match_confidence,
      'verified', new.verified
    );
    if tg_op = 'UPDATE' then
      v_previous_values := jsonb_build_object(
        'player_id', old.player_id, 'match_type', old.match_type,
        'match_confidence', old.match_confidence, 'verified', old.verified
      );
    end if;
  elsif tg_table_name = 'gtm_customer_discovery' then
    v_contact_id := new.contact_id;
    v_gtm_organization_id := new.organization_id;
    v_entity_type := 'gtm_customer_discovery';
    v_new_values := jsonb_build_object(
      'contact_id', new.contact_id, 'interaction_id', new.interaction_id,
      'organization_id', new.organization_id, 'pain_level', new.pain_level,
      'would_use', new.would_use, 'would_pilot', new.would_pilot,
      'would_pay', new.would_pay,
      'introduction_offered', new.introduction_offered
    );
    if tg_op = 'UPDATE' then
      v_previous_values := jsonb_build_object(
        'interaction_id', old.interaction_id,
        'organization_id', old.organization_id, 'pain_level', old.pain_level,
        'would_use', old.would_use, 'would_pilot', old.would_pilot,
        'would_pay', old.would_pay,
        'introduction_offered', old.introduction_offered
      );
    end if;
  else
    raise exception 'Unsupported GTM audit source table: %', tg_table_name;
  end if;

  if v_contact_id is not null and v_gtm_organization_id is null then
    select contact.organization_id into v_gtm_organization_id
    from public.gtm_contacts contact where contact.id = v_contact_id;
  end if;

  if v_gtm_organization_id is not null then
    select account.canonical_organization_id into v_canonical_organization_id
    from public.gtm_organizations account where account.id = v_gtm_organization_id;
  end if;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id,
    actor_role, actor_role_scope, risk_level, previous_values, new_values,
    request_metadata
  ) values (
    v_canonical_organization_id, v_actor,
    'gtm.' || replace(v_entity_type, 'gtm_', '') || '.'
      || case when tg_op = 'INSERT' then 'created' else 'updated' end,
    v_entity_type, new.id::text,
    case when v_actor is null then 'system' else 'super_admin' end,
    case when v_actor is null then 'system' else 'platform' end,
    case when tg_table_name in ('gtm_customer_discovery', 'gtm_contact_players')
      then 'high' else 'medium' end,
    v_previous_values, v_new_values,
    jsonb_build_object('source', 'gtm_foundation_child_trigger')
  );

  return new;
end;
$$;

revoke all on function private.audit_gtm_foundation_child_change()
  from public, anon, authenticated, service_role;

-- Manual Player matching writes only the join record. public.players remains
-- canonical and is neither copied nor modified.
create or replace function public.match_gtm_contact_player(
  p_contact_id uuid,
  p_player_id uuid
)
returns public.gtm_contact_players
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_link public.gtm_contact_players;
begin
  if v_actor is null or not (select public.is_internal_admin()) then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.gtm_contacts contact
    where contact.id = p_contact_id
      and contact.contact_type = 'athlete'
      and contact.archived = false
  ) then
    raise exception 'Only an active athlete contact can be matched to a Player'
      using errcode = '23514';
  end if;

  if not exists (select 1 from public.players player where player.id = p_player_id) then
    raise exception 'Player not found' using errcode = 'P0002';
  end if;

  update public.gtm_contact_players
  set verified = false
  where contact_id = p_contact_id
    and player_id <> p_player_id
    and verified = true;

  select * into v_link
  from public.gtm_contact_players
  where contact_id = p_contact_id and player_id = p_player_id
  for update;

  if found then
    update public.gtm_contact_players
    set match_type = 'manual', match_confidence = 1, verified = true
    where id = v_link.id
    returning * into v_link;
  else
    insert into public.gtm_contact_players (
      contact_id, player_id, match_type, match_confidence, verified, created_by
    ) values (
      p_contact_id, p_player_id, 'manual', 1, true, v_actor
    ) returning * into v_link;
  end if;

  return v_link;
end;
$$;

revoke all on function public.match_gtm_contact_player(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.match_gtm_contact_player(uuid, uuid)
  to authenticated, service_role;

comment on function public.match_gtm_contact_player(uuid, uuid) is
  'Creates or verifies one manual contact-to-canonical-Player association without modifying Player Master data.';

-- Full contact editing is atomic and intentionally excludes provenance,
-- import identity, canonical organization linkage, archive state, and current
-- workflow fields, which have narrower dedicated mutations.
create or replace function public.update_gtm_contact_v1(
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
  p_relationship_source text
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

revoke all on function public.update_gtm_contact_v1(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  text, text, smallint, smallint, smallint, smallint, smallint, boolean,
  text, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.update_gtm_contact_v1(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  text, text, smallint, smallint, smallint, smallint, smallint, boolean,
  text, text, text, text, text, text, text, text
) to authenticated, service_role;

comment on function public.update_gtm_contact_v1(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  text, text, smallint, smallint, smallint, smallint, smallint, boolean,
  text, text, text, text, text, text, text, text
) is
  'Atomically edits an active private GTM contact and clears verified Player status when it is no longer classified as an athlete.';

-- Reliable V1 instrumentation is calculated from the authorized source rows,
-- not copied into a second analytics table. Text aggregations are deliberately
-- straightforward exact-value counts; AI summarization is out of scope.
create or replace function public.get_gtm_metrics_v1(
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

  with active_contacts as (
    select * from public.gtm_contacts where archived = false
  ),
  contact_type_counts as (
    select contact_type as key, count(*) as value
    from active_contacts group by contact_type
  ),
  segment_counts as (
    select segment as key, count(*) as value
    from active_contacts where segment is not null and btrim(segment) <> ''
    group by segment
  ),
  discovery_problems as (
    select btrim(problem_discussed) as key, count(*) as value
    from public.gtm_customer_discovery
    where problem_discussed is not null and created_at >= v_since
    group by btrim(problem_discussed)
    order by value desc, key
    limit 10
  ),
  discovery_use_cases as (
    select btrim(primary_bltz_use_case) as key, count(*) as value
    from public.gtm_customer_discovery
    where primary_bltz_use_case is not null and created_at >= v_since
    group by btrim(primary_bltz_use_case)
    order by value desc, key
    limit 10
  ),
  discovery_features as (
    select btrim(feature_requested) as key, count(*) as value
    from public.gtm_customer_discovery
    where feature_requested is not null and created_at >= v_since
    group by btrim(feature_requested)
    order by value desc, key
    limit 10
  ),
  discovery_objections as (
    select btrim(primary_objection) as key, count(*) as value
    from public.gtm_customer_discovery
    where primary_objection is not null and created_at >= v_since
    group by btrim(primary_objection)
    order by value desc, key
    limit 10
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'since', v_since,
    'totalContacts', (select count(*) from active_contacts),
    'contactTypeCounts', coalesce((
      select jsonb_object_agg(key, value) from contact_type_counts
    ), '{}'::jsonb),
    'segmentCounts', coalesce((
      select jsonb_object_agg(key, value) from segment_counts
    ), '{}'::jsonb),
    'tierAContacts', (select count(*) from active_contacts where priority_tier = 'A'),
    'tierBContacts', (select count(*) from active_contacts where priority_tier = 'B'),
    'priorityContacts', (select count(*) from active_contacts where is_priority = true),
    'enterpriseContacts', (select count(*) from active_contacts where contact_type = 'enterprise'),
    'athleteContacts', (select count(*) from active_contacts where contact_type = 'athlete'),
    'multiplierContacts', (select count(*) from active_contacts where contact_type = 'multiplier'),
    'activeConversations', (
      select count(*) from active_contacts
      where last_interaction_at >= v_since
        and pipeline_stage not in ('converted', 'not_now')
    ),
    'contactsNeedingFollowUp', (
      select count(*) from active_contacts
      where next_action_at <= now()
        and pipeline_stage not in ('converted', 'not_now')
    ),
    'discoveryConversations', (
      select count(distinct contact_id) from public.gtm_customer_discovery
      where created_at >= v_since
    ),
    'demoCandidates', (select count(*) from active_contacts where pipeline_stage = 'demo_candidate'),
    'pilotCandidates', (select count(*) from active_contacts where pipeline_stage = 'pilot_candidate'),
    'activePilots', (select count(*) from active_contacts where pipeline_stage = 'active_pilot'),
    'conversions', (select count(*) from active_contacts where pipeline_stage = 'converted'),
    'playerLinkedContacts', (
      select count(distinct link.contact_id)
      from public.gtm_contact_players link
      join active_contacts contact on contact.id = link.contact_id
      where link.verified = true
    ),
    'discoveryAnalysis', jsonb_build_object(
      'problems', coalesce((select jsonb_agg(jsonb_build_object('value', key, 'count', value) order by value desc, key) from discovery_problems), '[]'::jsonb),
      'useCases', coalesce((select jsonb_agg(jsonb_build_object('value', key, 'count', value) order by value desc, key) from discovery_use_cases), '[]'::jsonb),
      'features', coalesce((select jsonb_agg(jsonb_build_object('value', key, 'count', value) order by value desc, key) from discovery_features), '[]'::jsonb),
      'objections', coalesce((select jsonb_agg(jsonb_build_object('value', key, 'count', value) order by value desc, key) from discovery_objections), '[]'::jsonb),
      'pilotIntent', jsonb_build_object(
        'yes', (select count(*) from public.gtm_customer_discovery where created_at >= v_since and would_pilot is true),
        'no', (select count(*) from public.gtm_customer_discovery where created_at >= v_since and would_pilot is false),
        'unknown', (select count(*) from public.gtm_customer_discovery where created_at >= v_since and would_pilot is null)
      ),
      'willingnessToPay', jsonb_build_object(
        'yes', (select count(*) from public.gtm_customer_discovery where created_at >= v_since and would_pay is true),
        'no', (select count(*) from public.gtm_customer_discovery where created_at >= v_since and would_pay is false),
        'unknown', (select count(*) from public.gtm_customer_discovery where created_at >= v_since and would_pay is null)
      )
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_gtm_metrics_v1(timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.get_gtm_metrics_v1(timestamptz)
  to authenticated, service_role;

comment on function public.get_gtm_metrics_v1(timestamptz) is
  'RLS-protected GTM workflow and discovery aggregates with an explicit reporting window and no AI summarization.';
