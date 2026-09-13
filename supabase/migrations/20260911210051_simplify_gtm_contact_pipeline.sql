-- Simplify conversation status without treating closure as conversion.
-- Existing contact audit trigger preserves old/new stages, including archived rows.
alter table public.gtm_contacts drop constraint gtm_contacts_pipeline_stage_check;
update public.gtm_contacts set pipeline_stage = case pipeline_stage
 when 'connected' then 'contacted'
 when 'engaged' then 'in_conversation'
 when 'discovery' then 'in_conversation'
 when 'demo_candidate' then 'in_conversation'
 when 'pilot_candidate' then 'in_conversation'
 when 'active_pilot' then 'in_conversation'
 when 'nurture' then 'follow_up_later'
 when 'not_now' then 'follow_up_later'
 when 'converted' then 'closed'
 else pipeline_stage end
where pipeline_stage <> 'identified';
alter table public.gtm_contacts add constraint gtm_contacts_pipeline_stage_check
 check (pipeline_stage in ('identified','contacted','in_conversation','follow_up_later','closed'));
comment on column public.gtm_contacts.pipeline_stage is
 'Conversation status only. Closed does not imply claim, verified ownership, payment, or conversion.';

-- Clear only untouched classifier defaults. Preserve reviewed scores and explanation history.
update public.gtm_contacts set relationship_strength = null
where contact_type = 'enterprise' and relationship_strength = 2
 and classification_status = 'auto_classified'
 and priority_score_explanation->'inferredFields' ? 'relationshipStrength'
 and not ('relationship_strength' = any(coalesce(manual_field_locks, '{}'::text[])));

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
  active_discovery as (
    select discovery.*
    from public.gtm_customer_discovery discovery
    join active_contacts contact on contact.id = discovery.contact_id
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
    from active_discovery
    where problem_discussed is not null and created_at >= v_since
    group by btrim(problem_discussed)
    order by value desc, key
    limit 10
  ),
  discovery_use_cases as (
    select btrim(primary_bltz_use_case) as key, count(*) as value
    from active_discovery
    where primary_bltz_use_case is not null and created_at >= v_since
    group by btrim(primary_bltz_use_case)
    order by value desc, key
    limit 10
  ),
  discovery_features as (
    select btrim(feature_requested) as key, count(*) as value
    from active_discovery
    where feature_requested is not null and created_at >= v_since
    group by btrim(feature_requested)
    order by value desc, key
    limit 10
  ),
  discovery_objections as (
    select btrim(primary_objection) as key, count(*) as value
    from active_discovery
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
      where pipeline_stage = 'in_conversation'
    ),
    'contactsNeedingFollowUp', (
      select count(*) from active_contacts
      where next_action_at <= now()
        and pipeline_stage <> 'closed'
    ),
    'discoveryConversations', (
      select count(distinct contact_id) from active_discovery
      where created_at >= v_since
    ),
    'stageCounts', (select jsonb_object_agg(stage, (select count(*) from active_contacts where pipeline_stage = stage)) from unnest(array['identified','contacted','in_conversation','follow_up_later','closed']) stage),
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
        'yes', (select count(*) from active_discovery where created_at >= v_since and would_pilot is true),
        'no', (select count(*) from active_discovery where created_at >= v_since and would_pilot is false),
        'unknown', (select count(*) from active_discovery where created_at >= v_since and would_pilot is null)
      ),
      'willingnessToPay', jsonb_build_object(
        'yes', (select count(*) from active_discovery where created_at >= v_since and would_pay is true),
        'no', (select count(*) from active_discovery where created_at >= v_since and would_pay is false),
        'unknown', (select count(*) from active_discovery where created_at >= v_since and would_pay is null)
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
  'RLS-protected active-contact GTM workflow and discovery aggregates with an explicit reporting window and no AI summarization.';

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
      where contact.archived = false and contact.pipeline_stage = 'in_conversation'
    ),
    'overdueNextActions', count(*) filter (
      where contact.archived = false
        and contact.next_action_at < now()
        and contact.pipeline_stage <> 'closed'
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
