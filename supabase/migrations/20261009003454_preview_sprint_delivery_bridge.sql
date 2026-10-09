-- Prerequisite: the EXISTING analytics_events, analytics_delivery_outbox and
-- accept_analytics_delivery_event(jsonb,jsonb) production-environment support.
-- This migration does not install the unrelated Intelligence/feature schemas
-- bundled in 20261005183837. Apply only an approved transport prerequisite first.
do $$ begin
  if to_regclass('public.analytics_delivery_outbox') is null
    or to_regprocedure('public.accept_analytics_delivery_event(jsonb,jsonb)') is null then
    raise exception 'preview analytics requires approved existing delivery transport prerequisite';
  end if;
end $$;

-- One server-owned capture setting. Disabled until the runtime and transport
-- have been reviewed together; the browser cannot enable capture or pick env.
create table private.preview_analytics_capture_config (
  singleton boolean primary key default true check(singleton),
  environment text check(environment in ('development','production')),
  updated_at timestamptz not null default clock_timestamp()
);
insert into private.preview_analytics_capture_config(singleton) values(true);
alter table private.preview_analytics_capture_config enable row level security;
revoke all on private.preview_analytics_capture_config from public,anon,authenticated,service_role;

create function public.configure_preview_analytics_capture(p_environment text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_environment is not null and p_environment not in ('development','production') then
    raise exception 'invalid capture environment' using errcode='22023';
  end if;
  update private.preview_analytics_capture_config set environment=p_environment,updated_at=clock_timestamp() where singleton;
end $$;
revoke all on function public.configure_preview_analytics_capture(text) from public,anon,authenticated,service_role;
grant execute on function public.configure_preview_analytics_capture(text) to service_role;

create index analytics_delivery_preview_session on public.analytics_delivery_outbox
  ((envelope->'properties'->>'preview_id'),(envelope->>'session_id'),accepted_at)
  where envelope->>'scope_key'='preview_sprint';

-- Restricted helper constructs the only allowed envelope. Trigger execution is
-- privileged because the conversion ledger deliberately denies service reads;
-- this exports reviewed facts without expanding ledger/table access.
create function private.append_preview_analytics(
  p_id uuid,p_preview uuid,p_kind text,p_session uuid,p_at timestamptz,
  p_actor_kind text,p_basis text,p_media text default null,p_progress integer default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_environment text; v_properties jsonb; v_envelope jsonb; v_result jsonb;
begin
  select environment into v_environment from private.preview_analytics_capture_config where singleton;
  if v_environment is null then return jsonb_build_object('accepted',false,'excluded',true); end if;
  if p_id is null or p_preview is null or p_at is null or p_actor_kind not in ('anonymous','authenticated','operational')
    or p_basis not in ('unverified_client','server_workflow')
    or p_kind is null or p_kind not in ('locker_view','photos_view','film_view','photo_open','video_open','video_play','video_progress','video_complete','stats_view','claim_click','referral_link_copied',
      'sent','accepted','declined','claim_submit','dashboard_interest','booking_click','booking_confirmed','walkthrough_completed','referral_created','referral_copied','referral_submit','referred_prepared','referred_claimed')
    or ((p_kind in ('photo_open','video_open','video_play','video_progress','video_complete')) <> (p_media is not null))
    or (p_media is not null and p_media !~ '^[A-Za-z0-9_-]{1,128}$')
    or ((p_kind='video_progress') <> (p_progress is not null))
    or (p_progress is not null and p_progress not in (25,50,75)) then
    raise exception 'invalid preview event' using errcode='22023';
  end if;
  v_properties:=jsonb_strip_nulls(jsonb_build_object('preview_id',p_preview,'event_kind',p_kind,'media_id',p_media,'progress',p_progress));
  v_envelope:=jsonb_build_object(
    'event_id',p_id,'schema_version',1,'event_name','preview_'||p_kind,'event_version','preview-sprint-v1',
    'occurred_at',p_at,'received_at',clock_timestamp(),'environment',v_environment,'surface','preview',
    'producer','bltz_collector','actor_kind',p_actor_kind,'measurement_basis',p_basis,'audience_eligible',false,
    'subject_player_id',null,'moment_id',null,'asset_id',null,'asset_model',null,'session_id',p_session,
    'scope_key','preview_sprint','source_channel','unknown','properties',v_properties);
  v_result:=public.accept_analytics_delivery_event(
    jsonb_build_object('client_event_id',p_id,'event_name','preview_'||p_kind,'occurred_at',p_at,
      'user_id',null,'athlete_id',null,'session_id',p_session,'source','preview','page',null,'properties',v_properties),v_envelope);
  return jsonb_build_object('accepted',true,'eventId',p_id,'duplicate',v_result->'duplicate');
end $$;
revoke all on function private.append_preview_analytics(uuid,uuid,text,uuid,timestamptz,text,text,text,integer) from public,anon,authenticated,service_role;

create function public.record_preview_analytics_event(p_input jsonb,p_actor uuid,p_environment text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_preview uuid; v_id uuid; v_session uuid; v_kind text; v_media text; v_progress integer;
  v_row public.preview_lockers%rowtype; v_previous public.analytics_delivery_outbox%rowtype; v_environment text;
  v_properties jsonb; v_actor_kind text:=case when p_actor is null then 'anonymous' else 'authenticated' end;
begin
  if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>2048
    or (p_input - array['previewId','eventId','sessionId','eventName','assetId','progress'])<>'{}'::jsonb then
    raise exception 'invalid preview input' using errcode='22023';
  end if;
  v_preview:=(p_input->>'previewId')::uuid; v_id:=(p_input->>'eventId')::uuid; v_session:=(p_input->>'sessionId')::uuid;
  v_kind:=p_input->>'eventName'; v_media:=p_input->>'assetId'; v_progress:=(p_input->>'progress')::integer;
  if v_preview is null or v_id is null or v_session is null or v_kind is null
    or v_kind not in ('locker_view','photos_view','film_view','photo_open','video_open','video_play','video_progress','video_complete','stats_view','claim_click','referral_link_copied')
    or ((v_kind in ('photo_open','video_open','video_play','video_progress','video_complete')) <> (v_media is not null))
    or (v_media is not null and v_media !~ '^[A-Za-z0-9_-]{1,128}$')
    or ((v_kind='video_progress') <> (v_progress is not null)) or (v_progress is not null and v_progress not in (25,50,75)) then
    raise exception 'invalid preview input' using errcode='22023';
  end if;
  select * into v_row from public.preview_lockers where id=v_preview;
  if not found or not (
    exists(select 1 from public.preview_locker_short_links where preview_id=v_preview and public_access_enabled)
    or exists(select 1 from public.preview_locker_viewer_grants where preview_locker_id=v_preview and viewer_user_id=p_actor and assigned_at+interval '48 hours'>now())
  ) then raise exception 'preview unavailable' using errcode='42501'; end if;
  if (p_actor is not null and private.has_active_platform_role(p_actor,array['super_admin']))
    or exists(select 1 from public.preview_conversion_campaigns where preview_id=v_preview and is_test) then
    return jsonb_build_object('accepted',false,'excluded',true);
  end if;
  if v_media is not null and not (
    (v_kind='photo_open' and (exists(select 1 from jsonb_array_elements(v_row.photos) item where item->>'id'=v_media)
      or (v_media='headshot-photo' and v_row.headshot_url is not null)))
    or (v_kind like 'video_%' and (exists(select 1 from jsonb_array_elements(v_row.videos) item where item->>'id'=v_media)
      or (v_media='hero-video' and v_row.hero_video_url is not null)))
  ) then raise exception 'invalid preview asset' using errcode='22023'; end if;
  select environment into v_environment from private.preview_analytics_capture_config where singleton;
  if v_environment is null then return jsonb_build_object('accepted',false,'excluded',true); end if;
  if p_environment is distinct from v_environment then raise exception 'capture environment mismatch' using errcode='22023'; end if;
  v_properties:=jsonb_strip_nulls(jsonb_build_object('preview_id',v_preview,'event_kind',v_kind,'media_id',v_media,'progress',v_progress));
  perform pg_advisory_xact_lock(hashtextextended(v_preview::text||v_session::text,821));
  -- Stable occurrence/envelope on retry, even if the first HTTP acknowledgment
  -- was lost. Changed payloads under an accepted ID are rejected.
  select * into v_previous from public.analytics_delivery_outbox where event_id=v_id and environment=v_environment;
  if found then
    if v_previous.envelope->'properties' is distinct from v_properties or v_previous.envelope->>'session_id' is distinct from v_session::text
      or v_previous.envelope->>'actor_kind' is distinct from v_actor_kind or v_previous.envelope->>'event_version' is distinct from 'preview-sprint-v1' then
      raise exception 'preview event identity collision' using errcode='22023';
    end if;
    return jsonb_build_object('accepted',true,'eventId',v_id,'duplicate',true);
  end if;
  if (select count(*) from public.analytics_delivery_outbox where envelope->>'scope_key'='preview_sprint'
    and envelope->'properties'->>'preview_id'=v_preview::text and envelope->>'session_id'=v_session::text
    and accepted_at>clock_timestamp()-interval '1 minute')>=60 then raise exception 'rate limited' using errcode='54000'; end if;
  if exists(select 1 from public.analytics_delivery_outbox where envelope->>'scope_key'='preview_sprint'
    and envelope->>'session_id'=v_session::text and envelope->'properties'=v_properties
    and accepted_at>clock_timestamp()-interval '30 seconds') then return jsonb_build_object('accepted',false,'excluded',true); end if;
  return private.append_preview_analytics(v_id,v_preview,v_kind,v_session,clock_timestamp(),v_actor_kind,'unverified_client',v_media,v_progress);
end $$;
revoke all on function public.record_preview_analytics_event(jsonb,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.record_preview_analytics_event(jsonb,uuid,text) to service_role;

create function private.export_preview_conversion_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_operational boolean:=new.kind in ('sent','booking_confirmed','walkthrough_completed','referred_prepared');
begin
  -- Uniform visible client tracker covers room views on ALL authorized previews.
  if new.kind in ('view','photos_view','film_view')
    or exists(select 1 from public.preview_conversion_campaigns where preview_id=new.preview_id and is_test)
    or (not v_operational and new.actor_id is not null and private.has_active_platform_role(new.actor_id,array['super_admin'])) then return new; end if;
  perform private.append_preview_analytics(new.id,new.preview_id,new.kind,new.session_id,new.created_at,
    case when v_operational then 'operational' when new.actor_id is null then 'anonymous' else 'authenticated' end,'server_workflow');
  return new;
end $$;
revoke all on function private.export_preview_conversion_event() from public,anon,authenticated,service_role;
create trigger preview_conversion_delivery after insert on public.preview_conversion_events
  for each row execute function private.export_preview_conversion_event();

-- These optional capture columns contain only anonymous tab-session context.
-- Form details stay in the current private inquiry table and never enter export.
alter table public.preview_link_inquiries
  add column analytics_session_id uuid,
  add column analytics_environment text check(analytics_environment in ('development','production'));

create function private.export_preview_link_inquiry() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_environment text; v_kind text; v_hash text; v_id uuid;
begin
  select environment into v_environment from private.preview_analytics_capture_config where singleton;
  if new.analytics_environment is null or new.analytics_environment is distinct from v_environment then return new; end if;
  foreach v_kind in array array['accepted','claim_submit'] loop
    v_hash:=md5('preview-inquiry:'||new.id::text||':'||v_kind);
    v_id:=(substr(v_hash,1,8)||'-'||substr(v_hash,9,4)||'-5'||substr(v_hash,14,3)||'-8'||substr(v_hash,18,3)||'-'||substr(v_hash,21,12))::uuid;
    perform private.append_preview_analytics(v_id,new.preview_id,v_kind,new.analytics_session_id,new.created_at,'anonymous','server_workflow');
  end loop;
  return new;
end $$;
revoke all on function private.export_preview_link_inquiry() from public,anon,authenticated,service_role;
create trigger preview_link_inquiry_delivery after insert on public.preview_link_inquiries
  for each row execute function private.export_preview_link_inquiry();

create function public.save_preview_link_inquiry(p_preview uuid,p_email text,p_features text,p_session uuid,p_actor uuid,p_environment text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_environment text;
begin
  if not exists(select 1 from public.preview_locker_short_links where preview_id=p_preview and public_access_enabled) then
    raise exception 'preview unavailable' using errcode='42501';
  end if;
  if p_email is null or length(p_email) not between 3 and 254 or p_email<>lower(btrim(p_email))
    or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_features)>2000 then
    raise exception 'invalid inquiry' using errcode='22023';
  end if;
  select environment into v_environment from private.preview_analytics_capture_config where singleton;
  if p_environment is null or p_environment is distinct from v_environment
    or (p_actor is not null and private.has_active_platform_role(p_actor,array['super_admin']))
    or exists(select 1 from public.preview_conversion_campaigns where preview_id=p_preview and is_test) then v_environment:=null; end if;
  insert into public.preview_link_inquiries(preview_id,email,feature_requests,analytics_session_id,analytics_environment)
    values(p_preview,p_email,nullif(btrim(p_features),''),p_session,v_environment) on conflict(preview_id,email) do nothing;
  return jsonb_build_object('saved',true);
end $$;
revoke all on function public.save_preview_link_inquiry(uuid,text,text,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.save_preview_link_inquiry(uuid,text,text,uuid,uuid,text) to service_role;
