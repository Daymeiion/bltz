# Executive Journey — Foundation / Database Task Packet

**Branch:** `codex/crm-foundation-executive`  
**Worktree:** `C:\Users\Administrator\bltz-worktrees\crm-foundation-executive`  
**Start from:** immutable tag `crm-executive-wave1-base` on `codex/crm-integration-executive`; verify its commit against the Coordinator launch handoff

## Required outcome

Complete Phase 3A foundation confirmation for the Executive Action Center and implement only contracts that are already approved by the governing documents or approved through a Coordinator decision. Do not build UI or feature routes.

## Required reading

Read completely, in the governing order, the five controlling documents listed in `00-COORDINATOR-BASELINE.md`, then inspect all existing schema/migrations, generated types, `lib/organization/**`, Supabase clients/middleware, RBAC helpers, and relevant tests.

## Authorized work

1. Map every Executive data dependency to an existing canonical source or mark it `missing`, `conflicting`, or `unsafe to reuse`.
2. Define the permission registry and server enforcement matrix for organization-wide and team-limited scope, including finance and athlete/media restrictions.
3. Specify source-owned truth versus the Executive read projection.
4. Specify assignment, notification, audit, concurrency, idempotency, and atomicity behavior.
5. Define deterministic, rights-safe fixtures for all Executive personas and required states.
6. Add schema/RBAC/integration tests and approved additive migrations only after exact entity/status/transition decisions are documented.
7. Update generated database types only from the accepted schema.

## Mandatory decision requests

Submit a Coordinator decision request before creating or changing any of the following when no canonical answer exists:

- Opportunity, Activation, Assignment/Task, Notification, Financial Exception, or Executive Projection tables/columns;
- stage/status/priority vocabularies or transition graphs;
- team grant or permission bundle representation;
- reuse of legacy revenue, media, rights, message, or beta-intelligence records as Executive truth;
- audit metadata shape beyond the existing safe append-only contract.

Each request must include context, options, recommendation, affected files/data, migration compatibility, and reversibility. Continue unrelated mapping/testing work while it is reviewed.

## Exclusive ownership

Foundation exclusively owns during Wave 1:

- `supabase/migrations/20260824000000` through `supabase/migrations/20260824000009` if migrations are approved;
- `lib/enterprise-crm/data/**`;
- `lib/enterprise-crm/auth/**`;
- `lib/enterprise-crm/audit/**`;
- `lib/enterprise-crm/fixtures/**`;
- `lib/organization/context.ts` and `lib/organization/types.ts` only when required for accepted server scope contracts;
- `types/database.ts` after accepted schema generation;
- `tests/database/executive-*.test.ts`;
- `tests/enterprise-crm/data/**` and `tests/enterprise-crm/rbac/**`.

Do not edit UI Systems paths, `app/organization/**`, `components/**`, `app/globals.css`, public Locker routes, or later-journey files.

## Minimum contract evidence

- Matrix covering Organization/School, Team/Scope, Membership/Permission, Athlete summary, Opportunity, Activation, Media/Rights, Financial Exception, Intelligence Signal, Assignment/Task, Notification, Audit Event, and Executive Projection.
- Permission keys and enforcement point for every read, count, aggregate, search, export, mutation, and notification payload.
- Proof that broad-to-narrow scope cannot reuse broad cached data.
- Proof that finance data is omitted rather than redacted after delivery.
- Atomic assignment/notification/audit design with idempotency and stale-version recovery.
- Migration deploy order, backfill, compatibility, rollback/forward-fix, and recovery notes, or an explicit `no migrations` report.

## Tests

Run the affected database/RBAC/integration suites plus the protected baseline named in `00-COORDINATOR-BASELINE.md`. Add denial and anti-enumeration tests for each accepted server contract.

## Handoff

Report:

- worktree, branch, base/head commits;
- decisions, approved deviations, and unresolved requests;
- files changed;
- every migration and deploy/backfill/compatibility/recovery note;
- permission keys and enforcement locations;
- fixture contract;
- exact test commands and pass/fail/skipped results;
- screenshots as `not applicable` unless a diagnostic UI was explicitly authorized;
- blockers, assumptions, gaps, and next-owner notes.
