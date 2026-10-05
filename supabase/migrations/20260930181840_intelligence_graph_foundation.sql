-- Private, additive BLTZ Intelligence foundation. No legacy/cohort changes.
begin;

create table public.intelligence_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique check (length(btrim(source_key)) between 1 and 160),
  name text not null check (length(btrim(name)) between 1 and 240),
  provider text not null check (length(btrim(provider)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.intelligence_ingestions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.intelligence_sources(id) on delete restrict,
  namespace text not null check (length(btrim(namespace)) between 1 and 160),
  external_id text check (external_id is null or length(btrim(external_id)) between 1 and 400),
  locator text check (locator is null or length(locator) <= 4000),
  fetched_at timestamptz not null,
  normalizer_version text not null check (length(btrim(normalizer_version)) between 1 and 120),
  idempotency_key text not null unique check (length(btrim(idempotency_key)) between 1 and 240),
  raw_payload jsonb not null,
  normalized_candidate jsonb not null default '{}'::jsonb check (jsonb_typeof(normalized_candidate) = 'object'),
  normalization_status text not null default 'pending'
    check (normalization_status in ('pending', 'normalized', 'needs_review', 'ambiguous', 'rejected', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, id)
);

create table public.moments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 400),
  occurred_on date,
  occurred_year smallint check (occurred_year between 1800 and 2200),
  date_precision text not null default 'unknown' check (date_precision in ('day', 'year', 'unknown')),
  sport text check (sport is null or length(btrim(sport)) between 1 and 80),
  event_id uuid references public.sports_events(id) on delete restrict,
  status text not null default 'candidate' check (status in ('candidate', 'verified', 'rejected')),
  confidence numeric check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (date_precision = 'day' and occurred_on is not null and occurred_year is not null and occurred_year = extract(year from occurred_on))
    or (date_precision = 'year' and occurred_on is null and occurred_year is not null)
    or (date_precision = 'unknown' and occurred_on is null and occurred_year is null)
  )
);

create table public.moment_athletes (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete restrict,
  player_id uuid not null references public.players(id) on delete restrict,
  relationship_type text not null check (relationship_type in ('featured', 'participant', 'contributor')),
  status text not null default 'candidate' check (status in ('candidate', 'verified', 'rejected')),
  confidence numeric check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (moment_id, player_id, relationship_type),
  unique (moment_id, player_id, id)
);

create table public.intelligence_evidence (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete restrict,
  moment_id uuid references public.moments(id) on delete restrict,
  source_id uuid not null references public.intelligence_sources(id) on delete restrict,
  ingestion_id uuid,
  fact_type text not null check (length(btrim(fact_type)) between 1 and 120),
  statement text not null check (length(btrim(statement)) between 1 and 4000),
  structured_data jsonb not null default '{}'::jsonb check (jsonb_typeof(structured_data) = 'object'),
  status text not null default 'candidate' check (status in ('candidate', 'verified', 'rejected')),
  confidence numeric check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (source_id, ingestion_id) references public.intelligence_ingestions(source_id, id) on delete restrict
);

create index intelligence_ingestions_source_fetched_idx on public.intelligence_ingestions(source_id, fetched_at desc);
create index intelligence_ingestions_external_idx on public.intelligence_ingestions(source_id, namespace, external_id);
create index moments_event_idx on public.moments(event_id) where event_id is not null;
create index moment_athletes_player_idx on public.moment_athletes(player_id, status, moment_id);
create index intelligence_evidence_player_idx on public.intelligence_evidence(player_id, status);
create index intelligence_evidence_moment_idx on public.intelligence_evidence(moment_id) where moment_id is not null;
create index intelligence_evidence_ingestion_idx on public.intelligence_evidence(source_id, ingestion_id);

-- Source-backed Moment evidence must refer to an explicit athlete association.
-- Write the Moment and association before writing its supporting evidence.
create function private.intelligence_check_evidence_athlete() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.moment_id is not null and not exists (
    select 1 from public.moment_athletes ma
    where ma.moment_id = new.moment_id and ma.player_id = new.player_id
  ) then
    raise exception 'evidence requires explicit moment athlete association' using errcode = '23503';
  end if;
  return new;
end $$;
revoke all on function private.intelligence_check_evidence_athlete() from public, anon, authenticated;
grant execute on function private.intelligence_check_evidence_athlete() to service_role;
create trigger intelligence_evidence_check_athlete before insert or update on public.intelligence_evidence
  for each row execute function private.intelligence_check_evidence_athlete();

create function private.intelligence_preserve_association() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if row(new.moment_id,new.player_id) is distinct from row(old.moment_id,old.player_id) then
    raise exception 'moment athlete identity is immutable' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function private.intelligence_preserve_association() from public, anon, authenticated;
grant execute on function private.intelligence_preserve_association() to service_role;
create trigger moment_athletes_preserve_identity before update on public.moment_athletes
  for each row execute function private.intelligence_preserve_association();

create function private.intelligence_preserve_ingestion() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if row(new.source_id,new.namespace,new.external_id,new.locator,new.fetched_at,new.normalizer_version,new.idempotency_key,new.raw_payload)
    is distinct from row(old.source_id,old.namespace,old.external_id,old.locator,old.fetched_at,old.normalizer_version,old.idempotency_key,old.raw_payload) then
    raise exception 'ingestion provenance is immutable' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function private.intelligence_preserve_ingestion() from public, anon, authenticated;
grant execute on function private.intelligence_preserve_ingestion() to service_role;
create trigger intelligence_ingestions_preserve_provenance before update on public.intelligence_ingestions
  for each row execute function private.intelligence_preserve_ingestion();

create function private.intelligence_touch_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke all on function private.intelligence_touch_updated_at() from public, anon, authenticated;
grant execute on function private.intelligence_touch_updated_at() to service_role;

do $$ declare relation_name text; begin
  foreach relation_name in array array['intelligence_sources','intelligence_ingestions','moments','moment_athletes','intelligence_evidence'] loop
    execute format('alter table public.%I enable row level security', relation_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', relation_name);
    execute format('grant select, insert, update on table public.%I to service_role', relation_name);
    execute format('create trigger %I before update on public.%I for each row execute function private.intelligence_touch_updated_at()', relation_name || '_updated_at', relation_name);
  end loop;
end $$;

comment on table public.intelligence_ingestions is 'Private raw evidence and normalization candidates. External IDs here never establish canonical identity; player_external_ids remains the verified athlete mapping authority.';
comment on table public.intelligence_evidence is 'Sourced athlete assertions, optionally supporting a Moment. Confidence is not verification. Structured performance/award facts avoid premature competing schemas.';
comment on table public.moment_athletes is 'Explicit sports-Moment relationships; no inferred ownership, rights or economic entitlement.';
commit;
