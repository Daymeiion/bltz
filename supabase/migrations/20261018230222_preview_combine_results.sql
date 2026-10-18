begin;

create function private.preview_combine_valid(events jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare event jsonb; measurement jsonb; ids text[] := '{}'; metrics text[]; metric text; reference text; amount numeric; lower_bound numeric; upper_bound numeric;
begin
  if events is null or jsonb_typeof(events) is distinct from 'array' then return false; end if;
  if jsonb_array_length(events)>10 or octet_length(events::text)>32000 then return false; end if;
  for event in select value from jsonb_array_elements(events) loop
    if jsonb_typeof(event) is distinct from 'object' or event-array['id','eventType','year','sourceUrl','timing','measurements'] <> '{}'::jsonb then return false; end if;
    if jsonb_typeof(event->'id') is distinct from 'string' or event->>'id' !~ '^[A-Za-z0-9_-]{1,80}$' or event->>'id'=any(ids) then return false; end if;
    ids:=array_append(ids,event->>'id');
    if event->>'eventType' is null or event->>'eventType' not in ('combine','pro_day') then return false; end if;
    if event ? 'year' and event->'year'<>'null'::jsonb then
      if jsonb_typeof(event->'year') is distinct from 'number' then return false; end if;
      amount:=(event->>'year')::numeric;
      if amount<>trunc(amount) or amount not between 1950 and 2100 then return false; end if;
    end if;
    if event ? 'timing' and (event->>'timing' is null or event->>'timing' not in ('not_recorded','official','unofficial')) then return false; end if;
    -- Inline the existing preview URL rules so validation does not need private
    -- schema USAGE or a privilege-elevating nested function.
    reference:=event->>'sourceUrl';
    if reference is not null and (length(reference)>2048 or reference ~ '[[:space:][:cntrl:]\\]' or reference !~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}([/?#]|$)' or reference ~* '^https://[^/?#]*\.(localhost|local|internal|test|invalid)([/?#]|$)') then return false; end if;
    if jsonb_typeof(event->'measurements') is distinct from 'array' then return false; end if;
    if jsonb_array_length(event->'measurements')>11 then return false; end if;
    metrics:='{}';
    for measurement in select value from jsonb_array_elements(event->'measurements') loop
      if jsonb_typeof(measurement) is distinct from 'object' or measurement-array['metric','value','sourceUrl']<>'{}'::jsonb then return false; end if;
      metric:=measurement->>'metric';
      if metric is null or metric=any(metrics) or jsonb_typeof(measurement->'value') is distinct from 'number' then return false; end if;
      case metric
        when 'forty','shuttle','cone' then lower_bound:=1; upper_bound:=30;
        when 'ten_split' then lower_bound:=0.1; upper_bound:=10;
        when 'vertical' then lower_bound:=1; upper_bound:=100;
        when 'broad_jump' then lower_bound:=1; upper_bound:=240;
        when 'bench' then lower_bound:=0; upper_bound:=100;
        when 'height' then lower_bound:=40; upper_bound:=100;
        when 'weight' then lower_bound:=60; upper_bound:=450;
        when 'arm' then lower_bound:=10; upper_bound:=50;
        when 'hand' then lower_bound:=4; upper_bound:=16;
        else return false;
      end case;
      amount:=(measurement->>'value')::numeric;
      if amount not between lower_bound and upper_bound or (metric='bench' and amount<>trunc(amount)) then return false; end if;
      reference:=measurement->>'sourceUrl';
      if coalesce(reference,event->>'sourceUrl') is null then return false; end if;
      if reference is not null and (length(reference)>2048 or reference ~ '[[:space:][:cntrl:]\\]' or reference !~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}([/?#]|$)' or reference ~* '^https://[^/?#]*\.(localhost|local|internal|test|invalid)([/?#]|$)') then return false; end if;
      metrics:=array_append(metrics,metric);
    end loop;
  end loop;
  return true;
end; $$;
revoke all on function private.preview_combine_valid(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.preview_combine_valid(jsonb) to authenticated;

alter table public.preview_lockers add column combine_results jsonb not null default '[]'::jsonb
  constraint preview_combine_results_valid check (private.preview_combine_valid(combine_results));
grant select(combine_results),insert(combine_results),update(combine_results) on public.preview_lockers to authenticated;
grant select(combine_results) on public.preview_lockers to service_role;
comment on column public.preview_lockers.combine_results is 'Manual, sourced Combine and Pro Day event measurements for preview presentation. Kept separate from season stats. Existing access gates, revisions and audit apply; scraper runs do not edit these values.';

do $migration$
declare definition text;
begin
  definition:=pg_get_functiondef('public.preview_conversion_create(uuid,jsonb,jsonb)'::regprocedure);
  if strpos(definition,'pfr_stats,videos')=0 or strpos(definition,'coalesce(r.pfr_stats,''[]''::jsonb),r.videos')=0 then raise exception 'Unexpected preview enrollment definition'; end if;
  definition:=replace(definition,'pfr_stats,videos','pfr_stats,combine_results,videos');
  definition:=replace(definition,'coalesce(r.pfr_stats,''[]''::jsonb),r.videos','coalesce(r.pfr_stats,''[]''::jsonb),coalesce(r.combine_results,''[]''::jsonb),r.videos');
  execute definition;

  definition:=pg_get_functiondef('private.audit_preview_change()'::regprocedure);
  if strpos(definition,'jsonb_build_object(''revision'',old.revision')=0 or strpos(definition,'jsonb_build_object(''revision'',new.revision')=0 then raise exception 'Unexpected preview audit definition'; end if;
  definition:=replace(definition,'jsonb_build_object(''revision'',old.revision','jsonb_build_object(''revision'',old.revision,''combine_results'',old.combine_results');
  definition:=replace(definition,'jsonb_build_object(''revision'',new.revision','jsonb_build_object(''revision'',new.revision,''combine_results'',new.combine_results');
  execute definition;
end;
$migration$;
notify pgrst,'reload schema';
commit;
