begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000e001', 'gtm-admin@example.test'),
  ('00000000-0000-4000-8000-00000000e002', 'gtm-user@example.test');

insert into public.platform_role_assignments (id, user_id, role, assigned_by, assignment_reason)
values (
  '00000000-0000-4000-8000-00000000e101',
  '00000000-0000-4000-8000-00000000e001',
  'super_admin',
  '00000000-0000-4000-8000-00000000e001',
  'GTM Foundation V1 UI/QA rollback fixture'
);

insert into public.players (id, slug, name, display_name, team, position, level)
values
  ('00000000-0000-4000-8000-00000000e201', 'qa-alex-smith-one', 'Alex Smith', 'Alex Smith', 'Denver', 'QB', 'pro'),
  ('00000000-0000-4000-8000-00000000e202', 'qa-alex-smith-two', 'Alex Smith', 'Alex Smith', 'Atlanta', 'WR', 'pro');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000e002', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000e002","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.gtm_contacts) <> 0 then
    raise exception 'ordinary authenticated user could read GTM contacts';
  end if;
  begin
    insert into public.gtm_contacts (display_name, created_by, updated_by)
    values ('Forbidden contact', auth.uid(), auth.uid());
    raise exception 'ordinary authenticated user could write GTM contacts';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000e001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000e001","role":"authenticated"}', true);

select public.prepare_gtm_import_job(
  'connections.csv', 'linkedin_connections', repeat('a', 64),
  '00000000-0000-4000-8000-00000000e301', '{}'::jsonb,
  '{"valid":1,"invalid":0,"duplicates":0,"potentialMatches":1}'::jsonb,
  1, 0, 0, 1
);

create temporary table first_import as
select * from public.import_gtm_contacts(
  'connections.csv', repeat('a', 64), '00000000-0000-4000-8000-00000000e301',
  '{}'::jsonb, '{"valid":1,"invalid":0,"duplicates":0,"potentialMatches":1}'::jsonb,
  jsonb_build_array(jsonb_build_object(
    'displayName', 'Alex Smith', 'firstName', 'Alex', 'lastName', 'Smith',
    'email', 'alex@example.test', 'linkedinUrl', 'https://www.linkedin.com/in/qa-alex-smith',
    'currentCompany', 'Denver', 'currentTitle', 'Founder', 'connectedOn', '2026-08-01',
    'contactType', 'athlete', 'sport', 'football', 'leagueLevel', 'pro',
    'doNotAutomate', false, 'sourceRecordId', repeat('b', 64),
    'playerId', '00000000-0000-4000-8000-00000000e201',
    'playerMatchType', 'name_and_team', 'playerMatchConfidence', 0.92
  )), 0, 0
);

do $$ begin
  if (select rows_created from first_import) <> 1 then raise exception 'first import did not create one contact'; end if;
end $$;

select public.prepare_gtm_import_job(
  'connections.csv', 'linkedin_connections', repeat('c', 64),
  '00000000-0000-4000-8000-00000000e302', '{}'::jsonb,
  '{"valid":1,"invalid":0,"duplicates":0,"potentialMatches":0}'::jsonb,
  1, 0, 0, 0
);

create temporary table repeat_import as
select * from public.import_gtm_contacts(
  'connections.csv', repeat('c', 64), '00000000-0000-4000-8000-00000000e302',
  '{}'::jsonb, '{"valid":1,"invalid":0,"duplicates":0,"potentialMatches":0}'::jsonb,
  jsonb_build_array(jsonb_build_object(
    'displayName', 'Alex Smith', 'firstName', 'Alex', 'lastName', 'Smith',
    'email', 'alex@example.test', 'linkedinUrl', 'https://www.linkedin.com/in/qa-alex-smith',
    'currentCompany', 'Denver', 'currentTitle', 'CEO', 'connectedOn', '2026-08-01',
    'contactType', 'athlete', 'sport', 'football', 'leagueLevel', 'pro',
    'doNotAutomate', false, 'sourceRecordId', repeat('b', 64)
  )), 0, 0
);

do $$
declare v_contact_id uuid;
declare interaction_id uuid;
begin
  if (select rows_updated from repeat_import) <> 1 then raise exception 'repeat import did not update one contact'; end if;
  select id into v_contact_id from public.gtm_contacts where linkedin_url = 'https://www.linkedin.com/in/qa-alex-smith';
  if (select current_title from public.gtm_contacts where id = v_contact_id) <> 'CEO' then raise exception 'repeat import did not persist changed title'; end if;

  insert into public.gtm_notes (contact_id, note_type, body, created_by)
  values (v_contact_id, 'call', 'Initial note', auth.uid());
  update public.gtm_notes set body = 'Edited note' where gtm_notes.contact_id = v_contact_id;
  if not exists (select 1 from public.gtm_notes note where note.contact_id = v_contact_id and note.body = 'Edited note') then raise exception 'note edit failed'; end if;

  select result.id into interaction_id from public.log_gtm_interaction_v3(
    v_contact_id, 'phone', 'outbound', now(), 'QA call', 'Discussed pilot', null, null,
    'Send pilot outline', now() + interval '2 days', array['pilot_opportunity'],
    'After university pilot', true
  ) result;
  if (select last_interaction_at is null from public.gtm_contacts where id = v_contact_id) then raise exception 'interaction did not update contact'; end if;

  perform public.create_gtm_customer_discovery(
    v_contact_id, interaction_id, null, 'Fragmented media', null, null::smallint, null, null,
    null, true, null, null, null, null, null, null, 'Partial record'
  );
  perform public.create_gtm_customer_discovery(
    v_contact_id, interaction_id, null, 'Fragmented media', 'Spreadsheets', 5::smallint, 'Player Locker', 'Archive search',
    true, true, true, 'Athletic director', '$25k-$50k', 'Timing', true, 'Conference peer', 'Full record'
  );
  if (select count(*) from public.gtm_customer_discovery discovery where discovery.contact_id = v_contact_id) <> 2 then raise exception 'discovery records missing'; end if;

  perform public.match_gtm_contact_player(v_contact_id, '00000000-0000-4000-8000-00000000e201');
  perform public.match_gtm_contact_player(v_contact_id, '00000000-0000-4000-8000-00000000e201');
  if (select count(*) from public.gtm_contact_players link where link.contact_id = v_contact_id and link.player_id = '00000000-0000-4000-8000-00000000e201') <> 1 then raise exception 'duplicate Player pair created'; end if;
  if not exists (select 1 from public.gtm_contact_players link where link.contact_id = v_contact_id and link.verified) then raise exception 'manual Player verification failed'; end if;
end;
$$;

rollback;
