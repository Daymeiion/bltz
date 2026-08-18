-- =============================================================================
-- 20260817000000_beta_analytics_qa_hardening.sql
-- Phase One QA hardening: durable event idempotency, database-backed request
-- throttling, and service-only Beta Intelligence aggregates.
-- =============================================================================

-- Every intended event has one stable UUID. Historical server events created
-- before this contract use their internal UUID as the idempotency UUID.
update public.analytics_events
   set client_event_id = id
 where client_event_id is null;

alter table public.analytics_events
  alter column client_event_id set not null;

comment on column public.analytics_events.client_event_id is
  'Stable event UUID supplied by the producer and reused for delivery retries. The unique constraint makes duplicate delivery an accepted no-op in the server writer.';

-- Short-lived pseudonymous counters shared by all serverless instances. Keys
-- are HMAC hashes produced by the server; raw network addresses are not stored.
create table if not exists public.analytics_rate_limit_buckets (
  key_hash text not null
    check (key_hash ~ '^[a-f0-9]{64}$'),
  bucket_start timestamptz not null,
  request_count integer not null default 1
    check (request_count > 0),
  expires_at timestamptz not null,
  primary key (key_hash, bucket_start)
);

create index if not exists analytics_rate_limit_buckets_expiry_idx
  on public.analytics_rate_limit_buckets (expires_at);

alter table public.analytics_rate_limit_buckets enable row level security;
revoke all on table public.analytics_rate_limit_buckets from public, anon, authenticated;

create or replace function public.consume_analytics_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bucket_start timestamptz;
  v_count integer;
begin
  if p_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid rate-limit key';
  end if;
  if p_limit < 1 or p_limit > 10000 then
    raise exception 'invalid rate limit';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'invalid rate-limit window';
  end if;

  v_bucket_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds)
      * p_window_seconds
  );

  delete from public.analytics_rate_limit_buckets
   where key_hash = p_key_hash
     and expires_at < clock_timestamp();

  insert into public.analytics_rate_limit_buckets (
    key_hash,
    bucket_start,
    request_count,
    expires_at
  )
  values (
    p_key_hash,
    v_bucket_start,
    1,
    v_bucket_start + make_interval(secs => p_window_seconds * 2)
  )
  on conflict (key_hash, bucket_start) do update
    set request_count = least(
      public.analytics_rate_limit_buckets.request_count + 1,
      p_limit + 1
    )
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_analytics_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_analytics_rate_limit(text, integer, integer)
  to service_role;

comment on function public.consume_analytics_rate_limit(text, integer, integer) is
  'Atomically consumes one fixed-window analytics request allowance. Service-role only; callers pass HMAC hashes, never raw addresses.';

-- One aggregate payload supports the cohort overview, action percentages,
-- insight groupings, recent feedback, and athlete drill-down. The denominator
-- for every action percentage is the number of beta_participants remaining
-- after p_since/p_cohort/p_status/p_athlete_id filters are applied.
create or replace function public.get_beta_intelligence_dashboard(
  p_since timestamptz default null,
  p_cohort text default null,
  p_status text default null,
  p_athlete_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with filtered_participants as (
  select bp.*
  from public.beta_participants bp
  where (p_since is null or bp.invited_at >= p_since)
    and (p_cohort is null or bp.cohort = p_cohort)
    and (p_status is null or bp.status::text = p_status)
    and (p_athlete_id is null or bp.athlete_id = p_athlete_id)
),
event_rollups as (
  select
    ae.athlete_id,
    count(*) filter (where ae.event_name = 'locker_viewed')::integer as locker_views,
    count(*) filter (where ae.event_name = 'film_room_opened')::integer as film_room_opens,
    count(*) filter (where ae.event_name = 'photo_gallery_opened')::integer as photos_opens,
    count(*) filter (where ae.event_name = 'media_viewed')::integer as media_views,
    count(*) filter (where ae.event_name in ('profile_edit_completed', 'field_edited'))::integer as profile_edits,
    count(*) filter (where ae.event_name = 'correction_requested')::integer as career_corrections,
    count(*) filter (where ae.event_name in ('media_uploaded', 'media_submitted'))::integer as media_uploads,
    count(*) filter (where ae.event_name in ('locker_shared', 'share_link_copied'))::integer as shares,
    count(*) filter (where ae.event_name = 'social_link_clicked')::integer as social_link_clicks,
    min(ae.occurred_at) filter (where ae.event_name = 'locker_viewed') as locker_viewed_at,
    min(ae.occurred_at) filter (where ae.event_name in ('profile_edit_completed', 'field_edited')) as locker_edited_at,
    min(ae.occurred_at) filter (where ae.event_name = 'locker_shared') as locker_shared_at,
    max(ae.occurred_at) as last_activity_at,
    count(distinct (ae.occurred_at at time zone 'UTC')::date) > 1 as returned
  from public.analytics_events ae
  join filtered_participants fp on fp.athlete_id = ae.athlete_id
  group by ae.athlete_id
),
latest_feedback as (
  select distinct on (af.athlete_id) af.*
  from public.athlete_feedback af
  join filtered_participants fp on fp.athlete_id = af.athlete_id
  order by af.athlete_id, af.interview_date desc, af.created_at desc
),
insight_rollups as (
  select
    ai.athlete_id,
    jsonb_agg(
      jsonb_build_object(
        'id', ai.id,
        'category', ai.category,
        'description', ai.description,
        'severity', ai.severity,
        'status', ai.status
      )
      order by ai.created_at desc
    ) as insights
  from public.athlete_insights ai
  join filtered_participants fp on fp.athlete_id = ai.athlete_id
  group by ai.athlete_id
),
baseline_rollups as (
  select abs.athlete_id, max(abs.created_at) as baseline_captured_at
  from public.athlete_baseline_snapshots abs
  join filtered_participants fp on fp.athlete_id = abs.athlete_id
  group by abs.athlete_id
),
enriched as (
  select
    fp.*,
    p.full_name,
    lf.id as feedback_id,
    lf.created_at as feedback_created_at,
    lf.locker_value_rating,
    lf.career_accuracy_rating,
    lf.media_value_rating,
    lf.would_share,
    lf.willingness_to_pay,
    lf.payment_expectation,
    lf.digital_intelligence_interest,
    lf.analytics_interest,
    case
      when jsonb_typeof(lf.additional_responses -> 'organization_interest') = 'boolean'
        then (lf.additional_responses ->> 'organization_interest')::boolean
      else null
    end as organization_interest,
    lf.biggest_problem,
    lf.favorite_feature,
    lf.missing_feature,
    coalesce(er.locker_views, 0) as locker_views,
    coalesce(er.film_room_opens, 0) as film_room_opens,
    coalesce(er.photos_opens, 0) as photos_opens,
    coalesce(er.media_views, 0) as media_views,
    coalesce(er.profile_edits, 0) as profile_edits,
    coalesce(er.career_corrections, 0) as career_corrections,
    coalesce(er.media_uploads, 0) as media_uploads,
    coalesce(er.shares, 0) as shares,
    coalesce(er.social_link_clicks, 0) as social_link_clicks,
    er.locker_viewed_at,
    er.locker_edited_at,
    er.locker_shared_at,
    er.last_activity_at,
    coalesce(er.returned, false) as returned,
    coalesce(ir.insights, '[]'::jsonb) as insights,
    br.baseline_captured_at
  from filtered_participants fp
  join public.players p on p.id = fp.athlete_id
  left join event_rollups er on er.athlete_id = fp.athlete_id
  left join latest_feedback lf on lf.athlete_id = fp.athlete_id
  left join insight_rollups ir on ir.athlete_id = fp.athlete_id
  left join baseline_rollups br on br.athlete_id = fp.athlete_id
),
athlete_payloads as (
  select
    e.invited_at,
    jsonb_build_object(
      'id', e.athlete_id,
      'name', coalesce(e.full_name, 'Unknown athlete'),
      'cohort', e.cohort,
      'status', e.status,
      'invitedAt', e.invited_at,
      'joinedAt', e.joined_at,
      'lockerViewedAt', e.locker_viewed_at,
      'lockerClaimedAt', e.locker_claimed_at,
      'lockerEditedAt', e.locker_edited_at,
      'lockerSharedAt', e.locker_shared_at,
      'feedback', case when e.feedback_id is null then null else jsonb_build_object(
        'completedAt', e.feedback_created_at,
        'lockerValueRating', e.locker_value_rating,
        'careerAccuracyRating', e.career_accuracy_rating,
        'mediaValueRating', e.media_value_rating,
        'wouldShare', e.would_share,
        'willingnessToPay', e.willingness_to_pay,
        'paymentExpectation', e.payment_expectation,
        'digitalIntelligenceInterest', e.digital_intelligence_interest,
        'analyticsInterest', e.analytics_interest,
        'organizationInterest', e.organization_interest,
        'biggestProblem', e.biggest_problem,
        'favoriteFeature', e.favorite_feature,
        'missingFeature', e.missing_feature
      ) end,
      'activity', jsonb_build_object(
        'lockerViews', e.locker_views,
        'filmRoomOpens', e.film_room_opens,
        'photosOpens', e.photos_opens,
        'mediaViews', e.media_views,
        'profileEdits', e.profile_edits,
        'careerCorrections', e.career_corrections,
        'mediaUploads', e.media_uploads,
        'shares', e.shares,
        'socialLinkClicks', e.social_link_clicks,
        'returned', e.returned,
        'lastActivityAt', e.last_activity_at
      ),
      'insights', e.insights,
      'caseStudyCandidate', e.case_study_candidate,
      'caseStudyPermission', e.case_study_permission,
      'baselineCapturedAt', e.baseline_captured_at,
      'engagementLevel', case
        when e.locker_views + e.film_room_opens + e.photos_opens + e.media_views
          + e.profile_edits + e.career_corrections + e.media_uploads + e.shares
          + e.social_link_clicks >= 8 then 'high'
        when e.returned or e.locker_views + e.film_room_opens + e.photos_opens
          + e.media_views + e.profile_edits + e.career_corrections
          + e.media_uploads + e.shares + e.social_link_clicks >= 3 then 'medium'
        else 'low'
      end
    ) as payload
  from enriched e
)
select jsonb_build_object(
  'source', 'live',
  'generatedAt', now(),
  'summary', jsonb_build_object(
    'participantDenominator', (select count(*) from enriched),
    'athletesInvited', (select count(*) from enriched where invited_at is not null),
    'athletesJoined', (select count(*) from enriched where joined_at is not null),
    'lockersClaimed', (select count(*) from enriched where locker_claimed_at is not null),
    'activeAthletes', (select count(*) from enriched where status = 'active'),
    'feedbackCompleted', (select count(*) from enriched where feedback_id is not null),
    'caseStudyCandidates', (select count(*) from enriched where case_study_candidate),
    'actionPercentages', jsonb_build_object(
      'lockerViews', jsonb_build_object(
        'numerator', (select count(*) from enriched where locker_views > 0),
        'denominator', (select count(*) from enriched)
      ),
      'filmRoomOpens', jsonb_build_object(
        'numerator', (select count(*) from enriched where film_room_opens > 0),
        'denominator', (select count(*) from enriched)
      ),
      'photosOpens', jsonb_build_object(
        'numerator', (select count(*) from enriched where photos_opens > 0),
        'denominator', (select count(*) from enriched)
      ),
      'mediaViews', jsonb_build_object(
        'numerator', (select count(*) from enriched where media_views > 0),
        'denominator', (select count(*) from enriched)
      ),
      'profileEdits', jsonb_build_object(
        'numerator', (select count(*) from enriched where profile_edits > 0),
        'denominator', (select count(*) from enriched)
      ),
      'careerCorrections', jsonb_build_object(
        'numerator', (select count(*) from enriched where career_corrections > 0),
        'denominator', (select count(*) from enriched)
      ),
      'mediaUploads', jsonb_build_object(
        'numerator', (select count(*) from enriched where media_uploads > 0),
        'denominator', (select count(*) from enriched)
      ),
      'shares', jsonb_build_object(
        'numerator', (select count(*) from enriched where shares > 0),
        'denominator', (select count(*) from enriched)
      ),
      'socialLinkClicks', jsonb_build_object(
        'numerator', (select count(*) from enriched where social_link_clicks > 0),
        'denominator', (select count(*) from enriched)
      )
    )
  ),
  'athletes', coalesce(
    (select jsonb_agg(payload order by invited_at desc nulls last) from athlete_payloads),
    '[]'::jsonb
  ),
  'recentFeedback', coalesce(
    (
      select jsonb_agg(item order by completed_at desc)
      from (
        select
          e.feedback_created_at as completed_at,
          jsonb_build_object(
            'athleteId', e.athlete_id,
            'athleteName', coalesce(e.full_name, 'Unknown athlete'),
            'completedAt', e.feedback_created_at,
            'lockerValueRating', e.locker_value_rating,
            'biggestProblem', e.biggest_problem,
            'favoriteFeature', e.favorite_feature
          ) as item
        from enriched e
        where e.feedback_id is not null
        order by e.feedback_created_at desc
        limit 20
      ) recent
    ),
    '[]'::jsonb
  )
);
$$;

revoke all on function public.get_beta_intelligence_dashboard(
  timestamptz, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.get_beta_intelligence_dashboard(
  timestamptz, text, text, uuid
) to service_role;

comment on function public.get_beta_intelligence_dashboard(
  timestamptz, text, text, uuid
) is
  'Service-only Beta Dashboard aggregate. Action numerators count unique participant athletes with at least one action; denominator is the filtered beta participant count.';
