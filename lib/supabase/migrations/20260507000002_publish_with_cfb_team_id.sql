-- =============================================================================
-- 20260507000002_publish_with_cfb_team_id.sql
-- Extend the publish RPC to persist `players.cfb_team_id`.
--
-- The school autocomplete on the identity form now captures the ESPN team
-- ID when the athlete picks a logo'd suggestion. We carry it through the
-- pipeline and persist it here so the locker page can join `cfb_teams`
-- and render team colors + logo without a separate scrape.
--
-- Mirrors the gsis_id treatment in 20260507000000: insert when supplied,
-- and on update use COALESCE so a re-publish that drops the field never
-- nullifies the link.
-- =============================================================================

create or replace function publish_onboarding_run(
  p_run_id uuid,
  p_user_id uuid,
  p_player jsonb,
  p_awards jsonb default '[]'::jsonb,
  p_headshot_url text default null,
  p_photos jsonb default '[]'::jsonb,
  p_claim_player_id uuid default null,
  p_claim_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run onboarding_pipeline_runs%rowtype;
  v_token claim_tokens%rowtype;
  v_player_id uuid;
  v_school_id uuid;
  v_slug text := p_player->>'slug';
  v_slug_holder record;
  v_award jsonb;
  v_photo jsonb;
  v_now timestamptz := now();
begin
  select *
    into v_run
    from onboarding_pipeline_runs
   where id = p_run_id
   for update;

  if not found or v_run.user_id is distinct from p_user_id then
    raise exception 'run_not_found';
  end if;

  v_player_id := coalesce(v_run.claim_player_id, p_claim_player_id, v_run.player_id);

  if p_claim_token is not null then
    select *
      into v_token
      from claim_tokens
     where token = p_claim_token
     for update;

    if not found then
      raise exception 'claim_token_missing';
    end if;

    if v_token.claimed_at is not null and v_token.claimed_by is distinct from p_user_id then
      raise exception 'claim_token_already_claimed';
    end if;

    v_player_id := coalesce(v_player_id, v_token.player_id);
  end if;

  select id, user_id
    into v_slug_holder
    from players
   where slug = v_slug
     and id is distinct from v_player_id
   limit 1;

  if found and v_slug_holder.user_id is not null and v_slug_holder.user_id is distinct from p_user_id then
    raise exception 'slug_taken';
  end if;

  if nullif(p_player->>'school', '') is not null then
    select id
      into v_school_id
      from schools
     where name ilike (p_player->>'school')
     limit 1;
  end if;

  if v_player_id is null then
    select id
      into v_player_id
      from players
     where user_id = p_user_id
     order by id
     limit 1
     for update;
  end if;

  if v_player_id is null then
    insert into players (
      full_name, name, slug, bio, dob, height_in, weight_lbs, games_played,
      position, level, school, school_id, hometown, headshot_url, image_url,
      profile_image, youtube_urls, gsis_id, cfb_team_id, visibility, is_public,
      user_id, confirmed_fields
    )
    values (
      p_player->>'full_name', p_player->>'name', v_slug, p_player->>'bio',
      nullif(p_player->>'dob', '')::date, nullif(p_player->>'height_in', '')::smallint,
      nullif(p_player->>'weight_lbs', '')::smallint, nullif(p_player->>'games_played', '')::integer,
      nullif(p_player->>'position', ''), nullif(p_player->>'level', ''),
      nullif(p_player->>'school', ''), v_school_id, nullif(p_player->>'hometown', ''),
      nullif(p_player->>'headshot_url', ''), nullif(p_player->>'image_url', ''),
      nullif(p_player->>'profile_image', ''), coalesce(p_player->'youtube_urls', '[]'::jsonb),
      nullif(p_player->>'gsis_id', ''),
      nullif(p_player->>'cfb_team_id', ''),
      true, true, p_user_id, coalesce(p_player->'confirmed_fields', '{}'::jsonb)
    )
    returning id into v_player_id;
  else
    update players
       set full_name = p_player->>'full_name', name = p_player->>'name',
           slug = v_slug, bio = p_player->>'bio',
           dob = nullif(p_player->>'dob', '')::date,
           height_in = nullif(p_player->>'height_in', '')::smallint,
           weight_lbs = nullif(p_player->>'weight_lbs', '')::smallint,
           games_played = nullif(p_player->>'games_played', '')::integer,
           position = nullif(p_player->>'position', ''),
           level = nullif(p_player->>'level', ''),
           school = nullif(p_player->>'school', ''), school_id = v_school_id,
           hometown = nullif(p_player->>'hometown', ''),
           headshot_url = nullif(p_player->>'headshot_url', ''),
           image_url = nullif(p_player->>'image_url', ''),
           profile_image = nullif(p_player->>'profile_image', ''),
           youtube_urls = coalesce(p_player->'youtube_urls', '[]'::jsonb),
           gsis_id = coalesce(nullif(p_player->>'gsis_id', ''), gsis_id),
           cfb_team_id = coalesce(nullif(p_player->>'cfb_team_id', ''), cfb_team_id),
           visibility = true, is_public = true, user_id = p_user_id,
           confirmed_fields = coalesce(p_player->'confirmed_fields', '{}'::jsonb)
     where id = v_player_id;
  end if;

  for v_award in select * from jsonb_array_elements(coalesce(p_awards, '[]'::jsonb))
  loop
    insert into player_awards (
      player_id, name, year, organization, source_url,
      ai_discovered, verified, category, significance
    )
    values (
      v_player_id, v_award->>'name', nullif(v_award->>'year', '')::integer,
      nullif(v_award->>'organization', ''), nullif(v_award->>'source_url', ''),
      true, false, 'sports', 'regional'
    )
    on conflict do nothing;
  end loop;

  if p_headshot_url is not null then
    insert into media (player_id, url, kind, provenance, display_order)
    values (v_player_id, p_headshot_url, 'headshot', 'athlete_uploaded', 0)
    on conflict do nothing;
  end if;

  for v_photo in select * from jsonb_array_elements(coalesce(p_photos, '[]'::jsonb))
  loop
    insert into media (
      player_id, url, kind, credits, width, height, display_order, provenance
    )
    values (
      v_player_id, v_photo->>'url', 'photo', nullif(v_photo->>'credits', ''),
      nullif(v_photo->>'width', '')::integer, nullif(v_photo->>'height', '')::integer,
      coalesce((v_photo->>'display_order')::integer, 1), 'founder_archive'
    )
    on conflict do nothing;
  end loop;

  insert into profiles (id, role, player_id, full_name, updated_at)
  values (p_user_id, 'player', v_player_id, p_player->>'full_name', v_now)
  on conflict (id) do update
    set role = excluded.role, player_id = excluded.player_id,
        full_name = excluded.full_name, updated_at = excluded.updated_at;

  if p_claim_token is not null then
    update claim_tokens
       set claimed_at = coalesce(claimed_at, v_now),
           claimed_by = coalesce(claimed_by, p_user_id)
     where token = p_claim_token;
  end if;

  update onboarding_pipeline_runs
     set status = 'complete', player_id = v_player_id,
         completed_at = coalesce(completed_at, v_now)
   where id = p_run_id;

  return jsonb_build_object('slug', v_slug, 'playerId', v_player_id);
end;
$$;
