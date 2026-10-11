-- User-authorized sprint import: preview payload only, using existing RLS,
-- revision and audit triggers. Canonical player statistics are unchanged.
begin;
alter table public.preview_lockers add column pfr_stats jsonb not null default '[]'::jsonb
  constraint preview_pfr_stats_bounded check (
    jsonb_typeof(pfr_stats) = 'array' and jsonb_array_length(pfr_stats) <= 7
    and octet_length(pfr_stats::text) <= 100000
  );
grant select (pfr_stats), insert (pfr_stats), update (pfr_stats)
  on public.preview_lockers to authenticated;
comment on column public.preview_lockers.pfr_stats is
  'Admin-reviewed Pro Football Reference regular-season CSV tables for preview Lockers. Source URLs are references, never fetched. Existing preview access controls apply.';

-- Preserve all previous fields and the atomic enrollment/retry contract.
do $migration$
declare definition text := pg_get_functiondef('public.preview_conversion_create(uuid,jsonb,jsonb)'::regprocedure);
begin
  if strpos(definition, 'cfb_stats,videos') = 0
    or strpos(definition, 'coalesce(r.cfb_stats,''[]''::jsonb),r.videos') = 0 then
    raise exception 'Unexpected preview enrollment function; review before migration';
  end if;
  definition := replace(definition, 'cfb_stats,videos', 'cfb_stats,pfr_stats,videos');
  definition := replace(definition, 'coalesce(r.cfb_stats,''[]''::jsonb),r.videos',
    'coalesce(r.cfb_stats,''[]''::jsonb),coalesce(r.pfr_stats,''[]''::jsonb),r.videos');
  execute definition;
end;
$migration$;
notify pgrst, 'reload schema';
commit;
