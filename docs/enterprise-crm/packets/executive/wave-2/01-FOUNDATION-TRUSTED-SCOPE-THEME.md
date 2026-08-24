# Executive Journey Wave 2 — Foundation Trusted Scope and Theme Packet

**Branch:** `codex/crm-foundation-executive-wave2`  
**Worktree:** `C:\Users\Administrator\bltz-worktrees\crm-foundation-executive-wave2`  
**Start from:** immutable tag `crm-executive-wave2-base`; verify the commit from the Coordinator handoff

## Outcome

Close the application-contract portion of Gate 3B and produce the user decision packet required for persisted grants and the canonical school-directory link. Do not invent production roles, grants, team access, branding links, or schema.

Read the governing documents, `GATE-3A-3C-REPORT.md`, Decision 0001, Decision 0002, and all existing organization/school/team/RBAC schema and tests before acting.

## Stage A — authorized now

1. Add strict, server-only requested-scope parsing and canonical organization/team validation contracts.
2. Add an adapter interface for trusted membership, team grants, and explicit permission grants.
3. Resolve `ResolvedEnterpriseGrants` only from trusted adapter output; deny when team/permission evidence is absent, stale, malformed, revoked, or cross-tenant.
4. Add a permission-driven shell capability projection for primary navigation, global search, Create, notifications, theme administration, and financial surfaces.
5. Ensure capability/cache output changes with actor, organization, team, permissions, and revocation/version input.
6. Add an exact-link-only school-theme resolver contract with contrast validation and BLTZ Default fallback.
7. Audit `schools`, `Colleges`, and `cfb_teams` identity/coverage/linkage and write a formal schema decision proposal with options, recommendation, deployment/backfill/compatibility/recovery, and reversibility.
8. Add denial, scope, capability, cache, theme fallback, ambiguity, and anti-enumeration tests.

No production permission may be granted merely because a user has an existing role. No name/slug/fuzzy school match may select production colors.

## Stage B — blocked pending user approval

Do not implement migrations, a database adapter that returns allowed grants, production role bundles, team grants, or a school-directory foreign key until the user approves the exact Decision 0002 schema/source proposal.

If approval arrives, the Coordinator will issue an amendment identifying exact tables, vocabularies, migration ownership, and tests. Reserved migration range: `20260824000010`–`20260824000019`.

## Exclusive ownership

Authorized now:

- `lib/enterprise-crm/auth/**`
- `lib/enterprise-crm/data/**`
- `lib/enterprise-crm/theme/**`
- `tests/enterprise-crm/rbac/**`
- `tests/enterprise-crm/data/**`
- `tests/enterprise-crm/theme/**`
- one proposal under `docs/enterprise-crm/decisions/proposals/**`

Not authorized:

- `supabase/migrations/**`, `types/database.ts`, `lib/organization/**`, Supabase middleware;
- `app/**`, `components/**`, UI tests/screenshots;
- package/lock/config files;
- persisted domain models or later-journey work.

Request Coordinator ownership before touching a frozen/shared path.

## Required evidence

- Trusted/untrusted input boundary diagram or concise contract mapping.
- Exact capability keys and source evidence required for each shell utility.
- Tests proving query scope never grants access, revoked/missing grants deny, cross-team/org deny, cache/capabilities change on revocation, and unauthorized finance is absent.
- Tests proving school theme requires an exact approved link and unsafe/missing/ambiguous identity returns BLTZ Default.
- User-ready schema/source proposal.
- Typecheck, exact lint, targeted tests, expanded organization/Phase 2/RBAC regressions.

## Handoff

Report worktree/branch/base/head, decisions, files, migrations as `none`, exact tests, screenshots as `not applicable`, blockers, schema proposal path, assumptions, and UI integration notes. Gate 3B remains blocked if Stage B lacks approval.

