# Isolated contact-import production candidate — October 5, 2026

## Status and authority

Prepared for the user-approved guarded contact-import release. This task has not
committed, pushed, deployed or imported production data. Product Doctrine and the
current build order continue to govern identity and permissions.

Candidate branch: `codex/csv-import-production-2026-10-05`.
Known live authentication/security baseline: `af0b7077a1228581ebeb13a18158080c07e3fe97`.
Selected matching source: `b02d015ae57b3df1195de8f5b62eb16677e750b5`.
Checkout: `C:/Users/Administrator/.codex/worktrees/auth-security-production/bltz`.
The original security branch still references the unchanged baseline; it was not
reset, deleted or overwritten. The broader reconciliation head and stale main
are not this release candidate.

## Included files and behavior

Exactly six runtime files and eight reviewed tests were copied byte-for-byte
from the selected source commit. The accompanying manifest lists their SHA-256
hashes, the two narrowly changed package files and this report. It excludes its
own circular hash.

Runtime paths:

- `app/admin/gtm/actions.ts`
- `components/admin/gtm/GtmImportWorkspace.tsx`
- `lib/gtm/import-contract.ts`
- `lib/gtm/import-review-progress.ts`
- `lib/gtm/import.ts`
- `lib/gtm/player-matching.ts`

The existing Imports workspace permits explicit individual or bulk deferral of
uncertain Player relationships, preserving contacts and possible/ambiguous
review state without creating a new Player link. It renders twenty reviews per
page, collapses automatic suggestions and exposes every bounded parser exception.
Exact contextual suggestions remain unverified until explicitly selected.
Name-only, loose substring and competing contextual candidates remain uncertain.

Optional downloaded checkpoints contain hashes and reviewed identifiers, not raw
CSV rows, contact names or email addresses. They are unsigned, untrusted progress
metadata. The original file, mapping and current candidate/context signatures are
rechecked; approval is never restored. No automatic browser storage is added.
Same-file validation retains compatible choices, clears stale choices and clears
confirmation. Pending operations freeze upload, mapping and choices.

The parser quarantines entire connected stable-identity conflict groups instead
of keeping the first differing occurrence. Homonyms with distinct profile/source
identities remain separate. Overlength identifiers are rejected, not truncated.
The unchanged source CSV and complete diagnostics preserve excluded work.

Server actions retain Admin/session authorization, independently validate choices
and deferrals, bind candidate context in the existing preview summary, check job
actor/file/name/mapping/type/status before commit and return matching completed
receipts without another mutation. Zero-eligible batches are refused. Existing
row/file bindings and founder field locks remain in place.

## Routes, database, migrations and permissions

Existing route: `/admin/gtm/imports`. No route was added.
No schema, migration, generated database type, role or grant changed. Existing
GTM contact and import-job RPCs remain required; local fixtures do not attest their
hosted definitions. No NFL directory import, Career ID creation or automatic
identity merge is included. Contacts remain private under existing Admin/RLS
boundaries. Later canonical attribution remains a separate review workflow.

Locker/photo/film-room, Intelligence Lab, authentication and Organization source
remain at the live baseline. No preview enrichment, provider restoration, new
analytics delivery route or future-phase migration was copied from reconciliation.

## Dependencies, environment and preservation

Baseline runtime dependencies and scripts are unchanged. Only two package
adjustments were made:

- Override existing `source-map-js` to patched `1.2.2`.
- Add `@electric-sql/pglite` `0.5.8` as a development-only dependency for the
  reviewed disposable SQL fixture test.

Lockfile comparison found changes only in its root entry and those two package
entries. All other lock entries were preserved. Installation used the official
npm registry, trusted system certificates, the ignored workspace cache and
`--ignore-scripts --legacy-peer-deps`; TLS verification was not disabled.
No Tinybird/QStash or unrelated dependency additions were copied.

No environment file, secret or cloud value was changed. `next.config.ts` and
`vercel.json` are unchanged; the 2 MB CSV/10,000-row application caps and 3 MB
Server Action transport cap remain. All four analytics/workflow flags remain
explicitly false. Supabase migrations, generated types, RBAC, Supabase client,
classification helpers, navigation and shared utilities retain baseline content.
No original CSV, private recovery data, pitch material or other checkout was
copied, edited or deleted. Ignored `output` remains excluded from deployment.

## Validation

Validation ran in the isolated candidate, after its exact dependency install:

- Full Vitest: **1,114 passed, zero failed, 24 existing skips; 147 test files**.
- Full TypeScript check: passed.
- Repository ESLint: zero errors; 287 existing warnings.
- Production Next.js build: passed; two existing CSS parsing warnings remain.
- Runtime dependency audit: zero findings.
- The install's complete dependency audit reports nine existing tooling findings
  (seven high, two moderate); no broad tooling upgrade or force fix was applied.
- All fourteen copied source/test hashes still equal the selected Git blobs.
- Protected authentication, permission, configuration, type and migration paths
  retain the known live baseline.

QA evidence is under ignored
`output/csv-import-production-2026-10-05/`: selected-source-copy.json,
preserved-baseline-check.json, tests-final.json, tests-final.log,
typecheck-final.log, lint-final.log, build-final.log and runtime-audit-final.json.
Passing component and disposable PostgreSQL tests do not substitute for a live
Admin session, actual hosted RLS or a 6,100-row hosted execution canary.

## Production and contact-batch gates

The coordinator must verify the exact selected upload, candidate deployment,
rollback target, unchanged disabled flags and anonymous/security smoke behavior
before promotion. This preparation does not assert a live alias or release.

Before the approved contact batch:

1. Verify hosted RPC definitions, row/file/actor binding, grants and RLS through
   the actual authorized Admin session. Read-only migration history/counts alone
   are not enough. Do not use a service-role import shortcut.
2. Recheck the untouched original LinkedIn source hash
   `b3020ed186433bc21e3d175d5d812065eddd467f3889b81e5ccb3730416c5961`,
   current directory and zero existing contacts. If state or counts drift, stop
   and reconcile rather than silently updating existing unlocked fields.
3. Create a fresh preview after release. The three historical preview jobs lack
   the new candidate-context hash and must not be reused for this commit.
4. Expected audited batch: 6,378 found, 6,100 eligible creates, zero updates or
   duplicates, 544 uncertain relationships explicitly deferred (464 possible,
   80 ambiguous, zero strong), and 278 excluded rows kept for later correction.
   Recompute these totals against current data before confirming.
5. Retain the original CSV and download complete row diagnostics and review
   progress before leaving. Confirm the concrete current batch explicitly.
6. Verify the committed receipt and persistence. The existing SQL initializes
   failed rows with the 278 excluded entries, so expected status is
   `completed_with_errors` with 6,100 created and 278 known exclusions. Additional
   failures, unexpected updates or fewer creates require reconciliation.
7. Verify deferred statuses, no new Player links/IDs and a same-job retry without
   another mutation. Preserve audit/history; never delete and reimport the batch.

Hosted large-batch duration, authorization, persistence and rollback/retry behavior
remain gates. No production data action occurred from this task.

## Known limitations and deferred work

The existing SQL completed-replay branch returns before all its binding checks.
This action's owner/file/mapping precheck guards its receipts, but direct-RPC
correction needs a separately reviewed migration. No such migration is included.
Existing cross-contact identity collisions remain skipped counts without per-row
collision reasons; they differ from fully exposed in-file parser conflicts.
The first audited batch had no stored contacts. Future repeat imports can change
unlocked existing fields; this is not a universal fill-empty policy.

Deferral preserves identity review work but does not solve name-only attribution.
The existing later drawer supports canonical Player UUIDs and eligible athlete
contacts; standalone NFL GSIS records may need a future review workflow. The
public-directory NFL importer, source entitlement, scraping, outreach and the
new analytics pipeline remain excluded and separately gated.

## Product-direction check

Stable contact identity and preserved attribution review strengthen Career Graph
accuracy without creating or merging Career IDs. This remains useful after an
athlete changes teams. No Moment/Value Graph relationship, ownership, rights,
publication or earnings entitlement is inferred. No generalized CRM, DAM, media
publishing or payment system was added.
