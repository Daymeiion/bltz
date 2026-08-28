-- GTM Foundation V1 metric correction.
-- Archived contacts are excluded from the active GTM portfolio, so their
-- discovery records must not contribute to dashboard counts or analysis.

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
      where last_interaction_at >= v_since
        and pipeline_stage not in ('converted', 'not_now')
    ),
    'contactsNeedingFollowUp', (
      select count(*) from active_contacts
      where next_action_at <= now()
        and pipeline_stage not in ('converted', 'not_now')
    ),
    'discoveryConversations', (
      select count(distinct contact_id) from active_discovery
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
