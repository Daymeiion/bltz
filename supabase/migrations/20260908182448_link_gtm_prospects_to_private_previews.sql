-- Private GTM cohort preview workflow. This links an explicitly selected
-- Player Master prospect to one private demo preview without creating a
-- canonical player, claim, public Locker, viewer grant, or rights decision.
begin;

create table public.gtm_player_preview_lockers (
  gsis_id text primary key
    references public.gtm_player_prospects(gsis_id)
      on update cascade on delete restrict,
  preview_locker_id uuid not null unique
    references public.preview_lockers(id)
      on update restrict on delete restrict,
  linked_by uuid not null
    references auth.users(id) on delete restrict,
  linked_at timestamptz not null default clock_timestamp(),
  completed_revision integer,
  completed_by uuid
    references auth.users(id) on delete restrict,
  completed_at timestamptz,
  constraint gtm_player_preview_completion_state_check check (
    (completed_revision is null and completed_by is null and completed_at is null)
    or
    (completed_revision is not null and completed_revision > 0 and completed_by is not null and completed_at is not null)
  )
);

create index gtm_player_preview_lockers_linked_by_idx
  on public.gtm_player_preview_lockers(linked_by);

create index gtm_player_preview_lockers_completed_by_idx
  on public.gtm_player_preview_lockers(completed_by)
  where completed_by is not null;

comment on table public.gtm_player_preview_lockers is
  'Admin-only relationship between an explicitly selected GTM Player Master prospect and one private demo preview. It is not canonical player identity, a claim, public publication, viewer access, or rights verification.';

comment on column public.gtm_player_preview_lockers.completed_revision is
  'The exact persisted preview revision explicitly reviewed by an admin. Any later persisted content edit clears completion.';

alter table public.gtm_player_preview_lockers enable row level security;
revoke all on table public.gtm_player_preview_lockers
  from public, anon, authenticated, service_role;
grant select on table public.gtm_player_preview_lockers to authenticated;
grant all on table public.gtm_player_preview_lockers to service_role;

create policy gtm_player_preview_internal_admin_read
  on public.gtm_player_preview_lockers
  for select
  to authenticated
  using ((select public.is_internal_admin()));

create function private.open_or_create_gtm_player_preview(p_gsis_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_gsis_id text := btrim(p_gsis_id);
  master public.nfl_players%rowtype;
  existing_link public.gtm_player_preview_lockers%rowtype;
  preview_id uuid := gen_random_uuid();
  preview_slug text;
  preview_revision integer;
  safe_headshot text;
begin
  if actor is null or not public.is_internal_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if normalized_gsis_id is null
    or length(normalized_gsis_id) not between 1 and 120
    or normalized_gsis_id ~ '[[:cntrl:][:space:]]' then
    raise exception 'invalid Player Master id' using errcode = '22023';
  end if;

  perform 1
  from public.gtm_player_prospects prospect
  where prospect.gsis_id = normalized_gsis_id
    and prospect.archived = false
  for update;
  if not found then
    raise exception 'active selected prospect not found' using errcode = '22023';
  end if;

  select link.*
  into existing_link
  from public.gtm_player_preview_lockers link
  where link.gsis_id = normalized_gsis_id;

  if existing_link.preview_locker_id is not null then
    select locker.slug, locker.revision
    into preview_slug, preview_revision
    from public.preview_lockers locker
    where locker.id = existing_link.preview_locker_id;
    if preview_slug is null then
      raise exception 'linked preview not found' using errcode = '23503';
    end if;
    return jsonb_build_object(
      'id', existing_link.preview_locker_id,
      'slug', preview_slug,
      'created', false,
      'complete', coalesce(existing_link.completed_revision = preview_revision, false)
    );
  end if;

  select player.*
  into master
  from public.nfl_players player
  where player.gsis_id = normalized_gsis_id;
  if master.gsis_id is null then
    raise exception 'Player Master row not found' using errcode = '22023';
  end if;

  preview_slug := rtrim(left(
    coalesce(
      nullif(trim(both '-' from regexp_replace(lower(master.display_name), '[^a-z0-9]+', '-', 'g')), ''),
      'player'
    ),
    50
  ), '-') || '-' || left(md5(master.gsis_id), 20);
  safe_headshot := case
    when master.headshot_url is not null
      and private.preview_url_valid(master.headshot_url)
      then master.headshot_url
    else null
  end;

  insert into public.preview_lockers (
    id,
    slug,
    full_name,
    position,
    level,
    school,
    jersey,
    height_in,
    weight_lbs,
    headshot_url,
    bio
  ) values (
    preview_id,
    preview_slug,
    master.display_name,
    left(master.position, 60),
    'pro',
    left(master.college_name, 160),
    left(master.jersey_number::text, 10),
    case when master.height_in between 40 and 96 then master.height_in else null end,
    case when master.weight_lbs between 60 and 450 then master.weight_lbs else null end,
    safe_headshot,
    ''
  );

  insert into public.gtm_player_preview_lockers (
    gsis_id,
    preview_locker_id,
    linked_by
  ) values (
    normalized_gsis_id,
    preview_id,
    actor
  );

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    actor_role_scope,
    risk_level,
    new_values,
    request_metadata
  ) values (
    actor,
    'preview.gtm_linked',
    'preview_locker',
    preview_id::text,
    'platform',
    'medium',
    jsonb_build_object('player_master_gsis_id', normalized_gsis_id, 'revision', 1),
    jsonb_build_object('source', 'gtm_player_preview_function', 'demo_only', true)
  );

  return jsonb_build_object(
    'id', preview_id,
    'slug', preview_slug,
    'created', true,
    'complete', false
  );
end;
$$;

revoke all on function private.open_or_create_gtm_player_preview(text)
  from public, anon, authenticated, service_role;
grant execute on function private.open_or_create_gtm_player_preview(text)
  to authenticated;

create function public.open_or_create_gtm_player_preview(p_gsis_id text)
returns jsonb
language sql
security invoker
set search_path = ''
begin atomic;
  select private.open_or_create_gtm_player_preview(p_gsis_id);
end;

revoke all on function public.open_or_create_gtm_player_preview(text)
  from public, anon, authenticated, service_role;
grant execute on function public.open_or_create_gtm_player_preview(text)
  to authenticated;

create function private.complete_gtm_player_preview(
  p_preview_locker_id uuid,
  p_revision integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_revision integer;
  link public.gtm_player_preview_lockers%rowtype;
begin
  if actor is null or not public.is_internal_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_revision is null or p_revision <= 0 then
    raise exception 'invalid revision' using errcode = '22023';
  end if;

  select locker.revision
  into current_revision
  from public.preview_lockers locker
  where locker.id = p_preview_locker_id
  for update;
  if current_revision is null then
    raise exception 'preview not found' using errcode = 'P0002';
  end if;
  if current_revision <> p_revision then
    return 'revision_conflict';
  end if;

  select relationship.*
  into link
  from public.gtm_player_preview_lockers relationship
  where relationship.preview_locker_id = p_preview_locker_id
  for update;
  if link.preview_locker_id is null then
    return 'not_linked';
  end if;
  if link.completed_revision = current_revision then
    return 'unchanged';
  end if;

  update public.gtm_player_preview_lockers
  set completed_revision = current_revision,
      completed_by = actor,
      completed_at = clock_timestamp()
  where preview_locker_id = p_preview_locker_id;

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
    'preview.completed',
    'preview_locker',
    p_preview_locker_id::text,
    'platform',
    'medium',
    jsonb_build_object('completed_revision', link.completed_revision),
    jsonb_build_object('completed_revision', current_revision),
    jsonb_build_object('source', 'gtm_player_preview_function', 'demo_only', true, 'rights_verified', false)
  );

  return 'completed';
end;
$$;

revoke all on function private.complete_gtm_player_preview(uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function private.complete_gtm_player_preview(uuid, integer)
  to authenticated;

create function public.complete_gtm_player_preview(
  p_preview_locker_id uuid,
  p_revision integer
)
returns text
language sql
security invoker
set search_path = ''
begin atomic;
  select private.complete_gtm_player_preview(p_preview_locker_id, p_revision);
end;

revoke all on function public.complete_gtm_player_preview(uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.complete_gtm_player_preview(uuid, integer)
  to authenticated;

create function private.invalidate_gtm_player_preview_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  completed integer;
  linked_gsis_id text;
begin
  if actor is null or not public.is_internal_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select relationship.completed_revision, relationship.gsis_id
  into completed, linked_gsis_id
  from public.gtm_player_preview_lockers relationship
  where relationship.preview_locker_id = new.id
  for update;

  if row(
    old.slug, old.full_name, old.position, old.level, old.school,
    old.hometown, old.jersey, old.height_in, old.weight_lbs, old.games_played,
    old.headshot_url, old.hero_video_url, old.bio, old.athlete_quote,
    old.athlete_quote_author, old.schools, old.pro_teams, old.awards,
    old.videos, old.photos
  ) is not distinct from row(
    new.slug, new.full_name, new.position, new.level, new.school,
    new.hometown, new.jersey, new.height_in, new.weight_lbs, new.games_played,
    new.headshot_url, new.hero_video_url, new.bio, new.athlete_quote,
    new.athlete_quote_author, new.schools, new.pro_teams, new.awards,
    new.videos, new.photos
  ) then
    -- The preview revision trigger stamps every persisted UPDATE. Preserve an
    -- explicit completion across a no-op save because the reviewed content is
    -- byte-for-byte unchanged, while keeping completion bound to the current
    -- persisted revision.
    if completed = old.revision then
      update public.gtm_player_preview_lockers
      set completed_revision = new.revision
      where preview_locker_id = new.id;
    end if;
    return new;
  end if;

  if completed is null then
    return new;
  end if;

  update public.gtm_player_preview_lockers
  set completed_revision = null,
      completed_by = null,
      completed_at = null
  where preview_locker_id = new.id;

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
    'preview.completion.invalidated',
    'preview_locker',
    new.id::text,
    'platform',
    'medium',
    jsonb_build_object('completed_revision', completed),
    jsonb_build_object('revision', new.revision, 'complete', false),
    jsonb_build_object('source', 'gtm_player_preview_edit_trigger', 'demo_only', true, 'player_master_gsis_id', linked_gsis_id)
  );

  return new;
end;
$$;

revoke all on function private.invalidate_gtm_player_preview_completion()
  from public, anon, authenticated, service_role;

create trigger preview_gtm_completion_invalidation
after update of
  slug,
  full_name,
  position,
  level,
  school,
  hometown,
  jersey,
  height_in,
  weight_lbs,
  games_played,
  headshot_url,
  hero_video_url,
  bio,
  athlete_quote,
  athlete_quote_author,
  schools,
  pro_teams,
  awards,
  videos,
  photos
on public.preview_lockers
for each row execute function private.invalidate_gtm_player_preview_completion();

-- Deployment order: apply after the private preview and one-viewer migrations.
-- Recovery: prefer a forward fix. To contain creation/completion, revoke the two
-- public wrappers and replace or disable the trigger as needed. Retain the
-- relationship rows because they are audit-significant link/completion history.
-- Preview, Player Master, GTM selections, contacts, viewer grants, canonical
-- player, and claim records are otherwise unchanged.
commit;
