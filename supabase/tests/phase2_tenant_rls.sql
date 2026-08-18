begin;

-- Deterministic identities for transactional role tests. The transaction is
-- rolled back, so the isolated database remains clean after verification.
insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-00000000a001', 'phase2-member-a@example.test'),
  ('00000000-0000-4000-8000-00000000a002', 'phase2-member-b@example.test'),
  ('00000000-0000-4000-8000-00000000a003', 'phase2-non-member@example.test'),
  ('00000000-0000-4000-8000-00000000a004', 'phase2-legacy-admin@example.test'),
  ('00000000-0000-4000-8000-00000000a005', 'phase2-platform-admin@example.test'),
  ('00000000-0000-4000-8000-00000000a006', 'phase2-owner-a@example.test'),
  ('00000000-0000-4000-8000-00000000a007', 'phase2-organization-admin@example.test');

-- The production baseline does not create profiles from auth.users in this
-- isolated path, so create the legacy compatibility fixture explicitly.
insert into public.profiles (id, email, role)
values (
  '00000000-0000-4000-8000-00000000a004',
  'phase2-legacy-admin@example.test',
  'admin'
);

insert into public.organizations (
  id, name, organization_type, status, created_by
)
values
  (
    '00000000-0000-4000-8000-00000000b001',
    'Phase 2 Organization A',
    'school',
    'approved',
    '00000000-0000-4000-8000-00000000a005'
  ),
  (
    '00000000-0000-4000-8000-00000000b002',
    'Phase 2 Organization B',
    'team',
    'approved',
    '00000000-0000-4000-8000-00000000a005'
  );

insert into public.organization_memberships (
  id, organization_id, user_id, role, status, created_by
)
values
  (
    '00000000-0000-4000-8000-00000000c001',
    '00000000-0000-4000-8000-00000000b001',
    '00000000-0000-4000-8000-00000000a001',
    'viewer',
    'active',
    '00000000-0000-4000-8000-00000000a005'
  ),
  (
    '00000000-0000-4000-8000-00000000c002',
    '00000000-0000-4000-8000-00000000b002',
    '00000000-0000-4000-8000-00000000a001',
    'viewer',
    'suspended',
    '00000000-0000-4000-8000-00000000a005'
  ),
  (
    '00000000-0000-4000-8000-00000000c003',
    '00000000-0000-4000-8000-00000000b002',
    '00000000-0000-4000-8000-00000000a002',
    'viewer',
    'active',
    '00000000-0000-4000-8000-00000000a005'
  ),
  (
    '00000000-0000-4000-8000-00000000c004',
    '00000000-0000-4000-8000-00000000b001',
    '00000000-0000-4000-8000-00000000a006',
    'owner',
    'active',
    '00000000-0000-4000-8000-00000000a005'
  ),
  (
    '00000000-0000-4000-8000-00000000c005',
    '00000000-0000-4000-8000-00000000b001',
    '00000000-0000-4000-8000-00000000a007',
    'organization_admin',
    'active',
    '00000000-0000-4000-8000-00000000a005'
  );

insert into public.platform_role_assignments (
  id, user_id, role, assigned_by, assignment_reason
)
values (
  '00000000-0000-4000-8000-00000000d001',
  '00000000-0000-4000-8000-00000000a005',
  'super_admin',
  '00000000-0000-4000-8000-00000000a005',
  'Phase 2 local RLS verification fixture'
);

insert into public.audit_logs (
  organization_id,
  actor_user_id,
  action,
  entity_type,
  entity_id,
  actor_role,
  actor_role_scope,
  reason,
  correlation_id
)
values (
  '00000000-0000-4000-8000-00000000b001',
  '00000000-0000-4000-8000-00000000a005',
  'organization.created',
  'organization',
  '00000000-0000-4000-8000-00000000b001',
  'super_admin',
  'platform',
  'Phase 2 local RLS verification fixture',
  '00000000-0000-4000-8000-00000000f001'
);

insert into public.teams (id, name, slug, organization_id)
values
  (
    '00000000-0000-4000-8000-00000000e001',
    'Phase 2 Unmapped Team',
    'phase-2-unmapped-team',
    null
  ),
  (
    '00000000-0000-4000-8000-00000000e002',
    'Phase 2 Mapped Team',
    'phase-2-mapped-team',
    '00000000-0000-4000-8000-00000000b001'
  ),
  (
    '00000000-0000-4000-8000-00000000e003',
    'Phase 2 Mapped Team B',
    'phase-2-mapped-team-b',
    '00000000-0000-4000-8000-00000000b002'
  );

insert into public.players (id, slug, name, team_id)
values
  (
    '00000000-0000-4000-8000-00000000f101',
    'phase-2-athlete-a',
    'Phase 2 Athlete A',
    '00000000-0000-4000-8000-00000000e002'
  ),
  (
    '00000000-0000-4000-8000-00000000f102',
    'phase-2-athlete-b',
    'Phase 2 Athlete B',
    null
  );

insert into public.seasons (
  id, organization_id, sport, season_code, starts_on, ends_on, status
)
values
  (
    '00000000-0000-4000-8000-00000000f201',
    '00000000-0000-4000-8000-00000000b001',
    'football',
    '2026',
    '2026-08-01',
    '2027-02-28',
    'active'
  ),
  (
    '00000000-0000-4000-8000-00000000f202',
    '00000000-0000-4000-8000-00000000b002',
    'football',
    '2026',
    '2026-08-01',
    '2027-02-28',
    'active'
  );

insert into public.team_seasons (
  id, organization_id, team_id, season_id
)
values
  (
    '00000000-0000-4000-8000-00000000f301',
    '00000000-0000-4000-8000-00000000b001',
    '00000000-0000-4000-8000-00000000e002',
    '00000000-0000-4000-8000-00000000f201'
  ),
  (
    '00000000-0000-4000-8000-00000000f302',
    '00000000-0000-4000-8000-00000000b002',
    '00000000-0000-4000-8000-00000000e003',
    '00000000-0000-4000-8000-00000000f202'
  );

insert into public.athlete_team_seasons (
  id, organization_id, team_season_id, player_id, roster_status,
  jersey_number, position, starts_on
)
values
  (
    '00000000-0000-4000-8000-00000000f401',
    '00000000-0000-4000-8000-00000000b001',
    '00000000-0000-4000-8000-00000000f301',
    '00000000-0000-4000-8000-00000000f101',
    'active',
    '12',
    'quarterback',
    '2026-08-01'
  ),
  (
    '00000000-0000-4000-8000-00000000f402',
    '00000000-0000-4000-8000-00000000b002',
    '00000000-0000-4000-8000-00000000f302',
    '00000000-0000-4000-8000-00000000f102',
    'active',
    '24',
    'safety',
    '2026-08-01'
  );

insert into public.athlete_season_stats (
  id, organization_id, athlete_team_season_id, source, season_phase, stats
)
values
  (
    '00000000-0000-4000-8000-00000000f501',
    '00000000-0000-4000-8000-00000000b001',
    '00000000-0000-4000-8000-00000000f401',
    'phase2_test',
    'regular',
    '{"games":1}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-00000000f502',
    '00000000-0000-4000-8000-00000000b002',
    '00000000-0000-4000-8000-00000000f402',
    'phase2_test',
    'regular',
    '{"games":1}'::jsonb
  );

insert into public.sports_events (
  id, steward_organization_id, sport, name, event_type, starts_at
)
values (
  '00000000-0000-4000-8000-00000000f601',
  '00000000-0000-4000-8000-00000000b001',
  'football',
  'Phase 2 Cross-Organization Game',
  'game',
  '2026-09-01T19:00:00Z'
);

insert into public.sports_event_teams (
  id, event_id, organization_id, team_id, team_season_id, participation_role
)
values
  (
    '00000000-0000-4000-8000-00000000f701',
    '00000000-0000-4000-8000-00000000f601',
    '00000000-0000-4000-8000-00000000b001',
    '00000000-0000-4000-8000-00000000e002',
    '00000000-0000-4000-8000-00000000f301',
    'home'
  ),
  (
    '00000000-0000-4000-8000-00000000f702',
    '00000000-0000-4000-8000-00000000f601',
    '00000000-0000-4000-8000-00000000b002',
    '00000000-0000-4000-8000-00000000e003',
    '00000000-0000-4000-8000-00000000f302',
    'away'
  );

insert into public.sports_event_athletes (
  id, event_id, organization_id, team_id, player_id,
  athlete_team_season_id, participation_role
)
values
  (
    '00000000-0000-4000-8000-00000000f801',
    '00000000-0000-4000-8000-00000000f601',
    '00000000-0000-4000-8000-00000000b001',
    '00000000-0000-4000-8000-00000000e002',
    '00000000-0000-4000-8000-00000000f101',
    '00000000-0000-4000-8000-00000000f401',
    'starter'
  ),
  (
    '00000000-0000-4000-8000-00000000f802',
    '00000000-0000-4000-8000-00000000f601',
    '00000000-0000-4000-8000-00000000b002',
    '00000000-0000-4000-8000-00000000e003',
    '00000000-0000-4000-8000-00000000f102',
    '00000000-0000-4000-8000-00000000f402',
    'starter'
  );

-- Catalog and privilege invariants.
do $$
declare
  protected_table text;
begin
  foreach protected_table in array array[
    'organizations',
    'organization_memberships',
    'platform_role_assignments',
    'audit_logs',
    'seasons',
    'team_seasons',
    'athlete_team_seasons',
    'athlete_season_stats',
    'sports_events',
    'sports_event_teams',
    'sports_event_athletes'
  ]
  loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = protected_table
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', protected_table;
    end if;

    if has_table_privilege('anon', 'public.' || protected_table, 'SELECT')
       or has_table_privilege('anon', 'public.' || protected_table, 'INSERT')
       or has_table_privilege('anon', 'public.' || protected_table, 'UPDATE')
       or has_table_privilege('anon', 'public.' || protected_table, 'DELETE') then
      raise exception 'anonymous privilege leaked on public.%', protected_table;
    end if;
  end loop;

  if has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'player_id', 'UPDATE') then
    raise exception 'authenticated profile authorization columns remain writable';
  end if;

  if has_table_privilege('authenticated', 'public.teams', 'UPDATE')
     or has_table_privilege('authenticated', 'public.teams', 'INSERT')
     or has_table_privilege('authenticated', 'public.teams', 'DELETE') then
    raise exception 'authenticated team mutation privilege remains';
  end if;

  if not has_table_privilege('anon', 'public.teams', 'SELECT')
     or not has_table_privilege('authenticated', 'public.teams', 'SELECT') then
    raise exception 'team directory SELECT contract is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'teams_organization_id_fkey'
      and conrelid = 'public.teams'::regclass
  ) then
    raise exception 'teams.organization_id foreign key is missing';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'teams'
      and indexname = 'teams_organization_id_idx'
  ) then
    raise exception 'teams.organization_id index is missing';
  end if;
end
$$;

-- Anonymous can read directory teams but cannot reach protected tenant tables.
set local role anon;
do $$
begin
  if (select count(*) from public.teams where id in (
    '00000000-0000-4000-8000-00000000e001',
    '00000000-0000-4000-8000-00000000e002'
  )) <> 2 then
    raise exception 'anonymous team directory read failed';
  end if;

  begin
    perform 1 from public.organizations;
    raise exception 'anonymous organization read unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;
reset role;

-- Member A sees Org A only. Its suspended Org B membership is visible as
-- history but cannot grant organization access.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000a001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}',
  true
);
do $$
begin
  if (select count(*) from public.organizations) <> 1
     or not exists (
       select 1 from public.organizations
       where id = '00000000-0000-4000-8000-00000000b001'
     ) then
    raise exception 'member A organization isolation failed';
  end if;

  if (select count(*) from public.organization_memberships) <> 2
     or exists (
       select 1 from public.organization_memberships
       where user_id <> '00000000-0000-4000-8000-00000000a001'
     ) then
    raise exception 'member A membership isolation failed';
  end if;

  if (select count(*) from public.seasons) <> 1
     or (select count(*) from public.team_seasons) <> 1
     or (select count(*) from public.athlete_team_seasons) <> 1
     or (select count(*) from public.athlete_season_stats) <> 1 then
    raise exception 'member A career-context isolation failed';
  end if;

  if (select count(*) from public.sports_events) <> 1
     or (select count(*) from public.sports_event_teams) <> 1
     or (select count(*) from public.sports_event_athletes) <> 1 then
    raise exception 'member A shared-event isolation failed';
  end if;

  begin
    perform 1 from public.platform_role_assignments;
    raise exception 'member A platform assignment read unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform 1 from public.audit_logs;
    raise exception 'member A audit read unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;
reset role;

-- Member B sees only Org B tenant rows while still discovering the shared
-- event through its participating team.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000a002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000a002","role":"authenticated"}',
  true
);
do $$
begin
  if (select count(*) from public.organizations) <> 1
     or (select count(*) from public.organization_memberships) <> 1
     or (select count(*) from public.seasons) <> 1
     or (select count(*) from public.team_seasons) <> 1
     or (select count(*) from public.athlete_team_seasons) <> 1
     or (select count(*) from public.athlete_season_stats) <> 1
     or (select count(*) from public.sports_events) <> 1
     or (select count(*) from public.sports_event_teams) <> 1
     or (select count(*) from public.sports_event_athletes) <> 1
     or public.is_internal_admin() then
    raise exception 'member B tenant and shared-event isolation failed';
  end if;
end
$$;
reset role;

-- Owner and organization_admin are tenant roles, not platform roles. Both see
-- Org A context and both must fail the internal-admin predicate.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000a006', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000a006","role":"authenticated"}',
  true
);
do $$
begin
  if (select count(*) from public.organizations) <> 1
     or (select count(*) from public.organization_memberships) <> 1
     or (select count(*) from public.seasons) <> 1
     or public.is_internal_admin() then
    raise exception 'organization owner authorization boundary failed';
  end if;
end
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000a007', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000a007","role":"authenticated"}',
  true
);
do $$
begin
  if (select count(*) from public.organizations) <> 1
     or (select count(*) from public.organization_memberships) <> 1
     or (select count(*) from public.seasons) <> 1
     or public.is_internal_admin() then
    raise exception 'organization_admin authorization boundary failed';
  end if;
end
$$;
reset role;

-- A regular non-member sees no tenant rows and is not an internal admin.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000a003', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000a003","role":"authenticated"}',
  true
);
do $$
begin
  if (select count(*) from public.organizations) <> 0
     or (select count(*) from public.organization_memberships) <> 0
     or (select count(*) from public.seasons) <> 0
     or (select count(*) from public.sports_events) <> 0
     or public.is_internal_admin() then
    raise exception 'non-member authorization failed closed check';
  end if;
end
$$;
reset role;

-- The reviewed super_admin assignment satisfies the compatibility helper.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000a005', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000a005","role":"authenticated"}',
  true
);
do $$
begin
  if not public.is_internal_admin()
     or (select count(*) from public.organizations) <> 2
     or (select count(*) from public.organization_memberships) <> 5
     or (select count(*) from public.seasons) <> 2
     or (select count(*) from public.team_seasons) <> 2
     or (select count(*) from public.athlete_team_seasons) <> 2
     or (select count(*) from public.athlete_season_stats) <> 2
     or (select count(*) from public.sports_events) <> 1
     or (select count(*) from public.sports_event_teams) <> 2
     or (select count(*) from public.sports_event_athletes) <> 2 then
    raise exception 'assigned super_admin compatibility read failed';
  end if;
end
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000a004', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000a004","role":"authenticated"}',
  true
);
do $$
begin
  if public.is_internal_admin()
     or (select count(*) from public.organizations) <> 0
     or (select count(*) from public.organization_memberships) <> 0
     or (select count(*) from public.seasons) <> 0
     or (select count(*) from public.sports_events) <> 0 then
    raise exception 'profile-only legacy admin unexpectedly retained platform access';
  end if;
end
$$;
reset role;

-- Service-only mutation boundary and database invariants.
set local role service_role;
insert into public.audit_logs (
  action, entity_type, entity_id, actor_role, actor_role_scope, reason
)
values (
  'phase2.test',
  'organization',
  '00000000-0000-4000-8000-00000000b001',
  'system',
  'system',
  'Verify service-only audit insertion'
);

do $$
begin
  begin
    update public.organization_memberships
    set status = 'suspended'
    where id = '00000000-0000-4000-8000-00000000c004';
    raise exception 'final owner suspension unexpectedly succeeded';
  exception
    when check_violation then null;
  end;
end
$$;
reset role;

do $$
begin
  begin
    update public.audit_logs
    set reason = 'tampered';
    raise exception 'audit update unexpectedly succeeded';
  exception
    when check_violation then null;
  end;

  begin
    delete from public.organizations
    where id = '00000000-0000-4000-8000-00000000b001';
    raise exception 'organization hard delete unexpectedly succeeded';
  exception
    when check_violation then null;
  end;

  begin
    update public.teams
    set organization_id = '00000000-0000-4000-8000-00000000ffff'
    where id = '00000000-0000-4000-8000-00000000e001';
    raise exception 'invalid team organization unexpectedly succeeded';
  exception
    when foreign_key_violation then null;
  end;

  begin
    insert into public.athlete_team_seasons (
      id, organization_id, team_season_id, player_id, starts_on
    ) values (
      '00000000-0000-4000-8000-00000000f403',
      '00000000-0000-4000-8000-00000000b001',
      '00000000-0000-4000-8000-00000000f301',
      '00000000-0000-4000-8000-00000000f101',
      '2026-09-01'
    );
    raise exception 'overlapping roster stint unexpectedly succeeded';
  exception
    when exclusion_violation then null;
  end;

  begin
    update public.sports_event_teams
    set team_season_id = '00000000-0000-4000-8000-00000000f302'
    where id = '00000000-0000-4000-8000-00000000f701';
    raise exception 'cross-tenant event team season unexpectedly succeeded';
  exception
    when foreign_key_violation then null;
  end;

  begin
    update public.sports_event_athletes
    set athlete_team_season_id = '00000000-0000-4000-8000-00000000f402'
    where id = '00000000-0000-4000-8000-00000000f801';
    raise exception 'cross-tenant event athlete roster link unexpectedly succeeded';
  exception
    when foreign_key_violation then null;
  end;
end
$$;

rollback;
