# Enterprise security controls review — 2026-11-11

Source: https://www.instagram.com/reel/Dd4LFuGDLDG/ (retrieved caption identifies RBAC, audit logs, tenant isolation; video/audio not independently reviewed).

Scope: `Daymeiion/bltz`, baseline `dd75d69`. This is a source-code review and local database verification, not certification of the live Supabase project.

## Findings

| Control | Existing implementation | Gap addressed in this change |
| --- | --- | --- |
| RBAC | Canonical `organization_memberships`, specialized `platform_role_assignments`, explicit organization permission grants, trusted server snapshot resolver, workspace API gates, restricted financial permissions. | Membership identity could be changed in place, moving permission beneficiaries and bypassing the final-owner trigger, which only watched role/status. Membership ID, organization and user are now immutable. |
| Audit logs | `audit_logs` has actor, organization, action, target, timestamp, reason and before/after fields; browser roles cannot access it; updates/deletes are rejected. Permission grant/revoke already writes audit entries transactionally. | Activation, Locker launch, membership and platform role writes now append selected operational before/after values in the business transaction. Audit insertion failure aborts the write. |
| Tenant isolation | Membership checks and explicit permissions precede workspace requests. Pilot operational tables are service-only with RLS enabled; application queries filter by organization. | Media could reference another organization's activation or launch; athlete invites could reference another organization's roster entry. Composite foreign keys now reject these links, including service-role writes. |

Primary existing code: `lib/organization/context.ts`, `lib/enterprise-crm/workspace-access.ts`, `lib/enterprise-crm/auth/{authorize,trusted-resolver,supabase-adapter}.ts`, `lib/enterprise-crm/pilot/api.ts`, and the Phase 2 / CRM pilot migrations.

## Changes

- Migration: `supabase/migrations/20261111120000_enterprise_security_controls.sql`.
- Database regression tests: `tests/database/enterprise-security-controls.test.ts`.
- No application routes, UI, environment variables, role grants or table columns changed. Existing TypeScript row shapes are unchanged; live generated-type reconciliation remains an external follow-up.
- No new future-phase graph models, duplicate backends, or third-party workflows. These controls protect persistent organization/athlete relationships and remain useful after an athlete leaves an organization.

## Deployment and verification

1. Use authenticated Supabase access to check migration history and schema drift against the migration chain. Confirm the November CRM pilot prerequisite migrations are present. Local PGlite verification uses the relevant real migrations with minimal auth/directory/storage fixtures; it is not a reset of the entire production database.
2. Before applying, check for cross-tenant media links and invites with the queries below. Resolve any mismatches through reviewed data corrections; do not delete or reassign data automatically. The migration validates existing rows and rolls back atomically on inconsistent data. Unique indexes and foreign-key validation take locks: schedule application according to table size and traffic.
3. Apply the versioned migration through the existing Supabase deployment workflow. No production database mutation was attempted in this task.
4. Exercise an activation create/update and a Locker launch in staging with an authorized account; check actor IDs, organization IDs and before/after values in `audit_logs`. Deny a missing permission, a suspended membership and an account from another organization. Verify no private fields appear on public Locker pages.
5. Verify existing audit records cannot be changed/deleted and direct browser operational-table access remains denied. Repeat the authorized/unauthorized smoke checks in production after application.

```sql
select m.id, m.organization_id, a.organization_id as linked_organization_id
from public.organization_athlete_media m
join public.organization_activations a on a.id = m.activation_id
where m.organization_id <> a.organization_id;

select m.id, m.organization_id, l.organization_id as linked_organization_id
from public.organization_athlete_media m
join public.organization_locker_launches l on l.id = m.launch_id
where m.organization_id <> l.organization_id;

select i.id, i.organization_id, a.organization_id as linked_organization_id
from public.organization_athlete_invites i
join public.organization_athletes a on a.id = i.organization_athlete_id
where i.organization_id <> a.organization_id;
```

## Limits and follow-up

- Vercel's connected API identifies `bltz` and a ready production deployment on `bltz.me`. This does not establish live database policy/migration state. The execution environment has no configured Supabase credentials or database connection, so live migration status, RLS and application smoke checks remain unverified.
- Audit coverage is incremental, not exhaustive. Integration connect/disconnect, brief sharing/revocation, media review and other legacy admin actions need a separate coverage inventory and actor-aware write paths. This migration does not imply those actions are logged.
- Service writes have no end-user JWT. Activation/launch writes use the actor columns already supplied by authorized server code; membership updates without an authenticated subject record a system/null actor rather than incorrectly crediting their original creator. An actor/reason-aware membership mutation RPC is a follow-up for stronger human attribution.
- Service-role database access bypasses RLS by design. Server-side authorization remains essential; composite keys reinforce relationships but do not authorize a request or replace those gates.
- Before calling this enterprise-ready, verify backup restoration, retention/export policy, complete sensitive-action audit coverage and cross-tenant production tests. No readiness certification is claimed here.

## Validation results

- Focused authorization and database checks: 7 files / 61 tests passed, including seven new PostgreSQL regression tests.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed, 0 errors / 300 existing warnings.
- `git diff --cached --check`: passed.
- Initial sandboxed full test execution failed; subprocess-based tests received empty stdout. A one-worker recheck passed the analytics tests but reproduced five subprocess-output failures. Full-suite execution outside the sandbox is being checked separately.
- `npm run build`: blocked inside the sandbox by empty TypeScript `--showConfig` subprocess output. Outside the sandbox it progressed to webpack and failed in the existing `next/font` Google Open Sans loader (`TypeError: Cannot read properties of null (reading '1')`). No application code or build configuration was modified.
- Live/manual browser workflows, remote migration status and production RLS were not verified; Supabase access is absent. These remain deployment acceptance checks, not passed checks.
