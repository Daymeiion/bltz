-- The deployed publish RPC was authored against profiles.full_name, while the
-- actual profiles schema exposes display_name. Patch the current function in
-- place so already-migrated projects receive the same correction as fresh
-- installs running the amended historical definitions.

do $migration$
declare
  function_oid oid;
  function_sql text;
  patched_sql text;
begin
  function_oid := to_regprocedure(
    'public.publish_onboarding_run(uuid,uuid,jsonb,jsonb,text,jsonb,uuid,text)'
  )::oid;

  if function_oid is null then
    raise exception 'publish_onboarding_run function was not found';
  end if;

  select pg_get_functiondef(function_oid)
    into function_sql;

  patched_sql := replace(
    function_sql,
    'player_id, full_name, updated_at',
    'player_id, display_name, updated_at'
  );
  patched_sql := replace(
    patched_sql,
    'full_name = excluded.full_name',
    'display_name = excluded.display_name'
  );
  patched_sql := replace(
    patched_sql,
    'coalesce(p_player->''youtube_urls'', ''[]''::jsonb)',
    'array(select jsonb_array_elements_text(coalesce(p_player->''youtube_urls'', ''[]''::jsonb)))'
  );

  if patched_sql = function_sql then
    if position('display_name' in function_sql) = 0
       or position('youtube_urls = coalesce' in function_sql) > 0 then
      raise exception 'publish_onboarding_run has an unexpected schema contract';
    end if;
    return;
  end if;

  execute patched_sql;
end
$migration$;
