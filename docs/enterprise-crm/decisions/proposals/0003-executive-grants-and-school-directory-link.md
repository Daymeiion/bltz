# Proposal 0003 — Executive Grants and Canonical School Identity Link

**Status:** User decision required; no migration authorized
**Prepared for:** Executive Wave 2 Gate 3B
**Reserved migration range if approved:** `20260824000010`–`20260824000019`

## Decision requested

Approve or reject both persisted foundations below before Wave 2 Stage B:

1. Add explicit membership permission grants with optional team scope.
2. Add one typed link from `schools` to the approved Division I/II identity directory.

No production Executive permission or school color can be resolved safely until these choices are recorded. Application contracts already fail closed when evidence is missing.

## Trusted boundary mapping

```text
route/query organization + team
  → strict requested-scope parser (request only; zero authority)
  → server session actor + TrustedEnterpriseAccessAdapter
  → coherent membership/team/team-grant/permission snapshot
  → fail-closed ResolvedEnterpriseGrants
  → server enforcement + versioned cache identity
  → permission-derived shell availability (presentation only)

organization.school_id
  → ExactSchoolThemeAdapter using an approved typed link only
  → exact identity + color/URL/contrast validation
  → safe School Theme OR BLTZ Default
```

Browser role labels, request bodies, query parameters, cookies, local state, route presence, component visibility, untyped `schools.meta`, and name/slug/fuzzy matching never cross either trust boundary as evidence.

## Current evidence

### Authorization

- `organization_memberships` proves actor, organization, status, and an existing role.
- It contains no team scope or explicit permission key.
- `teams.organization_id` can prove that a selected team belongs to an organization, but not that a member may use it.
- Existing role labels are not approved Executive capability bundles.
- A URL/query `team` value is therefore a request only and cannot grant access.

### School identity

- `organizations.school_id` and `teams.school_id` reference `schools.id` (UUID).
- `schools` contains name, slug, logo, location, and untyped `meta`; it has no typed colors or directory key.
- `Colleges` contains Division/conference fields, typed primary/secondary colors, logo, and a bigint ID.
- `cfb_teams` contains ESPN identity, typed primary/alternate colors, light/dark logos, and a text ID.
- Neither candidate has an exact foreign-key relationship from `schools`.
- The repository includes schema, not a row-level export capable of proving match coverage or uniqueness. Name, slug, location, or fuzzy matching is not approved for production.

## Authorization options

### Option A — Explicit membership grants (recommended)

Create an additive historical grant table tied to:

- existing `organization_memberships.id`;
- the same `organization_id`;
- nullable `team_id` (`NULL` means organization-wide; non-null means exact team);
- one validated key from the canonical Executive permission registry;
- assigned-by/assigned-at/reason;
- revoked-by/revoked-at/reason;
- an opaque version or updated timestamp used in trusted snapshot/cache identity.

Required invariants:

- membership and team must belong to the same organization;
- one active grant per membership/scope/permission;
- a team grant cannot be inferred from organization role or URL state;
- revocation is historical, immediate on the next protected request, and audited;
- browser roles cannot mutate or enumerate grants;
- service reads construct one coherent, expiring authorization snapshot;
- all protected reads, counts, aggregates, searches, exports, mutations, jobs, and notification payloads re-authorize.

Bundle strategy: keep bundles separately versioned and explicitly approved, or begin with direct grants only. Do not hard-code current organization roles as bundles during migration.

### Option B — Existing authoritative external adapter

Name an already authoritative system that supplies actor, membership, organization, optional team, permission key, revocation, version, and expiry atomically. Approval must document ownership, outage behavior, freshness, audit, incident recovery, and anti-enumeration. No such adapter is identified in the current repository.

### Option C — Organization-only launch waiver

Launch without team-limited access using a separately approved organization-wide bundle. This does not meet the full Executive persona matrix and requires a time-bound Gate 3B waiver. The team scope control must remain unavailable.

## School identity options

### Option 1 — Link `schools` to `Colleges` (recommended pending coverage audit)

Add a nullable typed `schools.college_directory_id` foreign key to `Colleges.id` if a staging audit confirms `Colleges` is the authoritative Division I/II directory and provides acceptable unique coverage. The resolver reads typed colors/logo only through that exact key.

Why recommended: `Colleges` explicitly carries division, conference, primary/secondary colors, mascot, and logo, matching the multi-division requirement better than the football-only adapter.

### Option 2 — Link `schools` to `cfb_teams`

Add a nullable typed ESPN team key only if football coverage is intentionally authoritative for the organization identity use case. This is narrower than Division I/II athletics and may misrepresent non-football or non-CFB organizations.

### Option 3 — New canonical identity adapter table

Create a provider-neutral directory-link table when neither existing source has sufficient coverage/identity quality. This is more extensible but adds operational ownership and should not duplicate school brand fields onto organizations.

## Required pre-migration audits

1. Count active organizations with and without `school_id`.
2. Count referenced `schools` rows and candidate exact matches in each directory.
3. Report unmatched and multiply matched schools; do not auto-resolve them.
4. Validate directory division coverage, active status, logo availability, and six-digit color validity.
5. Review samples across Division I, Division II, multi-team schools, renamed institutions, and shared locations.
6. Confirm the chosen directory’s update owner and stable identifier policy.
7. Capture proposed mappings for human approval before backfill.

## Deployment order if approved

1. Add the grant table, constraints, indexes, service-only privileges/RLS, and append-only audit hooks with no initial grants.
2. Deploy the trusted adapter against empty grants; production capabilities remain denied.
3. Add the nullable typed school-directory foreign key and indexes.
4. Run a reviewed, idempotent exact-link backfill from an approved mapping file; ambiguous/unmatched rows remain null and use BLTZ Default.
5. Insert explicitly approved grants or versioned bundles through a reviewed server process.
6. Regenerate database types and deploy shell wiring that consumes only trusted server projections.
7. Verify revocation, cache separation, cross-tenant denial, contrast fallback, and audit evidence before enabling team scope or school mode.

## Compatibility and backfill

- All changes are additive; existing `organizations.school_id`, `teams.school_id`, Player Locker links, and role fields remain intact.
- No current role automatically receives a grant.
- No current school row automatically receives a directory link without approved exact mapping.
- Null links render BLTZ Default; empty grants keep protected capabilities unavailable.
- Older application versions continue operating because new columns/tables are not required by existing paths.

## Recovery and reversibility

- Disable new shell capability/theme wiring first.
- Revoke affected grants rather than deleting history.
- Clear trusted authorization caches by version.
- Null incorrect school-directory links and return affected organizations to BLTZ Default.
- Prefer a forward-fix for deployed schema; tables/columns can remain unused without changing existing behavior.
- If rollback is required before production data exists, remove only the new FK/table after dependency and audit verification.

## Acceptance tests required for Stage B

- active, suspended, removed, revoked, expired, missing, unknown, and mixed-version grant cases;
- organization-wide and exact-team allow/deny, including cross-team/cross-organization and direct URL/query attempts;
- permission checks for navigation, search, Create, notifications, theme administration, finance, APIs, counts, caches, exports, and jobs;
- concurrent grant/revocation reads and immediate cache-version separation;
- append-only assignment/revocation/theme-change audit evidence;
- exact school link, null link, ambiguous mapping, removed directory row, unsafe colors, missing logo, and BLTZ fallback;
- migration replay, indexes, RLS/privileges, backfill idempotency, compatibility, and recovery rehearsal.

## Requested user response

Choose:

- authorization: **A**, **B** with named adapter, or **C** with waiver terms; and
- school identity: **1**, **2**, or **3** after the required coverage report.

Until both are approved, Stage B and production shell wiring remain blocked.
