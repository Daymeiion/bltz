begin;
-- Contact nominations are leads for Admin review, never verified identities or consent from the nominee.
alter table public.preview_conversion_responses add column feature_requests text check(length(feature_requests)<=2000);
create table public.preview_locker_candidates (
 id uuid primary key default gen_random_uuid(),
 referrer_preview_id uuid not null references public.preview_conversion_responses(preview_id) on delete restrict,
 full_name text not null check(length(btrim(full_name)) between 2 and 120),
 email text check(length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 phone text check(phone ~ '^[+0-9 ().-]{7,30}$'),
 created_at timestamptz not null default clock_timestamp(),
 check(email is not null or phone is not null)
);
create index preview_locker_candidates_origin on public.preview_locker_candidates(referrer_preview_id,created_at);
alter table public.preview_locker_candidates enable row level security;
revoke all on public.preview_locker_candidates from public,anon,authenticated,service_role;
grant select on public.preview_locker_candidates to authenticated;
create policy preview_candidates_admin_read on public.preview_locker_candidates for select to authenticated using ((select public.is_internal_admin()));
create or replace function private.can_view_preview_locker(p_preview_locker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.preview_locker_viewer_grants grant_row
      where grant_row.preview_locker_id = p_preview_locker_id
        and grant_row.viewer_user_id = (select auth.uid())
        and grant_row.assigned_at + interval '48 hours' > now()
    );
$$;


create or replace function private.preview_conversion(p_preview uuid,p_action text,p_request uuid,p_session uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid(); admin boolean := coalesce(public.is_internal_admin(),false);
  c public.preview_conversion_campaigns; r public.preview_conversion_responses;
  referral public.preview_conversion_referrals; contact uuid; matches integer;
  email_value text := lower(btrim(p_data->>'email')); token_value uuid;
  candidate jsonb; candidate_count integer;
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
      if not exists(select 1 from public.preview_locker_viewer_grants where preview_locker_id=p_preview) then raise exception 'assign viewer first' using errcode='22023'; end if;
      update public.preview_conversion_campaigns set sent_at=coalesce(sent_at,clock_timestamp()),updated_at=clock_timestamp() where preview_id=p_preview;
    elsif not exists(select 1 from public.preview_conversion_responses where preview_id=p_preview and state='accepted') then
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
      session_value:=p_preview;
      if p_action='claim_submit' then
        insert into public.preview_conversion_events(preview_id,actor_id,session_id,request_id,kind)
          values(p_preview,actor,p_preview,p_request,'accepted');
        if p_data->>'dashboard_interest'='true' then
          insert into public.preview_conversion_events(preview_id,actor_id,session_id,request_id,kind) values(p_preview,actor,p_preview,p_request,'dashboard_interest');
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
    values(actor,'preview.conversion.'||p_action,'preview_locker',p_preview::text,'platform','low',jsonb_build_object('event',p_action));
  end if;
  return jsonb_build_object('saved',true,'token',token_value);
end;
$$;

create or replace function private.assign_preview_locker_viewer(
  p_preview_locker_id uuid,
  p_email text
)
returns text
language plpgsql
security definer
set search_path = ''
as $
declare
  actor uuid := auth.uid();
  normalized_email text := lower(btrim(p_email));
  target_user_id uuid;
  previous_user_id uuid;
  action_name text;
begin
  if actor is null or not public.is_internal_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if normalized_email is null
    or length(normalized_email) not between 3 and 254
    or normalized_email ~ '[[:cntrl:][:space:]]'
    or normalized_email !~ '^[^@]+@[^@]+\.[^@]+
 then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  perform 1
  from public.preview_lockers
  where id = p_preview_locker_id
  for update;
  if not found then
    raise exception 'preview not found' using errcode = 'P0002';
  end if;

  select user_row.id
  into target_user_id
  from auth.users user_row
  where lower(user_row.email) = normalized_email
    and user_row.deleted_at is null;

  if target_user_id is null then
    return 'account_not_found';
  end if;

  select grant_row.viewer_user_id
  into previous_user_id
  from public.preview_locker_viewer_grants grant_row
  where grant_row.preview_locker_id = p_preview_locker_id
  for update;

  if previous_user_id = target_user_id and exists (select 1 from public.preview_locker_viewer_grants where preview_locker_id=p_preview_locker_id and assigned_at + interval '48 hours' > now()) then
    return 'unchanged';
  end if;

  insert into public.preview_locker_viewer_grants as current_grant (
    preview_locker_id,
    viewer_user_id,
    assigned_by,
    assigned_at,
    updated_at
  ) values (
    p_preview_locker_id,
    target_user_id,
    actor,
    clock_timestamp(),
    clock_timestamp()
  )
  on conflict (preview_locker_id) do update
  set viewer_user_id = excluded.viewer_user_id,
      assigned_by = excluded.assigned_by,
      assigned_at = excluded.assigned_at,
      updated_at = excluded.updated_at;

  action_name := case
    when previous_user_id is null then 'preview.viewer.assigned'
    else 'preview.viewer.reassigned'
  end;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    actor_role_scope,
    risk_level,
    previous_values,
    new_values,
    request_metadata
  ) values (
    actor,
    action_name,
    'preview_locker',
    p_preview_locker_id::text,
    'platform',
    'high',
    case when previous_user_id is null then null
      else jsonb_build_object('viewer_user_id', previous_user_id) end,
    jsonb_build_object('viewer_user_id', target_user_id),
    jsonb_build_object('source', 'private_preview_viewer_function', 'demo_only', true)
  );

  return case when previous_user_id is null then 'assigned' else 'reassigned' end;
end;
$;

-- Bound signed media links to the same viewer access window. Admin previews stay editable.
create function private.preview_media_ttl(p_preview uuid) returns integer language sql stable security definer set search_path='' as $
 select case when auth.uid() is null then 0 when public.is_internal_admin() then 900 else
 coalesce((select greatest(0,least(900,floor(extract(epoch from (assigned_at + interval '48 hours' - now())))::integer))
 from public.preview_locker_viewer_grants where preview_locker_id=p_preview and viewer_user_id=auth.uid()),0) end;
$;
revoke all on function private.preview_media_ttl(uuid) from public,anon,authenticated,service_role;
grant execute on function private.preview_media_ttl(uuid) to authenticated;
create function public.preview_media_ttl(p_preview uuid) returns integer language sql security invoker set search_path='' begin atomic;
 select private.preview_media_ttl(p_preview);
end;
revoke all on function public.preview_media_ttl(uuid) from public,anon,authenticated,service_role;
grant execute on function public.preview_media_ttl(uuid) to authenticated;
commit;
