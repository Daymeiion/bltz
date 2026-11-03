# Proposal 0004 — Executive Stage B Persisted Trust Boundary

**Status:** User approval required; no migration has been run  
**Supersedes the implementation detail in:** Proposal 0003  
**Reserved migration range:** `20260824000010`–`20260824000019`

## Decision requested

Approve the recommended additive Stage B model below:

1. direct, explicit organization/team permission grants (no inferred role bundles); and
2. an exact nullable link from `public.schools` to the Division I/II `public."Colleges"` directory, populated only from a reviewed coverage map.

This approval authorizes Foundation to prepare migrations and tests. It does **not** authorize production grants, fuzzy school matching, or automatic role conversion.

## Recommended schema

### Existing-table additions

- `public.organization_memberships.authorization_version bigint not null default 1`, incremented atomically whenever an active team or permission grant is assigned/revoked.
- `unique (organization_id, id)` on `public.organization_memberships`, enabling tenant-coherent composite foreign keys. (`public.teams` already has `teams_organization_id_id_key`.)
- `public.schools.college_directory_id bigint null references public."Colleges"(id) on delete set null`.
- Unique partial index on `schools(college_directory_id) where college_directory_id is not null`; a coverage audit must prove this one-to-one assumption before the constraint is applied.

### `public.enterprise_permission_definitions`

| Column | Contract |
|---|---|
| `permission_key text primary key` | One of the 17 keys in `EXECUTIVE_PERMISSION_KEYS`; migration parity test is mandatory. |
| `domain text not null` | Stable grouping only; not a role bundle. |
| `financial boolean not null default false` | True only for `financial.summary.read` and `financial.exception.read`. |
| `active boolean not null default true` | Retires a key without deleting grant history. |
| `created_at timestamptz not null default now()` | Immutable creation time. |

The migration seeds only the canonical permission definitions, not user grants or production persona bundles.

### `public.organization_team_grants`

| Column | Contract |
|---|---|
| `id uuid primary key default gen_random_uuid()` | Historical grant identity. |
| `organization_id uuid not null` | Composite FK participant. |
| `membership_id uuid not null` | With `organization_id`, FK to `organization_memberships(organization_id,id)` on delete restrict. |
| `team_id uuid not null` | With `organization_id`, FK to `teams(organization_id,id)` on delete restrict. |
| `assigned_by uuid not null` | FK to `auth.users(id)` on delete restrict. |
| `assigned_at timestamptz not null default now()` | Assignment time. |
| `assignment_reason text not null` | Trimmed length 1–2000. |
| `revoked_by uuid null` | FK to `auth.users(id)` on delete restrict. |
| `revoked_at timestamptz null` | Must be at/after `assigned_at`. |
| `revocation_reason text null` | Required with revocation; trimmed length 1–2000. |

Constraints enforce all-or-none revocation metadata. A partial unique index on `(membership_id, team_id) where revoked_at is null` permits only one active team grant.

### `public.organization_permission_grants`

| Column | Contract |
|---|---|
| `id uuid primary key default gen_random_uuid()` | Historical grant identity. |
| `organization_id uuid not null` | Composite FK participant. |
| `membership_id uuid not null` | With `organization_id`, FK to `organization_memberships(organization_id,id)` on delete restrict. |
| `team_grant_id uuid null` | Null means organization-wide; otherwise FK to `organization_team_grants(id)` on delete restrict. The adapter joins and proves the same organization/membership/team. |
| `permission_key text not null` | FK to `enterprise_permission_definitions(permission_key)` on delete restrict. |
| `assigned_by`, `assigned_at`, `assignment_reason` | Same contracts as team grants. |
| `revoked_by`, `revoked_at`, `revocation_reason` | Same historical revocation contracts as team grants. |

Partial unique indexes enforce one active organization-wide grant per `(membership_id, permission_key)` and one active team-scoped grant per `(membership_id, team_grant_id, permission_key)`.

## RLS, mutation, and audit contract

- Enable RLS on all three new tables; revoke all from `public`, `anon`, and `authenticated`.
- Grant `service_role` select/insert/update only; grant no delete. Revoke browser update of `schools.college_directory_id` and keep mapping writes server-only.
- Before-update guards make assignment identity/scope/permission fields immutable and permit only the one-way null-to-revoked transition.
- Insert/revoke triggers append `executive.team_grant.assigned|revoked` and `executive.permission_grant.assigned|revoked` to existing `public.audit_logs`, including actor, organization, grant target, timestamp, reason, and allowlisted scalar scope metadata.
- The same transaction increments `organization_memberships.authorization_version`. The trusted adapter reads membership, requested team, active team grant, active permissions, and version in one repeatable-read server transaction and stamps one short expiry. Query/cookie/client role values remain requests only.

## Coverage audit and backfill

Before applying the school FK/index, produce a signed report with:

- active organization count, organizations with/without `school_id`, and distinct referenced school rows;
- exact candidate counts against `"Colleges"`, split by Division I/II, plus unmatched and multiply matched rows;
- invalid/missing six-digit primary/secondary colors, logos, division, and stable IDs;
- samples for renamed institutions, shared locations, and multi-team schools;
- the directory update owner and a human-approved `school_id -> Colleges.id` mapping file.

Backfill is idempotent: update only rows whose `college_directory_id is null` from that approved map. Ambiguous/unmatched rows remain null and use BLTZ Default. No grant or directory link is inferred from names, slugs, `schools.meta`, memberships.role, or team query state. No existing user receives a permission automatically.

## Deployment and recovery

1. Add empty definitions/grant structures, RLS, constraints, version/audit triggers, and nullable directory link.
2. Regenerate database types; deploy the trusted adapter against empty grants (all Executive capabilities remain denied).
3. Apply only the reviewed school mapping; verify exact resolution and BLTZ fallback.
4. Load separately approved direct grants through the audited server path; do not create role bundles in this wave.
5. Wire shell scope/capabilities/theme, then run cross-tenant, revocation, cache, financial non-inference, accessibility, and protected regression suites before enablement.

Recovery: disable the Executive shell flag, revoke affected grants (never delete history), bump authorization versions/clear caches, null incorrect directory links, and return to BLTZ Default. Prefer forward fixes; before production data exists, the new empty structures may be rolled back after dependency/audit verification.

## Alternatives

- **External authoritative adapter:** approve only by naming a system that atomically supplies membership, team scope, permission, revocation, version, expiry, audit, and outage behavior. None exists in this repository.
- **Organization-only waiver:** omit team grants temporarily, disable team scope, and record a time-limited Gate 3B waiver. This does not satisfy the canonical persona matrix.
- **`cfb_teams` school link:** narrower football-only coverage; not recommended for a Division I/II all-athletics CRM.
- **Provider-neutral identity link table:** choose if the coverage audit rejects `"Colleges"`; more extensible, but adds a separately owned directory-mapping model.

## Recommended user response

Approve **direct grants + `schools.college_directory_id -> "Colleges".id`, subject to the coverage audit**. If not approved, name the chosen authorization and school-identity alternatives. Stage B and Feature remain blocked until both decisions are explicit.
