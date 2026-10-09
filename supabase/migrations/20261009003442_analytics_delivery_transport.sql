-- Bounded development analytics exception. No historical backfill or production activation.
-- All functions use invoker security with explicit service-only privileges.
create table public.analytics_delivery_batches (
  id uuid primary key default gen_random_uuid(),
  environment text not null check(environment = 'development'),
  state text not null default 'pending' check(state in ('pending','published','processing','retry','acknowledged','quarantined','dead_letter')),
  event_count integer not null check(event_count between 1 and 100),
  byte_count integer not null check(byte_count between 1 and 262144),
  publish_attempts integer not null default 0 check(publish_attempts between 0 and 5),
  worker_attempts integer not null default 0 check(worker_attempts between 0 and 5),
  publish_lease_token uuid, publish_lease_until timestamptz,
  worker_lease_token uuid, worker_lease_until timestamptz,
  next_attempt_at timestamptz not null default now(),
  message_id text check(message_id is null or length(message_id) <= 256),
  last_error_code text check(last_error_code is null or last_error_code ~ '^[a-z0-9_]{1,80}$'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  acknowledged_at timestamptz
);
create table public.analytics_delivery_outbox (
  environment text not null check(environment = 'development'), event_id uuid not null,
  analytics_event_id uuid not null references public.analytics_events(id) on delete restrict,
  envelope jsonb not null check(jsonb_typeof(envelope)='object' and octet_length(envelope::text)<=16384),
  payload_hash text not null check(payload_hash ~ '^[a-f0-9]{32}$'),
  batch_id uuid references public.analytics_delivery_batches(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  primary key(environment,event_id), unique(analytics_event_id),
  check((envelope->>'event_id'=event_id::text) is true), check((envelope->>'environment'=environment) is true),
  check((envelope->>'schema_version'='1') is true),
  check(payload_hash=md5(envelope::text))
);
create index analytics_delivery_outbox_pending on public.analytics_delivery_outbox(environment,accepted_at,event_id) where batch_id is null;
create index analytics_delivery_outbox_batch on public.analytics_delivery_outbox(batch_id,event_id);
create index analytics_delivery_batches_due on public.analytics_delivery_batches(environment,state,next_attempt_at);
alter table public.analytics_delivery_outbox enable row level security;
alter table public.analytics_delivery_batches enable row level security;
revoke all on public.analytics_delivery_outbox,public.analytics_delivery_batches from public,anon,authenticated,service_role;
grant select,insert,update on public.analytics_delivery_outbox,public.analytics_delivery_batches to service_role;

create function public.accept_analytics_delivery_event(p_event jsonb,p_envelope jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_duplicate boolean:=false; v_envelope jsonb; v_existing public.analytics_events%rowtype;
begin
  if p_envelope->>'environment' is distinct from 'development' or p_envelope->>'schema_version' is distinct from '1'
     or p_envelope->>'event_id' is distinct from p_event->>'client_event_id'
     or p_envelope->>'subject_player_id' is distinct from p_event->>'athlete_id'
     or p_envelope->>'session_id' is distinct from p_event->>'session_id' then raise exception 'invalid delivery envelope'; end if;
  v_envelope:=p_envelope || jsonb_build_object('received_at',clock_timestamp());
  insert into public.analytics_events(client_event_id,event_name,user_id,athlete_id,session_id,source,page,properties,occurred_at)
    values((p_event->>'client_event_id')::uuid,p_event->>'event_name',(p_event->>'user_id')::uuid,(p_event->>'athlete_id')::uuid,
      (p_event->>'session_id')::uuid,p_event->>'source',p_event->>'page',coalesce(p_event->'properties','{}'::jsonb),(p_event->>'occurred_at')::timestamptz)
    on conflict(client_event_id) do nothing returning id into v_id;
  if v_id is null then
    v_duplicate:=true;
    select * into strict v_existing from public.analytics_events where client_event_id=(p_event->>'client_event_id')::uuid;
    if v_existing.event_name is distinct from p_event->>'event_name' or v_existing.athlete_id is distinct from (p_event->>'athlete_id')::uuid
      or v_existing.user_id is distinct from (p_event->>'user_id')::uuid or v_existing.session_id is distinct from (p_event->>'session_id')::uuid
      or v_existing.source is distinct from p_event->>'source' or v_existing.page is distinct from p_event->>'page'
      or v_existing.properties is distinct from coalesce(p_event->'properties','{}'::jsonb)
      or v_existing.occurred_at is distinct from (p_event->>'occurred_at')::timestamptz then raise exception 'event identity collision'; end if;
    v_id:=v_existing.id;
  end if;
  insert into public.analytics_delivery_outbox(environment,event_id,analytics_event_id,envelope,payload_hash)
    values('development',(p_event->>'client_event_id')::uuid,v_id,v_envelope,md5(v_envelope::text))
    on conflict(environment,event_id) do nothing;
  return jsonb_build_object('event_id',v_id,'duplicate',v_duplicate);
end $$;

create function public.get_analytics_delivery_batch(p_batch_id uuid,p_environment text) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('batch_id',b.id,'state',b.state,'event_count',b.event_count,
    'event_ids',jsonb_agg(o.event_id order by o.event_id),'envelopes',jsonb_agg(o.envelope order by o.event_id),
    'payload_hashes',jsonb_agg(o.payload_hash order by o.event_id))
  from public.analytics_delivery_batches b join public.analytics_delivery_outbox o on o.batch_id=b.id
  where b.id=p_batch_id and b.environment=p_environment group by b.id;
$$;

create function public.lease_analytics_delivery_batch(p_environment text,p_limit integer,p_byte_cap integer,p_lease_token uuid,p_lease_seconds integer default 60) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_batch uuid; v_count integer:=0; v_bytes integer:=0; v_ids uuid[]:='{}'; v_row record; v_result jsonb;
begin
  if p_environment is distinct from 'development' or p_limit is null or p_limit not between 1 and 100
    or p_byte_cap is null or p_byte_cap not between 16384 and 262144
    or p_lease_token is null or p_lease_seconds is null or p_lease_seconds not between 10 and 60 then raise exception 'invalid lease bounds'; end if;
  -- A crashed worker after the external call is ambiguous, never silently replay it.
  update public.analytics_delivery_batches set state='quarantined',last_error_code='worker_lease_expired',updated_at=clock_timestamp()
    where environment=p_environment and state='processing' and worker_lease_until<clock_timestamp();
  update public.analytics_delivery_batches set state='dead_letter',last_error_code='publish_attempts_exhausted',updated_at=clock_timestamp()
    where environment=p_environment and state in ('pending','retry','published') and publish_attempts>=5
      and (publish_lease_until is null or publish_lease_until<clock_timestamp());
  select id into v_batch from public.analytics_delivery_batches
    where environment=p_environment and state in ('pending','retry','published') and next_attempt_at<=clock_timestamp()
      and publish_attempts<5 and (publish_lease_until is null or publish_lease_until<clock_timestamp())
    order by created_at,id for update skip locked limit 1;
  if v_batch is null then
    -- Reserve transport columns/newline bytes beyond the immutable envelope.
    for v_row in select event_id,octet_length(envelope::text)+150 as bytes from public.analytics_delivery_outbox
      where environment=p_environment and batch_id is null order by accepted_at,event_id for update skip locked limit p_limit loop
      exit when v_bytes+v_row.bytes>p_byte_cap;
      v_ids:=array_append(v_ids,v_row.event_id);v_count:=v_count+1;v_bytes:=v_bytes+v_row.bytes;
    end loop;
    if v_count=0 then return null; end if;
    insert into public.analytics_delivery_batches(environment,event_count,byte_count) values(p_environment,v_count,v_bytes) returning id into v_batch;
    update public.analytics_delivery_outbox set batch_id=v_batch where environment=p_environment and event_id=any(v_ids);
  end if;
  update public.analytics_delivery_batches set publish_attempts=publish_attempts+1,publish_lease_token=p_lease_token,
    publish_lease_until=clock_timestamp()+make_interval(secs=>p_lease_seconds),updated_at=clock_timestamp() where id=v_batch;
  v_result:=public.get_analytics_delivery_batch(v_batch,p_environment);
  return v_result || jsonb_build_object('attempt',(select publish_attempts from public.analytics_delivery_batches where id=v_batch));
end $$;

create function public.mark_analytics_delivery_published(p_batch_id uuid,p_lease_token uuid,p_message_id text) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
  update public.analytics_delivery_batches set message_id=p_message_id,publish_lease_until=null,
    state=case when state in ('pending','retry') and worker_attempts=0 then 'published' else state end,
    next_attempt_at=case when state='retry' and worker_attempts>0 then next_attempt_at else clock_timestamp()+interval '10 minutes' end,updated_at=clock_timestamp()
    where id=p_batch_id and publish_lease_token=p_lease_token;
  return found;
end $$;

create function public.release_analytics_delivery_publish(p_batch_id uuid,p_lease_token uuid,p_error_code text) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
  update public.analytics_delivery_batches set state=case when publish_attempts>=5 then 'dead_letter' else 'retry' end,
    last_error_code=p_error_code,publish_lease_until=null,next_attempt_at=clock_timestamp()+make_interval(secs=>least(3600,30*power(2,publish_attempts)::integer)),updated_at=clock_timestamp()
    where id=p_batch_id and publish_lease_token=p_lease_token and state in ('pending','retry','published');
  return found;
end $$;

create function public.acquire_analytics_delivery_batch(p_batch_id uuid,p_environment text,p_lease_token uuid,p_lease_seconds integer default 60) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_batch public.analytics_delivery_batches%rowtype;v_result jsonb;
begin
  if p_environment is distinct from 'development' or p_batch_id is null or p_lease_token is null
    or p_lease_seconds is null or p_lease_seconds not between 10 and 60 then raise exception 'invalid worker lease';end if;
  select * into v_batch from public.analytics_delivery_batches where id=p_batch_id and environment=p_environment for update;
  if not found then return null;end if;
  if v_batch.state='acknowledged' then return public.get_analytics_delivery_batch(p_batch_id,p_environment);end if;
  if v_batch.state in ('quarantined','dead_letter') then return null;end if;
  if v_batch.state='processing' then
    if v_batch.worker_lease_until<clock_timestamp() then
      update public.analytics_delivery_batches set state='quarantined',last_error_code='worker_lease_expired',updated_at=clock_timestamp() where id=p_batch_id;
    end if;
    return null;
  end if;
  if v_batch.worker_attempts>=5 then
    update public.analytics_delivery_batches set state='dead_letter',last_error_code='worker_attempts_exhausted',updated_at=clock_timestamp() where id=p_batch_id;return null;
  end if;
  if v_batch.next_attempt_at>clock_timestamp() and v_batch.state='retry' then return null;end if;
  update public.analytics_delivery_batches set state='processing',worker_attempts=worker_attempts+1,
    worker_lease_token=p_lease_token,worker_lease_until=clock_timestamp()+make_interval(secs=>p_lease_seconds),updated_at=clock_timestamp() where id=p_batch_id;
  v_result:=public.get_analytics_delivery_batch(p_batch_id,p_environment);
  return v_result||jsonb_build_object('attempt',v_batch.worker_attempts+1);
end $$;

create function public.settle_analytics_delivery_batch(p_batch_id uuid,p_lease_token uuid,p_outcome text,p_error_code text default null) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
  if p_batch_id is null or p_lease_token is null or p_outcome is null
    or p_outcome not in ('acknowledged','retry','quarantined','dead_letter') then raise exception 'invalid settlement';end if;
  update public.analytics_delivery_batches set state=case when p_outcome='retry' and worker_attempts>=5 then 'dead_letter' else p_outcome end,
    worker_lease_until=null,last_error_code=p_error_code,
    acknowledged_at=case when p_outcome='acknowledged' then clock_timestamp() else null end,
    next_attempt_at=clock_timestamp()+make_interval(secs=>least(3600,30*power(2,worker_attempts)::integer)),updated_at=clock_timestamp()
    where id=p_batch_id and state='processing' and worker_lease_token=p_lease_token and worker_lease_until>=clock_timestamp();
  return found;
end $$;

-- Immutability: batch membership and accepted payload cannot change after acceptance.
create function public.guard_analytics_delivery_outbox() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.environment<>old.environment or new.event_id<>old.event_id or new.analytics_event_id<>old.analytics_event_id
    or new.envelope<>old.envelope or new.payload_hash<>old.payload_hash or new.accepted_at<>old.accepted_at
    or (old.batch_id is not null and new.batch_id is distinct from old.batch_id) then raise exception 'accepted delivery immutable';end if;
  return new;
end $$;
create trigger analytics_delivery_outbox_immutable before update on public.analytics_delivery_outbox
  for each row execute function public.guard_analytics_delivery_outbox();

revoke all on function public.accept_analytics_delivery_event(jsonb,jsonb),public.get_analytics_delivery_batch(uuid,text),
  public.lease_analytics_delivery_batch(text,integer,integer,uuid,integer),public.mark_analytics_delivery_published(uuid,uuid,text),
  public.release_analytics_delivery_publish(uuid,uuid,text),public.acquire_analytics_delivery_batch(uuid,text,uuid,integer),
  public.settle_analytics_delivery_batch(uuid,uuid,text,text),public.guard_analytics_delivery_outbox() from public,anon,authenticated;
grant execute on function public.accept_analytics_delivery_event(jsonb,jsonb),public.get_analytics_delivery_batch(uuid,text),
  public.lease_analytics_delivery_batch(text,integer,integer,uuid,integer),public.mark_analytics_delivery_published(uuid,uuid,text),
  public.release_analytics_delivery_publish(uuid,uuid,text),public.acquire_analytics_delivery_batch(uuid,text,uuid,integer),
  public.settle_analytics_delivery_batch(uuid,uuid,text,text),public.guard_analytics_delivery_outbox() to service_role;
