# Decision 0002 — Wave 2 Trusted Scope, Capabilities, and School Theme Boundary

**Date:** 2026-08-24  
**Status:** Approved for application-contract work; persisted authorization/theme links require user approval  
**Owner:** CRM Coordinator  
**Applies to:** Gate 3B completion

## Findings

The application can validate and consume trusted grants, but the deployed schema cannot currently resolve all required grants:

- `organization_memberships` proves active organization membership and an organization role.
- It has no canonical team grant, per-permission assignment, or approved production role-to-permission bundle.
- A `team` query parameter therefore cannot establish team access.
- `organizations.school_id` references `schools.id`.
- `schools` has name, slug, logo, location, and untyped `meta`, but no typed color fields or approved foreign key to the Division I/II color/logo directory.
- Color-bearing reference data exists in `Colleges` and `cfb_teams`, but no approved exact organization-school link to either source is documented.

Therefore a complete trusted resolver cannot be application-layer only. Application code may parse requests, fail closed, validate canonical rows, derive capabilities from already-resolved explicit grants, and safely fall back for themes. It may not manufacture the missing grant or directory relationship.

## Immediate application-layer authorization

Foundation may implement, without schema changes:

- strict parsing of requested organization/team scope;
- validation that a selected team belongs to the current organization;
- a server-only resolver interface that accepts canonical membership rows and explicit grants from a trusted persistence adapter;
- fail-closed behavior when the adapter cannot supply a team grant or permission;
- permission-driven shell capability projection for navigation, search, Create, notifications, theme administration, and financial visibility;
- actor/organization/team/permission-aware cache identity and invalidation inputs;
- a school-theme resolver interface that reads only an exact approved directory link and otherwise returns BLTZ Default/safe fallback;
- discovery/tests documenting existing school-directory coverage and ambiguity.

The application layer must never infer permissions from browser state, query parameters, client-visible roles, route presence, or component visibility. It must never fuzzy-match school names into a production theme.

## User-approved persisted decision required

Before Foundation may return an allowed team grant or production Executive capability, the user must approve one canonical source:

1. **Recommended:** additive persisted grants tied to the existing membership, organization, optional team, and canonical permission key, with status/audit/revocation constraints; plus an approved permission-bundle mapping strategy.
2. A named existing external authorization adapter that is already authoritative for the same actor/organization/team/permission dimensions.
3. A deliberately narrower organization-only launch with an explicitly approved production role bundle and no team-limited access. This does not satisfy the full Executive persona matrix and would require a recorded gate waiver.

Before school colors may be used, the user must approve an exact typed link from `schools` (and therefore `organizations.school_id`) to the authoritative Division I/II directory record. Untyped `schools.meta`, name matching, or duplicated organization color columns are not approved substitutes.

## Recommended schema direction for user review

Foundation should return a formal proposal, not a migration, covering:

- membership permission grants with organization and optional team scope;
- permission key validation, active/revoked lifecycle, uniqueness, audit, RLS/service boundaries, indexes, backfill/deploy/recovery;
- whether bundles are versioned data or an explicitly approved application registry;
- a nullable typed directory foreign key on `schools` to the confirmed Division I/II identity table, after coverage and identity audit;
- compatibility with existing `organizations.school_id`, `teams.school_id`, and Player Locker references.

Migration identifiers `20260824000010` through `20260824000019` are reserved but remain unauthorized until the user approves the proposal.

## Gate consequence

Gate 3B remains failed until an authoritative grant source and exact school-theme link are approved, implemented, and tested. Fail-closed interfaces alone are necessary but not sufficient for a pass.

