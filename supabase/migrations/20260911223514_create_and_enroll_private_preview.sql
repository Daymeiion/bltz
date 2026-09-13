-- One Admin transaction; existing RLS, preview validation triggers and enrollment audit remain active.
create or replace function public.preview_conversion_create(p_id uuid, p_content jsonb, p_enrollment jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare saved jsonb; request_id uuid := gen_random_uuid();
begin
 if auth.uid() is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_id is null or jsonb_typeof(p_content) is distinct from 'object' or jsonb_typeof(p_enrollment) is distinct from 'object' then raise exception 'invalid input' using errcode='22023'; end if;
 -- Serialize retry requests using the stable create ID.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select to_jsonb(p) into saved from (select id,slug,full_name,position,level,school,hometown,jersey,height_in,weight_lbs,games_played,headshot_url,hero_video_url,bio,athlete_quote,athlete_quote_author,schools,pro_teams,awards,career_stats,videos,photos,revision,created_at,updated_at from public.preview_lockers where id=p_id for update) p;
 if found then
   if (saved->>'revision')::integer<>1 or exists(select 1 from jsonb_each(p_content) kv where saved->kv.key is distinct from kv.value) then
     raise exception 'preview conflict' using errcode='23505';
   end if;
 else
   insert into public.preview_lockers(id,slug,full_name,position,level,school,hometown,jersey,height_in,weight_lbs,games_played,headshot_url,hero_video_url,bio,athlete_quote,athlete_quote_author,schools,pro_teams,awards,career_stats,videos,photos)
   select p_id,r.slug,r.full_name,r.position,r.level,r.school,r.hometown,r.jersey,r.height_in,r.weight_lbs,r.games_played,r.headshot_url,r.hero_video_url,r.bio,r.athlete_quote,r.athlete_quote_author,r.schools,r.pro_teams,r.awards,r.career_stats,r.videos,r.photos
   from jsonb_populate_record(null::public.preview_lockers,p_content) r
   returning jsonb_build_object('id',id,'slug',slug,'revision',revision) into saved;
 end if;
 -- Failure rolls back preview creation and its audit, never leaving a partial setup.
 perform public.preview_conversion(p_id,'enroll',request_id,request_id,p_enrollment);
 return jsonb_build_object('id',saved->'id','slug',saved->'slug','revision',saved->'revision','enrolled',true);
end;
$$;
revoke all on function public.preview_conversion_create(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.preview_conversion_create(uuid,jsonb,jsonb) to authenticated;
