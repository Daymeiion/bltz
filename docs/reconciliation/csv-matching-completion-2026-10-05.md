# Contact CSV matching recovery: source checkpoint

## Objective and authority

Complete the unfinished contact-import workflow without merging people by name,
discarding conflicting data or forcing hundreds of uncertain Player decisions.
The user approved the 2 MB limit and requested safe matching automation. Product
Doctrine and current build order govern identity and phase boundaries.

Source branch: `codex/csv-matching-recovery-2026-10-05`, based on pushed checkpoint
`3c31bd99ab78c717430b6938df333e03c011c7a0`. This is an application source checkpoint,
not a production import or deployment. Existing NFL directory records remain.

## Recovery and actual batch

Read-only hosted inventory confirmed 24,740 NFL reference records, 296 canonical
Career IDs, zero GTM contacts and three `preview_ready` jobs whose content hashes
match the recovered LinkedIn export. No abandoned browser choices are claimed
recovered. The original CSV remains available and unchanged.

The recovered LinkedIn file is 752,277 bytes, with 6,100 eligible contact rows and
278 invalid rows, not a 4 MB NFL directory replacement. Its 6,100 profile URLs are
distinct. Against the current 24,740-row directory, an in-memory audit produced
544 uncertain candidate groups: 464 possible and 80 ambiguous, zero automatic
strong suggestions, and 5,556 contacts with no matching NFL name candidate.
These are diagnostic totals, not approved or executed import results.

An appropriate reviewable first batch would create the 6,100 eligible private
contacts, explicitly defer the 544 uncertain Player relationships, and keep the
278 excluded rows in the unchanged original and complete diagnostics. Do not
guess identities, create Career IDs or replace the existing NFL directory.

Both recovered originals have SHA-256-verified private recovery copies under
ignored `output/csv-matching-recovery-2026-10-05/original-inputs/`. `output` is also
excluded from deployments. No original data or private CSV enters Git. The
aggregate [recovery report](csv-matching-recovery-2026-10-05.md) records source
paths/hashes and separates historical file-only results from current evidence.

Preservation verification retained all 749 original snapshot files, 21 held
historical source copies, the named tracked-edit stash and 89 uncommitted
pitch/review files. The 24 protected UI/authentication/permission/flag source paths
retain checkpoint content; four have existing CRLF-only differences from their
Git blobs and were not edited. Both original CSVs and private recovery copies
match their recorded hashes. Eleven configured private values were checked
against selected source files without printing them; no matches were found.
The local receipt is `preservation-final.json` in the evidence directory.

## Included changes and files

- Current `/admin/gtm/imports` workspace: uncertain reviews first, 20-item pages,
  individual review-later choices, explicit bulk deferral, collapsed automatic
  suggestions, complete row diagnostics and optional review-progress download.
- `lib/gtm/import-review-progress.ts`: bounded choice validation, deterministic
  candidate/context hashes, file/mapping-bound checkpoints and stale restoration
  rejection. Artifacts contain hashes and stable decision IDs, not names, email
  addresses or raw contact rows. No automatic browser storage is added.
- `app/admin/gtm/actions.ts`: existing authorized inspection/preview/commit actions
  validate deferrals and candidate choices afresh; preserve pending unlinked
  identities; bind candidate context in existing preview-summary JSON; guard
  completed receipts by actor/file/name/mapping/type; reject zero eligible writes.
- `lib/gtm/player-matching.ts`: only exact normalized context can support an
  automatic suggestion; substring and name-only candidates remain uncertain.
  Suggestions remain unverified until an explicit reviewed selection.
- `lib/gtm/import.ts` and its contract: quarantine every occurrence in connected
  conflicting profile/email/source-ID groups; count harmless identical supported
  rows; preserve homonyms; reject overlength identifiers instead of truncating.
- Meaningful parser, selection, progress, action-security, SQL-binding and UI
  regressions, existing contract updates, recovery report and current wireframe.
- `package.json` and its lock: pin only `source-map-js` to patched version 1.2.2.
  The fresh runtime audit identified a high-severity denial-of-service advisory;
  declared application/development dependencies and unrelated lock entries stay
  unchanged. See the [reviewed advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

The exact file manifest is `csv-matching-files-2026-10-05.json`, excluding its own
hash. The [wireframe](../design-reference/contact-import-match-review-2026-10-05.md)
preserves the existing Admin hierarchy and design tokens.

## Behavior, permissions and exclusions

Deferred contact rows are still imported when explicitly confirmed, but gain no
new Player link and retain possible/ambiguous identity status. Deferral does not
mean rejection, removal, identity verification or completed Player attribution.
Existing stored links are not cleared. Existing founder locks remain; the legacy
contact uploader can still update other unlocked fields on a future repeat
import. Do not call this a universal fill-empty policy. This first observed batch
has no existing contacts, but its state must be rechecked before a live commit.

Repeated validation preserves compatible explicit choices and clears changed
ones. Cross-session continuation requires downloading a checkpoint, reselecting
the original CSV, validating the same mapping, then restoring compatible choices.
Confirmation is always cleared. Checkpoint metadata is untrusted input, not a
signed identity assertion; current server authorization and candidate validation
remain decisive. Server preview jobs remain bound to the authorized actor.

Current Admin/session, RLS and actor/file/row-bound RPCs remain. No service-role
import shortcut, public contact projection, new role or broad table grant is
introduced. No new route, dependency package, schema, migration, generated database
types or environment variables change; one existing transitive package is patched.
All four analytics/workflow flags stay
false. Locker/photo/film-room, authentication and Organization interfaces remain.

Excluded: automatic name merges, fuzzy identity verification, canonical identity
creation, old NFL importer/migration restoration, public-directory CSV ingestion,
headshots/stat imports, provider scraping, outreach, backfills and production
deployment. NFL source entitlement remains unresolved and its importer is held.

## Validation and limitations

Final validation of the frozen source candidate:

- Full Vitest suite: 1,670 passed, 24 existing skipped, zero failed; 188 files.
- Full TypeScript `tsc --noEmit`: passed.
- Repository `npm run lint`: zero errors; 286 existing warnings remain.
- Production `npm run build`: passed; two existing CSS parsing warnings remain.
- `npm audit --omit=dev`: zero runtime vulnerabilities after the targeted patch.
- Independent frozen-source review: 101 focused tests in ten files passed,
  including UI buttons/restoration, server authorization and seven disposable
  PostgreSQL executions using actual repository import function bodies.
- Whitespace and exact file/hash manifest checks protect the source checkpoint.

Full development dependency audit still reports nine tooling vulnerabilities
(seven high, two moderate) in the existing lint/Tailwind dependency chains.
No broad framework downgrade, Tailwind upgrade or `audit fix --force` was applied.
Test logs also contain React act/iframe simulator warnings; passing component
tests do not substitute for an authenticated browser or mobile import check.

The local evidence directory is `output/csv-matching-recovery-2026-10-05/`:
`tests-final.json`, `typecheck-final.log`, `lint-final.log`, `build-final.log`,
`runtime-audit-final.json`, `all-dependency-audit-final.json` and
`frozen-review-focused.log`. No live import or production database write ran.

Read-only hosted table/history inventory is not proof of current RPC definitions,
grants, migration equivalence or RLS behavior under the actual Admin session.
The existing SQL completed-replay path returns before its binding checks; new
application guards protect this action, but a direct-RPC correction requires a
separate reviewed migration. SQL fixture tests do not attest hosted behavior.

The later manual GSIS attribution workflow remains incomplete for NFL directory
records without a canonical Player. Existing drawer matching supports canonical
Player UUIDs and eligible athlete contacts. Deferral preserves review work; it
does not magically finish those identities. New candidate evidence or explicit
identity review is still necessary for the remaining name-only cases.

Existing cross-contact identity collisions are counted as skipped duplicates
without per-row collision reasons. This is separate from the new complete parser
conflict diagnostics and does not affect the audited first batch with zero stored
contacts. Later imports require review of collision counts and preservation of
their original files; do not call this automatic lossless conflict resolution.

No authenticated browser/mobile import or hosted rollback/idempotency canary was
performed. Before production: exact candidate release review, read-only hosted
RPC/history/grant preflight, actual Admin staging workflow, source/data visibility
review, and explicit approval of the concrete import batch and deployment.
Do not re-use stale main or deploy the entire reconciliation branch blindly.

## Product direction

This improves Career Graph identity accuracy and preserves contact-to-athlete
review evidence across sessions. It remains useful after athletes change teams.
No Moment or Value Graph relationship, ownership or earnings is inferred. No
generalized CRM, DAM, social publishing, payment or media workflow is duplicated.
Pitch files and all historical recovery work remain untouched.
