-- =============================================================================
-- GTM relationship intelligence foundation.
--
-- public.players remains the canonical athlete table. public.organizations
-- remains the canonical BLTZ tenant/school-linked organization table.
-- gtm_organizations represents internal GTM account context for external
-- companies and may link to exactly one canonical organization. When linked,
-- canonical identity is authoritative and identity fields here stay null.
-- =============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.gtm_organizations (
  id uuid primary key default gen_random_uuid(),
  canonical_organization_id uuid unique
    references public.organizations(id) on delete restrict,
  name text,
  organization_type text,
  website text,
  linkedin_url text,
  sport text,
  conference text,
  division text,
  city text,
  state text,
  logo_url text,
  school_id uuid references public.schools(id) on delete set null,
  priority smallint check (priority is null or priority between 0 and 5),
  pipeline_stage text not null default 'unqualified'
    check (pipeline_stage in (
      'unqualified', 'identified', 'qualified', 'discovery', 'demo', 'pilot',
      'proposal', 'negotiation', 'won', 'lost'
    )),
  owner uuid references auth.users(id) on delete set null,
  archived boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gtm_organizations_identity_source_check check (
    (
      canonical_organization_id is not null
      and name is null
      and organization_type is null
      and website is null
      and linkedin_url is null
      and sport is null
      and conference is null
      and division is null
      and city is null
      and state is null
      and logo_url is null
      and school_id is null
    )
    or (
      canonical_organization_id is null
      and char_length(btrim(name)) between 1 and 200
      and char_length(btrim(organization_type)) between 1 and 80
    )
  ),
  constraint gtm_organizations_website_check check (
    website is null or website ~* '^https?://'
  ),
  constraint gtm_organizations_linkedin_url_check check (
    linkedin_url is null or linkedin_url ~* '^https://([a-z]+\.)?linkedin\.com/'
  )
);

comment on table public.gtm_organizations is
  'Internal GTM account context. canonical_organization_id links a BLTZ tenant; otherwise the row represents an external account.';
comment on column public.gtm_organizations.canonical_organization_id is
  'Unique link to canonical tenant identity. Linked rows must resolve name, organization type, and school from public.organizations.';

create unique index if not exists gtm_organizations_external_name_key
  on public.gtm_organizations (lower(btrim(name)))
  where canonical_organization_id is null and archived = false;
create unique index if not exists gtm_organizations_external_linkedin_key
  on public.gtm_organizations (lower(btrim(linkedin_url)))
  where canonical_organization_id is null and linkedin_url is not null;
create index if not exists gtm_organizations_school_id_idx
  on public.gtm_organizations (school_id)
  where school_id is not null;
create index if not exists gtm_organizations_owner_pipeline_idx
  on public.gtm_organizations (owner, pipeline_stage)
  where archived = false;

create table if not exists public.gtm_contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text check (first_name is null or char_length(btrim(first_name)) between 1 and 120),
  last_name text check (last_name is null or char_length(btrim(last_name)) between 1 and 120),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 240),
  linkedin_url text check (
    linkedin_url is null or linkedin_url ~* '^https://([a-z]+\.)?linkedin\.com/'
  ),
  email text check (email is null or char_length(btrim(email)) between 3 and 320),
  phone text check (phone is null or char_length(btrim(phone)) between 3 and 40),
  organization_id uuid references public.gtm_organizations(id) on delete set null,
  current_company text check (current_company is null or char_length(btrim(current_company)) <= 200),
  current_title text check (current_title is null or char_length(btrim(current_title)) <= 200),
  contact_type text not null default 'unclassified'
    check (contact_type in ('enterprise', 'athlete', 'multiplier', 'unclassified')),
  segment text check (segment is null or char_length(btrim(segment)) <= 120),
  sport text check (sport is null or char_length(btrim(sport)) <= 80),
  league_level text check (league_level is null or char_length(btrim(league_level)) <= 80),
  geography text check (geography is null or char_length(btrim(geography)) <= 160),
  relationship_strength smallint check (relationship_strength is null or relationship_strength between 0 and 5),
  network_leverage smallint check (network_leverage is null or network_leverage between 0 and 5),
  bltz_relevance smallint check (bltz_relevance is null or bltz_relevance between 0 and 5),
  buying_authority smallint check (buying_authority is null or buying_authority between 0 and 5),
  introduction_potential smallint check (introduction_potential is null or introduction_potential between 0 and 5),
  timing_score smallint check (timing_score is null or timing_score between 0 and 5),
  priority_score smallint check (priority_score is null or priority_score between 0 and 100),
  priority_tier text check (priority_tier is null or priority_tier in ('A', 'B', 'C', 'D')),
  priority_model text check (priority_model is null or priority_model = 'enterprise_v1'),
  pipeline_stage text not null default 'unqualified'
    check (pipeline_stage in (
      'unqualified', 'identified', 'qualified', 'discovery', 'demo', 'pilot',
      'proposal', 'negotiation', 'won', 'lost'
    )),
  source text check (source is null or char_length(btrim(source)) <= 80),
  source_record_id text check (source_record_id is null or char_length(btrim(source_record_id)) <= 255),
  linkedin_connected_on date,
  do_not_automate boolean not null default false,
  is_priority boolean not null default false,
  archived boolean not null default false,
  last_interaction_at timestamptz,
  next_action text check (next_action is null or char_length(btrim(next_action)) between 1 and 1000),
  next_action_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gtm_contacts_source_identity_check check (
    (source is null and source_record_id is null)
    or (source is not null and source_record_id is not null)
  ),
  constraint gtm_contacts_next_action_pair_check check (
    next_action_at is null or next_action is not null
  ),
  constraint gtm_contacts_enterprise_score_check check (
    (
      priority_model is null
      and priority_score is null
      and priority_tier is null
    )
    or (
      contact_type = 'enterprise'
      and priority_model = 'enterprise_v1'
      and priority_score is not null
      and priority_tier = case
        when priority_score >= 80 then 'A'
        when priority_score >= 60 then 'B'
        when priority_score >= 40 then 'C'
        else 'D'
      end
    )
  )
);

comment on table public.gtm_contacts is
  'Private founder relationship intelligence. Athlete identity is linked through gtm_contact_players and is never copied into this table.';
comment on column public.gtm_contacts.do_not_automate is
  'Hard safety signal for future workflows. No automated outreach is authorized by this foundation.';
comment on column public.gtm_contacts.priority_model is
  'Scoring provenance. enterprise_v1 is valid only for enterprise contacts; other contact types require a separately approved model.';

create unique index if not exists gtm_contacts_linkedin_url_key
  on public.gtm_contacts (lower(btrim(linkedin_url)))
  where linkedin_url is not null and archived = false;
create unique index if not exists gtm_contacts_source_record_key
  on public.gtm_contacts (source, source_record_id)
  where source_record_id is not null;
create index if not exists gtm_contacts_organization_id_idx
  on public.gtm_contacts (organization_id)
  where organization_id is not null;
create index if not exists gtm_contacts_pipeline_priority_idx
  on public.gtm_contacts (pipeline_stage, priority_tier, priority_score desc)
  where archived = false;
create index if not exists gtm_contacts_follow_up_idx
  on public.gtm_contacts (next_action_at, priority_score desc)
  where archived = false and next_action_at is not null;
create index if not exists gtm_contacts_type_segment_idx
  on public.gtm_contacts (contact_type, segment)
  where archived = false;

create table if not exists public.gtm_contact_players (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.gtm_contacts(id) on delete restrict,
  player_id uuid not null references public.players(id) on delete restrict,
  match_type text not null
    check (match_type in (
      'linkedin_url', 'stable_identifier', 'name_and_team',
      'name_and_college', 'name_only', 'manual'
    )),
  match_confidence numeric(5,4) not null check (match_confidence between 0 and 1),
  verified boolean not null default false,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint gtm_contact_players_contact_player_key unique (contact_id, player_id),
  constraint gtm_contact_players_verification_check check (
    (verified = false and verified_by is null and verified_at is null)
    or (verified = true and verified_by is not null and verified_at is not null)
  )
);

comment on table public.gtm_contact_players is
  'Conservative links to canonical public.players records. Name-only matches remain unverified until manual review.';

create index if not exists gtm_contact_players_player_id_idx
  on public.gtm_contact_players (player_id);
create index if not exists gtm_contact_players_review_idx
  on public.gtm_contact_players (verified, match_confidence, created_at desc);

create table if not exists public.gtm_opportunities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 240),
  organization_id uuid references public.gtm_organizations(id) on delete set null,
  primary_contact_id uuid references public.gtm_contacts(id) on delete set null,
  opportunity_type text not null
    check (opportunity_type in (
      'enterprise_pilot', 'enterprise_contract', 'locker_activation',
      'brand_partnership', 'media_partnership', 'investment',
      'strategic_partnership', 'introduction'
    )),
  stage text not null default 'identified'
    check (stage in (
      'identified', 'qualified', 'discovery', 'demo', 'pilot', 'proposal',
      'negotiation', 'won', 'lost'
    )),
  estimated_value numeric(14,2) check (estimated_value is null or estimated_value >= 0),
  probability smallint check (probability is null or probability between 0 and 100),
  next_step text check (next_step is null or char_length(btrim(next_step)) between 1 and 2000),
  next_step_at timestamptz,
  owner uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gtm_opportunities_next_step_pair_check check (
    next_step_at is null or next_step is not null
  )
);

create index if not exists gtm_opportunities_organization_id_idx
  on public.gtm_opportunities (organization_id)
  where organization_id is not null;
create index if not exists gtm_opportunities_primary_contact_id_idx
  on public.gtm_opportunities (primary_contact_id)
  where primary_contact_id is not null;
create index if not exists gtm_opportunities_owner_stage_idx
  on public.gtm_opportunities (owner, stage, next_step_at);

create table if not exists public.gtm_interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.gtm_contacts(id) on delete restrict,
  organization_id uuid references public.gtm_organizations(id) on delete set null,
  opportunity_id uuid references public.gtm_opportunities(id) on delete set null,
  interaction_type text not null
    check (interaction_type in (
      'linkedin', 'email', 'phone', 'video_call', 'meeting', 'event',
      'introduction', 'other'
    )),
  direction text not null check (direction in ('inbound', 'outbound', 'mutual')),
  subject text check (subject is null or char_length(btrim(subject)) <= 500),
  summary text check (summary is null or char_length(btrim(summary)) <= 10000),
  interaction_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint gtm_interactions_id_contact_key unique (id, contact_id)
);

create index if not exists gtm_interactions_contact_recent_idx
  on public.gtm_interactions (contact_id, interaction_at desc);
create index if not exists gtm_interactions_organization_recent_idx
  on public.gtm_interactions (organization_id, interaction_at desc)
  where organization_id is not null;
create index if not exists gtm_interactions_opportunity_recent_idx
  on public.gtm_interactions (opportunity_id, interaction_at desc)
  where opportunity_id is not null;
create index if not exists gtm_interactions_created_by_idx
  on public.gtm_interactions (created_by, created_at desc);

create table if not exists public.gtm_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.gtm_contacts(id) on delete restrict,
  note_type text not null
    check (note_type in (
      'general', 'call', 'meeting', 'linkedin', 'email', 'introduction',
      'research', 'personal_context', 'opportunity'
    )),
  body text not null check (char_length(btrim(body)) between 1 and 20000),
  interaction_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gtm_notes_interaction_contact_fkey
    foreign key (interaction_id, contact_id)
    references public.gtm_interactions(id, contact_id) on delete restrict
);

create index if not exists gtm_notes_contact_recent_idx
  on public.gtm_notes (contact_id, created_at desc);
create index if not exists gtm_notes_interaction_id_idx
  on public.gtm_notes (interaction_id)
  where interaction_id is not null;
create index if not exists gtm_notes_created_by_idx
  on public.gtm_notes (created_by, created_at desc);

create table if not exists public.gtm_relationships (
  id uuid primary key default gen_random_uuid(),
  source_contact_id uuid not null references public.gtm_contacts(id) on delete restrict,
  target_contact_id uuid not null references public.gtm_contacts(id) on delete restrict,
  relationship_type text not null
    check (relationship_type in (
      'knows', 'worked_with', 'teammate', 'former_teammate', 'school_alumni',
      'introduced_by', 'can_introduce', 'advisor', 'investor', 'agent',
      'client', 'partner', 'employee'
    )),
  relationship_strength smallint check (
    relationship_strength is null or relationship_strength between 0 and 5
  ),
  notes text check (notes is null or char_length(btrim(notes)) <= 10000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint gtm_relationships_distinct_contacts_check
    check (source_contact_id <> target_contact_id),
  constraint gtm_relationships_source_target_type_key
    unique (source_contact_id, target_contact_id, relationship_type)
);

comment on table public.gtm_relationships is
  'Directed relationship edges. Reverse meaning is explicit so future graph traversal does not infer symmetry.';

create index if not exists gtm_relationships_target_contact_id_idx
  on public.gtm_relationships (target_contact_id);
create index if not exists gtm_relationships_type_strength_idx
  on public.gtm_relationships (relationship_type, relationship_strength desc);

create table if not exists public.gtm_import_jobs (
  id uuid primary key default gen_random_uuid(),
  import_type text not null check (import_type in ('linkedin_connections', 'player_master')),
  filename text not null check (char_length(btrim(filename)) between 1 and 512),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  idempotency_key uuid not null unique,
  status text not null default 'uploaded'
    check (status in (
      'uploaded', 'mapping', 'validating', 'preview_ready', 'committing',
      'completed', 'completed_with_errors', 'failed', 'cancelled'
    )),
  field_mapping jsonb not null default '{}'::jsonb
    check (jsonb_typeof(field_mapping) = 'object'),
  preview_summary jsonb not null default '{}'::jsonb
    check (jsonb_typeof(preview_summary) = 'object'),
  rows_found integer not null default 0 check (rows_found >= 0),
  rows_created integer not null default 0 check (rows_created >= 0),
  rows_updated integer not null default 0 check (rows_updated >= 0),
  rows_duplicated integer not null default 0 check (rows_duplicated >= 0),
  rows_failed integer not null default 0 check (rows_failed >= 0),
  error_summary text check (error_summary is null or char_length(error_summary) <= 10000),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint gtm_import_jobs_row_counts_check check (
    rows_created + rows_updated + rows_duplicated + rows_failed <= rows_found
  ),
  constraint gtm_import_jobs_completion_check check (
    (
      status in ('completed', 'completed_with_errors', 'failed', 'cancelled')
      and completed_at is not null
    )
    or (
      status not in ('completed', 'completed_with_errors', 'failed', 'cancelled')
      and completed_at is null
    )
  )
);

comment on table public.gtm_import_jobs is
  'Persistent import mapping, preview totals, idempotency, and outcome history. Raw uploaded CSV rows are not retained here.';

create index if not exists gtm_import_jobs_uploaded_recent_idx
  on public.gtm_import_jobs (uploaded_by, created_at desc);
create index if not exists gtm_import_jobs_type_hash_idx
  on public.gtm_import_jobs (import_type, content_sha256, created_at desc);
create index if not exists gtm_import_jobs_active_idx
  on public.gtm_import_jobs (status, created_at)
  where status in ('uploaded', 'mapping', 'validating', 'preview_ready', 'committing');

create or replace function private.apply_gtm_enterprise_priority()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_score smallint;
begin
  if new.contact_type <> 'enterprise'
     or new.relationship_strength is null
     or new.bltz_relevance is null
     or new.buying_authority is null
     or new.network_leverage is null
     or new.timing_score is null then
    new.priority_score := null;
    new.priority_tier := null;
    new.priority_model := null;
    return new;
  end if;

  v_score := round((
    new.relationship_strength * 0.25
    + new.bltz_relevance * 0.25
    + new.buying_authority * 0.20
    + new.network_leverage * 0.15
    + new.timing_score * 0.15
  ) / 5.0 * 100)::smallint;

  new.priority_score := v_score;
  new.priority_tier := case
    when v_score >= 80 then 'A'
    when v_score >= 60 then 'B'
    when v_score >= 40 then 'C'
    else 'D'
  end;
  new.priority_model := 'enterprise_v1';
  return new;
end;
$$;

revoke all on function private.apply_gtm_enterprise_priority()
  from public, anon, authenticated, service_role;

create or replace trigger gtm_contacts_apply_enterprise_priority
  before insert or update of contact_type, relationship_strength, bltz_relevance,
    buying_authority, network_leverage, timing_score
  on public.gtm_contacts
  for each row execute function private.apply_gtm_enterprise_priority();

create or replace function private.protect_gtm_record_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'GTM record provenance is immutable'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_gtm_record_provenance()
  from public, anon, authenticated, service_role;

create or replace trigger gtm_contacts_protect_provenance
  before update on public.gtm_contacts
  for each row execute function private.protect_gtm_record_provenance();
create or replace trigger gtm_organizations_protect_provenance
  before update on public.gtm_organizations
  for each row execute function private.protect_gtm_record_provenance();
create or replace trigger gtm_opportunities_protect_provenance
  before update on public.gtm_opportunities
  for each row execute function private.protect_gtm_record_provenance();
create or replace trigger gtm_notes_protect_provenance
  before update on public.gtm_notes
  for each row execute function private.protect_gtm_record_provenance();

create or replace trigger gtm_contact_players_protect_provenance
  before update on public.gtm_contact_players
  for each row execute function private.protect_gtm_record_provenance();

create or replace function private.stamp_gtm_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is not null then
    new.updated_by := v_actor;
  end if;
  return new;
end;
$$;

revoke all on function private.stamp_gtm_updated_by()
  from public, anon, authenticated, service_role;

create or replace trigger gtm_contacts_stamp_updated_by
  before update on public.gtm_contacts
  for each row execute function private.stamp_gtm_updated_by();
create or replace trigger gtm_organizations_stamp_updated_by
  before update on public.gtm_organizations
  for each row execute function private.stamp_gtm_updated_by();
create or replace trigger gtm_opportunities_stamp_updated_by
  before update on public.gtm_opportunities
  for each row execute function private.stamp_gtm_updated_by();

create or replace function private.enforce_gtm_player_verification_actor()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if new.verified = false then
    new.verified_by := null;
    new.verified_at := null;
  elsif v_actor is not null and (
    tg_op = 'INSERT'
    or old.verified = false
  ) then
    new.verified_by := v_actor;
    new.verified_at := now();
  elsif tg_op = 'UPDATE' and old.verified = true and (
    new.verified_by is distinct from old.verified_by
    or new.verified_at is distinct from old.verified_at
  ) then
    raise exception 'GTM player verification provenance is immutable'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_gtm_player_verification_actor()
  from public, anon, authenticated, service_role;

create or replace trigger gtm_contact_players_enforce_verification_actor
  before insert or update on public.gtm_contact_players
  for each row execute function private.enforce_gtm_player_verification_actor();

create or replace trigger gtm_organizations_set_updated_at
  before update on public.gtm_organizations
  for each row execute function public.set_updated_at();
create or replace trigger gtm_contacts_set_updated_at
  before update on public.gtm_contacts
  for each row execute function public.set_updated_at();
create or replace trigger gtm_opportunities_set_updated_at
  before update on public.gtm_opportunities
  for each row execute function public.set_updated_at();
create or replace trigger gtm_notes_set_updated_at
  before update on public.gtm_notes
  for each row execute function public.set_updated_at();
create or replace trigger gtm_import_jobs_set_updated_at
  before update on public.gtm_import_jobs
  for each row execute function public.set_updated_at();

create or replace function private.protect_gtm_import_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.uploaded_by is distinct from old.uploaded_by
     or new.created_at is distinct from old.created_at
     or new.idempotency_key is distinct from old.idempotency_key
     or new.content_sha256 is distinct from old.content_sha256 then
    raise exception 'GTM import provenance is immutable'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_gtm_import_provenance()
  from public, anon, authenticated, service_role;

create or replace trigger gtm_import_jobs_protect_provenance
  before update on public.gtm_import_jobs
  for each row execute function private.protect_gtm_import_provenance();

create or replace function private.audit_gtm_contact_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_canonical_organization_id uuid;
  v_actor uuid := (select auth.uid());
begin
  if new.organization_id is not null then
    select account.canonical_organization_id
    into v_canonical_organization_id
    from public.gtm_organizations account
    where account.id = new.organization_id;
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    actor_role,
    actor_role_scope,
    risk_level,
    previous_values,
    new_values,
    request_metadata
  ) values (
    v_canonical_organization_id,
    v_actor,
    case when tg_op = 'INSERT' then 'gtm.contact.created' else 'gtm.contact.updated' end,
    'gtm_contact',
    new.id::text,
    case when v_actor is null then 'system' else 'super_admin' end,
    'platform',
    'medium',
    case when tg_op = 'UPDATE' then jsonb_build_object(
      'organization_id', old.organization_id,
      'contact_type', old.contact_type,
      'pipeline_stage', old.pipeline_stage,
      'priority_score', old.priority_score,
      'priority_tier', old.priority_tier,
      'do_not_automate', old.do_not_automate,
      'is_priority', old.is_priority,
      'archived', old.archived,
      'next_action', old.next_action,
      'next_action_at', old.next_action_at
    ) else null end,
    jsonb_build_object(
      'organization_id', new.organization_id,
      'contact_type', new.contact_type,
      'pipeline_stage', new.pipeline_stage,
      'priority_score', new.priority_score,
      'priority_tier', new.priority_tier,
      'do_not_automate', new.do_not_automate,
      'is_priority', new.is_priority,
      'archived', new.archived,
      'next_action', new.next_action,
      'next_action_at', new.next_action_at
    ),
    jsonb_build_object('source', 'gtm_contact_trigger')
  );

  return new;
end;
$$;

revoke all on function private.audit_gtm_contact_change()
  from public, anon, authenticated, service_role;

create or replace trigger gtm_contacts_write_audit
  after insert or update on public.gtm_contacts
  for each row execute function private.audit_gtm_contact_change();

create or replace function private.audit_gtm_opportunity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_canonical_organization_id uuid;
  v_actor uuid := (select auth.uid());
begin
  if new.organization_id is not null then
    select account.canonical_organization_id
    into v_canonical_organization_id
    from public.gtm_organizations account
    where account.id = new.organization_id;
  end if;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, actor_role,
    actor_role_scope, risk_level, previous_values, new_values, request_metadata
  ) values (
    v_canonical_organization_id,
    v_actor,
    case when tg_op = 'INSERT' then 'gtm.opportunity.created' else 'gtm.opportunity.updated' end,
    'gtm_opportunity',
    new.id::text,
    case when v_actor is null then 'system' else 'super_admin' end,
    'platform',
    'high',
    case when tg_op = 'UPDATE' then jsonb_build_object(
      'organization_id', old.organization_id,
      'primary_contact_id', old.primary_contact_id,
      'stage', old.stage,
      'estimated_value', old.estimated_value,
      'probability', old.probability,
      'next_step', old.next_step,
      'next_step_at', old.next_step_at,
      'owner', old.owner
    ) else null end,
    jsonb_build_object(
      'organization_id', new.organization_id,
      'primary_contact_id', new.primary_contact_id,
      'stage', new.stage,
      'estimated_value', new.estimated_value,
      'probability', new.probability,
      'next_step', new.next_step,
      'next_step_at', new.next_step_at,
      'owner', new.owner
    ),
    jsonb_build_object('source', 'gtm_opportunity_trigger')
  );

  return new;
end;
$$;

revoke all on function private.audit_gtm_opportunity_change()
  from public, anon, authenticated, service_role;

create or replace trigger gtm_opportunities_write_audit
  after insert or update on public.gtm_opportunities
  for each row execute function private.audit_gtm_opportunity_change();

alter table public.gtm_organizations enable row level security;
alter table public.gtm_contacts enable row level security;
alter table public.gtm_contact_players enable row level security;
alter table public.gtm_opportunities enable row level security;
alter table public.gtm_interactions enable row level security;
alter table public.gtm_notes enable row level security;
alter table public.gtm_relationships enable row level security;
alter table public.gtm_import_jobs enable row level security;

create policy "Internal admins read GTM organizations"
  on public.gtm_organizations for select to authenticated
  using ((select public.is_internal_admin()));
create policy "Internal admins create GTM organizations"
  on public.gtm_organizations for insert to authenticated
  with check ((select public.is_internal_admin()) and created_by = (select auth.uid()));
create policy "Internal admins update GTM organizations"
  on public.gtm_organizations for update to authenticated
  using ((select public.is_internal_admin()))
  with check ((select public.is_internal_admin()));

create policy "Internal admins read GTM contacts"
  on public.gtm_contacts for select to authenticated
  using ((select public.is_internal_admin()));
create policy "Internal admins create GTM contacts"
  on public.gtm_contacts for insert to authenticated
  with check ((select public.is_internal_admin()) and created_by = (select auth.uid()));
create policy "Internal admins update GTM contacts"
  on public.gtm_contacts for update to authenticated
  using ((select public.is_internal_admin()))
  with check ((select public.is_internal_admin()));

create policy "Internal admins read GTM player links"
  on public.gtm_contact_players for select to authenticated
  using ((select public.is_internal_admin()));
create policy "Internal admins create GTM player links"
  on public.gtm_contact_players for insert to authenticated
  with check ((select public.is_internal_admin()) and created_by = (select auth.uid()));
create policy "Internal admins update GTM player links"
  on public.gtm_contact_players for update to authenticated
  using ((select public.is_internal_admin()))
  with check ((select public.is_internal_admin()));

create policy "Internal admins read GTM opportunities"
  on public.gtm_opportunities for select to authenticated
  using ((select public.is_internal_admin()));
create policy "Internal admins create GTM opportunities"
  on public.gtm_opportunities for insert to authenticated
  with check ((select public.is_internal_admin()) and created_by = (select auth.uid()));
create policy "Internal admins update GTM opportunities"
  on public.gtm_opportunities for update to authenticated
  using ((select public.is_internal_admin()))
  with check ((select public.is_internal_admin()));

create policy "Internal admins read GTM interactions"
  on public.gtm_interactions for select to authenticated
  using ((select public.is_internal_admin()));
create policy "Internal admins create GTM interactions"
  on public.gtm_interactions for insert to authenticated
  with check ((select public.is_internal_admin()) and created_by = (select auth.uid()));

create policy "Internal admins read GTM notes"
  on public.gtm_notes for select to authenticated
  using ((select public.is_internal_admin()));
create policy "Internal admins create GTM notes"
  on public.gtm_notes for insert to authenticated
  with check ((select public.is_internal_admin()) and created_by = (select auth.uid()));
create policy "Internal admins update GTM notes"
  on public.gtm_notes for update to authenticated
  using ((select public.is_internal_admin()))
  with check ((select public.is_internal_admin()));

create policy "Internal admins read GTM relationships"
  on public.gtm_relationships for select to authenticated
  using ((select public.is_internal_admin()));
create policy "Internal admins create GTM relationships"
  on public.gtm_relationships for insert to authenticated
  with check ((select public.is_internal_admin()) and created_by = (select auth.uid()));

create policy "Internal admins read GTM import jobs"
  on public.gtm_import_jobs for select to authenticated
  using ((select public.is_internal_admin()));
create policy "Internal admins create GTM import jobs"
  on public.gtm_import_jobs for insert to authenticated
  with check ((select public.is_internal_admin()) and uploaded_by = (select auth.uid()));
create policy "Internal admins update GTM import jobs"
  on public.gtm_import_jobs for update to authenticated
  using ((select public.is_internal_admin()))
  with check ((select public.is_internal_admin()));

revoke all on table public.gtm_organizations, public.gtm_contacts,
  public.gtm_contact_players, public.gtm_opportunities, public.gtm_interactions,
  public.gtm_notes, public.gtm_relationships, public.gtm_import_jobs
  from public, anon, authenticated, service_role;

grant select, insert, update on table public.gtm_organizations,
  public.gtm_contacts, public.gtm_contact_players, public.gtm_opportunities,
  public.gtm_notes, public.gtm_import_jobs
  to authenticated, service_role;
grant select, insert on table public.gtm_interactions, public.gtm_relationships
  to authenticated, service_role;

create or replace function public.log_gtm_interaction(
  p_contact_id uuid,
  p_interaction_type text,
  p_direction text,
  p_interaction_at timestamptz,
  p_subject text default null,
  p_summary text default null,
  p_organization_id uuid default null,
  p_opportunity_id uuid default null,
  p_next_action text default null,
  p_next_action_at timestamptz default null
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

  if p_next_action_at is not null and nullif(btrim(p_next_action), '') is null then
    raise exception 'next action is required when a follow-up date is provided'
      using errcode = '23514';
  end if;

  insert into public.gtm_interactions (
    contact_id, organization_id, opportunity_id, interaction_type, direction,
    subject, summary, interaction_at, created_by
  ) values (
    p_contact_id, p_organization_id, p_opportunity_id, p_interaction_type,
    p_direction, nullif(btrim(p_subject), ''), nullif(btrim(p_summary), ''),
    p_interaction_at, v_actor
  )
  returning * into v_interaction;

  update public.gtm_contacts
  set
    last_interaction_at = greatest(
      coalesce(last_interaction_at, p_interaction_at),
      p_interaction_at
    ),
    next_action = case
      when nullif(btrim(p_next_action), '') is not null then btrim(p_next_action)
      else next_action
    end,
    next_action_at = case
      when nullif(btrim(p_next_action), '') is not null then p_next_action_at
      else next_action_at
    end,
    updated_by = v_actor
  where id = p_contact_id;

  if not found then
    raise exception 'GTM contact not found' using errcode = 'P0002';
  end if;

  return v_interaction;
end;
$$;

revoke all on function public.log_gtm_interaction(
  uuid, text, text, timestamptz, text, text, uuid, uuid, text, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.log_gtm_interaction(
  uuid, text, text, timestamptz, text, text, uuid, uuid, text, timestamptz
) to authenticated, service_role;

comment on function public.log_gtm_interaction(
  uuid, text, text, timestamptz, text, text, uuid, uuid, text, timestamptz
) is
  'Atomically logs an interaction and advances contact interaction/follow-up state for an active internal super admin.';
