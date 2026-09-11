begin;

create table private.preview_conversion_limits (
  actor_id uuid primary key references auth.users(id) on delete cascade,
  window_at timestamptz not null,
  requests integer not null
);
alter table private.preview_conversion_limits enable row level security;
revoke all on private.preview_conversion_limits from public,anon,authenticated,service_role;

create table public.preview_conversion_campaigns (
  preview_id uuid primary key references public.preview_lockers(id) on delete restrict,
  contact_id uuid not null unique references public.gtm_contacts(id) on delete restrict,
  campaign text not null check (campaign ~ '^[a-zA-Z0-9_-]{1,80}$'),
  channel text not null check (channel in ('email','linkedin','sms','in_person','referral','other')),
  relationship text not null check (relationship in ('warm','cold')),
  source text not null check (source ~ '^[a-zA-Z0-9_-]{1,80}$'),
  is_test boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default clock_timestamp(),
  sent_at timestamptz,
  referral_token uuid unique,
  updated_at timestamptz not null default clock_timestamp()
);
create table public.preview_conversion_responses (
  preview_id uuid primary key references public.preview_conversion_campaigns(preview_id),
  actor_id uuid not null references auth.users(id),
  state text not null check (state in ('accepted','declined')),
  email text check (email = lower(btrim(email)) and length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  updates_permission boolean not null default false,
  dashboard_interest boolean not null default false,
  decline_reason text check (length(decline_reason) <= 500),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (state <> 'accepted' or (email is not null and updates_permission))
);
create table public.preview_conversion_events (
  id uuid primary key default gen_random_uuid(),
  preview_id uuid not null references public.preview_conversion_campaigns(preview_id),
  actor_id uuid references auth.users(id),
  session_id uuid not null,
  request_id uuid not null,
  kind text not null check (kind in ('sent','view','photos_view','film_view','claim_click','accepted','declined','claim_submit','dashboard_interest','booking_click','booking_confirmed','walkthrough_completed','referral_created','referral_copied','referral_submit','referred_prepared','referred_claimed')),
  related_id uuid,
  utm jsonb not null default '{}'::jsonb check (jsonb_typeof(utm) = 'object' and octet_length(utm::text) <= 512),
  created_at timestamptz not null default clock_timestamp(),
  unique(preview_id,kind,request_id),
  unique(preview_id,kind,session_id)
);
create table public.preview_conversion_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_preview_id uuid not null references public.preview_conversion_campaigns(preview_id),
  actor_id uuid not null unique references auth.users(id),
  reserved_preview_id uuid not null unique default gen_random_uuid(),
  preview_id uuid unique references public.preview_lockers(id),
  contact_id uuid references public.gtm_contacts(id),
  full_name text not null check (length(btrim(full_name)) between 2 and 120),
  email text not null unique check (email = lower(btrim(email)) and length(email) <= 254),
  campaign text not null,
  source text not null,
  consent_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  check (preview_id is null or preview_id = reserved_preview_id)
);
create index preview_conversion_cohort on public.preview_conversion_campaigns(created_at,campaign,source,channel);
create index preview_conversion_timeline on public.preview_conversion_events(preview_id,created_at);
create index preview_conversion_actor on public.preview_conversion_events(actor_id,created_at);
create index preview_conversion_referrer on public.preview_conversion_referrals(referrer_preview_id);
create index preview_conversion_referral_contact on public.preview_conversion_referrals(contact_id);
create index preview_conversion_response_actor on public.preview_conversion_responses(actor_id);
create index preview_conversion_creator on public.preview_conversion_campaigns(created_by);
create index preview_conversion_related_intake on public.preview_conversion_events(related_id);
alter table public.preview_conversion_events add constraint conversion_event_related_referral foreign key(related_id) references public.preview_conversion_referrals(id);

alter table public.preview_conversion_campaigns enable row level security;
alter table public.preview_conversion_responses enable row level security;
alter table public.preview_conversion_events enable row level security;
alter table public.preview_conversion_referrals enable row level security;
revoke all on public.preview_conversion_campaigns,public.preview_conversion_responses,public.preview_conversion_events,public.preview_conversion_referrals from public,anon,authenticated,service_role;
grant select on public.preview_conversion_campaigns,public.preview_conversion_responses,public.preview_conversion_events,public.preview_conversion_referrals to authenticated;
create policy conversion_campaign_admin on public.preview_conversion_campaigns for select to authenticated using ((select public.is_internal_admin()));
create policy conversion_response_admin on public.preview_conversion_responses for select to authenticated using ((select public.is_internal_admin()));
create policy conversion_event_admin on public.preview_conversion_events for select to authenticated using ((select public.is_internal_admin()));
create policy conversion_referral_admin on public.preview_conversion_referrals for select to authenticated using ((select public.is_internal_admin()));

create function private.conversion_append_only() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'append only ledger' using errcode='42501'; end;
$$;
create trigger conversion_events_append_only before update or delete on public.preview_conversion_events for each row execute function private.conversion_append_only();
revoke all on function private.conversion_append_only() from public,anon,authenticated,service_role;

-- One transaction entry point; public invoker wrapper matches existing preview RPC architecture.
create function private.preview_conversion(p_preview uuid,p_action text,p_request uuid,p_session uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid(); admin boolean := coalesce(public.is_internal_admin(),false);
  c public.preview_conversion_campaigns; r public.preview_conversion_responses;
  referral public.preview_conversion_referrals; contact uuid; matches integer;
  email_value text := lower(btrim(p_data->>'email')); token_value uuid;
  session_value uuid := p_session; event_name text; utm_value jsonb := coalesce(p_data->'utm','{}');
begin
  if actor is null or p_request is null or p_session is null then raise exception 'forbidden' using errcode='42501'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text)>4096
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
revoke all on function private.preview_conversion(uuid,text,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.preview_conversion(uuid,text,uuid,uuid,jsonb) to authenticated;
create function public.preview_conversion(p_preview uuid,p_action text,p_request uuid,p_session uuid,p_data jsonb)
returns jsonb language sql security invoker set search_path='' begin atomic;
  select private.preview_conversion(p_preview,p_action,p_request,p_session,p_data);
end;
revoke all on function public.preview_conversion(uuid,text,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.preview_conversion(uuid,text,uuid,uuid,jsonb) to authenticated;

create function private.prepare_conversion_referral() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.preview_conversion_referrals; c public.preview_conversion_campaigns;
begin
  select * into r from public.preview_conversion_referrals where reserved_preview_id=new.id for update;
  if not found then return new; end if;
  if auth.uid() is null or not public.is_internal_admin() or r.contact_id is null then raise exception 'resolve referral contact before preparation' using errcode='42501'; end if;
  select * into c from public.preview_conversion_campaigns where preview_id=r.referrer_preview_id;
  update public.preview_conversion_referrals set preview_id=new.id where id=r.id;
  insert into public.preview_conversion_campaigns(preview_id,contact_id,campaign,channel,relationship,source,created_by)
    values(new.id,r.contact_id,r.campaign,'referral','warm',r.source,auth.uid());
  insert into public.preview_conversion_events(preview_id,actor_id,session_id,request_id,kind,related_id)
    values(r.referrer_preview_id,auth.uid(),r.id,r.id,'referred_prepared',r.id);
  return new;
end;
$$;
revoke all on function private.prepare_conversion_referral() from public,anon,authenticated,service_role;
create trigger prepare_conversion_referral after insert on public.preview_lockers for each row execute function private.prepare_conversion_referral();
commit;
