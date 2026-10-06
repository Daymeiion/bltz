# Isolated contact-import production candidate — October 5–6, 2026

## Status and authority

Prepared source-only lookup replanning checkpoint for the user-approved guarded
contact-import release. The previous isolated email-index checkpoint is
`f3b34bb4f8d3815f4b05c6dfe8137d220dc7fe9e`; it remains undeployed.
The first isolated 18-path source checkpoint was committed and pushed as
`8ac5768cf5da39d02476e2341e37d6761cce8819`; it was not deployed or promoted.
Its full hosted staging batch failed with SQLSTATE `57014` under the unchanged
eight-second authenticated statement limit. Release remains blocked.
The coordinator then applied the reviewed email index in staging only and
retried the same import key. That second hosted attempt also FAILED with SQLSTATE
`57014`. Read-only reconciliation confirmed zero contacts and zero links; three
import jobs, 624 synthetic NFL directory rows, two canonical Players, seven
platform role assignments and 62 audit rows were preserved. These are staging
fixture counts, not the real production directory.

This feature-branch checkpoint preserves the reviewed source and failed gate
evidence; it is not a production release. No production deployment, promotion,
index migration or contact import is authorized until the complete hosted
performance, persistence, audit and retry gates succeed. Do not bypass the
authenticated timeout or change grants/roles to force the batch through. Product
Doctrine and the current build order continue to govern identity and permissions.

Candidate branch: `codex/csv-import-production-2026-10-05`.
Known live authentication/security baseline: `af0b7077a1228581ebeb13a18158080c07e3fe97`.
Selected matching source: `b02d015ae57b3df1195de8f5b62eb16677e750b5`.
Selected lookup-replanning migration: `4379c1f169c18703eb9e63f500f1ace69357ac22`.
Selected typed regression test: `93e970c9c9fe150b08d989314c997e54e421e8bd`.
Checkout: `C:/Users/Administrator/.codex/worktrees/auth-security-production/bltz`.
The original security branch still references the unchanged baseline; it was not
reset, deleted or overwritten. The broader reconciliation head and stale main
are not this release candidate.

## Included files and behavior

Exactly six runtime files and eight reviewed tests remain byte-for-byte equal
to the selected matching source commit. The email index and its regression test
remain identical to primary checkpoint `36b31278169768b567d45ac12821585050372330`.
This forward checkpoint adds only the lookup-replanning migration and its
semantic regression test, plus updates this report and its manifest. There are
twenty-two release paths relative to the live security baseline, and four
changed/new paths relative to the isolated email-index checkpoint. The manifest
records twenty-one file hashes and excludes its own circular hash. Package files and all fourteen copied matching paths are retained
unchanged. The new source checkpoint must be explicitly pinned after review;
existing deployment wrappers remain pinned to the blocked first checkpoint.

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
Two forward database migrations are included. The nonunique partial expression
email index in `supabase/migrations/20261006033000_index_gtm_import_email_lookup.sql`
accelerates the existing active-contact `lower(btrim(email))` lookup without
changing matching semantics or adding a uniqueness constraint.

`supabase/migrations/20261006043000_replan_gtm_import_identity_lookups.sql` changes
only three per-row lookups in the existing private V2 importer to constant
`EXECUTE ... USING` statements, allowing each query to be replanned as contacts
are inserted. The normalized previous body must match `c17054ebf22e4acd185df3d9003b5052`,
and the reviewed email index must be present, valid and ready. All lookup
predicates and values, collision checks, preview bindings, manual locks,
row exceptions, audit behavior and result counts remain unchanged. Reversing
only those three substitutions reproduces the prior normalized function body.
Signature and default arguments, owner/ACL, SECURITY DEFINER and empty search
path are preserved. No table columns, existing rows, public RPC wrappers,
triggers, generated database types, authentication, roles, grants, RLS or
statement limits change. Existing
GTM contact and import-job RPCs remain required. No NFL directory import, Career
ID creation or automatic identity merge is included. Contacts remain private
under existing Admin/RLS boundaries. Later canonical attribution remains a
separate review workflow.

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
explicitly false. Existing Supabase migrations, generated types, RBAC,
Supabase client, classification helpers, navigation and shared utilities retain
baseline content except for the two explicitly reviewed forward migrations.
The private lookup change is the only RPC-body delta. No timeout, role, grant, environment or hosted setting is changed.
No original CSV, private recovery data, pitch material or other checkout was
copied, edited or deleted. Ignored `output` remains excluded from deployment.

## Validation

The following completed local QA belongs to the first isolated checkpoint,
`8ac5768cf5da39d02476e2341e37d6761cce8819`. It is retained historical evidence
and does not attest the new index checkpoint. Validation ran after its exact
dependency install:

- Full Vitest: **1,114 passed, zero failed, 24 existing skips; 147 test files**.
- Full TypeScript check: passed.
- Repository ESLint: zero errors; 287 existing warnings.
- Production Next.js build: passed; two existing CSS parsing warnings remain.
- Runtime dependency audit: zero findings.
- The install's complete dependency audit reports nine existing tooling findings
  (seven high, two moderate); no broad tooling upgrade or force fix was applied.
- All fourteen copied source/test hashes still equal the selected Git blobs.
- Protected authentication, permission, configuration, type and existing
  migration paths retain the known live baseline.

The full hosted 6,100-contact canary at that checkpoint was canceled with
SQLSTATE `57014`. Its final job remained `preview_ready`, with zero contacts
created by the failed transaction. Preserve the existing job and reconcile
read-only before retrying; a client timeout alone is not rollback proof.

Coordinator-run disposable tests using the unchanged V2 RPC and audit path
measured approximately 39 seconds for an email-populated 6,100-contact batch
without the lookup index, versus 3.92/3.99 seconds with only the nonunique active
email index. The baseline blank-email batch measured 4.17 seconds without the
index. These are local synthetic measurements, not hosted production or hosted
staging acceptance.
`tests/gtm/import-email-index.test.ts` supplies duplicate/case/trim/archive and
function-owner lookup-plan regression coverage. The primary focused run reported
35 passing tests across the email-index, SQL-review and action-security suites;
scoped lint passed. These results do not attest a new isolated full release run.

The previous email-index candidate, saved as
`f3b34bb4f8d3815f4b05c6dfe8137d220dc7fe9e`, completed isolated QA: **1,118 passed, zero
failed, 24 existing skips across 148 files**; typecheck, lint and production build
passed; lint retained zero errors and 287 existing warnings; runtime dependency
audit found zero vulnerabilities. Fresh dry source review contained 1,099 files,
all twenty selected paths and only the approved new email index migration, with
private inputs and analytics delivery source excluded. All fourteen matching
source/test blobs remain identical to `b02d015`, and both index files remain
identical to primary checkpoint `36b31278169768b567d45ac12821585050372330`.

This local QA preceded the final documentation-only update recording the failed
second hosted retry. Runtime, tests, SQL, packages and configuration remained
byte-for-byte unchanged after QA; the manifest links the retained QA receipt to
those unchanged sources. Ignored evidence is in
`output/csv-import-production-2026-10-05/index-forward-qa/receipt.json`.

The successful local checks and index-only benchmark did not resolve hosted
performance. The second same-key hosted retry after index application failed
with `57014`, so the full staged transaction and its persistence/audit/retry
acceptance remain FAILED. Preserve the job and fixtures; do not start another
batch, delete rows or infer that a client timeout alone proves rollback. Diagnose
the remaining hosted execution cost and establish a successful bounded gate
before any production action. Do not treat a database-only repair as proof that
the new index is included in a deployed source checkpoint.

QA evidence is under ignored
`output/csv-import-production-2026-10-05/`: selected-source-copy.json,
preserved-baseline-check.json, tests-final.json, tests-final.log,
typecheck-final.log, lint-final.log, build-final.log and runtime-audit-final.json.
Passing component and disposable PostgreSQL tests do not substitute for a live
Admin session, actual hosted RLS or a 6,100-row hosted execution canary.

## Lookup replanning validation and pending hosted gate

Read-only hosted evidence showed zero contact reltuples, relpages and size,
valid/ready indexes and three zero-cost sequential lookup scans under the
function/table owner. This corroborates the locally reproduced analyzed-empty
cached-plan hypothesis; it does not prove nested timeout attribution or a
successful hosted batch. The latest hosted attempt after the index still FAILED
with `57014`; contacts and links remained zero, and the existing job/history
were preserved. No successful retry with this new migration has been attested.

Independent focused review ran 45 tests across lookup-replanning, email-index,
SQL-review and action-security suites, all passing. The disposable analyzed-empty
6,100-row import preserved 278 exclusions, 544 deferred identities, zero links,
6,100 creation audits and a same-job replay without writes. Its local measured
6.83 seconds is not hosted acceptance or a production performance guarantee.
Injection strings are bound values; conflicting/ambiguous identities, archived
scope, absent keys, manual locks and unauthorized preview changes retain
existing behavior. Scoped migration/test QA at the primary source also passed.

The first isolated run passed 1,128 tests with no test failures, but TypeScript
and the production build caught four untyped query-result fields in the new
disposable test. Test-only checkpoint `93e970c9c9fe150b08d989314c997e54e421e8bd`
adds four result generics without changing assertions or database behavior.
Its focused ten tests, scoped lint and primary full TypeScript check passed.
The failed first-run evidence remains under ignored
`output/csv-import-production-2026-10-05/replan-forward-qa-4379-first-failed/`.

Isolated full QA for the exact twenty-two-path candidate passed: **1,128
passed, zero failed, 24 existing skips across 149 files**. Typecheck,
full lint and production build passed; lint retained 0 errors and 287 existing
warnings; runtime dependency audit found zero vulnerabilities. The fresh dry
upload contained 1,101 files with all selected paths, only the two reviewed
new migrations, and no private input or analytics delivery source. The full
receipt is retained under ignored
`output/csv-import-production-2026-10-05/replan-forward-qa/receipt.json`.

This final documentation-only result update follows QA. Runtime, tests, SQL,
packages and configuration remain unchanged; the manifest binds the tested
source hashes and identifies the documentation update. The hosted replanning
canary remains unproven and production release/import remain blocked.

## Production and contact-batch gates

The coordinator must verify the exact selected upload, candidate deployment,
rollback target, unchanged disabled flags and anonymous/security smoke behavior
before promotion. This preparation does not assert a live alias or release.

Before release, revalidate hosted system identity, migration history, function
fingerprints, the index definition/validity, privileges/RLS, the unchanged
eight-second authenticated limit and canonical/contact counts. The coordinator's
latest pre-index production snapshot retained zero contacts/links, three preview
jobs, 24,740 NFL directory rows, 296 canonical Player IDs and one platform role
assignment; the required email index was absent. This snapshot is not permission
to apply to a different database or a changed migration history. Apply only the
two reviewed version-controlled migrations through the guarded process after
staging proves the full transaction and unchanged authorization boundaries. No direct role/timeout workaround is allowed.

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
correction needs a separately reviewed migration. Neither the email index nor lookup replanning corrects or expands that receipt
contract. The three query-plan substitutions preserve the existing replay debt.
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
