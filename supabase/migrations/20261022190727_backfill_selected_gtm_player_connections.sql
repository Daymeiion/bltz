begin;
-- User-authorized repair of the nine prospects audited on 2026-10-22.
-- Deliberately bounded: future selections use connect_gtm_player_cohort instead.
do $$
declare
  cohort record;
  mapping record;
  athlete public.players%rowtype;
  preview_id uuid;
  result jsonb;
  original_sub text := current_setting('request.jwt.claim.sub',true);
  original_claims text := current_setting('request.jwt.claims',true);
  target_ids constant text[] := array['00-0004866','00-0017924','00-0022714','00-0023459','00-0023479',
    '00-0025579','00-0026149','00-0026167','00-0026266'];
begin
  for cohort in select selected_by,array_agg(gsis_id order by gsis_id) as ids
    from public.gtm_player_prospects where not archived and gsis_id=any(target_ids) group by selected_by loop
    -- Maintenance provenance is attributed to the administrator who selected the rows.
    perform set_config('request.jwt.claim.sub',cohort.selected_by::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',cohort.selected_by,'role','authenticated')::text,true);
    result := public.connect_gtm_player_cohort(cohort.ids,false);
  end loop;

  -- These are individually reviewed legacy records, NOT an automatic name matcher.
  -- Unique name + the recorded college context were inspected in production.
  for mapping in select * from (values
    ('00-0023459','2da688ae-c133-493d-be4c-703a7ad21f9b'::uuid,'Aaron Rodgers','Cal Berkeley',null::text),
    ('00-0023479','2824b1ee-7768-4992-8ebd-8f0d2374c023'::uuid,'J.J. Arrington','Cal Berkeley',null::text),
    ('00-0025579','4ca1fa4c-c4dc-480d-9d47-3f0e220fcfa3'::uuid,'Desmond Bishop','Cal Berkeley',null::text),
    ('00-0026167','c48b4f20-bd48-4fda-a21e-b4514495cd6b'::uuid,'Antoine Cason',null::text,'University of Arizona'),
    ('00-0026266','5d5155b8-8bc3-4549-a959-8daafadebc62'::uuid,'Lavelle Hawkins','Cal Berkeley',null::text)
  ) reviewed(gsis_id,player_id,full_name,school,team) loop
    -- Other databases need not contain these production-specific legacy IDs.
    if not exists(select 1 from public.players where id=mapping.player_id) then continue; end if;
    select * into cohort from public.gtm_player_prospects where gsis_id=mapping.gsis_id and not archived;
    if not found then continue; end if;
    select * into strict athlete from public.players where id=mapping.player_id for update;
    if lower(btrim(coalesce(athlete.full_name,athlete.name))) <> lower(mapping.full_name)
      or (mapping.school is not null and athlete.school is distinct from mapping.school)
      or (mapping.team is not null and athlete.team is distinct from mapping.team)
      or (athlete.gsis_id is not null and athlete.gsis_id <> mapping.gsis_id)
      or (select count(*) from public.players where lower(btrim(coalesce(full_name,name)))=lower(mapping.full_name)) <> 1
      or not exists(select 1 from public.nfl_players n where n.gsis_id=mapping.gsis_id
        and n.display_name=mapping.full_name
        and (athlete.dob is null or n.birth_date is null or athlete.dob=n.birth_date)
        and ((mapping.school='Cal Berkeley' and n.college_name like 'California%')
          or (mapping.team='University of Arizona' and n.college_name='Arizona'))) then
      raise exception 'Reviewed cohort identity changed; manual review required for %',mapping.gsis_id;
    end if;
    perform set_config('request.jwt.claim.sub',cohort.selected_by::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',cohort.selected_by,'role','authenticated')::text,true);
    select preview_locker_id into strict preview_id from public.gtm_player_preview_lockers where gsis_id=mapping.gsis_id;
    perform public.review_preview_athlete_identity(preview_id,mapping.gsis_id,mapping.player_id);
    insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,new_values,request_metadata)
    values(cohort.selected_by,'gtm.cohort_identity_backfill','player',mapping.player_id::text,
      jsonb_build_object('gsis_id',mapping.gsis_id,'preview_id',preview_id),
      jsonb_build_object('source','20261022190727_backfill_selected_gtm_player_connections',
        'review_evidence','unique existing name and college context; explicit reviewed record ID','ownership_verified',false));
  end loop;

  for cohort in select selected_by,array_agg(gsis_id order by gsis_id) as ids
    from public.gtm_player_prospects where not archived and gsis_id=any(target_ids) group by selected_by loop
    perform set_config('request.jwt.claim.sub',cohort.selected_by::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',cohort.selected_by,'role','authenticated')::text,true);
    result := public.connect_gtm_player_cohort(cohort.ids,false);
    -- On production every audited row must finish; other datasets retain review safeguards.
    if exists(select 1 from public.players where id='2da688ae-c133-493d-be4c-703a7ad21f9b'::uuid)
      and (result->>'linkedPlayerCount')::integer <> cardinality(cohort.ids) then
      raise exception 'Audited cohort backfill incomplete';
    end if;
  end loop;
  perform set_config('request.jwt.claim.sub',coalesce(original_sub,''),true);
  perform set_config('request.jwt.claims',coalesce(original_claims,''),true);
end $$;
commit;
