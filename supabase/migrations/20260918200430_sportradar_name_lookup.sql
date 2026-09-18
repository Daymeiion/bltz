begin;
-- Discovery requests have no provider player ID until a candidate is found.
alter table public.provider_request_logs alter column provider_player_id drop not null;
create table public.sportradar_lookup_cache (
  endpoint text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.sportradar_lookup_cache enable row level security;
revoke all on public.sportradar_lookup_cache from public, anon, authenticated;
grant select, insert, update on public.sportradar_lookup_cache to service_role;
create or replace function public.reserve_sportradar_request(p_player_id uuid, p_provider_id uuid,
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
      and ((p_provider_id is not null and provider_player_id=p_provider_id)
        or (p_provider_id is null and provider_player_id is null and endpoint=p_endpoint)) and completed_at is null
      and requested_at > now()-interval '60 seconds') then
    raise exception 'request_in_progress';
  end if;
  insert into public.provider_request_logs(player_id,provider_player_id,endpoint,access_level)
    values(p_player_id,p_provider_id,p_endpoint,p_access) returning id into request_id;
  return request_id;
end $$;

commit;
