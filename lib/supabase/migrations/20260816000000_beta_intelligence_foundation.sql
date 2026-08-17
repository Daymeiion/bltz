-- =============================================================================
-- 20260816000000_beta_intelligence_foundation.sql
-- Minimal data foundation for the controlled athlete beta.
--
-- `players` remains the canonical athlete table. These records are internal
-- operational data: browsers do not insert analytics directly, and only the
-- existing global admin role may read or mutate beta-intelligence records.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Keep the current admin model isolated behind one helper so a future platform
-- role migration can replace the implementation without rewriting every policy.
create or replace function public.is_internal_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

revoke all on function public.is_internal_admin() from public;
grant execute on function public.is_internal_admin() to authenticated;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid unique,
  event_name text not null
    check (char_length(event_name) between 1 and 80)
    check (event_name ~ '^[a-z][a-z0-9_]*$'),
  user_id uuid references auth.users(id) on delete set null,
  athlete_id uuid references public.players(id) on delete set null,
  session_id uuid,
  source text not null
    check (char_length(source) between 1 and 64)
    check (source ~ '^[a-z][a-z0-9_]*$'),
  page text
    check (page is null or char_length(page) <= 512),
  properties jsonb not null default '{}'::jsonb
    check (jsonb_typeof(properties) = 'object')
    check (octet_length(properties::text) <= 8192),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.analytics_events is
  'Canonical beta product events. Inserts go through the server-only analytics service; raw rows are admin-only.';
comment on column public.analytics_events.athlete_id is
  'References the current canonical athlete record, public.players. Named athlete_id to keep the product contract stable.';

create index if not exists analytics_events_event_created_idx
  on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_athlete_created_idx
  on public.analytics_events (athlete_id, created_at desc)
  where athlete_id is not null;
create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc)
  where user_id is not null;
create index if not exists analytics_events_created_idx
  on public.analytics_events (created_at desc);
create index if not exists analytics_events_session_recent_idx
  on public.analytics_events (session_id, created_at desc)
  where session_id is not null;

create table if not exists public.beta_participants (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.players(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  cohort text not null check (char_length(cohort) between 1 and 80),
  invite_source text check (invite_source is null or char_length(invite_source) <= 120),
  invited_at timestamptz,
  joined_at timestamptz,
  locker_claimed_at timestamptz,
  feedback_completed_at timestamptz,
  case_study_candidate boolean not null default false,
  case_study_permission text not null default 'not_requested'
    check (case_study_permission in ('not_requested', 'pending', 'granted', 'declined', 'revoked')),
  status text not null default 'invited'
    check (status in ('invited', 'active', 'completed', 'withdrawn')),
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 10000),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);

create unique index if not exists beta_participants_athlete_key
  on public.beta_participants (athlete_id);
create index if not exists beta_participants_status_cohort_idx
  on public.beta_participants (status, cohort);
create index if not exists beta_participants_case_study_idx
  on public.beta_participants (created_at desc)
  where case_study_candidate = true;

create table if not exists public.athlete_feedback (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.players(id) on delete restrict,
  participant_id uuid,
  interview_date date not null default current_date,
  interviewer_id uuid references auth.users(id) on delete set null,
  overall_rating smallint check (overall_rating between 1 and 5),
  locker_value_rating smallint check (locker_value_rating between 1 and 5),
  career_accuracy_rating smallint check (career_accuracy_rating between 1 and 5),
  media_value_rating smallint check (media_value_rating between 1 and 5),
  would_share boolean,
  willingness_to_pay boolean,
  payment_expectation text check (payment_expectation is null or char_length(payment_expectation) <= 500),
  preferred_audience text check (preferred_audience is null or char_length(preferred_audience) <= 500),
  biggest_problem text,
  favorite_feature text,
  missing_feature text,
  missing_career_content text,
  missing_media text,
  monetization_interest boolean,
  analytics_interest boolean,
  digital_intelligence_interest boolean,
  testimonial_quote text,
  raw_notes text,
  follow_up_required boolean not null default false,
  additional_responses jsonb not null default '{}'::jsonb
    check (jsonb_typeof(additional_responses) = 'object')
    check (octet_length(additional_responses::text) <= 32768),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (participant_id, athlete_id)
    references public.beta_participants(id, athlete_id) on delete restrict
);

create index if not exists athlete_feedback_athlete_interview_idx
  on public.athlete_feedback (athlete_id, interview_date desc);
create index if not exists athlete_feedback_follow_up_idx
  on public.athlete_feedback (interview_date desc)
  where follow_up_required = true;

create table if not exists public.athlete_insights (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.players(id) on delete restrict,
  category text not null
    check (char_length(category) between 1 and 80)
    check (category ~ '^[a-z][a-z0-9_]*$'),
  description text not null check (char_length(description) between 1 and 10000),
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  source text not null check (char_length(source) between 1 and 120),
  status text not null default 'open'
    check (status in ('open', 'monitoring', 'resolved', 'dismissed')),
  evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence) = 'object')
    check (octet_length(evidence::text) <= 32768),
  created_by uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((status = 'resolved') = (resolved_at is not null))
);

create index if not exists athlete_insights_athlete_status_idx
  on public.athlete_insights (athlete_id, status, created_at desc);
create index if not exists athlete_insights_category_idx
  on public.athlete_insights (category, created_at desc);

create table if not exists public.athlete_baseline_snapshots (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.players(id) on delete restrict,
  participant_id uuid,
  schema_version smallint not null default 1 check (schema_version > 0),
  snapshot jsonb not null
    check (jsonb_typeof(snapshot) = 'object')
    check (octet_length(snapshot::text) <= 65536),
  captured_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (participant_id, athlete_id)
    references public.beta_participants(id, athlete_id) on delete restrict
);

comment on column public.athlete_baseline_snapshots.snapshot is
  'Versioned observed facts only. V1 keys may include locker_state, profile_completeness, media_count, known_sources, and feedback_summary; do not store invented SEO scores.';

create index if not exists athlete_baselines_athlete_created_idx
  on public.athlete_baseline_snapshots (athlete_id, created_at desc);

drop trigger if exists beta_participants_set_updated_at on public.beta_participants;
create trigger beta_participants_set_updated_at
  before update on public.beta_participants
  for each row execute function public.set_updated_at_now();

drop trigger if exists athlete_feedback_set_updated_at on public.athlete_feedback;
create trigger athlete_feedback_set_updated_at
  before update on public.athlete_feedback
  for each row execute function public.set_updated_at_now();

drop trigger if exists athlete_insights_set_updated_at on public.athlete_insights;
create trigger athlete_insights_set_updated_at
  before update on public.athlete_insights
  for each row execute function public.set_updated_at_now();

alter table public.analytics_events enable row level security;
alter table public.beta_participants enable row level security;
alter table public.athlete_feedback enable row level security;
alter table public.athlete_insights enable row level security;
alter table public.athlete_baseline_snapshots enable row level security;

-- Analytics has no INSERT/UPDATE/DELETE policy. Even authenticated browsers
-- must use the validated server endpoint; service_role bypasses RLS there.
drop policy if exists "Internal admins can read analytics events" on public.analytics_events;
create policy "Internal admins can read analytics events"
  on public.analytics_events for select
  using (public.is_internal_admin());

drop policy if exists "Internal admins manage beta participants" on public.beta_participants;
create policy "Internal admins manage beta participants"
  on public.beta_participants for all
  using (public.is_internal_admin())
  with check (public.is_internal_admin());

drop policy if exists "Internal admins manage athlete feedback" on public.athlete_feedback;
create policy "Internal admins manage athlete feedback"
  on public.athlete_feedback for all
  using (public.is_internal_admin())
  with check (public.is_internal_admin());

drop policy if exists "Internal admins manage athlete insights" on public.athlete_insights;
create policy "Internal admins manage athlete insights"
  on public.athlete_insights for all
  using (public.is_internal_admin())
  with check (public.is_internal_admin());

drop policy if exists "Internal admins manage athlete baselines" on public.athlete_baseline_snapshots;
create policy "Internal admins manage athlete baselines"
  on public.athlete_baseline_snapshots for all
  using (public.is_internal_admin())
  with check (public.is_internal_admin());
