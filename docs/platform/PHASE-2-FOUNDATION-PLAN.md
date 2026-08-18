# Phase 2 Shared Platform Foundation Plan

## Objective

Build stable tenant, authorization, career-context, and audit foundations without changing the Media Graph, public Locker behavior, or existing canonical athlete IDs.

## Boundaries

- `auth.users.id` remains authentication identity.
- `public.players.id` remains athlete identity.
- `profiles.role` remains a temporary compatibility field, not the new authorization source.
- `schools` remain directory rows; creating a school must not create a tenant.
- Existing `teams.id` values and `teams.school_id` remain stable.
- Tenant-owned rows carry `organization_id` directly and use organization-matching composite foreign keys where they reference another tenant-owned row. Shared cross-organization events are the documented exception and derive participating organizations through their association records.
- Organizations and their membership/authorization records are not anonymous-public directory data.
- New references to `auth.users.id` use restrictive deletion semantics. Accounts are deactivated and access assignments are suspended or removed; deleting an Auth user while referenced remains forbidden.
- No Phase 5 media, storage, provider, or rights tables are introduced.

## Ordered Increments

### 2A — Legacy authorization and exposure hardening

- Remove the privilege-escalation path that lets browser users change `profiles.role` or `profiles.player_id`.
- Remove permissive policies that override participant/owner policies on profiles, messaging, players, and reference data.
- Revoke browser execution of server-only pipeline and trigger functions.
- Revoke legacy default privileges that automatically grant future tables, functions, and sequences to browser roles.
- Preserve required public Locker reads through explicit SELECT grants and visibility policies.

Exit criteria:

- Browser roles cannot change authorization or athlete association fields on profiles.
- Anonymous users cannot write profiles, players, messages, attachments, threads, or reference colleges.
- Service-only RPCs reject anonymous and authenticated direct execution.
- Public visible-player reads and authenticated owner behavior continue to pass regression tests.

### 2B — Tenant and authorization contract

- Add minimal `organizations`, `organization_memberships`, and `platform_role_assignments` records.
- Add server-derived authorization helpers and least-privilege RLS.
- Add append-only `audit_logs` foundation.
- Add nullable `teams.organization_id` without inferring tenant mappings from schools.
- Inventory every current `profiles.role = 'admin'` user, review the assignment, convert each approved legacy administrator to `super_admin`, and remove the legacy admin authorization fallback after the reviewed backfill is verified.

Contract decisions:

- Organization statuses are `draft`, `pending_review`, `approved`, `rejected`, `suspended`, `restricted`, and `closed`.
- Organization type is validated non-empty text, not a database enum; the configurable taxonomy belongs to later platform settings.
- Organization review documents, risk notes, decisions, and reviewer workflow are later Admin records, not columns flattened into the core tenant row.
- Membership roles are `owner`, `organization_admin`, `media_manager`, `rights_manager`, `analyst`, and `viewer`.
- Membership statuses are `active`, `suspended`, and `removed`. Invitations are a separate future contract because they may precede an Auth user.
- Only active memberships authorize access. Suspended or closed organizations cannot be made operational by an active membership.
- Removing, suspending, or demoting the final active owner is forbidden. Ownership transfer must promote the replacement first and be audited.
- `platform_role_assignments` stores only privileged platform roles. An ordinary `user` has no assignment row.
- Tenant-scoped `organization_admin` and platform-scoped `organization_admin` are distinct and audit records must preserve the scope.
- Platform-role and membership mutations are server-only and require an audit reason. High-risk dual approval remains deferred until its workflow is defined.
- Organization, membership, platform-role, and audit records are not readable by `anon`; any later public organization directory requires a separate public-safe contract.
- Membership and platform-role references to `auth.users.id` use `ON DELETE RESTRICT`. Deactivation, membership suspension/removal, and role revocation preserve authorization history.

Exit criteria:

- Anonymous users have no access to tenant/private role data.
- Members can read their own active memberships and organizations.
- Organization administrators and platform administrators are resolved from database assignments, not browser claims or `profiles.role`.
- Every approved legacy administrator has a reviewed `super_admin` assignment, rejected/unapproved legacy rows grant no platform access, and the legacy admin fallback has been removed.
- Browser roles cannot directly mutate organizations, memberships, platform roles, or audit logs.
- Audit rows record actor, role scope, action, entity, organization, previous/new values, reason, risk level, request metadata, correlation ID, and timestamp.
- Migration contract tests, isolated migration reset/lint when Docker is available, typecheck, and relevant tests pass.

### 2C — Team tenancy compatibility

- Inventory the nullable `teams.organization_id` introduced in Phase 2B and prepare a proposed tenant mapping while preserving every team UUID and `school_id`.
- Do not write a production mapping in Phase 2. Any later mapping must be explicitly approved and must not create organizations for all school rows.
- Require organization context in new server-side team workflows.
- Keep `teams.organization_id` nullable throughout Phase 2. A production mapping must be explicitly reviewed and approved before any later backfill or `NOT NULL` migration.

Exit criteria:

- No team or Locker reference changes identity.
- Mapping proposals identify their evidence and remain reviewable before any production mutation.
- Orphan/unmapped teams are reported rather than silently assigned.
- Phase 2 does not infer, apply, or require a production tenant mapping.

### 2D — Career context

- Add stable organization-owned `seasons`, uniquely identified within an organization by `sport` and `season_code`. Performance/statistical facts remain in separate stats records rather than columns or JSON on the season identity row.
- Add `team_seasons` to connect a retained `teams.id` to an organization-owned season without changing the team UUID.
- Add dated roster stints referencing `players.id` and `team_seasons`. Start/end dates preserve transfers, returns, and multiple stints instead of collapsing career history into one current-team row.
- Add shared `sports_events` that can include teams from multiple organizations. Events are not forced under one tenant `organization_id`; explicit event-team associations identify every participating `team_season`.
- Add explicit event-athlete associations. Event participation is never inferred solely from a team roster.
- Apply direct `organization_id` plus organization-matching composite FKs to every tenant-owned career row. Shared event identity is the exception; its team and athlete association records carry the tenant context needed for authorization.
- Keep `players.team_id` and year fields as compatibility projections during migration.
- Keep monetization eligibility out of career context. Entitlement, subscription, billing, and monetization qualification are separate later contracts and are explicitly out of Phase 2D.

Exit criteria:

- Roster history supports multiple teams/seasons without changing `players.id`.
- Seasons are unique by organization, sport, and season code; stats evolve independently of season identity.
- Team-season and roster references cannot cross organizations, while one shared event can intentionally contain participants from multiple organizations.
- Event athlete participation is explicit and can differ from the full roster.
- FK columns and RLS predicates are indexed.
- Phase 5 can later reference organization, team, season, event, and player IDs without new identity tables.

### 2E — Server route foundation

- Add server-only organization-context and permission helpers.
- Add protected route layouts without building CRM screens.
- Phase 3 will add the visible organization switcher and CRM navigation.

Exit criteria:

- Protected actions verify membership and platform roles server-side.
- Organization context cannot be elevated by changing browser payloads.
- Authorized and unauthorized route tests pass.

### 2F — Remaining legacy authorization and RLS cleanup

- Migrate remaining `profiles.role` and JWT `user_role` authorization dependencies.
- Continue reducing broad legacy grants outside the Phase 2A critical surface without breaking public Locker reads.
- Verify anonymous, athlete A, athlete B, authenticated non-admin, organization roles, and platform-admin scenarios.
- Retain `profiles.role` only for non-privileged legacy profile compatibility if callers still need it; it must have no admin authorization fallback after the reviewed `super_admin` backfill.

Exit criteria:

- No protected decision depends only on `profiles.role` or mutable browser metadata.
- No legacy `profiles.role = 'admin'` value grants platform access.
- Public reads expose only the fields and rows required by Locker behavior.
- Cross-athlete and cross-organization access tests fail closed.

## Migration and Release Rules

- New migrations go only in `supabase/migrations`.
- Every new `public` table receives explicit grants because new tables are not automatically exposed through the Supabase Data API.
- RLS is enabled in the same migration that creates a tenant/private table.
- Remote `db push` and linked resets are release operations and are not part of local implementation.
- Regenerate authoritative database types after migrations are applied to an authenticated Supabase project. Until then, checked-in contracts must be verified against migration SQL and the blocker documented.
