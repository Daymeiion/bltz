begin;

-- A graph-only identity attachment must not stale saved content/enrichment or
-- its reviewed completion. Content edits still advance the normal revision.
create function private.preserve_preview_identity_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or public.is_internal_admin() is not true then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if new.player_id is distinct from old.player_id
    and (to_jsonb(new)-array['player_id','updated_at','revision'])
      is not distinct from (to_jsonb(old)-array['player_id','updated_at','revision']) then
    new.revision := old.revision;
  end if;
  return new;
end $$;
revoke all on function private.preserve_preview_identity_revision() from public,anon,authenticated,service_role;
-- PostgreSQL runs same-event triggers by name: this follows preview_stamp.
create trigger zz_preview_identity_revision before update of player_id on public.preview_lockers
for each row execute function private.preserve_preview_identity_revision();

-- Keep automatic and explicitly reviewed identity writers in the same lock order.
-- Existing identities, publication, claims, and preview content stay authoritative.
create or replace function public.review_preview_athlete_identity(p_preview_id uuid, p_gsis_id text, p_existing_player_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  linked uuid;
  master public.nfl_players%rowtype;
  athlete public.players%rowtype;
  athlete_id uuid;
  match_count integer;
  created boolean := false;
begin
  if actor is null or public.is_internal_admin() is not true then raise exception 'forbidden' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bltz:athlete-identity',0));
  select player_id into linked from public.preview_lockers where id=p_preview_id for update;
  if not found then raise exception 'preview_not_found'; end if;
  perform 1 from public.gtm_player_preview_lockers where preview_locker_id=p_preview_id and gsis_id=p_gsis_id for update;
  if not found then raise exception 'preview_identity_changed'; end if;
  select * into strict master from public.nfl_players where gsis_id=p_gsis_id for share;
  lock table public.players in share row exclusive mode;
  select count(*) into match_count from public.players where gsis_id=p_gsis_id;
  if match_count > 1 then raise exception 'duplicate_athlete_identity'; end if;
  select id into athlete_id from public.players where gsis_id=p_gsis_id;
  if p_existing_player_id is not null then
    select * into strict athlete from public.players where id=p_existing_player_id for update;
    if (athlete.gsis_id is not null and athlete.gsis_id <> p_gsis_id)
      or (athlete_id is not null and athlete_id <> p_existing_player_id) then raise exception 'athlete_identity_conflict'; end if;
    athlete_id := p_existing_player_id;
  end if;
  if linked is not null and (athlete_id is null or linked <> athlete_id) then raise exception 'preview_identity_conflict'; end if;
  if athlete_id is null then
    if exists(select 1 from public.players where lower(btrim(coalesce(full_name,name)))=lower(btrim(master.display_name))) then
      raise exception 'existing_athlete_requires_review';
    end if;
    athlete_id := gen_random_uuid();
    insert into public.players(id,slug,name,full_name,gsis_id,position,school,team,dob,level,visibility,is_public,is_verified)
      values(athlete_id,'athlete-'||athlete_id::text,master.display_name,master.display_name,master.gsis_id,
        master.position,master.college_name,master.latest_team,master.birth_date,'pro',false,false,false);
    created := true;
  else
    update public.players set gsis_id=p_gsis_id,updated_at=now() where id=athlete_id and gsis_id is distinct from p_gsis_id;
  end if;
  update public.preview_lockers set player_id=athlete_id,updated_at=now() where id=p_preview_id and player_id is distinct from athlete_id;
  insert into public.audit_logs(action,entity_type,entity_id,actor_user_id,new_values)
    values('preview.athlete_identity_review','player',athlete_id::text,actor,
      jsonb_build_object('preview_id',p_preview_id,'gsis_id',p_gsis_id,'created',created));
  return athlete_id;
end $$;

create function private.connect_gtm_player_cohort(p_gsis_ids text[], p_select boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  gsis text;
  v_contact_id uuid;
  contact_archived boolean;
  preview jsonb;
  preview_id uuid;
  preview_player_id uuid;
  career_id uuid;
  exact_count integer;
  selected_count integer := 0;
  created_contacts integer := 0;
  created_previews integer := 0;
  created_careers integer := 0;
  linked_count integer := 0;
  affected integer;
  reason text;
  review_required jsonb := '[]'::jsonb;
  connections jsonb := '[]'::jsonb;
begin
  if actor is null or public.is_internal_admin() is not true then
    raise exception 'GTM access denied' using errcode = '42501';
  end if;
  if p_select is null or p_gsis_ids is null or cardinality(p_gsis_ids) not between 1 and 100
    or exists(select 1 from unnest(p_gsis_ids) g where g is null or g !~ '^[0-9]{2}-[0-9]{7}$')
    or (select count(distinct g) from unnest(p_gsis_ids) g) <> cardinality(p_gsis_ids) then
    raise exception 'Choose between 1 and 100 distinct Player Master identifiers' using errcode = '22023';
  end if;
  if (select count(*) from public.nfl_players where gsis_id=any(p_gsis_ids)) <> cardinality(p_gsis_ids) then
    raise exception 'Player Master row not found' using errcode = '22023';
  end if;
  -- A batch and the manual identity reviewer acquire this before row/table locks.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bltz:athlete-identity',0));
  foreach gsis in array (select array_agg(g order by g) from unnest(p_gsis_ids) g) loop
    if p_select then
      insert into public.gtm_player_prospects(gsis_id,selected_by) values(gsis,actor)
      on conflict(gsis_id) do update set archived=false,archived_at=null,archived_by=null,
        selected_by=actor,selected_at=now() where public.gtm_player_prospects.archived;
      get diagnostics affected = row_count;
      selected_count := selected_count + affected;
    end if;
    perform 1 from public.gtm_player_prospects where gsis_id=gsis and not archived for update;
    if not found then raise exception 'Only active selected prospects can be connected' using errcode = '23514'; end if;

    insert into public.gtm_contacts(player_master_gsis_id,contact_type,sport,league_level,source,source_record_id,
      pipeline_stage,do_not_automate,created_by,updated_by)
    values(gsis,'athlete','football','NFL','player_master',gsis,'identified',true,actor,actor)
    on conflict(player_master_gsis_id) where player_master_gsis_id is not null do nothing;
    get diagnostics affected = row_count;
    created_contacts := created_contacts + affected;
    select id,archived into strict v_contact_id,contact_archived from public.gtm_contacts
      where player_master_gsis_id=gsis for update;
    preview := private.open_or_create_gtm_player_preview(gsis);
    preview_id := (preview->>'id')::uuid;
    if (preview->>'created')::boolean then created_previews := created_previews + 1; end if;
    reason := null;
    career_id := null;
    begin
      if contact_archived then raise exception 'contact_archived_requires_review'; end if;
      select count(*),min(id::text)::uuid into exact_count,career_id from public.players where gsis_id=gsis;
      if exact_count > 1 then raise exception 'duplicate_athlete_identity'; end if;
      if exists(select 1 from public.gtm_contact_players cp where cp.contact_id=v_contact_id
        and cp.verified and cp.player_id is distinct from career_id) then
        raise exception 'contact_identity_conflict';
      end if;
      select player_id into preview_player_id from public.preview_lockers where id=preview_id for update;
      if career_id is null or preview_player_id is distinct from career_id then
        career_id := public.review_preview_athlete_identity(preview_id,gsis,null);
        if exact_count=0 then created_careers := created_careers + 1; end if;
      end if;
      insert into public.gtm_contact_players(contact_id,player_id,match_type,match_confidence,verified,verified_by,verified_at,created_by)
      values(v_contact_id,career_id,'stable_identifier',1,true,actor,now(),actor)
      on conflict on constraint gtm_contact_players_contact_player_key do update set match_type='stable_identifier',match_confidence=1,
        verified=true,verified_by=actor,verified_at=now()
      where public.gtm_contact_players.verified is not true;
      linked_count := linked_count + 1;
    exception when raise_exception then
      if sqlerrm not in ('existing_athlete_requires_review','duplicate_athlete_identity','athlete_identity_conflict',
        'preview_identity_conflict','contact_identity_conflict','contact_archived_requires_review') then raise; end if;
      reason := sqlerrm;
      career_id := null;
      review_required := review_required || jsonb_build_array(jsonb_build_object('gsisId',gsis,'reason',reason));
    end;
    connections := connections || jsonb_build_array(jsonb_build_object('gsisId',gsis,'contactId',v_contact_id,
      'previewId',preview_id,'playerId',career_id,'status',case when reason is null then 'connected' else 'needs_review' end));
    insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,new_values,request_metadata)
    values(actor,'gtm.cohort_connected','gtm_contact',v_contact_id::text,
      jsonb_build_object('gsis_id',gsis,'preview_id',preview_id,'player_id',career_id,'review_reason',reason),
      jsonb_build_object('source','gtm_cohort_connection','ownership_verified',false));
  end loop;
  return jsonb_build_object('selectedCount',selected_count,'existingCount',cardinality(p_gsis_ids)-selected_count,
    'createdCount',created_contacts,'existingContactCount',cardinality(p_gsis_ids)-created_contacts,
    'previewCreatedCount',created_previews,'careerCreatedCount',created_careers,'linkedPlayerCount',linked_count,
    'reviewRequired',review_required,'connections',connections);
end $$;
revoke all on function private.connect_gtm_player_cohort(text[],boolean) from public,anon,authenticated,service_role;
grant execute on function private.connect_gtm_player_cohort(text[],boolean) to authenticated;

create function public.connect_gtm_player_cohort(p_gsis_ids text[], p_select boolean default true)
returns jsonb language sql security invoker set search_path = ''
begin atomic;
  select private.connect_gtm_player_cohort(p_gsis_ids,p_select);
end;
revoke all on function public.connect_gtm_player_cohort(text[],boolean) from public,anon,authenticated,service_role;
grant execute on function public.connect_gtm_player_cohort(text[],boolean) to authenticated;

-- Keep the older "Add to Contacts" entry atomic and conflict-safe as well.
create or replace function public.promote_gtm_player_prospects(p_gsis_ids text[])
returns jsonb language sql security invoker set search_path = ''
begin atomic;
  select result || jsonb_build_object('existingCount',result->'existingContactCount')
  from (select private.connect_gtm_player_cohort(p_gsis_ids,false) as result) connected;
end;

comment on function public.connect_gtm_player_cohort(text[],boolean) is
  'Admin-only atomic cohort selection, reference contact, private preview and exact Career ID connection. Conflicts require review; no claim, publication, access grant, campaign enrollment or outreach.';
notify pgrst, 'reload schema';
commit;
