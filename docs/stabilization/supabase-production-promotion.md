# Supabase production migration reconciliation and promotion

Status: procedure only; no production operation has been authorized or performed.  
Canonical migration directory: `supabase/migrations/`  
Baseline migration: `20260701000000_production_schema_baseline.sql`

## Safety invariant

Never run `db reset`, `migration repair`, `db push`, `db pull`, or a direct SQL mutation against production while discovering its state. The baseline is a schema snapshot for reproducible blank databases; it is not safe to execute over an established database merely because production migration history is incomplete.

The Supabase CLI link is local mutable state and is not proof of the target. Before every remote command, independently compare the intended project reference with the approved environment inventory. Prefer an explicit project reference for read-only inspection. If `.temp/project-ref` and `.temp/linked-project.json` disagree, stop and re-establish a single reviewed target before continuing.

## Phase 1 — immutable evidence collection (read-only)

Run from an immutable, clean commit after recording its SHA:

1. Record the production project reference from the approved deployment inventory. Do not infer it from a developer CLI link.
2. Export the remote migration-history list and a schema-only production dump to an access-controlled evidence directory outside the repository.
3. Record SHA-256 checksums for every canonical migration and the schema dump.
4. Record Postgres version, installed extensions, exposed Data API schemas, and current RLS/policy definitions.
5. Confirm backups and point-in-time recovery are healthy. This is evidence gathering, not authorization to mutate.

Do not place database passwords, access tokens, JWTs, secret keys, or production dumps in Git, CI logs, issue comments, or completion reports.

## Phase 2 — reconcile schema state before history

For each canonical version, classify production as exactly one of:

- `schema-equivalent/history-present`: no action.
- `schema-equivalent/history-missing`: candidate for a migration-history-only repair after independent review.
- `schema-missing/history-missing`: requires a new forward migration tested from the canonical chain; do not falsely mark it applied.
- `schema-different/history-present`: drift incident; stop promotion and reconcile with a reviewed forward migration.
- `history-present/checksum-or-definition-unknown`: provenance incident; stop until the applied definition is recovered and compared.

The `20260701000000` baseline may be marked as applied only when a reviewed schema diff proves that every baseline object, column, constraint, function, policy, grant, and required extension already exists with compatible definitions. `migration repair --status applied` changes migration history only; it does not create or validate schema objects.

Incremental versions after the baseline receive the same object-level comparison. Do not bulk-mark versions applied based only on filenames, dates, or successful application in staging.

## Phase 3 — corrective commit and isolated proof

If any production object is missing or different:

1. Create a new forward-only migration with the Supabase CLI migration generator.
2. Avoid editing an already-promoted migration.
3. Review locks, constraints, RLS, grants, function `search_path`, and rollback/forward-fix behavior.
4. Run `node scripts/validate-supabase-foundation.mjs`. It copies only config and canonical migrations into a unique temporary project, creates a fresh disposable local database, runs all migrations, runs `db reset --local --no-seed`, lints `public`, stops with `--no-backup`, and removes the temporary workspace.
5. Run migration contract tests, TypeScript checks, lint, and the full repository gates.
6. Commit and QA a new immutable integration SHA.

The validator pins Supabase CLI `2.114.0` and never uses `--linked` or a remote project reference. CI requires Node, Docker, and outbound registry access for the pinned CLI/container images.

## Phase 4 — staging promotion and live authorization proof

1. Promote the immutable candidate to the dedicated staging project.
2. Run a linked dry-run and review the exact pending versions before mutation.
3. Apply only to staging under the normal approval process.
4. Generate TypeScript types from staging and compare them with `types/database.ts`; do not overwrite the application-facing contracts without reviewing breaking differences.
5. Provision dedicated, non-production test identities for athlete A, athlete B, authenticated non-admin, and platform admin. Obtain short-lived JWTs through normal authentication; never invent or commit them.
6. Set `RUN_LIVE_RLS_TESTS=1` and the variables listed in `tests/database/beta-rls-live.test.ts`, then run that file explicitly.
7. Record each executed role and result. A skipped suite is not RLS evidence.

The service fixture must be `SUPABASE_SERVICE_ROLE_KEY=sb_secret_...` in a protected server environment. `lib/supabase/service.ts` is guarded by `server-only` and disables session persistence and refresh. Supabase is expected to return HTTP 401 when an `sb_secret_` key is presented with browser request metadata; that rejection is a security control, not an application failure.

## Phase 5 — production change window (requires separate approval)

Only after Phases 1–4 are signed off:

1. Reconfirm target project reference, immutable commit, backup/PITR status, and approved pending versions.
2. Apply individually reviewed migration-history repairs only for versions proven schema-equivalent.
3. Run a fresh production dry-run and require an exact expected migration list.
4. Apply migrations during the approved window.
5. Verify schema version, migration history, RLS smoke checks, API health, and application canaries.
6. Preserve command output and checksums in the controlled deployment record.

There is no production reset procedure. For a failed migration, prefer a reviewed forward fix. Use point-in-time recovery only through the incident process when a forward fix cannot safely restore service.

## Stop conditions

Stop immediately on target ambiguity, dirty candidate files, missing backups, unexplained schema drift, duplicate migration versions, type-generation drift, a skipped required RLS role, unexpected dry-run output, linter errors, or any command that requests broader credentials than the approved environment provides.
