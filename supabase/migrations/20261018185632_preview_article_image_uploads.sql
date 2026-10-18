-- News cards use the same private image overrides as merchandise.
begin;
do $migration$
declare definition text;
begin
  definition := pg_get_functiondef('private.preview_editorial_valid(text,jsonb)'::regprocedure);
  if position('kind=''merchandise'' and k=''imageStoragePath''' in definition)=0 then
    raise exception 'preview editorial validator changed; inspect before applying';
  end if;
  execute replace(definition,
    'kind=''merchandise'' and k=''imageStoragePath''',
    'kind in (''merchandise'',''article'') and k=''imageStoragePath''');
end;
$migration$;

-- Reuse the existing value-only ownership predicate; retain its name/ACLs.
alter table public.preview_lockers add constraint preview_article_images_owned
  check (private.preview_merchandise_images_owned(id,article_edits)) not valid;
alter table public.preview_lockers validate constraint preview_article_images_owned;
comment on function private.preview_merchandise_images_owned(uuid,jsonb) is
  'Private article and merchandise image overrides must belong to this preview. Legacy function name retained for compatibility.';
commit;
