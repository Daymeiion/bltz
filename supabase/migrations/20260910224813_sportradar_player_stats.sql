-- Additive trial adapter. Existing scraper sources and organization stint stats
-- are unchanged. Private review data never enters public season rows.
begin;

alter table public.preview_lockers add column if not exists player_id uuid
  references public.players(id) on delete restrict;
create index if not exists preview_lockers_player_id_idx on public.preview_lockers(player_id);
grant select, update on public.preview_lockers to service_role;

create table public.player_external_ids (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete restrict,
  provider text not null, provider_player_id text not null,
  sport text not null default 'football', league text not null check (league in ('nfl','ncaafb')),
  status text not null default 'VERIFIED' check (status = 'VERIFIED'),
  verified_at timestamptz not null default now(),
  verified_by uuid references auth.users(id) on delete set null,
  match_method text not null default 'manual_review',
  match_confidence numeric check (match_confidence between 0 and 1),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(player_id, provider, league), unique(provider, league, provider_player_id)
);

create table public.player_stat_ingestions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete restrict,
  provider text not null default 'sportradar' check(provider = 'sportradar'),
  provider_player_id uuid not null, league text not null check(league in ('nfl','ncaafb')),
  status text not null check(status in ('MANUAL_REVIEW','IMPORTED','NO_DATA')),
  raw_profile jsonb not null, normalized jsonb not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  imported_at timestamptz, imported_by uuid references auth.users(id) on delete set null
);
create index player_stat_ingestions_cache_idx on public.player_stat_ingestions(player_id,league,provider_player_id,fetched_at desc);

create table public.provider_request_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'sportradar', endpoint text not null,
  access_level text not null check(access_level in ('trial','production')),
  player_id uuid not null references public.players(id) on delete restrict,
  provider_player_id uuid not null, requested_at timestamptz not null default now(),
  response_status integer, cache_hit boolean not null default false,
  duration_ms integer check(duration_ms >= 0), error_code text,
  completed_at timestamptz
);
create index provider_request_logs_quota_idx on public.provider_request_logs(provider, access_level, requested_at desc) where not cache_hit;
create index provider_request_logs_player_idx on public.provider_request_logs(player_id, requested_at desc);
create index provider_request_logs_pending_idx on public.provider_request_logs(provider_player_id, requested_at desc) where completed_at is null;
create index player_external_ids_verified_by_idx on public.player_external_ids(verified_by);
create index player_stat_ingestions_imported_by_idx on public.player_stat_ingestions(imported_by);

alter table public.player_external_ids enable row level security;
alter table public.player_stat_ingestions enable row level security;
alter table public.provider_request_logs enable row level security;
revoke all on public.player_external_ids, public.player_stat_ingestions, public.provider_request_logs from public, anon, authenticated;
grant all on public.player_external_ids, public.player_stat_ingestions, public.provider_request_logs to service_role;

-- Reserve quota BEFORE external IO. Serializes across serverless instances.
-- Unfinished reservations count against quota (fail closed after process death).
create function public.reserve_sportradar_request(p_player_id uuid, p_provider_id uuid,
  p_endpoint text, p_access text, p_budget integer default 20) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare request_id uuid;
begin
  perform pg_advisory_xact_lock(90210741);
  if p_budget is null or p_budget < 1 or p_budget > 1000 or p_access not in ('trial','production') then
    raise exception 'invalid_budget';
  end if;
  if (select count(*) from public.provider_request_logs where provider='sportradar'
      and access_level=p_access and not cache_hit) >= p_budget then
    raise exception 'trial_budget_exhausted';
  end if;
  if exists(select 1 from public.provider_request_logs where provider='sportradar' and not cache_hit
      and response_status=429 and requested_at > now()-interval '1 hour') then
    raise exception 'provider_cooldown';
  end if;
  if exists(select 1 from public.provider_request_logs where provider='sportradar' and not cache_hit
      and requested_at > now()-interval '1100 milliseconds') then
    raise exception 'request_throttled';
  end if;
  if exists(select 1 from public.provider_request_logs where provider='sportradar'
      and provider_player_id=p_provider_id and completed_at is null
      and requested_at > now()-interval '60 seconds') then
    raise exception 'request_in_progress';
  end if;
  insert into public.provider_request_logs(player_id,provider_player_id,endpoint,access_level)
    values(p_player_id,p_provider_id,p_endpoint,p_access) returning id into request_id;
  return request_id;
end $$;
revoke all on function public.reserve_sportradar_request(uuid,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_sportradar_request(uuid,uuid,text,text,integer) to service_role;

-- Import only the server-stored reviewed payload, never statistics posted by a
-- browser. Mapping, season replacement, preview link, and audit are one commit.
create function public.import_sportradar_stats(p_ingestion_id uuid, p_preview_id uuid,
  p_actor_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.player_stat_ingestions; existing_id text; linked_id uuid;
begin
  if (select auth.uid()) is null or p_actor_id <> (select auth.uid())
    or not (select public.is_internal_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into strict r from public.player_stat_ingestions where id=p_ingestion_id for update;
  perform pg_advisory_xact_lock(hashtextextended(r.player_id::text || r.league, 0));
  if r.status not in ('MANUAL_REVIEW','IMPORTED') then raise exception 'no_statistics'; end if;
  select player_id into linked_id from public.preview_lockers where id=p_preview_id for update;
  if not found then raise exception 'preview_not_found'; end if;
  if linked_id is not null and linked_id <> r.player_id then raise exception 'preview_identity_conflict'; end if;
  select provider_player_id into existing_id from public.player_external_ids
    where player_id=r.player_id and provider='sportradar' and league=r.league;
  if existing_id is not null and existing_id <> r.provider_player_id::text then raise exception 'mapping_conflict'; end if;
  insert into public.player_external_ids(player_id,provider,provider_player_id,league,verified_by)
    values(r.player_id,'sportradar',r.provider_player_id,r.league,p_actor_id)
    on conflict(player_id,provider,league) do nothing;
  -- Prevent replaying an older reviewed candidate over a more recent import.
  if exists(select 1 from public.player_stat_ingestions where player_id=r.player_id and league=r.league
      and status='IMPORTED' and fetched_at > r.fetched_at) then raise exception 'stale_review'; end if;
  if r.imported_at is null then
    delete from public.player_season_stats where player_id=r.player_id and source='sportradar_'||r.league;
    insert into public.player_season_stats(player_id,source,level,season,season_type,team,stats,last_synced_at)
      select r.player_id,'sportradar_'||r.league,case when r.league='nfl' then 'pro' else 'college' end,
        (s->>'year')::smallint,s->>'seasonType',string_agg(distinct s->>'team',', '),
        jsonb_build_object('version',1,'league',r.league,'seasons',jsonb_agg(s)),r.fetched_at
      from jsonb_array_elements(r.normalized->'seasons') s group by s->>'year',s->>'seasonType';
    update public.player_stat_ingestions set status='IMPORTED',imported_at=now(),imported_by=p_actor_id,updated_at=now() where id=r.id;
  end if;
  update public.preview_lockers set player_id=r.player_id,updated_at=now() where id=p_preview_id;
  insert into public.audit_logs(action,entity_type,entity_id,actor_user_id,new_values)
    values('sportradar.stats_import','player',r.player_id::text,p_actor_id,
      jsonb_build_object('ingestion_id',r.id,'preview_id',p_preview_id,'league',r.league));
  return r.player_id;
end $$;
revoke all on function public.import_sportradar_stats(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.import_sportradar_stats(uuid,uuid,uuid) to authenticated;

comment on table public.player_stat_ingestions is 'Admin-only review/cache. No provider calls on Locker reads. Never contains credentials.';
comment on table public.player_external_ids is 'Verified provider mappings to canonical players.id; no inferred account or ownership relationship.';
comment on column public.preview_lockers.player_id is 'Optional admin-reviewed link to the canonical Athlete Career ID used to render sourced structured statistics in this private preview.';
commit;
