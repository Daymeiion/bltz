begin;

alter table public.preview_lockers
  add column dob date constraint preview_dob_valid check (dob between date '1850-01-01' and current_date),
  add column high_school text constraint preview_high_school_valid check (
    high_school is null or (length(btrim(high_school)) between 1 and 160 and high_school !~ '[[:cntrl:]]')
  );
alter table public.players add column high_school text constraint players_high_school_valid check (
  high_school is null or (length(btrim(high_school)) between 1 and 160 and high_school !~ '[[:cntrl:]]')
);
comment on column public.preview_lockers.dob is 'Reviewed date of birth for Locker presentation. Date only, never inferred from age.';
comment on column public.preview_lockers.high_school is 'Reviewed high school, distinct from the primary college/school affiliation.';
comment on column public.players.high_school is 'Athlete high school, distinct from college and current team affiliations.';
grant select(dob,high_school), insert(dob,high_school), update(dob,high_school) on public.preview_lockers to authenticated;

-- Keep existing RLS, revision checks, audit triggers and atomic enrollment.
do $migration$
declare definition text;
begin
  definition := pg_get_functiondef('public.preview_conversion_create(uuid,jsonb,jsonb)'::regprocedure);
  if strpos(definition,'level,school,hometown')=0 or strpos(definition,'r.level,r.school,r.hometown')=0 then
    raise exception 'Unexpected preview enrollment definition';
  end if;
  definition := replace(definition,'level,school,hometown','level,school,dob,high_school,hometown');
  definition := replace(definition,'r.level,r.school,r.hometown','r.level,r.school,r.dob,r.high_school,r.hometown');
  execute definition;

  definition := pg_get_functiondef('private.audit_preview_change()'::regprocedure);
  if strpos(definition,'jsonb_build_object(''revision'',old.revision,')=0
    or strpos(definition,'jsonb_build_object(''revision'',new.revision,')=0 then
    raise exception 'Unexpected preview audit definition';
  end if;
  definition := replace(definition,'jsonb_build_object(''revision'',old.revision,',
    'jsonb_build_object(''revision'',old.revision,''dob'',old.dob,''high_school'',old.high_school,');
  definition := replace(definition,'jsonb_build_object(''revision'',new.revision,',
    'jsonb_build_object(''revision'',new.revision,''dob'',new.dob,''high_school'',new.high_school,');
  execute definition;

  -- Extend the existing atomic publish function without changing its access or
  -- identity checks. Older clients that omit high_school preserve its value.
  definition := pg_get_functiondef('public.publish_onboarding_run(uuid,uuid,jsonb,jsonb,text,jsonb,uuid,text)'::regprocedure);
  if strpos(definition,'full_name, name, slug, bio, dob, height_in')=0
    or strpos(definition,'nullif(p_player->>''dob'', '''')::date, nullif(p_player->>''height_in'', '''')::smallint')=0
    or strpos(definition,'dob = nullif(p_player->>''dob'', '''')::date,')=0 then
    raise exception 'Unexpected athlete publish definition';
  end if;
  definition := replace(definition,'full_name, name, slug, bio, dob, height_in','full_name, name, slug, bio, dob, high_school, height_in');
  definition := replace(definition,'nullif(p_player->>''dob'', '''')::date, nullif(p_player->>''height_in'', '''')::smallint',
    'nullif(p_player->>''dob'', '''')::date, nullif(p_player->>''high_school'', ''''), nullif(p_player->>''height_in'', '''')::smallint');
  definition := replace(definition,'dob = nullif(p_player->>''dob'', '''')::date,',
    'dob = nullif(p_player->>''dob'', '''')::date, high_school = case when p_player ? ''high_school'' then nullif(p_player->>''high_school'', '''') else high_school end,');
  execute definition;
end;
$migration$;

notify pgrst, 'reload schema';
commit;
