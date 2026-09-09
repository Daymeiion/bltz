-- Increase private preview discovery throughput for multi-Locker build days.
-- Only successful and currently active attempts consume the UTC-day allowance.
begin;

alter table private.preview_discovery_limits
  drop constraint preview_discovery_limits_starts_check,
  add constraint preview_discovery_limits_starts_check check (starts between 1 and 50);

create table private.preview_discovery_attempts (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id),
  identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  day date not null,
  started_at timestamptz not null,
  outcome text not null default 'pending' check (outcome in ('pending','success','failure'))
);
create index preview_discovery_attempts_daily_idx
  on private.preview_discovery_attempts (user_id, day, outcome, started_at);
create index preview_discovery_attempts_identity_idx
  on private.preview_discovery_attempts (user_id, identity_hash, started_at desc);
alter table private.preview_discovery_attempts enable row level security;
revoke all on private.preview_discovery_attempts from public, anon, authenticated, service_role;

drop function public.admit_preview_discovery();
drop function private.admit_preview_discovery();

create function private.admit_preview_discovery(p_identity_hash text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  request_id uuid := gen_random_uuid();
  now_at timestamptz := clock_timestamp();
  utc_day date := (clock_timestamp() at time zone 'UTC')::date;
  charged integer;
begin
  if actor is null or not public.is_internal_admin() then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_identity_hash is null or p_identity_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid identity hash' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  delete from private.preview_discovery_attempts
  where user_id = actor and day < utc_day - 14;

  if exists (
    select 1 from private.preview_discovery_attempts
    where user_id = actor and identity_hash = p_identity_hash
      and started_at >= now_at - interval '180 seconds'
  ) then return null; end if;

  select count(*) into charged
  from private.preview_discovery_attempts
  where user_id = actor and day = utc_day
    and (outcome = 'success' or (outcome = 'pending' and started_at >= now_at - interval '120 seconds'));
  if charged >= 50 then return null; end if;

  insert into private.preview_discovery_attempts(request_id,user_id,identity_hash,day,started_at)
  values(request_id,actor,p_identity_hash,utc_day,now_at);
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,request_metadata)
  values(actor,'preview.discovery.started','preview_discovery',request_id::text,'platform','medium','{"demo_only":true}');
  return request_id;
end; $$;
revoke all on function private.admit_preview_discovery(text) from public, anon, authenticated, service_role;
grant execute on function private.admit_preview_discovery(text) to authenticated;

create function public.admit_preview_discovery(p_identity_hash text) returns uuid
language sql security invoker set search_path = ''
begin atomic;
  select private.admit_preview_discovery(p_identity_hash);
end;
revoke all on function public.admit_preview_discovery(text) from public, anon, authenticated, service_role;
grant execute on function public.admit_preview_discovery(text) to authenticated;

create function private.finalize_preview_discovery(p_request_id uuid, p_succeeded boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); attempt_day date; changed boolean := false;
begin
  if actor is null then raise exception 'forbidden' using errcode='42501'; end if;
  update private.preview_discovery_attempts
  set outcome = case when p_succeeded then 'success' else 'failure' end
  where request_id = p_request_id and user_id = actor and outcome = 'pending'
  returning day into attempt_day;
  changed := found;
  if changed and p_succeeded then
    insert into private.preview_discovery_limits as limits(user_id,last_started,day,starts)
    values(actor,clock_timestamp(),attempt_day,1)
    on conflict(user_id) do update set
      last_started=excluded.last_started,
      day=excluded.day,
      starts=case when limits.day=excluded.day then least(limits.starts+1,50) else 1 end;
  end if;
  return changed;
end; $$;
revoke all on function private.finalize_preview_discovery(uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function private.finalize_preview_discovery(uuid,boolean) to authenticated;

create function public.finalize_preview_discovery(p_request_id uuid, p_succeeded boolean) returns boolean
language sql security invoker set search_path = ''
begin atomic;
  select private.finalize_preview_discovery(p_request_id,p_succeeded);
end;
revoke all on function public.finalize_preview_discovery(uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function public.finalize_preview_discovery(uuid,boolean) to authenticated;

commit;
