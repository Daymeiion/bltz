-- Bounded preview invitation operations. SMTP acceptance and mailbox DSNs are
-- transport evidence only: neither reading, identity verification nor ownership.
-- No access assignment/renewal, campaign enrollment or manual sent_at changes.
begin;

create table private.preview_invitation_email_attempts (
  id uuid primary key default gen_random_uuid(),
  preview_id uuid not null references public.preview_lockers(id) on delete restrict,
  contact_id uuid references public.gtm_contacts(id) on delete restrict,
  environment text not null check (environment in ('development','production')),
  created_by uuid not null references auth.users(id) on delete restrict,
  request_id uuid not null unique,
  recipient_email text not null check (recipient_email=lower(btrim(recipient_email)) and length(recipient_email) between 3 and 254 and recipient_email !~ '[[:cntrl:][:space:]]' and recipient_email ~ '^[^@]+@[^@]+\.[^@]+$'),
  recipient_name text not null check (length(recipient_name)<=200),
  preview_name text not null check (length(preview_name)<=200),
  short_alias text not null check (short_alias ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(short_alias) between 3 and 70),
  message_id text not null unique,
  state text not null default 'prepared' check (state in ('prepared','sending','smtp_accepted','delivery_delayed','delivery_reported','bounced','send_failed','send_uncertain')),
  failure_code text check (failure_code in ('smtp_rejected','smtp_auth_failed','smtp_unavailable','smtp_uncertain')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  sending_at timestamptz,
  smtp_accepted_at timestamptz,
  report_at timestamptz,
  state_event_id uuid not null default gen_random_uuid(),
  last_checked_at timestamptz,
  unique (id,environment),
  check (message_id='<bltz-preview-'||id::text||'@bltz.me>')
);
create table private.preview_invitation_email_receipts (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null,
  environment text not null check (environment in ('development','production')),
  receipt_id text not null check (receipt_id ~ '^[1-9][0-9]{0,19}:[1-9][0-9]{0,19}(:[A-Za-z0-9_-]{1,64})?$'),
  message_id text not null check (length(message_id)<=100),
  recipient_email text not null check (length(recipient_email)<=254),
  action text not null check (action in ('delivered','failed','delayed')),
  status text not null check (status ~ '^[245]\.[0-9]{1,3}\.[0-9]{1,3}$'),
  observed_at timestamptz not null,
  received_at timestamptz not null default clock_timestamp(),
  unique (environment,receipt_id),
  foreign key (attempt_id,environment) references private.preview_invitation_email_attempts(id,environment) on delete restrict,
  check ((action='delivered' and left(status,1)='2') or (action='failed' and left(status,1)='5') or (action='delayed' and left(status,1)='4'))
);
create index preview_invitation_email_preview on private.preview_invitation_email_attempts(preview_id,environment,created_at desc,id);
create index preview_invitation_email_checks on private.preview_invitation_email_attempts(environment,last_checked_at,created_at desc,id) where state in ('sending','smtp_accepted','delivery_delayed','delivery_reported','send_uncertain');
create index preview_invitation_email_receipts_attempt on private.preview_invitation_email_receipts(attempt_id,observed_at desc);
alter table private.preview_invitation_email_attempts enable row level security;
alter table private.preview_invitation_email_receipts enable row level security;
revoke all on private.preview_invitation_email_attempts,private.preview_invitation_email_receipts from public,anon,authenticated,service_role;
comment on table private.preview_invitation_email_receipts is 'Normalized mailbox DSN observations, not authenticated identity, ownership, inbox-read or anti-abuse evidence. Raw mail bodies are not retained.';

-- Extend only the privileged export builder. The public client event RPC and
-- its allowlist remain unchanged. Abort if the reviewed predecessor differs.
do $migration$
declare definition text := pg_get_functiondef('private.append_preview_analytics(uuid,uuid,text,uuid,timestamptz,text,text,text,integer)'::regprocedure);
  previous text := '''referred_prepared'',''referred_claimed'')';
begin
  if strpos(definition, previous)=0 or strpos(definition, '''email_smtp_accepted''')<>0 then
    raise exception 'Unexpected preview analytics builder; review before migration';
  end if;
  definition:=replace(definition, previous, '''referred_prepared'',''referred_claimed'',''email_smtp_accepted'',''email_delivery_delayed'',''email_delivery_reported'',''email_bounced'',''email_send_failed'',''email_send_uncertain'')');
  execute definition;
end;
$migration$;

create function private.preview_invitation_email_context(p_row private.preview_invitation_email_attempts,p_should_send boolean)
returns jsonb language sql immutable set search_path='' as $$
  select jsonb_build_object('id',p_row.id,'preview_id',p_row.preview_id,'recipient_email',p_row.recipient_email,'recipient_name',p_row.recipient_name,'preview_name',p_row.preview_name,'short_alias',p_row.short_alias,'state',p_row.state,'message_id',p_row.message_id,'created_at',p_row.created_at,'should_send',p_should_send);
$$;
revoke all on function private.preview_invitation_email_context(private.preview_invitation_email_attempts,boolean) from public,anon,authenticated,service_role;

create function private.preview_invitation_email_guard() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then raise exception 'invitation history retained' using errcode='42501'; end if;
  if (new.id,new.preview_id,new.contact_id,new.environment,new.created_by,new.request_id,new.recipient_email,new.recipient_name,new.preview_name,new.short_alias,new.message_id,new.created_at)
    is distinct from (old.id,old.preview_id,old.contact_id,old.environment,old.created_by,old.request_id,old.recipient_email,old.recipient_name,old.preview_name,old.short_alias,old.message_id,old.created_at) then
    raise exception 'invitation snapshot immutable' using errcode='42501';
  end if;
  if old.state='bounced' and new.state<>old.state then raise exception 'bounce state retained' using errcode='42501'; end if;
  return new;
end;
$$;
revoke all on function private.preview_invitation_email_guard() from public,anon,authenticated,service_role;
create trigger preview_invitation_email_snapshot before update or delete on private.preview_invitation_email_attempts for each row execute function private.preview_invitation_email_guard();
create function private.preview_invitation_email_receipt_guard() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'DSN receipt append only' using errcode='42501'; end;
$$;
revoke all on function private.preview_invitation_email_receipt_guard() from public,anon,authenticated,service_role;
create trigger preview_invitation_email_receipt_immutable before update or delete on private.preview_invitation_email_receipts for each row execute function private.preview_invitation_email_receipt_guard();

-- State facts and audit export contain no email, alias, mail body or SMTP error.
create function private.preview_invitation_email_state_event() returns trigger language plpgsql security definer set search_path='' as $$
declare event_kind text; capture_environment text;
begin
  if tg_op='UPDATE' and new.state=old.state then return new; end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,previous_values,new_values,request_metadata)
  values(new.created_by,'preview.invitation.'||new.state,'preview_locker',new.preview_id::text,'platform','low',
    case when tg_op='UPDATE' then jsonb_build_object('state',old.state) end,
    jsonb_build_object('attempt_id',new.id,'state',new.state,'environment',new.environment),
    jsonb_build_object('source','preview_invitation_email_ledger','measurement','mail_transport_only'));
  event_kind:=case new.state when 'smtp_accepted' then 'email_smtp_accepted' when 'delivery_delayed' then 'email_delivery_delayed' when 'delivery_reported' then 'email_delivery_reported' when 'bounced' then 'email_bounced' when 'send_failed' then 'email_send_failed' when 'send_uncertain' then 'email_send_uncertain' end;
  select environment into capture_environment from private.preview_analytics_capture_config where singleton;
  if event_kind is not null and capture_environment=new.environment then
    perform private.append_preview_analytics(new.state_event_id,new.preview_id,event_kind,null,coalesce(new.report_at,new.updated_at),'operational','server_workflow');
  end if;
  return new;
end;
$$;
revoke all on function private.preview_invitation_email_state_event() from public,anon,authenticated,service_role;
create trigger preview_invitation_email_state_audit after insert or update on private.preview_invitation_email_attempts for each row execute function private.preview_invitation_email_state_event();

-- Called only behind authorized RPCs; no direct grant-table reads are granted.
create function private.preview_invitation_email_can_send(p_preview uuid,p_contact uuid,p_email text,p_alias text)
returns boolean language plpgsql security definer set search_path='' as $$
declare valid_public boolean;
begin
  if p_contact is not null and not exists(select 1 from public.gtm_contacts where id=p_contact and not archived and lower(btrim(email))=p_email) then return false; end if;
  if p_contact is not null and exists(select 1 from public.preview_conversion_campaigns where preview_id=p_preview and contact_id<>p_contact) then return false; end if;
  if p_contact is not null and exists(select 1 from public.gtm_player_preview_lockers l join public.gtm_contacts c on c.id=p_contact where l.preview_locker_id=p_preview and c.player_master_gsis_id is distinct from l.gsis_id) then return false; end if;
  select public_access_enabled into valid_public from public.preview_locker_short_links where preview_id=p_preview and alias=p_alias;
  if not found then return false; end if;
  if valid_public then return true; end if;
  return exists(select 1 from public.preview_locker_viewer_grants g join auth.users u on u.id=g.viewer_user_id where g.preview_locker_id=p_preview and g.assigned_at+interval '48 hours'>clock_timestamp() and lower(u.email)=p_email and u.deleted_at is null);
end;
$$;
revoke all on function private.preview_invitation_email_can_send(uuid,uuid,text,text) from public,anon,authenticated,service_role;

create function public.prepare_preview_invitation_email(p_preview uuid,p_contact uuid,p_request uuid,p_environment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); attempt private.preview_invitation_email_attempts; recipient text; recipient_label text; preview_label text; alias_value text; attempt_id uuid:=gen_random_uuid();
begin
  if actor is null or not coalesce(public.is_internal_admin(),false) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_preview is null or p_request is null or p_environment is null or p_environment not in ('development','production') then raise exception 'invalid invitation' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('preview-email-request:'||p_request::text,913));
  select * into attempt from private.preview_invitation_email_attempts where request_id=p_request;
  if found then
    if (attempt.preview_id,attempt.contact_id,attempt.environment,attempt.created_by) is distinct from (p_preview,p_contact,p_environment,actor) then raise exception 'invitation request collision' using errcode='22023'; end if;
    return private.preview_invitation_email_context(attempt,false);
  end if;
  select full_name into preview_label from public.preview_lockers where id=p_preview for update;
  if not found then raise exception 'preview unavailable' using errcode='22023'; end if;
  if exists(select 1 from public.preview_conversion_campaigns where preview_id=p_preview and is_test) then raise exception 'test cohort outreach excluded' using errcode='22023'; end if;
  select alias into alias_value from public.preview_locker_short_links where preview_id=p_preview;
  if not found then raise exception 'preview link unavailable' using errcode='22023'; end if;
  if p_contact is not null then
    select lower(btrim(email)),coalesce(display_name,preview_label) into recipient,recipient_label from public.gtm_contacts where id=p_contact and not archived;
  else
    select lower(u.email),preview_label into recipient,recipient_label from public.preview_locker_viewer_grants g join auth.users u on u.id=g.viewer_user_id where g.preview_locker_id=p_preview and g.assigned_at+interval '48 hours'>clock_timestamp() and u.deleted_at is null;
  end if;
  if recipient is null or length(recipient) not between 3 and 254 or recipient ~ '[[:cntrl:][:space:]]' or recipient !~ '^[^@]+@[^@]+\.[^@]+$' or length(coalesce(recipient_label,''))>200 or length(coalesce(preview_label,''))>200 then raise exception 'recipient unavailable' using errcode='22023'; end if;
  if not private.preview_invitation_email_can_send(p_preview,p_contact,recipient,alias_value) then raise exception 'recipient or preview access unavailable' using errcode='22023'; end if;
  if exists(select 1 from private.preview_invitation_email_attempts where preview_id=p_preview and environment=p_environment and contact_id is not distinct from p_contact and created_at>clock_timestamp()-interval '30 seconds') then raise exception 'recent invitation already prepared' using errcode='22023'; end if;
  insert into private.preview_invitation_email_attempts(id,preview_id,contact_id,environment,created_by,request_id,recipient_email,recipient_name,preview_name,short_alias,message_id)
    values(attempt_id,p_preview,p_contact,p_environment,actor,p_request,recipient,coalesce(recipient_label,preview_label),preview_label,alias_value,'<bltz-preview-'||attempt_id::text||'@bltz.me>') returning * into attempt;
  return private.preview_invitation_email_context(attempt,true);
end;
$$;
revoke all on function public.prepare_preview_invitation_email(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.prepare_preview_invitation_email(uuid,uuid,uuid,text) to authenticated;

create function public.begin_preview_invitation_email(p_id uuid,p_environment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare attempt private.preview_invitation_email_attempts;
begin
  if p_id is null or p_environment is null or p_environment not in ('development','production') then raise exception 'invalid invitation' using errcode='22023'; end if;
  select * into attempt from private.preview_invitation_email_attempts where id=p_id and environment=p_environment for update;
  if not found then raise exception 'invitation unavailable' using errcode='22023'; end if;
  if attempt.state<>'prepared' then return private.preview_invitation_email_context(attempt,false); end if;
  if attempt.created_at<=clock_timestamp()-interval '1 hour' then raise exception 'prepared invitation expired' using errcode='22023'; end if;
  perform 1 from public.preview_lockers where id=attempt.preview_id for share;
  perform 1 from public.preview_locker_short_links where preview_id=attempt.preview_id for share;
  perform 1 from public.preview_locker_viewer_grants where preview_locker_id=attempt.preview_id for share;
  if not private.preview_invitation_email_can_send(attempt.preview_id,attempt.contact_id,attempt.recipient_email,attempt.short_alias) then raise exception 'recipient or preview access unavailable' using errcode='22023'; end if;
  update private.preview_invitation_email_attempts set state='sending',state_event_id=gen_random_uuid(),sending_at=clock_timestamp(),updated_at=clock_timestamp() where id=p_id returning * into attempt;
  return private.preview_invitation_email_context(attempt,true);
end;
$$;
revoke all on function public.begin_preview_invitation_email(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.begin_preview_invitation_email(uuid,text) to service_role;

create function public.settle_preview_invitation_email(p_id uuid,p_environment text,p_state text,p_failure_code text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare attempt private.preview_invitation_email_attempts;
begin
  if p_id is null or p_environment is null or p_environment not in ('development','production') or p_state is null or p_state not in ('smtp_accepted','send_failed','send_uncertain')
    or (p_state='smtp_accepted' and p_failure_code is not null) or (p_state='send_failed' and (p_failure_code is null or p_failure_code not in ('smtp_rejected','smtp_auth_failed','smtp_unavailable'))) or (p_state='send_uncertain' and p_failure_code is distinct from 'smtp_uncertain') then raise exception 'invalid SMTP outcome' using errcode='22023'; end if;
  select * into attempt from private.preview_invitation_email_attempts where id=p_id and environment=p_environment for update;
  if not found then raise exception 'invitation unavailable' using errcode='22023'; end if;
  if attempt.state=p_state then
    if attempt.failure_code is distinct from p_failure_code then raise exception 'SMTP outcome collision' using errcode='22023'; end if;
    return jsonb_build_object('settled',true,'duplicate',true,'state',attempt.state);
  end if;
  if attempt.state in ('delivery_delayed','delivery_reported','bounced') then
    if p_state='smtp_accepted' and attempt.smtp_accepted_at is null then update private.preview_invitation_email_attempts set smtp_accepted_at=clock_timestamp(),updated_at=clock_timestamp() where id=p_id; end if;
    return jsonb_build_object('settled',false,'state',attempt.state);
  end if;
  if attempt.state<>'sending' then return jsonb_build_object('settled',false,'state',attempt.state); end if;
  update private.preview_invitation_email_attempts set state=p_state,state_event_id=gen_random_uuid(),failure_code=p_failure_code,smtp_accepted_at=case when p_state='smtp_accepted' then clock_timestamp() end,updated_at=clock_timestamp() where id=p_id returning * into attempt;
  return jsonb_build_object('settled',true,'duplicate',false,'state',attempt.state);
end;
$$;
revoke all on function public.settle_preview_invitation_email(uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.settle_preview_invitation_email(uuid,text,text,text) to service_role;

-- Bounded fair rotation. A mailbox check can fail after claiming its slice;
-- the next cycles retry it without allowing a permanent oldest-20 bottleneck.
create function public.pending_preview_invitation_email_checks(p_environment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare checks jsonb;
begin
  if p_environment is null or p_environment not in ('development','production') then raise exception 'invalid environment' using errcode='22023'; end if;
  with picked as (
    select id from private.preview_invitation_email_attempts
    where environment=p_environment and state in ('sending','smtp_accepted','delivery_delayed','delivery_reported','send_uncertain')
      and created_at>clock_timestamp()-interval '14 days'
    order by last_checked_at nulls first,created_at desc,id limit 20 for update skip locked
  ), checked as (
    update private.preview_invitation_email_attempts a set last_checked_at=clock_timestamp()
    from picked where a.id=picked.id returning a.id,a.message_id,a.recipient_email,a.created_at
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'message_id',a.message_id,'recipient_email',a.recipient_email,'created_at',a.created_at) order by a.created_at desc,a.id),'[]'::jsonb) into checks from checked a;
  return checks;
end;
$$;
revoke all on function public.pending_preview_invitation_email_checks(text) from public,anon,authenticated,service_role;
grant execute on function public.pending_preview_invitation_email_checks(text) to service_role;
create function public.preview_invitation_email_report(p_preview uuid,p_environment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare total bigint; counts jsonb; attempts jsonb;
begin
  if auth.uid() is null or not coalesce(public.is_internal_admin(),false) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_preview is null or p_environment is null or p_environment not in ('development','production') then raise exception 'invalid report' using errcode='22023'; end if;
  if not exists(select 1 from public.preview_lockers where id=p_preview) then raise exception 'preview unavailable' using errcode='22023'; end if;
  select count(*) into total from private.preview_invitation_email_attempts where preview_id=p_preview and environment=p_environment;
  select jsonb_object_agg(state,n) into counts from (select s.state,count(a.id) n from unnest(array['prepared','sending','smtp_accepted','delivery_delayed','delivery_reported','bounced','send_failed','send_uncertain']) s(state) left join private.preview_invitation_email_attempts a on a.state=s.state and a.preview_id=p_preview and a.environment=p_environment group by s.state) c;
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'state',a.state,'recipient_masked',left(split_part(a.recipient_email,'@',1),1)||'***@'||split_part(a.recipient_email,'@',2),'created_at',a.created_at,'updated_at',a.updated_at,'smtp_accepted_at',a.smtp_accepted_at,'report_at',a.report_at,'failure_code',a.failure_code) order by a.created_at desc,a.id),'[]'::jsonb) into attempts from (select * from private.preview_invitation_email_attempts where preview_id=p_preview and environment=p_environment order by created_at desc,id limit 20) a;
  return jsonb_build_object('preview_id',p_preview,'total_attempts',total,'limited',total>20,'counts',counts,'attempts',attempts);
end;
$$;
revoke all on function public.preview_invitation_email_report(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.preview_invitation_email_report(uuid,text) to authenticated;

create function public.record_preview_invitation_dsn(p_id uuid,p_environment text,p_receipt_id text,p_message_id text,p_recipient text,p_action text,p_status text,p_observed_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare attempt private.preview_invitation_email_attempts; receipt private.preview_invitation_email_receipts; target_state text;
begin
  if p_id is null or p_environment is null or p_environment not in ('development','production') or p_receipt_id is null or p_receipt_id !~ '^[1-9][0-9]{0,19}:[1-9][0-9]{0,19}(:[A-Za-z0-9_-]{1,64})?$'
    or p_action is null or p_action not in ('delivered','failed','delayed') or p_status is null or p_status !~ '^[245]\.[0-9]{1,3}\.[0-9]{1,3}$' or not ((p_action='delivered' and left(p_status,1)='2') or (p_action='failed' and left(p_status,1)='5') or (p_action='delayed' and left(p_status,1)='4')) or p_observed_at is null or p_observed_at>clock_timestamp()+interval '5 minutes' then raise exception 'invalid DSN receipt' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('preview-email-receipt:'||p_environment||':'||p_receipt_id,914));
  select * into attempt from private.preview_invitation_email_attempts where id=p_id and environment=p_environment for update;
  if not found or p_message_id is distinct from attempt.message_id or p_recipient is distinct from attempt.recipient_email or p_observed_at<attempt.created_at-interval '5 minutes' then raise exception 'DSN invitation mismatch' using errcode='22023'; end if;
  select * into receipt from private.preview_invitation_email_receipts where environment=p_environment and receipt_id=p_receipt_id;
  if found then
    if (receipt.attempt_id,receipt.message_id,receipt.recipient_email,receipt.action,receipt.status,receipt.observed_at) is distinct from (p_id,p_message_id,p_recipient,p_action,p_status,p_observed_at) then raise exception 'DSN receipt collision' using errcode='22023'; end if;
    return jsonb_build_object('recorded',true,'duplicate',true,'state',attempt.state);
  end if;
  if attempt.state in ('prepared','send_failed') then raise exception 'invitation not submitted' using errcode='22023'; end if;
  insert into private.preview_invitation_email_receipts(attempt_id,environment,receipt_id,message_id,recipient_email,action,status,observed_at) values(p_id,p_environment,p_receipt_id,p_message_id,p_recipient,p_action,p_status,p_observed_at) returning * into receipt;
  target_state:=case p_action when 'failed' then 'bounced' when 'delivered' then 'delivery_reported' else 'delivery_delayed' end;
  if attempt.state<>'bounced' and not (attempt.state='delivery_reported' and p_action='delayed') and (p_action='failed' or attempt.report_at is null or p_observed_at>attempt.report_at or (p_observed_at=attempt.report_at and target_state='delivery_reported')) then
    update private.preview_invitation_email_attempts set state=target_state,state_event_id=case when state<>target_state then receipt.id else state_event_id end,report_at=p_observed_at,updated_at=clock_timestamp(),failure_code=null where id=p_id returning * into attempt;
  end if;
  return jsonb_build_object('recorded',true,'duplicate',false,'state',attempt.state);
end;
$$;
revoke all on function public.record_preview_invitation_dsn(uuid,text,text,text,text,text,text,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.record_preview_invitation_dsn(uuid,text,text,text,text,text,text,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
