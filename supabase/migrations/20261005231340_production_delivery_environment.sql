-- Forward environment support only. Application production flags remain disabled.
-- Preserve SECURITY INVOKER, RLS, service-only grants, immutable payloads and retry fencing.
ALTER TABLE public.analytics_delivery_batches DROP CONSTRAINT analytics_delivery_batches_environment_check;
ALTER TABLE public.analytics_delivery_batches ADD CONSTRAINT analytics_delivery_batches_environment_check CHECK(environment IN ('development','production'));
ALTER TABLE public.analytics_delivery_outbox DROP CONSTRAINT analytics_delivery_outbox_environment_check;
ALTER TABLE public.analytics_delivery_outbox ADD CONSTRAINT analytics_delivery_outbox_environment_check CHECK(environment IN ('development','production'));
ALTER TABLE public.analytics_delivery_batches ADD CONSTRAINT analytics_delivery_batches_environment_identity UNIQUE(id,environment);
ALTER TABLE public.analytics_delivery_outbox ADD CONSTRAINT analytics_delivery_outbox_environment_batch FOREIGN KEY(batch_id,environment) REFERENCES public.analytics_delivery_batches(id,environment) ON DELETE RESTRICT;

create or replace function public.accept_analytics_delivery_event(p_event jsonb,p_envelope jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_duplicate boolean:=false; v_envelope jsonb; v_existing public.analytics_events%rowtype; v_environment text:=p_envelope->>'environment'; v_accepted public.analytics_delivery_outbox%rowtype;
begin
  if (v_environment is null or v_environment not in ('development','production')) or p_envelope->>'schema_version' is distinct from '1'
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
  select * into v_accepted from public.analytics_delivery_outbox where analytics_event_id=v_id;
  if found and (v_accepted.environment is distinct from v_environment
    or (v_accepted.envelope - 'received_at' - 'occurred_at') is distinct from (v_envelope - 'received_at' - 'occurred_at')
    or (v_accepted.envelope->>'occurred_at')::timestamptz is distinct from (v_envelope->>'occurred_at')::timestamptz) then raise exception 'delivery identity collision';end if;
  insert into public.analytics_delivery_outbox(environment,event_id,analytics_event_id,envelope,payload_hash)
    values(v_environment,(p_event->>'client_event_id')::uuid,v_id,v_envelope,md5(v_envelope::text))
    on conflict(environment,event_id) do nothing;
  return jsonb_build_object('event_id',v_id,'duplicate',v_duplicate);
end $$;

create or replace function public.get_analytics_delivery_batch(p_batch_id uuid,p_environment text) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('batch_id',b.id,'state',b.state,'event_count',b.event_count,
    'event_ids',jsonb_agg(o.event_id order by o.event_id),'envelopes',jsonb_agg(o.envelope order by o.event_id),
    'payload_hashes',jsonb_agg(o.payload_hash order by o.event_id))
  from public.analytics_delivery_batches b join public.analytics_delivery_outbox o on o.batch_id=b.id and o.environment=b.environment
  where b.id=p_batch_id and b.environment=p_environment group by b.id;
$$;

create or replace function public.lease_analytics_delivery_batch(p_environment text,p_limit integer,p_byte_cap integer,p_lease_token uuid,p_lease_seconds integer default 60) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_batch uuid; v_count integer:=0; v_bytes integer:=0; v_ids uuid[]:='{}'; v_row record; v_result jsonb;
begin
  if (p_environment is null or p_environment not in ('development','production')) or p_limit is null or p_limit not between 1 and 100
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

create or replace function public.acquire_analytics_delivery_batch(p_batch_id uuid,p_environment text,p_lease_token uuid,p_lease_seconds integer default 60) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_batch public.analytics_delivery_batches%rowtype;v_result jsonb;
begin
  if (p_environment is null or p_environment not in ('development','production')) or p_batch_id is null or p_lease_token is null
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

CREATE FUNCTION public.guard_analytics_delivery_batch_environment() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NEW.environment IS DISTINCT FROM OLD.environment THEN RAISE EXCEPTION 'delivery batch environment immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER analytics_delivery_batch_environment_immutable BEFORE UPDATE ON public.analytics_delivery_batches FOR EACH ROW EXECUTE FUNCTION public.guard_analytics_delivery_batch_environment();
REVOKE ALL ON FUNCTION public.guard_analytics_delivery_batch_environment() FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_analytics_delivery_batch_environment() TO service_role;
