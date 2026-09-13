-- Private, demo-only preview restoration. No canonical player writes or links.
-- Fresh migration: never replay the preserved public-read preview migration.
begin;

create function private.preview_url_valid(value text) returns boolean
language sql immutable set search_path = '' as $$
  select value is null or (
    length(value) <= 2048 and value !~ '[[:space:][:cntrl:]\\]'
    and value ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}([/?#]|$)'
    and value !~* '^https://[^/?#]*\.(localhost|local|internal|test|invalid)([/?#]|$)'
  );
$$;
revoke all on function private.preview_url_valid(text) from public, anon, authenticated, service_role;
grant execute on function private.preview_url_valid(text) to authenticated;

create function private.preview_items_valid(kind text, items jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; k text; v jsonb; allowed text[]; max_items int; ids text[] := '{}';
begin
  if items is null or jsonb_typeof(items) <> 'array' then return false; end if;
  case kind
    when 'team' then allowed := array['label','color','logo']; max_items := 12;
    when 'award' then allowed := array['year','label']; max_items := 40;
    when 'video' then allowed := array['id','title','url','thumb']; max_items := 24;
    when 'photo' then allowed := array['id','title','url','credits','sourceUrl','level','season']; max_items := 40;
    else return false;
  end case;
  if jsonb_array_length(items) > max_items or octet_length(items::text) > 100000 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) <> 'object' or not item ?& allowed then return false; end if;
    for k,v in select key,value from jsonb_each(item) loop
      if not k = any(allowed) or jsonb_typeof(v) not in ('string','null') then return false; end if;
      if translate(item->>k, E'\t\n\r', '') ~ '[[:cntrl:]]' then return false; end if;
      if k in ('url','thumb','logo','sourceUrl') then
        -- Keep input-only validation invoker; no private-schema lookup/grant.
        if item->>k is not null and not (
          length(item->>k) <= 2048 and item->>k !~ '[[:space:][:cntrl:]\\]'
          and item->>k ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}([/?#]|$)'
          and item->>k !~* '^https://[^/?#]*\.(localhost|local|internal|test|invalid)([/?#]|$)'
        ) then return false; end if;
      elsif length(item->>k) > (case k when 'credits' then 300 when 'label' then 200 when 'year' then 20 when 'season' then 20 else 160 end) then return false;
      end if;
    end loop;
    if kind = 'team' and (coalesce(length(btrim(item->>'label')),0) not between 1 and 80 or coalesce(item->>'color','') !~ '^#[0-9A-Fa-f]{6}$') then return false; end if;
    if kind = 'award' and (coalesce(length(btrim(item->>'label')),0) not between 1 and 200 or jsonb_typeof(item->'year') <> 'string') then return false; end if;
    if kind in ('video','photo') then
      if coalesce(item->>'id','') !~ '^[A-Za-z0-9_-]{1,80}$' or coalesce(length(btrim(item->>'title')),0) not between 1 and 160 or item->>'url' is null then return false; end if;
      if (item->>'id') = any(ids) then return false; end if;
      ids := array_append(ids,item->>'id');
    end if;
    if kind = 'photo' and coalesce(item->>'level','') not in ('hs','cfb','pro','off-field') then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function private.preview_items_valid(text,jsonb) from public, anon, authenticated, service_role;
grant execute on function private.preview_items_valid(text,jsonb) to authenticated;

-- Do not IF NOT EXISTS a divergent historical table into a false success.
-- Deployment preflight must confirm absence; unexpected tables stop migration.
create table public.preview_lockers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(slug) between 3 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  full_name text not null check (length(btrim(full_name)) between 2 and 120),
  position text check (length(position) <= 60),
  level text check (level in ('hs','college','pro','former')),
  school text check (length(school) <= 160),
  hometown text check (length(hometown) <= 160),
  jersey text check (length(jersey) <= 10),
  height_in smallint check (height_in between 40 and 96),
  weight_lbs smallint check (weight_lbs between 60 and 450),
  games_played integer check (games_played between 0 and 1000),
  headshot_url text check (private.preview_url_valid(headshot_url)),
  hero_video_url text check (private.preview_url_valid(hero_video_url)),
  bio text not null default '' check (length(bio) <= 4000),
  athlete_quote text check (length(athlete_quote) <= 600),
  athlete_quote_author text check (length(athlete_quote_author) <= 160),
  schools jsonb not null default '[]' check (private.preview_items_valid('team',schools)),
  pro_teams jsonb not null default '[]' check (private.preview_items_valid('team',pro_teams)),
  awards jsonb not null default '[]' check (private.preview_items_valid('award',awards)),
  videos jsonb not null default '[]' check (private.preview_items_valid('video',videos)),
  photos jsonb not null default '[]' check (private.preview_items_valid('photo',photos)),
  revision integer not null default 1 check (revision > 0),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.preview_lockers is 'Private admin demo presentation records. Not Athlete Career IDs. No public sharing, claims, revenue or canonical player linkage.';
create index preview_lockers_created_idx on public.preview_lockers(created_at desc,id);
create index preview_lockers_creator_idx on public.preview_lockers(created_by);
alter table public.preview_lockers enable row level security;
revoke all on public.preview_lockers from public, anon, authenticated, service_role;
grant select (id,slug,full_name,position,level,school,hometown,jersey,height_in,weight_lbs,games_played,headshot_url,hero_video_url,bio,athlete_quote,athlete_quote_author,schools,pro_teams,awards,videos,photos,revision,created_at,updated_at) on public.preview_lockers to authenticated;
grant insert (id,slug,full_name,position,level,school,hometown,jersey,height_in,weight_lbs,games_played,headshot_url,hero_video_url,bio,athlete_quote,athlete_quote_author,schools,pro_teams,awards,videos,photos) on public.preview_lockers to authenticated;
grant update (slug,full_name,position,level,school,hometown,jersey,height_in,weight_lbs,games_played,headshot_url,hero_video_url,bio,athlete_quote,athlete_quote_author,schools,pro_teams,awards,videos,photos) on public.preview_lockers to authenticated;
create policy preview_admin_read on public.preview_lockers for select to authenticated using ((select public.is_internal_admin()));
create policy preview_admin_create on public.preview_lockers for insert to authenticated with check ((select public.is_internal_admin()) and created_by = (select auth.uid()));
create policy preview_admin_update on public.preview_lockers for update to authenticated using ((select public.is_internal_admin())) with check ((select public.is_internal_admin()));

create function private.preview_stamp() returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  if translate(concat_ws('',new.full_name,new.position,new.school,new.hometown,new.jersey,new.bio,new.athlete_quote,new.athlete_quote_author), E'\t\n\r', '') ~ '[[:cntrl:]]' then
    raise exception 'invalid preview text' using errcode='23514';
  end if;
  if tg_op = 'INSERT' then new.created_by := auth.uid(); new.revision := 1; new.created_at := clock_timestamp();
  else
    new.id := old.id; new.created_by := old.created_by; new.created_at := old.created_at;
    new.revision := old.revision + 1;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end; $$;
revoke all on function private.preview_stamp() from public, anon, authenticated, service_role;
create trigger preview_stamp before insert or update on public.preview_lockers for each row execute function private.preview_stamp();

-- Definer is scoped only to immutable audit insertion; preview mutation itself
-- uses the caller's grants/RLS. Any audit error rolls the mutation back.
create function private.audit_preview_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,previous_values,new_values,request_metadata)
  values(auth.uid(),case when tg_op='INSERT' then 'preview.created' else 'preview.updated' end,'preview_locker',new.id::text,'platform','medium',
    case when tg_op='UPDATE' then jsonb_build_object('revision',old.revision) else null end,
    jsonb_build_object('revision',new.revision,'photos',jsonb_array_length(new.photos),'videos',jsonb_array_length(new.videos)),
    jsonb_build_object('source','private_preview_trigger','demo_only',true));
  return new;
end; $$;
revoke all on function private.audit_preview_change() from public, anon, authenticated, service_role;
create trigger preview_write_audit after insert or update on public.preview_lockers for each row execute function private.audit_preview_change();

-- Rate admission contains no identity input, raw provider results or credentials.
create table private.preview_discovery_limits (
  user_id uuid primary key references auth.users(id), last_started timestamptz not null,
  day date not null, starts integer not null check (starts between 1 and 10)
);
alter table private.preview_discovery_limits enable row level security;
revoke all on private.preview_discovery_limits from public, anon, authenticated, service_role;
create function private.admit_preview_discovery() returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); request_id uuid := gen_random_uuid(); admitted uuid;
begin
  if actor is null or not public.is_internal_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  insert into private.preview_discovery_limits as limits(user_id,last_started,day,starts)
  values(actor,clock_timestamp(),(clock_timestamp() at time zone 'UTC')::date,1)
  on conflict(user_id) do update set last_started=excluded.last_started,day=excluded.day,
    starts=case when limits.day=excluded.day then limits.starts+1 else 1 end
  where limits.last_started < clock_timestamp()-interval '180 seconds'
    and (limits.day<>excluded.day or limits.starts<10)
  returning user_id into admitted;
  if admitted is null then return null; end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,actor_role_scope,risk_level,request_metadata)
    values(actor,'preview.discovery.started','preview_discovery',request_id::text,'platform','medium','{"demo_only":true}');
  return request_id;
end; $$;
revoke all on function private.admit_preview_discovery() from public, anon, authenticated, service_role;
grant execute on function private.admit_preview_discovery() to authenticated;
-- Parse/bind the private function at creation time, not under the caller's
-- schema lookup privileges. Caller still needs its explicit EXECUTE grant.
create function public.admit_preview_discovery() returns uuid language sql security invoker set search_path = ''
begin atomic;
  select private.admit_preview_discovery();
end;
revoke all on function public.admit_preview_discovery() from public, anon, authenticated, service_role;
grant execute on function public.admit_preview_discovery() to authenticated;
commit;
