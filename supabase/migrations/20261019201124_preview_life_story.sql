begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Existing bios remain intact. Life Story is independently authored and starts empty.
alter table public.preview_lockers add column story text not null default ''
  constraint preview_story_valid check (
    length(story) <= 20000
    and regexp_replace(story, E'[\t\n\r]', '', 'g') !~ '[[:cntrl:]]'
  );
grant select(story), insert(story), update(story) on public.preview_lockers to authenticated;
grant select(story) on public.preview_lockers to service_role;
comment on column public.preview_lockers.story is 'Manually authored long-form life story, separate from the short bio. Existing preview access, revisions and audit apply. Scraper refreshes do not edit this field.';

do $migration$
declare definition text;
begin
  definition := pg_get_functiondef('public.preview_conversion_create(uuid,jsonb,jsonb)'::regprocedure);
  if strpos(definition,'bio,athlete_quote') = 0 or strpos(definition,'r.bio,r.athlete_quote') = 0 then
    raise exception 'Unexpected preview enrollment definition';
  end if;
  definition := replace(definition,'bio,athlete_quote','bio,story,athlete_quote');
  definition := replace(definition,'r.bio,r.athlete_quote','r.bio,coalesce(r.story,''''),r.athlete_quote');
  execute definition;

  definition := pg_get_functiondef('private.audit_preview_change()'::regprocedure);
  if strpos(definition,'jsonb_build_object(''revision'',old.revision') = 0
    or strpos(definition,'jsonb_build_object(''revision'',new.revision') = 0 then
    raise exception 'Unexpected preview audit definition';
  end if;
  definition := replace(definition,'jsonb_build_object(''revision'',old.revision','jsonb_build_object(''revision'',old.revision,''story'',old.story');
  definition := replace(definition,'jsonb_build_object(''revision'',new.revision','jsonb_build_object(''revision'',new.revision,''story'',new.story');
  execute definition;
end;
$migration$;
notify pgrst, 'reload schema';
commit;
