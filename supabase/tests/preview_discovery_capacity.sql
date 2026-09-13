begin;
do $$
declare actor uuid;
begin
  select user_id into actor
  from public.platform_role_assignments
  where role = 'super_admin' and revoked_at is null
  limit 1;
  if actor is null then raise exception 'local super-admin fixture missing'; end if;
  delete from private.preview_discovery_attempts where user_id = actor;
  delete from private.preview_discovery_limits where user_id = actor;
  perform set_config('request.jwt.claim.sub', actor::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',actor,'role','authenticated')::text, true);
end $$;

set local role authenticated;

do $$
declare request_id uuid; replacement_id uuid; index integer;
begin
  for index in 1..49 loop
    request_id := public.admit_preview_discovery(md5('successful-' || index::text) || md5('player-' || index::text));
    if request_id is null then raise exception 'attempt % was unexpectedly rejected', index; end if;
    if not public.finalize_preview_discovery(request_id,true) then raise exception 'attempt % did not finalize', index; end if;
  end loop;

  request_id := public.admit_preview_discovery(md5('failed') || md5('failed-player'));
  if request_id is null or not public.finalize_preview_discovery(request_id,false) then
    raise exception 'failed attempt was not finalized';
  end if;

  replacement_id := public.admit_preview_discovery(md5('replacement') || md5('replacement-player'));
  if replacement_id is null then raise exception 'failed attempt consumed the daily allowance'; end if;
  if public.admit_preview_discovery(md5('replacement') || md5('replacement-player')) is not null then
    raise exception 'same-player cooldown was not enforced';
  end if;
  if not public.finalize_preview_discovery(replacement_id,true) then raise exception 'replacement did not finalize'; end if;
  if public.finalize_preview_discovery(replacement_id,true) then raise exception 'finalization was not idempotent'; end if;
  if public.admit_preview_discovery(md5('fifty-first') || md5('fifty-first-player')) is not null then
    raise exception 'fifty-first charged attempt was admitted';
  end if;
end $$;

rollback;
