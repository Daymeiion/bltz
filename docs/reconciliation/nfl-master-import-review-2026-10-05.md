# NFL Player Master importer: separate restoration review

**Review date:** October 5, 2026

**Source baseline:** `1f987276a84fb3728fb83bdf562d5f12a1f43970` on `codex/doctrine-reconciliation-2026-10-05`

**Authority:** Product Doctrine → current build order → existing identity and GTM contracts
**Status:** Review complete; implementation, migration and production release are **not authorized by this report**.

## Recommendation

Restore the useful workflow as a small **NFL reference-directory CSV import** in
the existing Admin Imports screen, after separate implementation approval. Do
not copy the historical package or apply its August migration wholesale.

The held package is recoverable. Its useful parts are stable GSIS matching,
field aliases, explicit preview/confirmation, exclusion summaries and atomic
import intent. Its transport, parser, preview binding and overwrite behavior
require changes before restoration. Use the current Admin shell, authorization,
import conventions and source-policy gates rather than reviving an older GTM UI.

This workflow writes `public.nfl_players`, an NFL reference directory keyed by
`gsis_id`. **`public.players.id` remains the canonical Athlete Career ID.** It
must not create or merge Career IDs, contacts, cohort selections, claims or
Lockers. Current explicit selection, promotion, preview and identity-review
workflows remain separate.

An important visibility boundary: the repository enables RLS on `nfl_players`
but permits public SELECT. A successful directory import is therefore **not a
private Locker draft edit**. Allowed reference facts become publicly readable
without a new Locker. Keep confidential fields and private contact data out of
the payload and explain this before confirmation. Hosted policies still require
read-only preflight; this review did not query production.

## Evidence and current contracts

Reviewed the eight files preserved beneath
`output/reconciliation-2026-10-05/held-historical-source/nfl-master-import/`:

- `lib/players/master-import.ts` and `master-import-contract.ts`.
- `app/admin/gtm/player-master-actions.ts` and `imports/page.tsx`.
- `components/admin/gtm/PlayerMasterImportPanel.tsx` and `GtmImportWorkspace.tsx`.
- `supabase/migrations/20260826142105_import_player_master.sql`.
- `tests/players/master-import.test.ts`.

These held files are evidence, not active imports or migration authority. They
remain unchanged. No historical checkout or script was executed or modified.

| Current source | Contract to preserve |
| --- | --- |
| `app/admin/gtm/imports/page.tsx`, `components/admin/gtm/GtmImportWorkspace.tsx` | Current LinkedIn/contact import, mapping, match review, confirmation and UI |
| `lib/gtm/import-contract.ts`, `next.config.ts` | Contact files: 2,000,000 bytes/10,000 rows; Server Action body limit: `3mb` including multipart overhead |
| `lib/rbac.ts`, `app/admin/layout.tsx` | Platform assignment authorization; never `profiles.role` or user-editable metadata for Admin writes |
| `20260818000002_phase2_legacy_admin_super_admin_transition.sql` | Current repository `is_internal_admin()` requires an active `super_admin` assignment |
| `20260701000000_production_schema_baseline.sql`, `types/database.generated.ts` | Existing NFL reference columns, GSIS primary key, public-read policy and `players.gsis_id` foreign key |
| `20260828121000_harden_gtm_contact_import.sql`, `20260828233000_close_gtm_prompt6_p1_gaps.sql` | Current contact commits bind normalized rows to preview hashes; authenticated direct import-job UPDATE is revoked |
| `lib/gtm/player-prospects.ts`, `app/admin/gtm/players/actions.ts` | Directory reads, selected cohorts and preview creation; existing links remain stable |
| `20260828215242_promote_player_prospects_to_gtm_contacts.sql` | GTM contacts reference directory identity instead of copying master identity fields |
| `20260918193313_preview_athlete_identity_review.sql` | Separate explicit Career ID review/linking with duplicate and identity-conflict checks |

The active repository has no `import_player_master` RPC or generated RPC type.
The old import targets existing reference columns, so a second athlete table or
new provider columns are unnecessary. Existing import-job rows support
`player_master` as a type, but `prepare_gtm_import_job_v2` currently accepts only
contact types and at most 10,000 rows; it cannot simply receive the old package.

## Required corrections before implementation

| Finding | Concrete required change |
| --- | --- |
| Old file cap is 5,000,000 bytes; current action transport is `3mb`. Oversized requests fail before the file validator can run. | Recommend an initial 2,000,000-byte cap, consistent across client, parser and actions, while retaining the current transport. Keep a separate bounded NFL row cap, proposed 25,000. Verify representative files fit. Larger full-snapshot support needs an independently reviewed upload design and hosted platform-limit checks; increasing `maxDuration` does not fix request size. |
| Old parser rejects ZIP workbooks but accepts legacy binary Excel disguised as CSV. | Reject both workbook signatures and invalid/nontext input before SheetJS. Reuse current contact-parser safety behavior without reusing its contact schema. |
| Old parser silently truncates IDs and drops later conflicting GSIS rows. Two overlength IDs can collapse into one. | Reject overlength/control-containing IDs; preserve textual leading zeroes. Use the same GSIS normalization and equality rule in parser, lookups, row hashing and database commit. Identical duplicate rows may be counted/skipped; conflicting duplicate fields require review or rejection, never first-row wins. Never deduplicate by player name. |
| The old numeric validator accepts negative height/weight/year values; headshot URL validation is absent. | Validate allowed field types and documented domain ranges, impossible dates and season ordering. Validate reference URLs with current safe-URL helpers. Unsupported/malformed fields become visible exceptions. Do not treat an accepted URL as publication permission. |
| Zero valid rows can create a preview and reach a zero-write commit. UI shows only 25 issues and does not explain all omitted exceptions. | Require at least one eligible row; show exclusion totals and accessible full exception review. Clearly distinguish invalid, identical duplicate, conflicting duplicate and unchanged rows. |
| Old SQL compares a caller-supplied file hash and counts, but not a server/database-generated normalized-row digest. A direct RPC can change approved row values while keeping those inputs. | Add a directory-specific preparation/commit contract using stored normalized-row hashes, actor, file hash, mapping/parser version, overwrite policy and confirmation summary. Reparse/revalidate on commit and verify the stored digest in SQL before any write. Do not reuse the contact digest's field exclusions/order as a directory digest. |
| Completed replay returns a job without checking uploader ownership; nullable SQL comparisons can fail open for explicit NULL inputs. | Validate required values with NULL-safe checks. Check current permission, actor ownership, import type and all immutable bindings before completed replay. Reject another actor's key and altered payload; matching retries return the same receipt. |
| Existing nonempty values are automatically replaced by every supplied non-NULL value. Blank CSV cells are preserved, but reviewed corrections and provider refreshes can still be overwritten. | Recommend creates and filling empty fields by default. Show old/new per-field differences for replacements and require an explicit approved policy. Never clear existing values implicitly, change a GSIS key or delete records missing from a snapshot. |
| Counts are computed before the upsert; a concurrent importer/provider refresh can invalidate both the preview and created/updated counts. | Bind reviewed replacements to a current-row fingerprint/version, reject changed records and request a fresh preview. Protect absent-row insert races too. Compute receipt counts from actual committed outcomes; distinguish unchanged rows. Any conflict or failure rolls back the entire accepted batch and approval transition. |
| Old public `SECURITY DEFINER` RPC concentrates directory write authority in an exposed implementation. It relies on inherited job auditing rather than documenting directory changes. | Reuse the current private-implementation/public-wrapper pattern with fixed search paths, explicit grants and repeated database authorization. Keep client calls session-bound; no browser/service-role workaround. Add a scoped import completion audit and durable changed-GSIS/field provenance sufficient for correction review without copying the CSV into a public log. |
| NFL directory rows are publicly readable; unknown CSV source and headshot rights are not checked. | Require a separately reviewed manual-import capability, approved source provenance and factual-ingestion entitlement before preparation and again at commit. Automated adapter `PERSIST_FACTS` permission alone never authorizes a CSV import. Apply current source-policy checks where applicable, plus confirmed provider/data entitlement and attribution. A source URL or user assertion alone is not a license. Hold unsupported/mixed/unknown sources. Defer headshot imports unless the existing image permission/provenance rules support public reference use. |
| Old commit revalidates only `/admin/gtm/imports`; cohort/directory and joined contact reads can remain stale. | Revalidate current directory/cohort/contact read paths as appropriate after successful commit. Do not refresh, rewrite or publish saved private previews or canonical Lockers automatically. |

The currently approved source-policy work blocks **new** Sports Reference stats
persistence while retaining unchanged historical records. A manual CSV is not a
bypass. The reference importer must not ingest stats under the guise of identity
fields, infer provider entitlement from discoverability or activate a provider.

## Permissions, routes and schema decisions

- Keep the route `/admin/gtm/imports`; add a clearly separate NFL reference panel
  inside the existing workspace. Preserve LinkedIn/contact import and Player
  match review. Do not copy the old workspace or add a separate application.
- Use `requireInternalAdmin()` plus authenticated session verification in every
  action. Reuse the same database assignment predicate in preparation/commit.
  Do not widen access to organization roles or other platform roles. Role
  expansion would require its own permission decision.
- Preferred source files are scoped under `lib/gtm/player-master-import.ts` and
  `lib/gtm/player-master-import-contract.ts`, with dedicated
  `app/admin/gtm/player-master-actions.ts` and
  `components/admin/gtm/PlayerMasterImportPanel.tsx`. These names are a proposed
  implementation plan, not files restored by this review.
- A reviewed new migration is required for directory-specific RPCs and binding/
  provenance constraints. Reuse `gtm_import_jobs` and its existing `rows_sha256`
  where adequate; record any additional minimal job metadata explicitly. No
  new `players`/`athletes`, Locker, media, rights, CRM or future-phase tables.
- Do not restore the backdated August migration into the active migration set.
  Reconcile hosted history and existing function definitions first; create a
  fresh migration with the repository CLI workflow. A preexisting hosted
  function must be compared and upgraded safely rather than presumed absent.
- Keep NFL reference reads as currently authorized; no broad write policy or
  table grant should enable bypassing confirmation. Check table privileges as
  well as RLS: baseline `GRANT ALL` includes non-row privileges such as TRUNCATE,
  which RLS does not protect. Limit browser roles to required directory reads;
  preserve approved service ingestion separately. This is a local schema review,
  not evidence of an exploitable hosted HTTP endpoint.
- Regenerate the appropriate database types after the reviewed schema change.
  Do not edit generated RPC signatures by hand or bypass missing schema with
  a service client. Missing configuration must return a bounded unavailable
  state with no directory mutation.

## Accepted and deferred scope

**Candidate scope for a separately approved implementation:** CSV inspection,
source review, stable-ID validation, safe duplicate handling, field-change
preview, confirmation, atomic directory updates, receipt/history/audit and
revalidation using existing Admin patterns. No provider calls are needed to
parse a supplied file.

**Deferred:** larger upload/background processing, blanket nonempty overwrites,
deletion/replacement snapshots, automatic Career ID creation/linking, contact or
cohort promotion, preview creation, claims, private preview edits, stats ingestion,
new headshot publication, backfills, new provider integrations, new role models,
Organization Console/CRM redesign and production deployment.

Genuine product choices before implementation:

1. Approve the recommended creates/fill-empty policy, or authorize a narrowly
   reviewed per-field replacement workflow. The held importer silently used a
   broader overwrite policy; previous UI restoration approvals do not resolve
   its data-authority conflict.
2. Confirm whether a 2 MB initial file cap is sufficient for the actual intended
   source. If not, review a larger upload design separately; do not advertise
   5 MB acceptance under the current transport.
3. Identify the permitted source/dataset and whether imported reference facts
   may enter the publicly readable directory. Unknown entitlement or private
   data remains blocked; this is not permission to ingest any available CSV.

No new user choice is needed to retain stable Career IDs, current UI, existing
cohorts/claims, current Admin permissions, recovery copies or pitch files.

## Reviewable implementation prompt

Use this prompt only after the coordinator records approval of the scoped plan
and resolves the choices above:

> **Objective:** Restore a guarded NFL reference-directory CSV workflow within
> the current Admin Imports screen. Follow Product Doctrine, build order and
> this restoration review. Inspect current source and migration history first.
>
> **Included:** Reuse current Admin design/auth primitives; add an independent
> reference panel; bounded CSV parsing; approved source entitlement and public
> visibility disclosure; stable GSIS preservation; visible exceptions and
> field differences; approved overwrite policy; actor/row/file-bound previews;
> atomic idempotent commit and audit; truthful receipts and revalidation.
>
> **Excluded:** Whole-package restoration, old migration insertion, service-role
> bypass, provider/backfill execution, secrets, pitch files, Career ID/contact/
> claim/Locker creation, stats/headshot publication without approved permission,
> future-phase schemas, Organization UI changes, analytics activation or deploy.
>
> **Required routes/data:** Preserve `/admin/gtm/imports` and current contact
> workflow. Write only approved `nfl_players` reference fields keyed by GSIS and
> minimal import-job/audit metadata. `players.id` and all existing links remain
> unchanged. Use a fresh reviewed migration and regenerated types.
>
> **Required permissions:** Current session plus active platform Admin assignment
> in every action and RPC; database-side ownership/binding checks, private
> implementation, explicit grants and RLS/grant negative tests. Unknown schema,
> source or entitlement blocks commit without fallback mutation.
>
> **Acceptance/validation:** Meet all gates below. Deliver the complete file,
> route, schema, migration, environment, permission, QA and deferred-work report.
> Present the migration/release evidence to the coordinator before applying it
> to hosted environments. Do not imply source approval authorizes production.

## Acceptance and release gates

1. Parser tests cover maximum bytes/rows, empty/invalid files, UTF-8/BOM and quoted
   CSV, both workbook signatures, duplicate/ambiguous headers, leading zeroes,
   control/overlength IDs, invalid domains, conflicting/identical duplicates,
   zero eligible rows and source permission rejection. No silent identity loss.
2. Action/component tests cover anonymous/non-Admin/expired sessions, direct
   calls, loading/error/unavailable states, preview invalidation after file or
   policy changes, full exception access, confirmation, changed records, clear
   public-reference wording, keyboard/mobile behavior and accurate receipts.
3. Execute actual migration SQL in a disposable local database with realistic
   foundation schema: denied unauthorized execution; cross-actor replay;
   explicit NULLs; altered normalized rows with an unchanged claimed file hash;
   forged counts; changed source/overwrite policy; size limits; stale/concurrent
   records; rollback; audit atomicity; exact retries; correct actual counts.
   SQL string assertions alone do not prove these properties.
4. Verify authorized directory reads and denied direct browser-role writes,
   deletes and TRUNCATE privileges. Preserve required service refresh capability.
   Confirm no writes to `players`, Lockers, contacts, cohorts or claims and no
   confidential data in public projection/audit.
5. Existing GTM importer, matching, directory/cohort and preview identity tests
   remain green. Run full tests, typecheck, lint and production build; do not
   treat already skipped live suites as hosted validation.
6. Before hosted migration/release: read-only migration/function/grant/RLS
   preflight, reviewable SQL/types diff, backup/recovery plan, representative
   staging upload under deployed transport limits, staging authorization/
   persistence/concurrency canaries and explicit migration/release approval.
   Existing analytics/workflow disabled gates remain unchanged.

## Validation performed and completion report

- **Files changed:** this review document only. **Routes, schema, migrations,
  environment variables and permissions changed:** none.
- **Current regression run:**
  `node node_modules/vitest/vitest.mjs run tests/gtm/import.test.ts tests/gtm/player-matching.test.ts --reporter=dot`
  passed **23 tests across two files**. The runner emitted its existing Vite
  configuration warning; no test failed.
- **Held parser probes:** transpiled the preserved parser in memory against
  installed TypeScript/SheetJS; no file, database or network writes. Confirmed
  legacy-workbook acceptance, conflicting-duplicate loss, negative-height and
  unsafe-headshot acceptance, overlength-ID collapse and zero eligible rows.
  Also confirmed textual leading zeroes remain intact. These are defect probes,
  not a passing restored-feature suite.
- **SQL:** read reviewed migrations/contracts; no SQL was applied or executed.
  The old tests include SQL text assertions rather than execution/RLS proof.
- **Manual verification:** source/UI contract comparison only; no authenticated
  browser, real upload, provider call or hosted database verification.
- **Limitations/deferred work:** actual source size/entitlement, field authority,
  deployed history and live privileges remain to be confirmed. The report does
  not assert that old importer functionality is deployed or that a production
  directory has any current historical row count.
- **Product direction:** reference accuracy supports future career recovery and
  stable GSIS-to-Career-ID review after an athlete leaves a team. No Moment or
  Value relationship, ownership or economic entitlement is inferred. No mature
  DAM, CRM, media publishing or payment workflow is duplicated.
