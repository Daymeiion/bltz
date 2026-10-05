-- Internal development review foundations. No publishing, rights grants, commerce
-- or legacy-table rewrites. Local migration; requires reviewed graph + engine runs.
begin;

create table public.intelligence_review_opportunities (
  id uuid primary key default gen_random_uuid(),
  environment text not null default 'development' check(environment = 'development'),
  opportunity_key text not null check(length(btrim(opportunity_key)) between 1 and 800),
  player_id uuid not null references public.players(id) on delete restrict,
  moment_id uuid references public.moments(id) on delete restrict,
  run_id uuid references public.intelligence_engine_runs(id) on delete restrict,
  rule_version text not null check(length(btrim(rule_version)) between 1 and 80),
  signal_keys text[] not null check(cardinality(signal_keys) between 1 and 32),
  evidence_ids uuid[] not null default '{}' check(cardinality(evidence_ids) <= 64),
  input_snapshot jsonb not null check(jsonb_typeof(input_snapshot) = 'object' and octet_length(input_snapshot::text) <= 32768),
  title text not null check(length(btrim(title)) between 1 and 400),
  explanation text not null check(length(btrim(explanation)) between 1 and 4000),
  state text not null default 'candidate' check(state in ('candidate','in_review','ready','accepted','dismissed','expired')),
  readiness_blockers text[] not null default array['permissions_and_measurement_review_required']::text[] check(cardinality(readiness_blockers) <= 24),
  assignee_id uuid references auth.users(id) on delete restrict,
  expires_at timestamptz,
  revision integer not null default 1 check(revision > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(environment, opportunity_key)
);
create index intelligence_review_opportunities_player on public.intelligence_review_opportunities(player_id,state,updated_at desc);
create index intelligence_review_opportunities_run on public.intelligence_review_opportunities(run_id) where run_id is not null;
create index intelligence_review_opportunities_assignment on public.intelligence_review_opportunities(assignee_id,state,expires_at);

create table public.intelligence_moment_asset_links (
  id uuid primary key default gen_random_uuid(),
  environment text not null default 'development' check(environment = 'development'),
  player_id uuid not null references public.players(id) on delete restrict,
  moment_id uuid not null references public.moments(id) on delete restrict,
  legacy_media_id uuid references public.media(id) on delete restrict,
  legacy_video_id uuid references public.videos(id) on delete restrict,
  status text not null check(status in ('verified','rejected')),
  evidence_ids uuid[] not null check(cardinality(evidence_ids) between 1 and 64),
  review_reason text not null check(length(btrim(review_reason)) between 1 and 2000),
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  revision integer not null default 1 check(revision > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(num_nonnulls(legacy_media_id, legacy_video_id) = 1)
);
create unique index intelligence_moment_asset_media_unique on public.intelligence_moment_asset_links(player_id,moment_id,legacy_media_id) where legacy_media_id is not null;
create unique index intelligence_moment_asset_video_unique on public.intelligence_moment_asset_links(player_id,moment_id,legacy_video_id) where legacy_video_id is not null;
create index intelligence_moment_asset_status on public.intelligence_moment_asset_links(player_id,moment_id,status);
comment on table public.intelligence_moment_asset_links is 'Explicit reviewed legacy asset association; never rights ownership, contribution or commercial clearance.';

create table public.intelligence_activation_drafts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.intelligence_review_opportunities(id) on delete restrict,
  title text not null check(length(btrim(title)) between 1 and 400),
  description text not null check(length(btrim(description)) between 1 and 4000),
  proposed_brands jsonb not null default '[]' check(jsonb_typeof(proposed_brands) = 'array' and jsonb_array_length(proposed_brands) <= 8),
  intended_use text not null check(intended_use in ('internal_review','public_display','social_publication','license','print','commercial_campaign')),
  release_at timestamptz,
  state text not null default 'draft' check(state in ('draft','awaiting_approvals','paused','cancelled')),
  owner_id uuid not null references auth.users(id) on delete restrict,
  revision integer not null default 1 check(revision > 0),
  review_approved_revision integer check(review_approved_revision is null or review_approved_revision = revision),
  metrics jsonb check(metrics is null),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index intelligence_activation_drafts_opportunity on public.intelligence_activation_drafts(opportunity_id,updated_at desc);
create index intelligence_activation_drafts_owner on public.intelligence_activation_drafts(owner_id,state);
comment on column public.intelligence_activation_drafts.review_approved_revision is 'Internal editorial review only. Does not grant intended-use rights, brand agreement, publishing or financial entitlement.';
comment on column public.intelligence_activation_drafts.metrics is 'Unavailable until a separately reviewed measured-outcome adapter is implemented; no illustrative metrics.';

create table public.intelligence_activation_assets (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references public.intelligence_activation_drafts(id) on delete restrict,
  moment_asset_link_id uuid not null references public.intelligence_moment_asset_links(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(activation_id, moment_asset_link_id)
);
create index intelligence_activation_assets_links on public.intelligence_activation_assets(moment_asset_link_id,active);

create table public.intelligence_workflow_history (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.intelligence_review_opportunities(id) on delete restrict,
  activation_id uuid references public.intelligence_activation_drafts(id) on delete restrict,
  moment_asset_link_id uuid references public.intelligence_moment_asset_links(id) on delete restrict,
  command_id uuid not null unique,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check(length(btrim(action)) between 1 and 80),
  reason text not null check(length(btrim(reason)) between 1 and 2000),
  revision integer not null check(revision > 0),
  request_hash text not null check(request_hash ~ '^[a-f0-9]{32}$'),
  before_snapshot jsonb,
  after_snapshot jsonb not null check(jsonb_typeof(after_snapshot)='object' and octet_length(after_snapshot::text)<=65536),
  created_at timestamptz not null default now(),
  check(num_nonnulls(opportunity_id,activation_id,moment_asset_link_id)=1)
);
create index intelligence_workflow_history_opportunity on public.intelligence_workflow_history(opportunity_id,created_at);
create index intelligence_workflow_history_activation on public.intelligence_workflow_history(activation_id,created_at);
create index intelligence_workflow_history_link on public.intelligence_workflow_history(moment_asset_link_id,created_at);

-- Defense in depth: provenance must belong to this canonical athlete/Moment.
create function private.intelligence_workflow_check_context(p_player uuid,p_moment uuid,p_evidence uuid[],p_run uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if p_moment is not null and not exists(select 1 from public.moments m join public.moment_athletes ma on ma.moment_id=m.id
    where m.id=p_moment and ma.player_id=p_player and m.status='verified' and ma.status='verified') then
    raise exception 'verified_moment_relationship_required' using errcode='23514';
  end if;
  if exists(select 1 from unnest(p_evidence) evidence_id where not exists(select 1 from public.intelligence_evidence e
    where e.id=evidence_id and e.player_id=p_player and e.status='verified' and (e.moment_id is null or e.moment_id is not distinct from p_moment))) then
    raise exception 'verified_evidence_context_required' using errcode='23514';
  end if;
  if p_run is not null and not exists(select 1 from public.intelligence_engine_runs r where r.id=p_run and r.player_id=p_player
    and r.environment='development' and (r.moment_id is null or r.moment_id is not distinct from p_moment)) then
    raise exception 'engine_run_context_mismatch' using errcode='23514';
  end if;
  if p_run is null and cardinality(p_evidence)=0 then raise exception 'input_lineage_required' using errcode='23514'; end if;
end $$;

-- One database permission adapter for legacy display eligibility. It deliberately
-- cannot approve publishing/licensing/commercial use from legacy flags.
create function private.intelligence_workflow_asset_display_eligible(p_link uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.intelligence_moment_asset_links l
    join public.moments m on m.id=l.moment_id and m.status='verified'
    join public.moment_athletes ma on ma.moment_id=l.moment_id and ma.player_id=l.player_id and ma.status='verified'
    left join public.media a on a.id=l.legacy_media_id
    where l.id=p_link and l.status='verified' and l.legacy_media_id is not null and a.player_id=l.player_id
      and a.kind in ('photo','headshot','video') and a.license_status='approved' and a.public_locker_approved
      and nullif(btrim(a.license_kind),'') is not null);
$$;

create function private.intelligence_workflow_validate_row() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_op public.intelligence_review_opportunities%rowtype; v_brand jsonb;
begin
  if tg_table_name='intelligence_review_opportunities' then
    if tg_op='INSERT' or row(new.run_id,new.evidence_ids,new.input_snapshot) is distinct from row(old.run_id,old.evidence_ids,old.input_snapshot) then
      perform private.intelligence_workflow_check_context(new.player_id,new.moment_id,new.evidence_ids,new.run_id);
    end if;
    if new.run_id is not null and not exists(select 1 from public.intelligence_engine_runs r where r.id=new.run_id
      and r.rule_version=new.rule_version and jsonb_typeof(r.signals->'signals')='array' and jsonb_typeof(r.signals->'opportunities')='array'
      and exists(select 1 from jsonb_array_elements(r.signals->'opportunities') o where o->>'key'=new.opportunity_key and o->>'playerId'=new.player_id::text and o->>'momentId' is not distinct from new.moment_id::text)
      and not exists(select 1 from unnest(new.signal_keys) k where not exists(select 1 from jsonb_array_elements(r.signals->'signals') s where s->>'key'=k and s->>'playerId'=new.player_id::text))) then
      raise exception 'engine_signal_lineage_mismatch' using errcode='23514';
    end if;
    if exists(select 1 from unnest(new.signal_keys) k where coalesce(length(btrim(k)),0) not between 1 and 800)
      or exists(select 1 from unnest(new.readiness_blockers) k where coalesce(length(btrim(k)),0) not between 1 and 240) then raise exception 'invalid_lineage_keys'; end if;
    if tg_op='UPDATE' and row(new.player_id,new.moment_id,new.opportunity_key,new.environment,new.created_by,new.created_at)
      is distinct from row(old.player_id,old.moment_id,old.opportunity_key,old.environment,old.created_by,old.created_at) then raise exception 'opportunity_identity_immutable'; end if;
  elsif tg_table_name='intelligence_moment_asset_links' then
    if tg_op='UPDATE' and row(new.player_id,new.moment_id,new.legacy_media_id,new.legacy_video_id,new.environment,new.created_at)
      is distinct from row(old.player_id,old.moment_id,old.legacy_media_id,old.legacy_video_id,old.environment,old.created_at) then raise exception 'asset_link_identity_immutable'; end if;
    if new.status='verified' then
      perform private.intelligence_workflow_check_context(new.player_id,new.moment_id,new.evidence_ids,null);
      if (new.legacy_media_id is not null and not exists(select 1 from public.media m where m.id=new.legacy_media_id and m.player_id=new.player_id))
        or (new.legacy_video_id is not null and not exists(select 1 from public.videos v where v.id=new.legacy_video_id and v.player_id=new.player_id)) then
        raise exception 'asset_athlete_relationship_required' using errcode='23514';
      end if;
    end if;
  elsif tg_table_name='intelligence_activation_drafts' then
    if tg_op='UPDATE' and row(new.opportunity_id,new.created_by,new.created_at) is distinct from row(old.opportunity_id,old.created_by,old.created_at) then raise exception 'activation_identity_immutable'; end if;
    for v_brand in select value from jsonb_array_elements(new.proposed_brands) loop
      if jsonb_typeof(v_brand)<>'object' or v_brand->>'status' is distinct from 'proposed' or coalesce(length(btrim(v_brand->>'name')),0) not between 1 and 120
        or v_brand - 'name' - 'status' <> '{}'::jsonb then raise exception 'brand_is_proposal_only'; end if;
    end loop;
  elsif tg_table_name='intelligence_activation_assets' then
    select * into strict v_op from public.intelligence_review_opportunities where id=(select opportunity_id from public.intelligence_activation_drafts where id=new.activation_id);
    if new.active and not exists(select 1 from public.intelligence_moment_asset_links l where l.id=new.moment_asset_link_id and l.player_id=v_op.player_id
      and (v_op.moment_id is null or l.moment_id=v_op.moment_id) and l.status='verified') then raise exception 'activation_asset_context_mismatch'; end if;
  end if;
  return new;
end $$;
create trigger workflow_opportunity_context before insert or update on public.intelligence_review_opportunities for each row execute function private.intelligence_workflow_validate_row();
create trigger workflow_link_context before insert or update on public.intelligence_moment_asset_links for each row execute function private.intelligence_workflow_validate_row();
create trigger workflow_activation_context before insert or update on public.intelligence_activation_drafts for each row execute function private.intelligence_workflow_validate_row();
create trigger workflow_asset_context before insert or update on public.intelligence_activation_assets for each row execute function private.intelligence_workflow_validate_row();

create function public.mutate_intelligence_workflow(p_actor_id uuid,p_command jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  v_action text:=p_command->>'action'; v_command uuid:=(p_command->>'commandId')::uuid;
  v_hash text:=md5(jsonb_build_object('actor',p_actor_id,'command',p_command)::text);
  v_history public.intelligence_workflow_history%rowtype;
  v_op public.intelligence_review_opportunities%rowtype; v_activation public.intelligence_activation_drafts%rowtype;
  v_link public.intelligence_moment_asset_links%rowtype; v_related public.intelligence_activation_drafts%rowtype; v_related_after jsonb;
  v_before jsonb; v_after jsonb; v_id uuid; v_kind text; v_revision integer; v_asset_ids uuid[]; v_duplicate boolean:=false;
begin
  if p_actor_id is null or not exists(select 1 from auth.users where id=p_actor_id) then raise exception 'actor_required' using errcode='42501'; end if;
  if v_command is null or length(btrim(p_command->>'reason')) not between 1 and 2000 then raise exception 'command_and_reason_required'; end if;
  perform pg_advisory_xact_lock(hashtext(v_command::text));
  select * into v_history from public.intelligence_workflow_history where command_id=v_command;
  if found then
    if v_history.request_hash<>v_hash then raise exception 'command_identity_collision' using errcode='23514'; end if;
    return jsonb_build_object('record',v_history.after_snapshot,'duplicate',true);
  end if;

  if v_action='register_opportunity' then
    perform pg_advisory_xact_lock(hashtext(p_command->>'opportunityKey'));
    select * into v_op from public.intelligence_review_opportunities where environment='development' and opportunity_key=p_command->>'opportunityKey' for update;
    if found then
      if v_op.player_id<>(p_command->>'playerId')::uuid or v_op.moment_id is distinct from (p_command->>'momentId')::uuid then raise exception 'opportunity_identity_collision'; end if;
      -- Engine refresh cannot reset an existing human decision or assignment.
      v_before:=to_jsonb(v_op); v_duplicate:=true;
    else
      insert into public.intelligence_review_opportunities(opportunity_key,player_id,moment_id,run_id,rule_version,signal_keys,evidence_ids,input_snapshot,title,explanation,expires_at,created_by,updated_by)
        values(p_command->>'opportunityKey',(p_command->>'playerId')::uuid,(p_command->>'momentId')::uuid,(p_command->>'runId')::uuid,p_command->>'ruleVersion',
          array(select jsonb_array_elements_text(p_command->'signalKeys')),array(select jsonb_array_elements_text(p_command->'evidenceIds'))::uuid[],
          p_command->'inputSnapshot',p_command->>'title',p_command->>'explanation',(p_command->>'expiresAt')::timestamptz,p_actor_id,p_actor_id) returning * into v_op;
    end if;
    v_id:=v_op.id; v_kind:='opportunity'; v_revision:=v_op.revision; v_after:=to_jsonb(v_op);
  elsif v_action='review_opportunity' then
    select * into strict v_op from public.intelligence_review_opportunities where id=(p_command->>'id')::uuid for update;
    if v_op.revision is distinct from (p_command->>'expectedRevision')::integer then raise exception 'revision_conflict' using errcode='40001'; end if;
    v_before:=to_jsonb(v_op);
    if v_op.state in ('dismissed','expired') and p_command->>'state' is distinct from v_op.state then raise exception 'terminal_review_decision_preserved'; end if;
    if p_command->>'state' in ('ready','accepted') then perform private.intelligence_workflow_check_context(v_op.player_id,v_op.moment_id,v_op.evidence_ids,v_op.run_id); end if;
    if p_command->>'state'='ready' and cardinality(case when p_command ? 'readinessBlockers' then array(select jsonb_array_elements_text(p_command->'readinessBlockers')) else v_op.readiness_blockers end)>0 then raise exception 'readiness_blocked'; end if;
    if p_command->>'state'='accepted' and v_op.expires_at is not null and v_op.expires_at<=now() then raise exception 'opportunity_expired'; end if;
    if p_command->>'state'='accepted' then
      if v_op.state not in ('ready','accepted') then raise exception 'opportunity_ready_required'; end if;
      if cardinality(v_op.readiness_blockers)>0 or cardinality(case when p_command ? 'readinessBlockers' then array(select jsonb_array_elements_text(p_command->'readinessBlockers')) else v_op.readiness_blockers end)>0 then raise exception 'readiness_blocked'; end if;
    end if;
    update public.intelligence_review_opportunities set state=p_command->>'state',
      assignee_id=case when p_command ? 'assigneeId' then (p_command->>'assigneeId')::uuid else assignee_id end,
      readiness_blockers=case when p_command ? 'readinessBlockers' then array(select jsonb_array_elements_text(p_command->'readinessBlockers')) else readiness_blockers end,
      revision=revision+1,updated_by=p_actor_id,updated_at=now() where id=v_op.id returning * into v_op;
    v_id:=v_op.id; v_kind:='opportunity'; v_revision:=v_op.revision; v_after:=to_jsonb(v_op);
  elsif v_action='review_asset_link' then
    if p_command->>'id' is null then
      insert into public.intelligence_moment_asset_links(player_id,moment_id,legacy_media_id,legacy_video_id,status,evidence_ids,review_reason,reviewed_by)
        values((p_command->>'playerId')::uuid,(p_command->>'momentId')::uuid,(p_command->>'legacyMediaId')::uuid,(p_command->>'legacyVideoId')::uuid,
          p_command->>'status',array(select jsonb_array_elements_text(p_command->'evidenceIds'))::uuid[],p_command->>'reason',p_actor_id) returning * into v_link;
    else
      select * into strict v_link from public.intelligence_moment_asset_links where id=(p_command->>'id')::uuid for update;
      if v_link.revision is distinct from (p_command->>'expectedRevision')::integer then raise exception 'revision_conflict' using errcode='40001'; end if;
      if row(v_link.player_id,v_link.moment_id,v_link.legacy_media_id,v_link.legacy_video_id) is distinct from row((p_command->>'playerId')::uuid,(p_command->>'momentId')::uuid,(p_command->>'legacyMediaId')::uuid,(p_command->>'legacyVideoId')::uuid) then raise exception 'asset_link_identity_immutable'; end if;
      v_before:=to_jsonb(v_link);
      update public.intelligence_moment_asset_links set status=p_command->>'status',evidence_ids=array(select jsonb_array_elements_text(p_command->'evidenceIds'))::uuid[],
        review_reason=p_command->>'reason',reviewed_by=p_actor_id,revision=revision+1,updated_at=now() where id=v_link.id returning * into v_link;
    end if;
    -- A rejected link immediately invalidates editorial approvals, independent of analytics.
    if v_link.status='rejected' then
      for v_related in select a.* from public.intelligence_activation_drafts a where a.review_approved_revision is not null
        and exists(select 1 from public.intelligence_activation_assets aa where aa.activation_id=a.id and aa.moment_asset_link_id=v_link.id and aa.active) for update loop
        update public.intelligence_activation_drafts set review_approved_revision=null,state=case when state='cancelled' then state else 'draft' end,
          revision=revision+1,updated_by=p_actor_id,updated_at=now() where id=v_related.id returning to_jsonb(intelligence_activation_drafts.*) into v_related_after;
        insert into public.intelligence_workflow_history(activation_id,command_id,actor_id,action,reason,revision,request_hash,before_snapshot,after_snapshot)
          values(v_related.id,md5(v_command::text||v_related.id::text)::uuid,p_actor_id,'asset_link_review_invalidated',p_command->>'reason',
            (v_related_after->>'revision')::integer,v_hash,to_jsonb(v_related),v_related_after);
      end loop;
    end if;
    v_id:=v_link.id; v_kind:='asset_link'; v_revision:=v_link.revision; v_after:=to_jsonb(v_link);
  elsif v_action='create_activation' then
    select * into strict v_op from public.intelligence_review_opportunities where id=(p_command->>'opportunityId')::uuid for share;
    if v_op.state in ('dismissed','expired') or (v_op.expires_at is not null and v_op.expires_at<=now()) then raise exception 'opportunity_not_actionable'; end if;
    insert into public.intelligence_activation_drafts(opportunity_id,title,description,proposed_brands,intended_use,release_at,owner_id,created_by,updated_by)
      values(v_op.id,p_command->>'title',p_command->>'description',coalesce(p_command->'proposedBrands','[]'),p_command->>'intendedUse',
        (p_command->>'releaseAt')::timestamptz,p_actor_id,p_actor_id,p_actor_id) returning * into v_activation;
    v_id:=v_activation.id; v_kind:='activation'; v_revision:=v_activation.revision; v_after:=to_jsonb(v_activation);
  elsif v_action in ('edit_activation','transition_activation') then
    select * into strict v_activation from public.intelligence_activation_drafts where id=(p_command->>'id')::uuid for update;
    if v_activation.revision is distinct from (p_command->>'expectedRevision')::integer then raise exception 'revision_conflict' using errcode='40001'; end if;
    v_before:=to_jsonb(v_activation);
    select * into strict v_op from public.intelligence_review_opportunities where id=v_activation.opportunity_id;
    if v_action='edit_activation' then
      if v_activation.state='cancelled' then raise exception 'activation_cancelled'; end if;
      update public.intelligence_activation_drafts set title=p_command->>'title',description=p_command->>'description',
        proposed_brands=coalesce(p_command->'proposedBrands','[]'),intended_use=p_command->>'intendedUse',release_at=(p_command->>'releaseAt')::timestamptz,
        state='draft',review_approved_revision=null,revision=revision+1,updated_by=p_actor_id,updated_at=now() where id=v_activation.id returning * into v_activation;
      v_asset_ids:=array(select jsonb_array_elements_text(coalesce(p_command->'assetLinkIds','[]')))::uuid[];
      if cardinality(v_asset_ids)>16 then raise exception 'too_many_assets'; end if;
      update public.intelligence_activation_assets set active=false,updated_at=now() where activation_id=v_activation.id;
      insert into public.intelligence_activation_assets(activation_id,moment_asset_link_id)
        select v_activation.id,x from unnest(v_asset_ids) x on conflict(activation_id,moment_asset_link_id) do update set active=true,updated_at=now();
    else
      -- Legacy compatibility display flags never establish rights to publish.
      if p_command->>'state' in ('approved','scheduled','live','completed') then raise exception 'rights_and_publishing_adapter_unavailable' using errcode='42501'; end if;
      if v_activation.state='cancelled' then raise exception 'activation_cancelled'; end if;
      if p_command->>'state'='awaiting_approvals' then
        if v_op.state<>'accepted' or (v_op.expires_at is not null and v_op.expires_at<=now()) then raise exception 'accepted_opportunity_required'; end if;
        if not exists(select 1 from public.intelligence_activation_assets where activation_id=v_activation.id and active)
          or exists(select 1 from public.intelligence_activation_assets aa where aa.activation_id=v_activation.id and aa.active
            and not private.intelligence_workflow_asset_display_eligible(aa.moment_asset_link_id)) then raise exception 'current_asset_review_required'; end if;
      end if;
      update public.intelligence_activation_drafts set state=p_command->>'state',revision=revision+1,
        review_approved_revision=case when p_command->>'state'='awaiting_approvals' then revision+1 else null end,
        updated_by=p_actor_id,updated_at=now() where id=v_activation.id returning * into v_activation;
    end if;
    v_id:=v_activation.id; v_kind:='activation'; v_revision:=v_activation.revision; v_after:=to_jsonb(v_activation)
      ||jsonb_build_object('asset_link_ids',coalesce((select jsonb_agg(moment_asset_link_id order by moment_asset_link_id) from public.intelligence_activation_assets where activation_id=v_id and active),'[]'::jsonb));
  else raise exception 'unsupported_workflow_action';
  end if;

  insert into public.intelligence_workflow_history(opportunity_id,activation_id,moment_asset_link_id,command_id,actor_id,action,reason,revision,request_hash,before_snapshot,after_snapshot)
    values(case when v_kind='opportunity' then v_id end,case when v_kind='activation' then v_id end,case when v_kind='asset_link' then v_id end,
      v_command,p_actor_id,v_action,p_command->>'reason',v_revision,v_hash,v_before,v_after);
  return jsonb_build_object('record',v_after,'duplicate',v_duplicate);
end $$;

-- Fresh reads resolve permission state synchronously, independent of analytics
-- refresh. A formerly reviewed draft never displays stale current clearance.
create function public.read_intelligence_workflows(p_player_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object(
    'opportunities',coalesce((select jsonb_agg(to_jsonb(o)) from (select * from public.intelligence_review_opportunities where player_id=p_player_id order by updated_at desc,id limit 101) o),'[]'::jsonb),
    'activations',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object(
      'asset_link_ids',coalesce((select jsonb_agg(aa.moment_asset_link_id order by aa.moment_asset_link_id) from public.intelligence_activation_assets aa where aa.activation_id=a.id and aa.active),'[]'::jsonb),
      'current_media_review_valid',coalesce(a.review_approved_revision=a.revision and exists(select 1 from public.intelligence_activation_assets aa where aa.activation_id=a.id and aa.active)
        and not exists(select 1 from public.intelligence_activation_assets aa where aa.activation_id=a.id and aa.active and not private.intelligence_workflow_asset_display_eligible(aa.moment_asset_link_id)),false),
      'publishing_allowed',false)) from (select d.* from public.intelligence_activation_drafts d join public.intelligence_review_opportunities o on o.id=d.opportunity_id where o.player_id=p_player_id order by d.updated_at desc,d.id limit 101) a),'[]'::jsonb),
    'momentAssetLinks',coalesce((select jsonb_agg(to_jsonb(l)||jsonb_build_object('current_display_eligible',private.intelligence_workflow_asset_display_eligible(l.id))) from (select * from public.intelligence_moment_asset_links where player_id=p_player_id order by updated_at desc,id limit 101) l),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(to_jsonb(h)) from (select h.* from public.intelligence_workflow_history h
      left join public.intelligence_review_opportunities o on o.id=h.opportunity_id
      left join public.intelligence_activation_drafts a on a.id=h.activation_id left join public.intelligence_review_opportunities ao on ao.id=a.opportunity_id
      left join public.intelligence_moment_asset_links l on l.id=h.moment_asset_link_id
      where o.player_id=p_player_id or ao.player_id=p_player_id or l.player_id=p_player_id order by h.created_at desc,h.id limit 101) h),'[]'::jsonb));
$$;

alter table public.intelligence_review_opportunities enable row level security;
alter table public.intelligence_moment_asset_links enable row level security;
alter table public.intelligence_activation_drafts enable row level security;
alter table public.intelligence_activation_assets enable row level security;
alter table public.intelligence_workflow_history enable row level security;
revoke all on public.intelligence_review_opportunities,public.intelligence_moment_asset_links,public.intelligence_activation_drafts,public.intelligence_activation_assets,public.intelligence_workflow_history from public,anon,authenticated,service_role;
grant select,insert,update on public.intelligence_review_opportunities,public.intelligence_moment_asset_links,public.intelligence_activation_drafts,public.intelligence_activation_assets to service_role;
grant select,insert on public.intelligence_workflow_history to service_role;
revoke all on function public.mutate_intelligence_workflow(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.mutate_intelligence_workflow(uuid,jsonb) to service_role;
revoke all on function public.read_intelligence_workflows(uuid) from public,anon,authenticated;
grant execute on function public.read_intelligence_workflows(uuid) to service_role;
revoke all on function private.intelligence_workflow_check_context(uuid,uuid,uuid[],uuid),private.intelligence_workflow_asset_display_eligible(uuid),private.intelligence_workflow_validate_row() from public,anon,authenticated;
grant execute on function private.intelligence_workflow_check_context(uuid,uuid,uuid[],uuid),private.intelligence_workflow_asset_display_eligible(uuid),private.intelligence_workflow_validate_row() to service_role;
commit;
