-- Explicit development/production review scopes. Runtime activation remains separately gated OFF.
-- No rights grants, publishing, campaign execution or financial inference.
-- Existing rows are development by the predecessor constraints; scope is immutable.
begin;
alter table public.intelligence_engine_runs drop constraint intelligence_engine_runs_environment_check;
alter table public.intelligence_engine_runs add constraint intelligence_engine_runs_environment_check check(environment in ('development','production'));
alter table public.intelligence_review_opportunities drop constraint intelligence_review_opportunities_environment_check;
alter table public.intelligence_review_opportunities add constraint intelligence_review_opportunities_environment_check check(environment in ('development','production'));
alter table public.intelligence_moment_asset_links drop constraint intelligence_moment_asset_links_environment_check;
alter table public.intelligence_moment_asset_links add constraint intelligence_moment_asset_links_environment_check check(environment in ('development','production'));
alter table public.intelligence_activation_drafts add column environment text not null default 'development' check(environment in ('development','production'));
alter table public.intelligence_activation_assets add column environment text not null default 'development' check(environment in ('development','production'));
alter table public.intelligence_workflow_history add column environment text not null default 'development' check(environment in ('development','production'));
alter table public.intelligence_review_opportunities add unique(id,environment);
alter table public.intelligence_moment_asset_links add unique(id,environment);
alter table public.intelligence_activation_drafts add unique(id,environment);
alter table public.intelligence_activation_drafts add foreign key(opportunity_id,environment) references public.intelligence_review_opportunities(id,environment) on delete restrict;
alter table public.intelligence_activation_assets add foreign key(activation_id,environment) references public.intelligence_activation_drafts(id,environment) on delete restrict;
alter table public.intelligence_activation_assets add foreign key(moment_asset_link_id,environment) references public.intelligence_moment_asset_links(id,environment) on delete restrict;
alter table public.intelligence_workflow_history add foreign key(opportunity_id,environment) references public.intelligence_review_opportunities(id,environment) on delete restrict;
alter table public.intelligence_workflow_history add foreign key(activation_id,environment) references public.intelligence_activation_drafts(id,environment) on delete restrict;
alter table public.intelligence_workflow_history add foreign key(moment_asset_link_id,environment) references public.intelligence_moment_asset_links(id,environment) on delete restrict;
alter table public.intelligence_workflow_history drop constraint intelligence_workflow_history_command_id_key;
alter table public.intelligence_workflow_history add unique(environment,command_id);
drop index public.intelligence_moment_asset_media_unique;
drop index public.intelligence_moment_asset_video_unique;
create unique index intelligence_moment_asset_media_unique on public.intelligence_moment_asset_links(environment,player_id,moment_id,legacy_media_id) where legacy_media_id is not null;
create unique index intelligence_moment_asset_video_unique on public.intelligence_moment_asset_links(environment,player_id,moment_id,legacy_video_id) where legacy_video_id is not null;
create index intelligence_review_opportunities_environment_player on public.intelligence_review_opportunities(environment,player_id,updated_at desc,id);
create index intelligence_moment_asset_environment_player on public.intelligence_moment_asset_links(environment,player_id,updated_at desc,id);
create index intelligence_workflow_history_environment_created on public.intelligence_workflow_history(environment,created_at desc,id);

create function private.intelligence_workflow_environment_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and new.environment is distinct from old.environment then raise exception 'workflow_environment_immutable' using errcode='23514';end if;
  if tg_table_name='intelligence_activation_assets' and tg_op='UPDATE' then
    if row(new.activation_id,new.moment_asset_link_id) is distinct from row(old.activation_id,old.moment_asset_link_id)
      then raise exception 'activation_asset_identity_immutable' using errcode='23514';end if;
  end if;
  return new;
end $$;
create trigger workflow_environment_immutable before update on public.intelligence_review_opportunities for each row execute function private.intelligence_workflow_environment_guard();
create trigger workflow_environment_immutable before update on public.intelligence_moment_asset_links for each row execute function private.intelligence_workflow_environment_guard();
create trigger workflow_environment_immutable before update on public.intelligence_activation_drafts for each row execute function private.intelligence_workflow_environment_guard();
create trigger workflow_environment_immutable before update on public.intelligence_activation_assets for each row execute function private.intelligence_workflow_environment_guard();
create trigger workflow_environment_immutable before update on public.intelligence_workflow_history for each row execute function private.intelligence_workflow_environment_guard();

create function private.intelligence_workflow_check_context_in_environment(p_player uuid,p_moment uuid,p_evidence uuid[],p_run uuid,p_environment text) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if p_environment is null or p_environment not in ('development','production') then raise exception 'invalid_workflow_environment' using errcode='23514';end if;
  if p_moment is not null and not exists(select 1 from public.moments m join public.moment_athletes ma on ma.moment_id=m.id
    where m.id=p_moment and ma.player_id=p_player and m.status='verified' and ma.status='verified') then
    raise exception 'verified_moment_relationship_required' using errcode='23514';
  end if;
  if exists(select 1 from unnest(p_evidence) evidence_id where not exists(select 1 from public.intelligence_evidence e
    where e.id=evidence_id and e.player_id=p_player and e.status='verified' and (e.moment_id is null or e.moment_id is not distinct from p_moment))) then
    raise exception 'verified_evidence_context_required' using errcode='23514';
  end if;
  if p_run is not null and not exists(select 1 from public.intelligence_engine_runs r where r.id=p_run and r.player_id=p_player
    and r.environment=p_environment and (r.moment_id is null or r.moment_id is not distinct from p_moment)) then
    raise exception 'engine_run_context_mismatch' using errcode='23514';
  end if;
  if p_run is null and cardinality(p_evidence)=0 then raise exception 'input_lineage_required' using errcode='23514'; end if;
end $$;

create function private.intelligence_workflow_asset_display_eligible_in_environment(p_link uuid,p_environment text) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.intelligence_moment_asset_links l
    join public.moments m on m.id=l.moment_id and m.status='verified'
    join public.moment_athletes ma on ma.moment_id=l.moment_id and ma.player_id=l.player_id and ma.status='verified'
    left join public.media a on a.id=l.legacy_media_id
    where l.id=p_link and l.environment=p_environment and l.status='verified' and l.legacy_media_id is not null and a.player_id=l.player_id
      and a.kind in ('photo','headshot','video') and a.license_status='approved' and a.public_locker_approved
      and nullif(btrim(a.license_kind),'') is not null);
$$;

create or replace function private.intelligence_workflow_validate_row() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_op public.intelligence_review_opportunities%rowtype; v_brand jsonb;
begin
  if tg_table_name='intelligence_review_opportunities' then
    if tg_op='INSERT' or row(new.run_id,new.evidence_ids,new.input_snapshot) is distinct from row(old.run_id,old.evidence_ids,old.input_snapshot) then
      perform private.intelligence_workflow_check_context_in_environment(new.player_id,new.moment_id,new.evidence_ids,new.run_id,new.environment);
    end if;
    if new.run_id is not null and not exists(select 1 from public.intelligence_engine_runs r where r.id=new.run_id and r.environment=new.environment
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
      perform private.intelligence_workflow_check_context_in_environment(new.player_id,new.moment_id,new.evidence_ids,null,new.environment);
      if (new.legacy_media_id is not null and not exists(select 1 from public.media m where m.id=new.legacy_media_id and m.player_id=new.player_id))
        or (new.legacy_video_id is not null and not exists(select 1 from public.videos v where v.id=new.legacy_video_id and v.player_id=new.player_id)) then
        raise exception 'asset_athlete_relationship_required' using errcode='23514';
      end if;
    end if;
  elsif tg_table_name='intelligence_activation_drafts' then
    if tg_op='UPDATE' and row(new.opportunity_id,new.environment,new.created_by,new.created_at) is distinct from row(old.opportunity_id,old.environment,old.created_by,old.created_at) then raise exception 'activation_identity_immutable'; end if;
    for v_brand in select value from jsonb_array_elements(new.proposed_brands) loop
      if jsonb_typeof(v_brand)<>'object' or v_brand->>'status' is distinct from 'proposed' or coalesce(length(btrim(v_brand->>'name')),0) not between 1 and 120
        or v_brand - 'name' - 'status' <> '{}'::jsonb then raise exception 'brand_is_proposal_only'; end if;
    end loop;
  elsif tg_table_name='intelligence_activation_assets' then
    select * into strict v_op from public.intelligence_review_opportunities where environment=new.environment and id=(select opportunity_id from public.intelligence_activation_drafts where id=new.activation_id and environment=new.environment);
    if new.active and not exists(select 1 from public.intelligence_moment_asset_links l where l.id=new.moment_asset_link_id and l.environment=new.environment and l.player_id=v_op.player_id
      and (v_op.moment_id is null or l.moment_id=v_op.moment_id) and l.status='verified') then raise exception 'activation_asset_context_mismatch'; end if;
  end if;
  return new;
end $$;
create function public.mutate_intelligence_workflow_in_environment(p_actor_id uuid,p_command jsonb,p_environment text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  v_action text:=p_command->>'action'; v_command uuid:=(p_command->>'commandId')::uuid;
  v_hash text:=md5(jsonb_build_object('actor',p_actor_id,'command',p_command)::text);
  v_history public.intelligence_workflow_history%rowtype;
  v_op public.intelligence_review_opportunities%rowtype; v_activation public.intelligence_activation_drafts%rowtype;
  v_link public.intelligence_moment_asset_links%rowtype; v_related public.intelligence_activation_drafts%rowtype; v_related_after jsonb;
  v_before jsonb; v_after jsonb; v_id uuid; v_kind text; v_revision integer; v_asset_ids uuid[]; v_duplicate boolean:=false;
begin
  if p_environment is null or p_environment not in ('development','production') then raise exception 'invalid_workflow_environment' using errcode='23514';end if;
  if p_actor_id is null or not exists(select 1 from auth.users where id=p_actor_id) then raise exception 'actor_required' using errcode='42501'; end if;
  if v_command is null or length(btrim(p_command->>'reason')) not between 1 and 2000 then raise exception 'command_and_reason_required'; end if;
  perform pg_advisory_xact_lock(hashtext(p_environment||v_command::text));
  select * into v_history from public.intelligence_workflow_history where environment=p_environment and command_id=v_command;
  if found then
    if v_history.request_hash<>v_hash then raise exception 'command_identity_collision' using errcode='23514'; end if;
    return jsonb_build_object('record',v_history.after_snapshot,'duplicate',true);
  end if;

  if v_action='register_opportunity' then
    perform pg_advisory_xact_lock(hashtext(p_environment||(p_command->>'opportunityKey')));
    select * into v_op from public.intelligence_review_opportunities where environment=p_environment and opportunity_key=p_command->>'opportunityKey' for update;
    if found then
      if v_op.player_id<>(p_command->>'playerId')::uuid or v_op.moment_id is distinct from (p_command->>'momentId')::uuid then raise exception 'opportunity_identity_collision'; end if;
      -- Engine refresh cannot reset an existing human decision or assignment.
      v_before:=to_jsonb(v_op); v_duplicate:=true;
    else
      insert into public.intelligence_review_opportunities(environment,opportunity_key,player_id,moment_id,run_id,rule_version,signal_keys,evidence_ids,input_snapshot,title,explanation,expires_at,created_by,updated_by)
        values(p_environment,p_command->>'opportunityKey',(p_command->>'playerId')::uuid,(p_command->>'momentId')::uuid,(p_command->>'runId')::uuid,p_command->>'ruleVersion',
          array(select jsonb_array_elements_text(p_command->'signalKeys')),array(select jsonb_array_elements_text(p_command->'evidenceIds'))::uuid[],
          p_command->'inputSnapshot',p_command->>'title',p_command->>'explanation',(p_command->>'expiresAt')::timestamptz,p_actor_id,p_actor_id) returning * into v_op;
    end if;
    v_id:=v_op.id; v_kind:='opportunity'; v_revision:=v_op.revision; v_after:=to_jsonb(v_op);
  elsif v_action='review_opportunity' then
    select * into strict v_op from public.intelligence_review_opportunities where environment=p_environment and id=(p_command->>'id')::uuid for update;
    if v_op.revision is distinct from (p_command->>'expectedRevision')::integer then raise exception 'revision_conflict' using errcode='40001'; end if;
    v_before:=to_jsonb(v_op);
    if v_op.state in ('dismissed','expired') and p_command->>'state' is distinct from v_op.state then raise exception 'terminal_review_decision_preserved'; end if;
    if p_command->>'state' in ('ready','accepted') then perform private.intelligence_workflow_check_context_in_environment(v_op.player_id,v_op.moment_id,v_op.evidence_ids,v_op.run_id,p_environment); end if;
    if p_command->>'state'='ready' and cardinality(case when p_command ? 'readinessBlockers' then array(select jsonb_array_elements_text(p_command->'readinessBlockers')) else v_op.readiness_blockers end)>0 then raise exception 'readiness_blocked'; end if;
    if p_command->>'state'='accepted' and v_op.expires_at is not null and v_op.expires_at<=now() then raise exception 'opportunity_expired'; end if;
    if p_command->>'state'='accepted' then
      if v_op.state not in ('ready','accepted') then raise exception 'opportunity_ready_required'; end if;
      if cardinality(v_op.readiness_blockers)>0 or cardinality(case when p_command ? 'readinessBlockers' then array(select jsonb_array_elements_text(p_command->'readinessBlockers')) else v_op.readiness_blockers end)>0 then raise exception 'readiness_blocked'; end if;
    end if;
    update public.intelligence_review_opportunities set state=p_command->>'state',
      assignee_id=case when p_command ? 'assigneeId' then (p_command->>'assigneeId')::uuid else assignee_id end,
      readiness_blockers=case when p_command ? 'readinessBlockers' then array(select jsonb_array_elements_text(p_command->'readinessBlockers')) else readiness_blockers end,
      revision=revision+1,updated_by=p_actor_id,updated_at=now() where environment=p_environment and id=v_op.id returning * into v_op;
    v_id:=v_op.id; v_kind:='opportunity'; v_revision:=v_op.revision; v_after:=to_jsonb(v_op);
  elsif v_action='review_asset_link' then
    if p_command->>'id' is null then
      insert into public.intelligence_moment_asset_links(environment,player_id,moment_id,legacy_media_id,legacy_video_id,status,evidence_ids,review_reason,reviewed_by)
        values(p_environment,(p_command->>'playerId')::uuid,(p_command->>'momentId')::uuid,(p_command->>'legacyMediaId')::uuid,(p_command->>'legacyVideoId')::uuid,
          p_command->>'status',array(select jsonb_array_elements_text(p_command->'evidenceIds'))::uuid[],p_command->>'reason',p_actor_id) returning * into v_link;
    else
      select * into strict v_link from public.intelligence_moment_asset_links where environment=p_environment and id=(p_command->>'id')::uuid for update;
      if v_link.revision is distinct from (p_command->>'expectedRevision')::integer then raise exception 'revision_conflict' using errcode='40001'; end if;
      if row(v_link.player_id,v_link.moment_id,v_link.legacy_media_id,v_link.legacy_video_id) is distinct from row((p_command->>'playerId')::uuid,(p_command->>'momentId')::uuid,(p_command->>'legacyMediaId')::uuid,(p_command->>'legacyVideoId')::uuid) then raise exception 'asset_link_identity_immutable'; end if;
      v_before:=to_jsonb(v_link);
      update public.intelligence_moment_asset_links set status=p_command->>'status',evidence_ids=array(select jsonb_array_elements_text(p_command->'evidenceIds'))::uuid[],
        review_reason=p_command->>'reason',reviewed_by=p_actor_id,revision=revision+1,updated_at=now() where environment=p_environment and id=v_link.id returning * into v_link;
    end if;
    -- A rejected link immediately invalidates editorial approvals, independent of analytics.
    if v_link.status='rejected' then
      for v_related in select a.* from public.intelligence_activation_drafts a where a.environment=p_environment and a.review_approved_revision is not null
        and exists(select 1 from public.intelligence_activation_assets aa where aa.environment=p_environment and aa.activation_id=a.id and aa.moment_asset_link_id=v_link.id and aa.active) for update loop
        update public.intelligence_activation_drafts set review_approved_revision=null,state=case when state='cancelled' then state else 'draft' end,
          revision=revision+1,updated_by=p_actor_id,updated_at=now() where environment=p_environment and id=v_related.id returning to_jsonb(intelligence_activation_drafts.*) into v_related_after;
        insert into public.intelligence_workflow_history(environment,activation_id,command_id,actor_id,action,reason,revision,request_hash,before_snapshot,after_snapshot)
          values(p_environment,v_related.id,md5(v_command::text||v_related.id::text)::uuid,p_actor_id,'asset_link_review_invalidated',p_command->>'reason',
            (v_related_after->>'revision')::integer,v_hash,to_jsonb(v_related),v_related_after);
      end loop;
    end if;
    v_id:=v_link.id; v_kind:='asset_link'; v_revision:=v_link.revision; v_after:=to_jsonb(v_link);
  elsif v_action='create_activation' then
    select * into strict v_op from public.intelligence_review_opportunities where environment=p_environment and id=(p_command->>'opportunityId')::uuid for share;
    if v_op.state in ('dismissed','expired') or (v_op.expires_at is not null and v_op.expires_at<=now()) then raise exception 'opportunity_not_actionable'; end if;
    insert into public.intelligence_activation_drafts(environment,opportunity_id,title,description,proposed_brands,intended_use,release_at,owner_id,created_by,updated_by)
      values(p_environment,v_op.id,p_command->>'title',p_command->>'description',coalesce(p_command->'proposedBrands','[]'),p_command->>'intendedUse',
        (p_command->>'releaseAt')::timestamptz,p_actor_id,p_actor_id,p_actor_id) returning * into v_activation;
    v_id:=v_activation.id; v_kind:='activation'; v_revision:=v_activation.revision; v_after:=to_jsonb(v_activation);
  elsif v_action in ('edit_activation','transition_activation') then
    select * into strict v_activation from public.intelligence_activation_drafts where environment=p_environment and id=(p_command->>'id')::uuid for update;
    if v_activation.revision is distinct from (p_command->>'expectedRevision')::integer then raise exception 'revision_conflict' using errcode='40001'; end if;
    v_before:=to_jsonb(v_activation);
    select * into strict v_op from public.intelligence_review_opportunities where environment=p_environment and id=v_activation.opportunity_id;
    if v_action='edit_activation' then
      if v_activation.state='cancelled' then raise exception 'activation_cancelled'; end if;
      update public.intelligence_activation_drafts set title=p_command->>'title',description=p_command->>'description',
        proposed_brands=coalesce(p_command->'proposedBrands','[]'),intended_use=p_command->>'intendedUse',release_at=(p_command->>'releaseAt')::timestamptz,
        state='draft',review_approved_revision=null,revision=revision+1,updated_by=p_actor_id,updated_at=now() where environment=p_environment and id=v_activation.id returning * into v_activation;
      v_asset_ids:=array(select jsonb_array_elements_text(coalesce(p_command->'assetLinkIds','[]')))::uuid[];
      if cardinality(v_asset_ids)>16 then raise exception 'too_many_assets'; end if;
      update public.intelligence_activation_assets set active=false,updated_at=now() where environment=p_environment and activation_id=v_activation.id;
      insert into public.intelligence_activation_assets(environment,activation_id,moment_asset_link_id)
        select p_environment,v_activation.id,x from unnest(v_asset_ids) x on conflict(activation_id,moment_asset_link_id) do update set active=true,updated_at=now();
    else
      -- Legacy compatibility display flags never establish rights to publish.
      if p_command->>'state' in ('approved','scheduled','live','completed') then raise exception 'rights_and_publishing_adapter_unavailable' using errcode='42501'; end if;
      if v_activation.state='cancelled' then raise exception 'activation_cancelled'; end if;
      if p_command->>'state'='awaiting_approvals' then
        if v_op.state<>'accepted' or (v_op.expires_at is not null and v_op.expires_at<=now()) then raise exception 'accepted_opportunity_required'; end if;
        if not exists(select 1 from public.intelligence_activation_assets where environment=p_environment and activation_id=v_activation.id and active)
          or exists(select 1 from public.intelligence_activation_assets aa where aa.environment=p_environment and aa.activation_id=v_activation.id and aa.active
            and not private.intelligence_workflow_asset_display_eligible_in_environment(aa.moment_asset_link_id,p_environment)) then raise exception 'current_asset_review_required'; end if;
      end if;
      update public.intelligence_activation_drafts set state=p_command->>'state',revision=revision+1,
        review_approved_revision=case when p_command->>'state'='awaiting_approvals' then revision+1 else null end,
        updated_by=p_actor_id,updated_at=now() where environment=p_environment and id=v_activation.id returning * into v_activation;
    end if;
    v_id:=v_activation.id; v_kind:='activation'; v_revision:=v_activation.revision; v_after:=to_jsonb(v_activation)
      ||jsonb_build_object('asset_link_ids',coalesce((select jsonb_agg(moment_asset_link_id order by moment_asset_link_id) from public.intelligence_activation_assets where environment=p_environment and activation_id=v_id and active),'[]'::jsonb));
  else raise exception 'unsupported_workflow_action';
  end if;

  insert into public.intelligence_workflow_history(environment,opportunity_id,activation_id,moment_asset_link_id,command_id,actor_id,action,reason,revision,request_hash,before_snapshot,after_snapshot)
    values(p_environment,case when v_kind='opportunity' then v_id end,case when v_kind='activation' then v_id end,case when v_kind='asset_link' then v_id end,
      v_command,p_actor_id,v_action,p_command->>'reason',v_revision,v_hash,v_before,v_after);
  return jsonb_build_object('record',v_after,'duplicate',v_duplicate);
end $$;

create function public.read_intelligence_workflows_in_environment(p_player_id uuid,p_environment text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
  if p_environment is null or p_environment not in ('development','production') then raise exception 'invalid_workflow_environment' using errcode='23514';end if;
  return (select jsonb_build_object(
    'opportunities',coalesce((select jsonb_agg(to_jsonb(o)) from (select * from public.intelligence_review_opportunities where environment=p_environment and player_id=p_player_id order by updated_at desc,id limit 101) o),'[]'::jsonb),
    'activations',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object(
      'asset_link_ids',coalesce((select jsonb_agg(aa.moment_asset_link_id order by aa.moment_asset_link_id) from public.intelligence_activation_assets aa where aa.environment=p_environment and aa.activation_id=a.id and aa.active),'[]'::jsonb),
      'current_media_review_valid',coalesce(a.review_approved_revision=a.revision and exists(select 1 from public.intelligence_activation_assets aa where aa.environment=p_environment and aa.activation_id=a.id and aa.active)
        and not exists(select 1 from public.intelligence_activation_assets aa where aa.environment=p_environment and aa.activation_id=a.id and aa.active and not private.intelligence_workflow_asset_display_eligible_in_environment(aa.moment_asset_link_id,p_environment)),false),
      'publishing_allowed',false)) from (select d.* from public.intelligence_activation_drafts d join public.intelligence_review_opportunities o on o.id=d.opportunity_id where d.environment=p_environment and o.environment=p_environment and o.player_id=p_player_id order by d.updated_at desc,d.id limit 101) a),'[]'::jsonb),
    'momentAssetLinks',coalesce((select jsonb_agg(to_jsonb(l)||jsonb_build_object('current_display_eligible',private.intelligence_workflow_asset_display_eligible_in_environment(l.id,p_environment))) from (select * from public.intelligence_moment_asset_links where environment=p_environment and player_id=p_player_id order by updated_at desc,id limit 101) l),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(to_jsonb(h)) from (select h.* from public.intelligence_workflow_history h
      left join public.intelligence_review_opportunities o on o.id=h.opportunity_id
      left join public.intelligence_activation_drafts a on a.id=h.activation_id left join public.intelligence_review_opportunities ao on ao.id=a.opportunity_id
      left join public.intelligence_moment_asset_links l on l.id=h.moment_asset_link_id
      where h.environment=p_environment and (o.player_id=p_player_id or ao.player_id=p_player_id or l.player_id=p_player_id) order by h.created_at desc,h.id limit 101) h),'[]'::jsonb)));
end $$;

-- Historical RPCs remain development-only wrappers and cannot read production rows.
create or replace function public.mutate_intelligence_workflow(p_actor_id uuid,p_command jsonb) returns jsonb
language sql security invoker set search_path='' as $$
  select public.mutate_intelligence_workflow_in_environment(p_actor_id,p_command,'development');
$$;
create or replace function public.read_intelligence_workflows(p_player_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select public.read_intelligence_workflows_in_environment(p_player_id,'development');
$$;
create or replace function private.intelligence_workflow_asset_display_eligible(p_link uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select private.intelligence_workflow_asset_display_eligible_in_environment(p_link,'development');
$$;
revoke all on function public.mutate_intelligence_workflow_in_environment(uuid,jsonb,text),public.read_intelligence_workflows_in_environment(uuid,text) from public,anon,authenticated;
grant execute on function public.mutate_intelligence_workflow_in_environment(uuid,jsonb,text),public.read_intelligence_workflows_in_environment(uuid,text) to service_role;
revoke all on function private.intelligence_workflow_check_context_in_environment(uuid,uuid,uuid[],uuid,text),private.intelligence_workflow_asset_display_eligible_in_environment(uuid,text),private.intelligence_workflow_environment_guard() from public,anon,authenticated;
grant execute on function private.intelligence_workflow_check_context_in_environment(uuid,uuid,uuid[],uuid,text),private.intelligence_workflow_asset_display_eligible_in_environment(uuid,text),private.intelligence_workflow_environment_guard() to service_role;
commit;
