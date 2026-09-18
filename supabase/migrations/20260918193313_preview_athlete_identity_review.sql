begin;
create function public.review_preview_athlete_identity(p_preview_id uuid, p_gsis_id text, p_existing_player_id uuid default null)
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
  select player_id into linked from public.preview_lockers where id=p_preview_id for update;
  if not found then raise exception 'preview_not_found'; end if;
  perform 1 from public.gtm_player_preview_lockers where preview_locker_id=p_preview_id and gsis_id=p_gsis_id for update;
  if not found then raise exception 'preview_identity_changed'; end if;
  select * into strict master from public.nfl_players where gsis_id=p_gsis_id for share;
  -- Serialize the duplicate check and insert, including other player writers.
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
    update public.players set gsis_id=p_gsis_id,updated_at=now() where id=athlete_id;
  end if;
  update public.preview_lockers set player_id=athlete_id,updated_at=now() where id=p_preview_id;
  insert into public.audit_logs(action,entity_type,entity_id,actor_user_id,new_values)
    values('preview.athlete_identity_review','player',athlete_id::text,actor,
      jsonb_build_object('preview_id',p_preview_id,'gsis_id',p_gsis_id,'created',created));
  return athlete_id;
end $$;
revoke all on function public.review_preview_athlete_identity(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.review_preview_athlete_identity(uuid,text,uuid) to authenticated;
commit;
