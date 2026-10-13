begin;
-- Adopt existing published links as pending without inventing historic access.
alter table public.preview_locker_short_links
 add column access_started_at timestamptz, add column access_expires_at timestamptz, add column access_extended_at timestamptz,
 add constraint preview_link_window_pair check ((access_started_at is null and access_expires_at is null and access_extended_at is null)
 or (access_started_at is not null and access_expires_at is not null and access_expires_at>=access_started_at+interval '48 hours' and (access_extended_at is null or access_extended_at>=access_started_at)));
comment on column public.preview_locker_short_links.access_started_at is 'First eligible visible browser admission. Link possession does not verify athlete identity.';
comment on column public.preview_locker_short_links.access_expires_at is 'Shared deadline; reload, alias, publication, enrollment and sent marking never reset it.';
revoke insert,update on public.preview_locker_short_links from authenticated;
grant insert(preview_id,alias,public_access_enabled) on public.preview_locker_short_links to authenticated;
grant update(alias,public_access_enabled) on public.preview_locker_short_links to authenticated;
create or replace function private.stamp_preview_short_link() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and current_user not in ('anon','authenticated','service_role') and new.alias is not distinct from old.alias and new.public_access_enabled is not distinct from old.public_access_enabled then
  new.preview_id:=old.preview_id; new.created_by:=old.created_by; new.created_at:=old.created_at; new.updated_at:=clock_timestamp(); return new;
 end if;
 if auth.uid() is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if tg_op='INSERT' then
  if new.access_started_at is not null or new.access_expires_at is not null or new.access_extended_at is not null then raise exception 'window columns require RPC' using errcode='42501'; end if;
  new.created_by:=auth.uid(); new.created_at:=clock_timestamp();
 else
  new.preview_id:=old.preview_id; new.created_by:=old.created_by; new.created_at:=old.created_at;
  if new.access_started_at is distinct from old.access_started_at or new.access_expires_at is distinct from old.access_expires_at or new.access_extended_at is distinct from old.access_extended_at then raise exception 'window columns require RPC' using errcode='42501'; end if;
 end if;
 new.updated_at:=clock_timestamp(); return new;
end $$;
create or replace function private.audit_preview_short_link() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and old.alias is not distinct from new.alias then return new; end if;
 if auth.uid() is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,previous_values,new_values,request_metadata)
 values(auth.uid(),case when tg_op='INSERT' then 'preview.short_link_created' else 'preview.short_link_updated' end,'preview_locker',new.preview_id::text,'platform','medium',
 case when tg_op='UPDATE' then jsonb_build_object('alias',old.alias) end,jsonb_build_object('alias',new.alias),jsonb_build_object('source','preview_short_link_trigger'));
 return new;
end $$;
create function private.preview_public_access_active(p_preview uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select exists(select 1 from public.preview_locker_short_links where preview_id=p_preview and public_access_enabled and access_started_at is not null and access_expires_at>clock_timestamp());
$$;
revoke all on function private.preview_public_access_active(uuid) from public,anon,authenticated,service_role;
create function public.preview_public_link_status(p_preview uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.preview_locker_short_links; at_time timestamptz:=clock_timestamp();
begin
 select * into link from public.preview_locker_short_links where preview_id=p_preview;
 if not found or not link.public_access_enabled then return jsonb_build_object('state','unavailable','remaining_seconds',0); end if;
 return jsonb_build_object('state',case when link.access_started_at is null then 'pending' when link.access_expires_at>at_time then 'active' else 'expired' end,
 'access_started_at',link.access_started_at,'access_expires_at',link.access_expires_at,'access_extended_at',link.access_extended_at,
 'remaining_seconds',coalesce(greatest(0,floor(extract(epoch from(link.access_expires_at-at_time)))::integer),0));
end $$;
revoke all on function public.preview_public_link_status(uuid) from public,anon,authenticated,service_role;
grant execute on function public.preview_public_link_status(uuid) to service_role;
-- Only the server calls admission after checking same origin, browser visibility,
-- authenticated Admin, prefetch and recognized crawler exclusions.
create function public.start_preview_link_access(p_preview uuid,p_actor uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.preview_locker_short_links; started timestamptz;
begin
 if p_actor is not null and private.has_active_platform_role(p_actor,array['super_admin']) then return jsonb_build_object('excluded',true); end if;
 select * into link from public.preview_locker_short_links where preview_id=p_preview for update;
 if not found or not link.public_access_enabled then raise exception 'preview unavailable' using errcode='42501'; end if;
 if link.access_started_at is null then
  started:=clock_timestamp();
  update public.preview_locker_short_links set access_started_at=started,access_expires_at=started+interval '48 hours' where preview_id=p_preview;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,new_values,request_metadata)
  values(p_actor,'preview.link_access_started','preview_locker',p_preview::text,'platform','low',jsonb_build_object('access_started_at',started,'access_expires_at',started+interval '48 hours'),jsonb_build_object('source','visible_browser_admission','identity_verified',false));
 elsif link.access_expires_at<=clock_timestamp() then raise exception 'preview expired' using errcode='42501'; end if;
 return public.preview_public_link_status(p_preview);
end $$;
revoke all on function public.start_preview_link_access(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.start_preview_link_access(uuid,uuid) to service_role;
create function public.extend_preview_link_access(p_preview uuid,p_reason text,p_request uuid default gen_random_uuid()) returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.preview_locker_short_links; deadline timestamptz; at_time timestamptz; previous_request public.audit_logs;
begin
 if auth.uid() is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_reason is null or length(btrim(p_reason)) not between 10 and 500 or p_request is null then raise exception 'extension reason required' using errcode='22023'; end if;
 select * into link from public.preview_locker_short_links where preview_id=p_preview for update;
 if not found or not link.public_access_enabled or link.access_started_at is null then raise exception 'started published link required' using errcode='22023'; end if;
 select * into previous_request from public.audit_logs where action='preview.link_access_extended' and entity_type='preview_locker' and entity_id=p_preview::text and request_metadata->>'request_id'=p_request::text limit 1;
 if found then
  if previous_request.request_metadata->>'reason' is distinct from btrim(p_reason) then raise exception 'extension request collision' using errcode='22023'; end if;
  return public.preview_public_link_status(p_preview)||jsonb_build_object('saved',true,'duplicate',true);
 end if;
 at_time:=clock_timestamp(); deadline:=greatest(link.access_expires_at,at_time)+interval '48 hours';
 update public.preview_locker_short_links set access_expires_at=deadline,access_extended_at=at_time where preview_id=p_preview;
 insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,previous_values,new_values,request_metadata)
 values(auth.uid(),'preview.link_access_extended','preview_locker',p_preview::text,'platform','high',jsonb_build_object('access_started_at',link.access_started_at,'access_expires_at',link.access_expires_at),
 jsonb_build_object('access_started_at',link.access_started_at,'access_expires_at',deadline),jsonb_build_object('source','admin_personal_request','reason',btrim(p_reason),'request_id',p_request,'extended_at',at_time));
 return public.preview_public_link_status(p_preview)||jsonb_build_object('saved',true);
end $$;
revoke all on function public.extend_preview_link_access(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.extend_preview_link_access(uuid,text,uuid) to authenticated;
-- Published-link expiry takes precedence over an old restricted viewer grant.
create or replace function private.can_view_preview_locker(p_preview_locker_id uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.preview_locker_viewer_grants g where g.preview_locker_id=p_preview_locker_id and g.viewer_user_id=auth.uid() and g.assigned_at+interval '48 hours'>clock_timestamp())
 and (not exists(select 1 from public.preview_locker_short_links where preview_id=p_preview_locker_id and public_access_enabled) or private.preview_public_access_active(p_preview_locker_id));
$$;
create or replace function private.preview_media_ttl(p_preview uuid) returns integer language sql volatile security definer set search_path='' as $$
 select case when auth.uid() is null then 0 when public.is_internal_admin() then 900 when not private.can_view_preview_locker(p_preview) then 0 else
 coalesce((select greatest(0,least(900,floor(extract(epoch from(least(g.assigned_at+interval '48 hours',coalesce((select access_expires_at from public.preview_locker_short_links where preview_id=p_preview and public_access_enabled),'infinity'::timestamptz))-clock_timestamp())))::integer))
 from public.preview_locker_viewer_grants g where g.preview_locker_id=p_preview and g.viewer_user_id=auth.uid()),0) end;
$$;
-- A viewer must use the authorized server read/signing path. Storage SELECT
-- otherwise permits arbitrary expiresIn values that outlive the access window.
-- Keep Admin access for these buckets; unrelated Storage policies are untouched.
drop policy preview_media_authorized_select on storage.objects;
create policy preview_media_authorized_select on storage.objects for select to authenticated
 using (bucket_id in ('preview-locker-photos','preview-locker-videos') and (select public.is_internal_admin()));
alter table public.preview_conversion_campaigns drop constraint preview_conversion_campaigns_channel_check;
alter table public.preview_conversion_campaigns add constraint preview_conversion_campaigns_channel_check check(channel in ('email','instagram','facebook','linkedin','sms','in_person','referral','other'));
alter table public.preview_conversion_campaigns add column sent_channel text check(sent_channel in ('email','instagram','facebook','linkedin','sms','in_person','referral','other'));
comment on column public.preview_conversion_campaigns.sent_channel is 'Actual manual invitation channel; enrollment attribution remains immutable. Null on legacy sent records.';
alter table public.preview_link_inquiries add column reviewed_contact_id uuid references public.gtm_contacts(id), add column reviewed_by uuid references auth.users(id), add column reviewed_at timestamptz,
 add constraint preview_inquiry_review_pair check ((reviewed_contact_id is null and reviewed_by is null and reviewed_at is null) or (reviewed_contact_id is not null and reviewed_by is not null and reviewed_at is not null));
create index preview_inquiry_review_contact on public.preview_link_inquiries(reviewed_contact_id) where reviewed_contact_id is not null;
create index preview_inquiry_review_actor on public.preview_link_inquiries(reviewed_by) where reviewed_by is not null;
create function public.accept_preview_inquiry_email(p_inquiry uuid,p_contact uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare inquiry public.preview_link_inquiries; old_contact public.gtm_contacts;
begin
 if auth.uid() is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_reason is null or length(btrim(p_reason)) not between 10 and 500 then raise exception 'review reason required' using errcode='22023'; end if;
 select * into inquiry from public.preview_link_inquiries where id=p_inquiry for update;
 if not found or not exists(select 1 from public.preview_conversion_campaigns where preview_id=inquiry.preview_id and contact_id=p_contact) then raise exception 'inquiry enrollment mismatch' using errcode='22023'; end if;
 if inquiry.reviewed_contact_id is not null then
  if inquiry.reviewed_contact_id is distinct from p_contact then raise exception 'inquiry already reviewed' using errcode='22023'; end if;
  return jsonb_build_object('saved',true,'duplicate',true);
 end if;
 select * into old_contact from public.gtm_contacts where id=p_contact and not archived for update;
 if not found or old_contact.email is not null then raise exception 'contact already has reviewed email or is unavailable' using errcode='22023'; end if;
 update public.gtm_contacts set email=inquiry.email where id=p_contact;
 update public.preview_link_inquiries set reviewed_contact_id=p_contact,reviewed_by=auth.uid(),reviewed_at=clock_timestamp() where id=p_inquiry;
 insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,previous_values,new_values,request_metadata)
 values(auth.uid(),'preview.inquiry_email_reviewed','gtm_contact',p_contact::text,'platform','high',jsonb_build_object('email_present',false),jsonb_build_object('email_present',true),jsonb_build_object('inquiry_id',p_inquiry,'preview_id',inquiry.preview_id,'reason',btrim(p_reason),'identity_verified',false));
 return jsonb_build_object('saved',true);
end $$;
revoke all on function public.accept_preview_inquiry_email(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.accept_preview_inquiry_email(uuid,uuid,text) to authenticated;

create or replace function private.can_read_preview_media(p_bucket_id text, p_object_name text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare actor uuid := auth.uid(); folders text[] := storage.foldername(p_object_name); preview_id uuid; kind text;
begin
  if actor is null or array_length(folders,1) <> 2
    or folders[1] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false; end if;
  preview_id := folders[1]::uuid; kind := folders[2];
  if (p_bucket_id = 'preview-locker-photos' and kind <> 'photos')
    or (p_bucket_id = 'preview-locker-videos' and kind <> 'videos')
    or p_bucket_id not in ('preview-locker-photos','preview-locker-videos') then return false; end if;
  return exists (
    select 1
    from public.preview_lockers preview
    join public.preview_locker_viewer_grants grant_row on grant_row.preview_locker_id = preview.id
    where preview.id = preview_id and grant_row.viewer_user_id = actor
      and private.can_view_preview_locker(preview_id)
      and exists (
        select 1 from jsonb_array_elements(case when kind='photos' then preview.photos else preview.videos end) item
        where item->>'storagePath' = p_object_name
      )
  );
end;
$$;
create or replace function private.preview_conversion(p_preview uuid,p_action text,p_request uuid,p_session uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid(); admin boolean := coalesce(public.is_internal_admin(),false);
  c public.preview_conversion_campaigns; r public.preview_conversion_responses;
  referral public.preview_conversion_referrals; contact uuid; matches integer;
  email_value text := lower(btrim(p_data->>'email')); token_value uuid;
  candidate jsonb; candidate_count integer;
  sent_time timestamptz; sent_channel_value text;
  session_value uuid := p_session; event_name text; utm_value jsonb := coalesce(p_data->'utm','{}');
begin
  if actor is null or p_request is null or p_session is null then raise exception 'forbidden' using errcode='42501'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text)>16384
    or p_action is null then raise exception 'invalid input' using errcode='22023'; end if;
  if not admin then
    insert into private.preview_conversion_limits(actor_id,window_at,requests)
      values(actor,date_trunc('hour',clock_timestamp()),1)
      on conflict(actor_id) do update set
        requests=case when preview_conversion_limits.window_at=date_trunc('hour',clock_timestamp()) then preview_conversion_limits.requests+1 else 1 end,
        window_at=date_trunc('hour',clock_timestamp()) returning requests into matches;
    if matches>120 then raise exception 'rate limited' using errcode='54000'; end if;
  end if;
  if p_action='enroll' then
    if not admin then raise exception 'forbidden' using errcode='42501'; end if;
    contact := (p_data->>'contact_id')::uuid;
    if not exists(select 1 from public.gtm_contacts where id=contact and not archived) then raise exception 'contact unavailable' using errcode='22023'; end if;
    -- Preserve reviewed Player Master linkage; no matching decisions are changed.
    if exists(select 1 from public.gtm_player_preview_lockers l join public.gtm_contacts g on g.id=contact
      where l.preview_locker_id=p_preview and g.player_master_gsis_id is distinct from l.gsis_id)
      then raise exception 'contact conflicts with Player Master preview' using errcode='22023'; end if;
    insert into public.preview_conversion_campaigns(preview_id,contact_id,campaign,channel,relationship,source,is_test,created_by)
      values(p_preview,contact,p_data->>'campaign',p_data->>'channel',p_data->>'relationship',p_data->>'source',coalesce((p_data->>'is_test')::boolean,false),actor)
      on conflict(preview_id) do nothing;
    select * into c from public.preview_conversion_campaigns where preview_id=p_preview;
    if c.contact_id<>contact or c.campaign<>p_data->>'campaign' or c.channel<>p_data->>'channel'
      or c.source<>p_data->>'source' or c.relationship<>p_data->>'relationship'
      or c.is_test<>coalesce((p_data->>'is_test')::boolean,false) then raise exception 'enrollment conflict' using errcode='22023'; end if;
    insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,new_values)
      values(actor,'preview.conversion.enrolled','preview_locker',p_preview::text,'platform','low',jsonb_build_object('contact_id',contact));
    return jsonb_build_object('saved',true);
  end if;

  if p_action='resolve_referral' then
    if not admin then raise exception 'forbidden' using errcode='42501'; end if;
    contact := (p_data->>'contact_id')::uuid;
    if not exists(select 1 from public.gtm_contacts where id=contact and not archived) then raise exception 'contact unavailable' using errcode='22023'; end if;
    update public.preview_conversion_referrals set contact_id=contact where id=(p_data->>'referral_id')::uuid and referrer_preview_id=p_preview and contact_id is null and preview_id is null;
    if not found then raise exception 'referral already matched or unavailable' using errcode='22023'; end if;
    insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,new_values)
      values(actor,'preview.referral.matched','preview_referral',p_data->>'referral_id','platform','medium',jsonb_build_object('contact_id',contact));
    return jsonb_build_object('saved',true);
  end if;
  if p_action='referral_intake' then
    if admin then return jsonb_build_object('excluded',true); end if;
    select * into c from public.preview_conversion_campaigns where referral_token=(p_data->>'token')::uuid and not is_test for update;
    if not found then raise exception 'unavailable' using errcode='42501'; end if;
    if not exists(select 1 from public.preview_locker_viewer_grants where preview_locker_id=c.preview_id) then raise exception 'unavailable' using errcode='42501'; end if;
    if p_data->>'consent' is distinct from 'true' or length(btrim(p_data->>'full_name')) not between 2 and 120
      or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and lower(email)=email_value and deleted_at is null)
      then raise exception 'confirmed account email and consent required' using errcode='22023'; end if;
    if exists(select 1 from public.preview_locker_viewer_grants where preview_locker_id=c.preview_id and viewer_user_id=actor)
      or exists(select 1 from public.gtm_contacts where id=c.contact_id and lower(btrim(email))=email_value)
      or exists(select 1 from public.preview_conversion_responses where preview_id=c.preview_id and email=email_value)
      then return jsonb_build_object('saved',true,'existing',true); end if;
    perform pg_advisory_xact_lock(hashtextextended(email_value,712));
    select * into referral from public.preview_conversion_referrals where email=email_value or actor_id=actor;
    if found then return jsonb_build_object('saved',true,'existing',true); end if;
    select count(*) into matches from public.gtm_contacts where lower(btrim(email))=email_value and not archived;
    if matches=1 then
      select id into contact from public.gtm_contacts where lower(btrim(email))=email_value and not archived;
      if exists(select 1 from public.preview_conversion_campaigns where contact_id=contact) then return jsonb_build_object('saved',true,'existing',true); end if;
    elsif matches=0 then
      insert into public.gtm_contacts(display_name,email,contact_type,source,source_record_id,created_by,do_not_automate,next_action)
      values(btrim(p_data->>'full_name'),email_value,'athlete','preview_referral',actor::text,c.created_by,true,'Review self-submitted referral and prepare private preview') returning id into contact;
    end if;
    insert into public.preview_conversion_referrals(referrer_preview_id,actor_id,contact_id,full_name,email,campaign,source)
      values(c.preview_id,actor,contact,btrim(p_data->>'full_name'),email_value,c.campaign,c.source) returning * into referral;
    insert into public.preview_conversion_events(preview_id,actor_id,session_id,request_id,kind,related_id)
      values(c.preview_id,actor,referral.id,p_request,'referral_submit',referral.id);
    return jsonb_build_object('saved',true);
  end if;

  select * into c from public.preview_conversion_campaigns where preview_id=p_preview for update;
  if not found then
    if p_action='state' and private.can_view_preview_locker(p_preview) then return jsonb_build_object('available',false); end if;
    raise exception 'unavailable' using errcode='42501';
  end if;
  if p_action in ('sent','booking_confirmed','walkthrough_completed') then
    if not admin then raise exception 'forbidden' using errcode='42501'; end if;
    if c.is_test then return jsonb_build_object('excluded',true); end if;
    if p_action='sent' then
      if c.sent_at is not null then
        if c.sent_channel is not null and (c.sent_channel is distinct from p_data->>'channel' or c.sent_at is distinct from (p_data->>'sent_at')::timestamptz) then raise exception 'sent record is immutable' using errcode='22023'; end if;
        return jsonb_build_object('saved',true,'duplicate',true);
      end if;
      if not exists(select 1 from public.preview_locker_short_links where preview_id=p_preview and public_access_enabled and (access_started_at is null or access_expires_at>clock_timestamp()))
        and not (not exists(select 1 from public.preview_locker_short_links where preview_id=p_preview and public_access_enabled) and exists(select 1 from public.preview_locker_viewer_grants where preview_locker_id=p_preview and assigned_at+interval '48 hours'>clock_timestamp())) then raise exception 'published link or current viewer required' using errcode='22023'; end if;
      sent_channel_value:=p_data->>'channel';
      if sent_channel_value is null or sent_channel_value not in ('email','instagram','facebook','linkedin','sms','in_person','referral','other') or coalesce(p_data->>'sent_at','') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' then raise exception 'actual channel and sent time required' using errcode='22023'; end if;
      sent_time:=(p_data->>'sent_at')::timestamptz;
      if sent_time>clock_timestamp() or sent_time<'2000-01-01'::timestamptz then raise exception 'sent time must be in the past' using errcode='22023'; end if;
      update public.preview_conversion_campaigns set sent_at=sent_time,sent_channel=sent_channel_value,updated_at=clock_timestamp() where preview_id=p_preview;
    elsif not exists(select 1 from public.preview_conversion_responses where preview_id=p_preview and state='accepted') and not exists(select 1 from public.preview_link_inquiries where preview_id=p_preview) then
      raise exception 'submission required' using errcode='22023';
    end if;
    session_value:=p_preview;
  else
    if not private.can_view_preview_locker(p_preview) and not admin then raise exception 'forbidden' using errcode='42501'; end if;
    -- Serialize revocation against an already-authorized athlete transaction.
    perform 1 from public.preview_locker_viewer_grants where preview_locker_id=p_preview and viewer_user_id=actor for share;
    if not found and not admin then raise exception 'forbidden' using errcode='42501'; end if;
    if admin or c.is_test then return jsonb_build_object('excluded',true); end if;
    if p_action='state' then
      select * into r from public.preview_conversion_responses where preview_id=p_preview;
      return jsonb_build_object('state',r.state,'dashboard_interest',r.dashboard_interest);
    end if;
    if p_action not in ('view','photos_view','film_view','claim_click','declined','claim_submit','booking_click','referral_created','referral_copied') then raise exception 'invalid action' using errcode='22023'; end if;
    if (select count(*) from public.preview_conversion_events where actor_id=actor and created_at>clock_timestamp()-interval '1 hour')>=120 then raise exception 'rate limited' using errcode='54000'; end if;
    if jsonb_typeof(utm_value)<>'object' or exists(select 1 from jsonb_each_text(utm_value) e where e.key not in ('utm_source','utm_medium','utm_campaign') or e.value !~ '^[a-zA-Z0-9_-]{1,80}$') then raise exception 'invalid attribution' using errcode='22023'; end if;
    if p_action='claim_submit' then
      if length(coalesce(p_data->>'feature_requests',''))>2000
        or jsonb_typeof(coalesce(p_data->'referrals','[]'::jsonb))<>'array' then
        raise exception 'invalid request details' using errcode='22023';
      end if;
      candidate_count := jsonb_array_length(coalesce(p_data->'referrals','[]'::jsonb));
      if candidate_count>10 then raise exception 'too many referrals' using errcode='22023'; end if;
    end if;
    if p_action in ('claim_submit','declined') then
      if p_action='claim_submit' and (email_value is null or length(email_value)>254 or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_data->>'consent' is distinct from 'true') then raise exception 'email and consent required' using errcode='22023'; end if;
      if length(coalesce(p_data->>'reason',''))>500 then raise exception 'reason too long' using errcode='22023'; end if;
      select * into r from public.preview_conversion_responses where preview_id=p_preview;
      if found then
        if r.state <> (case when p_action='claim_submit' then 'accepted' else 'declined' end) then raise exception 'response already recorded' using errcode='22023'; end if;
        return jsonb_build_object('saved',true,'state',r.state);
      end if;
      insert into public.preview_conversion_responses(preview_id,actor_id,state,email,updates_permission,dashboard_interest,decline_reason)
      values(p_preview,actor,case when p_action='claim_submit' then 'accepted' else 'declined' end,
        case when p_action='claim_submit' then email_value end,p_action='claim_submit',p_action='claim_submit' and coalesce((p_data->>'dashboard_interest')::boolean,false),case when p_action='declined' then p_data->>'reason' end);
      if p_action='claim_submit' then
        update public.preview_conversion_responses set feature_requests=nullif(btrim(p_data->>'feature_requests'),'') where preview_id=p_preview;
        for candidate in select value from jsonb_array_elements(coalesce(p_data->'referrals','[]'::jsonb)) loop
          if jsonb_typeof(candidate)<>'object' or candidate->>'full_name' is null then raise exception 'invalid referral' using errcode='22023'; end if;
          insert into public.preview_locker_candidates(referrer_preview_id,full_name,email,phone)
            values(p_preview,btrim(candidate->>'full_name'),nullif(lower(btrim(candidate->>'email')),''),nullif(btrim(candidate->>'phone'),''));
        end loop;
        insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,new_values)
          values(actor,'preview.interest.submitted','preview_locker',p_preview::text,'platform','low',jsonb_build_object('referral_count',candidate_count,'dashboard_interest',p_data->>'dashboard_interest'));
      end if;
      if p_action='claim_submit' then
        insert into public.preview_conversion_events(preview_id,actor_id,session_id,request_id,kind)
          values(p_preview,actor,p_session,p_request,'accepted');
        if p_data->>'dashboard_interest'='true' then
          insert into public.preview_conversion_events(preview_id,actor_id,session_id,request_id,kind) values(p_preview,actor,p_session,p_request,'dashboard_interest');
        end if;
        select * into referral from public.preview_conversion_referrals where preview_id=p_preview;
        if found then
          insert into public.preview_conversion_events(preview_id,actor_id,session_id,request_id,kind,related_id)
            values(referral.referrer_preview_id,actor,referral.id,p_request,'referred_claimed',referral.id) on conflict do nothing;
        end if;
      end if;
    end if;
    if p_action in ('booking_click','referral_created','referral_copied') then
      if not exists(select 1 from public.preview_conversion_responses where preview_id=p_preview and state='accepted') then raise exception 'submission required' using errcode='22023'; end if;
      if p_action='referral_created' then
        update public.preview_conversion_campaigns set referral_token=coalesce(referral_token,gen_random_uuid()),updated_at=clock_timestamp() where preview_id=p_preview returning referral_token into token_value;
        session_value:=p_preview;
      end if;
    end if;
  end if;
  event_name:=p_action;
  insert into public.preview_conversion_events(preview_id,actor_id,session_id,request_id,kind,utm)
    values(p_preview,actor,session_value,p_request,event_name,utm_value) on conflict do nothing;
  if admin then
    insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,new_values)
    values(actor,'preview.conversion.'||p_action,'preview_locker',p_preview::text,'platform','low',jsonb_strip_nulls(jsonb_build_object('event',p_action,'sent_channel',sent_channel_value,'sent_at',sent_time)));
  end if;
  return jsonb_build_object('saved',true,'token',token_value);
end;
$$;
create or replace function public.record_preview_analytics_event(p_input jsonb,p_actor uuid,p_environment text) returns jsonb
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
    private.preview_public_access_active(v_preview)
    or (not exists(select 1 from public.preview_locker_short_links where preview_id=v_preview and public_access_enabled) and exists(select 1 from public.preview_locker_viewer_grants where preview_locker_id=v_preview and viewer_user_id=p_actor and assigned_at+interval '48 hours'>clock_timestamp()))
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

create or replace function public.save_preview_link_inquiry(p_preview uuid,p_email text,p_features text,p_session uuid,p_actor uuid,p_environment text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_environment text;
begin
  perform 1 from public.preview_locker_short_links where preview_id=p_preview for share;
  if not private.preview_public_access_active(p_preview) then
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

-- Change only the approved affiliation cap; fail closed on validator drift.
do $migration$
declare definition text:=pg_get_functiondef('private.preview_items_valid(text,jsonb)'::regprocedure);
 previous text:=$s$when 'team' then allowed := array['label','color','logo']; required := allowed; max_items := 12;$s$;
 updated text:=$s$when 'team' then allowed := array['label','color','logo']; required := allowed; max_items := 32;$s$;
begin
 if strpos(definition,previous)=0 then raise exception 'Unexpected affiliation validator; review required'; end if;
 execute replace(definition,previous,updated);
end $migration$;
commit;
