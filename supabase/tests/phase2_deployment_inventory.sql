-- =============================================================================
-- Phase 2 deployment and team-mapping inventory
--
-- Run read-only on staging after migrations 20260818000000 through
-- 20260818000003 have been applied. Review every result set before proposing a
-- production team-to-organization mapping. This file contains SELECT statements
-- only and intentionally performs no backfill or authorization mutation.
-- =============================================================================

-- 1. Confirm the expected Phase 2 migration history is recorded.
select
  'phase2_migration_history' as report_name,
  version,
  name
from supabase_migrations.schema_migrations
where version between '20260818000000' and '20260818000003'
order by version;

-- 2. Legacy profile administrators that require reviewed transition evidence.
select
  'legacy_profile_admins' as report_name,
  profile.id as user_id,
  count(assignment.id) filter (where assignment.revoked_at is null) as active_assignment_count,
  count(assignment.id) filter (where assignment.revoked_at is not null) as revoked_assignment_count,
  coalesce(
    array_agg(assignment.role order by assignment.role)
      filter (where assignment.revoked_at is null),
    array[]::text[]
  ) as active_platform_roles
from public.profiles profile
left join public.platform_role_assignments assignment
  on assignment.user_id = profile.id
where profile.role = 'admin'
group by profile.id
order by profile.id;

-- 3. Active and revoked privileged platform-role assignments.
select
  'platform_role_assignments' as report_name,
  assignment.id as assignment_id,
  assignment.user_id,
  assignment.role,
  case when assignment.revoked_at is null then 'active' else 'revoked' end as assignment_state,
  assignment.assigned_at,
  assignment.assigned_by,
  assignment.revoked_at,
  assignment.revoked_by
from public.platform_role_assignments assignment
order by assignment.revoked_at nulls first, assignment.role, assignment.user_id;

-- 4. Organization and membership totals by lifecycle state.
select
  'organization_membership_counts' as report_name,
  organization.id as organization_id,
  organization.name as organization_name,
  organization.organization_type,
  organization.status as organization_status,
  organization.school_id,
  count(membership.id) as membership_count,
  count(membership.id) filter (where membership.status = 'active') as active_members,
  count(membership.id) filter (where membership.status = 'suspended') as suspended_members,
  count(membership.id) filter (where membership.status = 'removed') as removed_members,
  count(membership.id) filter (
    where membership.status = 'active' and membership.role = 'owner'
  ) as active_owners
from public.organizations organization
left join public.organization_memberships membership
  on membership.organization_id = organization.id
group by
  organization.id,
  organization.name,
  organization.organization_type,
  organization.status,
  organization.school_id
order by organization.name, organization.id;

-- 5. Every existing team and its nullable organization mapping.
select
  'team_organization_inventory' as report_name,
  team.id as team_id,
  team.name as team_name,
  team.slug as team_slug,
  team.sport,
  team.school_id,
  school.name as school_name,
  team.organization_id,
  organization.name as organization_name,
  organization.status as organization_status,
  case when team.organization_id is null then 'unmapped' else 'mapped' end as mapping_state
from public.teams team
left join public.schools school
  on school.id = team.school_id
left join public.organizations organization
  on organization.id = team.organization_id
order by mapping_state desc, school.name nulls last, team.name, team.id;

-- 6. School-centric grouping signals. A school is directory context, never an
-- automatic tenant mapping instruction.
with player_counts as (
  select player.team_id, count(*) as player_count
  from public.players player
  where player.team_id is not null
  group by player.team_id
)
select
  'school_team_groupings' as report_name,
  school.id as school_id,
  school.name as school_name,
  school.slug as school_slug,
  count(distinct team.id) as team_count,
  count(distinct team.id) filter (where team.organization_id is not null) as mapped_team_count,
  count(distinct team.id) filter (where team.organization_id is null) as unmapped_team_count,
  count(distinct team.organization_id) filter (
    where team.organization_id is not null
  ) as represented_organization_count,
  coalesce(sum(player_counts.player_count), 0) as referenced_player_count
from public.schools school
left join public.teams team
  on team.school_id = school.id
left join player_counts
  on player_counts.team_id = team.id
group by school.id, school.name, school.slug
order by referenced_player_count desc, team_count desc, school.name;

-- 7. Player references by team, including teams with zero current references.
select
  'player_counts_by_team' as report_name,
  team.id as team_id,
  team.name as team_name,
  team.school_id,
  team.organization_id,
  count(player.id) as player_count,
  count(player.id) filter (where player.visibility is true) as visible_player_count,
  count(player.id) filter (where player.user_id is not null) as claimed_player_count
from public.teams team
left join public.players player
  on player.team_id = team.id
group by team.id, team.name, team.school_id, team.organization_id
order by player_count desc, team.name, team.id;

-- 8. Strong unmapped operational-team candidates. A player reference is the
-- signal; this report is evidence for review and must not drive an automatic
-- organization creation or backfill.
with player_counts as (
  select player.team_id, count(*) as player_count
  from public.players player
  where player.team_id is not null
  group by player.team_id
)
select
  'unmapped_operational_team_candidates' as report_name,
  team.id as team_id,
  team.name as team_name,
  team.slug as team_slug,
  team.sport,
  team.school_id,
  school.name as school_name,
  player_counts.player_count,
  case
    when team.school_id is not null then 'players_and_school_reference'
    else 'players_without_school_reference'
  end as candidate_signal
from public.teams team
join player_counts
  on player_counts.team_id = team.id
left join public.schools school
  on school.id = team.school_id
where team.organization_id is null
  and player_counts.player_count > 0
order by player_counts.player_count desc, team.name, team.id;

-- 9. Case/whitespace-normalized duplicate signals across current directory and
-- tenant names/slugs. Exact uniqueness constraints do not catch every variant.
with duplicate_signals as (
  select
    'organizations'::text as entity_type,
    'name'::text as field_name,
    lower(btrim(organization.name)) as normalized_value,
    count(*) as duplicate_count,
    string_agg(organization.id::text, ',' order by organization.id) as record_ids
  from public.organizations organization
  group by lower(btrim(organization.name))
  having count(*) > 1

  union all

  select
    'teams',
    'name',
    lower(btrim(team.name)),
    count(*),
    string_agg(team.id::text, ',' order by team.id)
  from public.teams team
  group by lower(btrim(team.name))
  having count(*) > 1

  union all

  select
    'teams',
    'slug',
    lower(btrim(team.slug)),
    count(*),
    string_agg(team.id::text, ',' order by team.id)
  from public.teams team
  group by lower(btrim(team.slug))
  having count(*) > 1

  union all

  select
    'schools',
    'name',
    lower(btrim(school.name)),
    count(*),
    string_agg(school.id::text, ',' order by school.id)
  from public.schools school
  group by lower(btrim(school.name))
  having count(*) > 1

  union all

  select
    'schools',
    'slug',
    lower(btrim(school.slug)),
    count(*),
    string_agg(school.id::text, ',' order by school.id)
  from public.schools school
  group by lower(btrim(school.slug))
  having count(*) > 1
)
select
  'duplicate_name_slug_signals' as report_name,
  entity_type,
  field_name,
  normalized_value,
  duplicate_count,
  record_ids
from duplicate_signals
order by entity_type, field_name, normalized_value;

-- 10. Career-context row totals after Phase 2D.
select 'career_table_counts' as report_name, 'seasons' as table_name, count(*) as row_count
from public.seasons
union all
select 'career_table_counts', 'team_seasons', count(*)
from public.team_seasons
union all
select 'career_table_counts', 'athlete_team_seasons', count(*)
from public.athlete_team_seasons
union all
select 'career_table_counts', 'athlete_season_stats', count(*)
from public.athlete_season_stats
union all
select 'career_table_counts', 'sports_events', count(*)
from public.sports_events
union all
select 'career_table_counts', 'sports_event_teams', count(*)
from public.sports_event_teams
union all
select 'career_table_counts', 'sports_event_athletes', count(*)
from public.sports_event_athletes
order by table_name;
