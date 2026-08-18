# Agent 1 — production-readiness follow-up completion report

Date: 2026-08-17  
Branch: `codex/stabilization-agent1-production-readiness`  
Starting commit: `23c74cf9f3d4c8512c39db4dda385382a7abaedb`

## 1. Summary

Prepared the Supabase foundation for a controlled production-readiness cycle without linking, repairing, resetting, pushing, or mutating production. Added a production migration-history reconciliation procedure, a pinned isolated blank-database reset/lint entry, stronger live RLS fixture readiness, and a build-time `server-only` boundary for the privileged Supabase client.

The staging OpenAPI schema was verified through an explicitly non-browser `sb_secret_` request. All analytics/beta table columns and both RPCs matched the checked-in application-facing contracts, so `types/database.ts` required no correction. Direct CLI type generation was attempted twice and then stopped after the same transport error, per the Supabase skill recovery rule.

## 2. Files changed

- `lib/supabase/service.ts` — adds the `server-only` boundary and documents current secret-key support.
- `scripts/validate-supabase-foundation.mjs` — pinned, isolated local reset and lint entry for CI.
- `tests/supabase/service-client.test.ts` — verifies protected `sb_secret_` construction and missing-secret failure.
- `tests/database/beta-rls-live.test.ts` — explicit anon, athlete, non-admin, admin, service, and browser-rejection readiness.
- `tests/database/beta-foundation-migration.test.ts` — validates the canonical active migration directory.
- `tests/database/migration-reproducibility.test.ts` — validates canonical versions and the non-linked isolated CI entry.
- `docs/stabilization/supabase-production-promotion.md` — production reconciliation/promotion procedure.
- `docs/stabilization/agent-1-production-readiness-completion.md` — this report.

Pre-existing dirty `package.json`, `package-lock.json`, `skills-lock.json`, and `.agents/skills/**` changes were preserved and are not owned or staged by this agent.

## 3. Routes changed

None.

## 4. Database changes

None. No remote or local database schema was changed by this agent. The canonical baseline and incremental SQL files were inspected but not edited.

## 5. Migrations

No migration was added, edited, applied, repaired, reset, or pushed. Migration contract tests now read `supabase/migrations`, the production canonical chain, instead of the retained legacy copies under `lib/supabase/migrations`.

The production procedure classifies schema/history state per version and prohibits marking the baseline applied without an object-level equivalence proof. It requires a new forward migration for missing schema and explicitly prohibits production reset.

## 6. Environment variables

No environment file or variable was added or changed.

The live RLS suite requires:

- `RUN_LIVE_RLS_TESTS=1`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` containing an `sb_secret_...` value
- `RLS_TEST_ATHLETE_A_JWT`
- `RLS_TEST_ATHLETE_B_JWT`
- `RLS_TEST_NON_ADMIN_JWT`
- `RLS_TEST_PLATFORM_ADMIN_JWT`

JWTs must be obtained from dedicated test identities through normal authentication. Skipped tests are not evidence for a role.

## 7. Permission changes

No database permission changed. Application code now enforces a build-time server/client boundary around the RLS-bypassing client via `import "server-only"`.

Read-only staging verification established:

- the configured server key has the `sb_secret_` prefix;
- a non-browser secret-key OpenAPI request returns HTTP 200;
- presenting that key with browser request metadata returns HTTP 401 with the expected forbidden-secret response;
- protected rate-limit and dashboard RPC definitions are present in staging.

The broad grants present in the production baseline remain subject to the privilege and RLS audit required by the promotion runbook; this agent did not rewrite an exported production baseline.

## 8. Tests run

- `node --check scripts/validate-supabase-foundation.mjs` — PASS after the Windows launcher correction.
- `npm test -- tests/database/migration-reproducibility.test.ts tests/database/beta-foundation-migration.test.ts tests/database/beta-rls-live.test.ts tests/supabase/service-client.test.ts` — PASS for 17 tests; 12 live RLS tests explicitly SKIPPED because role JWT fixtures were not supplied.
- `npx tsc --noEmit` — PASS, zero diagnostics.
- `npx eslint lib/supabase/service.ts tests/supabase/service-client.test.ts tests/database/beta-rls-live.test.ts tests/database/beta-foundation-migration.test.ts tests/database/migration-reproducibility.test.ts scripts/validate-supabase-foundation.mjs --no-error-on-unmatched-pattern` — PASS, zero output.
- `npx supabase gen types typescript --project-id <staging> --schema public` — BLOCKED twice by `LegacyGenTypesNetworkError: TransportError`; no generated file was accepted or committed.
- Staging OpenAPI comparison using a non-browser protected request — PASS; analytics/beta columns and both RPC paths match checked-in contracts.
- `node scripts/validate-supabase-foundation.mjs` — BLOCKED before migration execution because Docker Desktop is unable to start. The corrected script reaches pinned Supabase CLI `2.114.0` and reports `LegacyDockerLifecycleInspectError`.

## 9. Manual verification

- Confirmed the dedicated branch starts at the requested immutable SHA.
- Confirmed `supabase/.temp/project-ref` identifies staging, while stale `linked-project.json` metadata names a different production project. No `--linked` remote command was used.
- Compared staging OpenAPI columns for `analytics_events`, `analytics_rate_limit_buckets`, `beta_participants`, `athlete_feedback`, `athlete_insights`, and `athlete_baseline_snapshots` with `types/database.ts`.
- Confirmed `consume_analytics_rate_limit` and `get_beta_intelligence_dashboard` are present in staging OpenAPI.
- Confirmed the privileged client uses `@supabase/supabase-js`, never the browser SSR factory, disables session persistence/refresh, and is now guarded by `server-only`.
- Confirmed the isolated validator copies only canonical config/migrations to a unique temporary workspace, changes the local project identity and database ports, never uses `--linked`, disables seed data during reset, stops without backup, and removes the temporary directory.

## 10. Known limitations

- The isolated blank reset and `db lint` did not execute because Docker Desktop cannot start and `com.docker.service` cannot be opened in this environment. This remains a release blocker until CI or a working Docker host runs the validator successfully.
- Live RLS role checks were not executed. Twelve tests were skipped, and no JWT was invented.
- CLI type generation could not reach the staging type endpoint. The OpenAPI verification covers table/RPC shape but is not a replacement for a successfully generated full TypeScript snapshot.
- The current dirty dependency installation warns that Node 20 is deprecated and fails to construct the upgraded Supabase client because native WebSocket support requires Node 22. Those package changes pre-date and are excluded from this commit; dependency/runtime alignment must be resolved by their owner.
- The CLI `.temp` metadata is internally inconsistent. Future remote work must re-establish and independently verify a single staging target before using `--linked`.
- The exported baseline contains broad historical grants. Production promotion requires the documented least-privilege/RLS review before history reconciliation.

## 11. Deferred work

1. Run `node scripts/validate-supabase-foundation.mjs` on a CI runner or workstation with functioning Docker; require reset and lint to pass.
2. Resolve the Node/Supabase dependency-runtime mismatch in the separate package-change stream, then rerun the server-client live read.
3. Restore staging CLI type-generation connectivity, generate a full schema snapshot, and review its diff against application-facing types.
4. Provision dedicated staging identities and execute every live RLS role test with `RUN_LIVE_RLS_TESTS=1`.
5. Audit baseline grants, public `SECURITY DEFINER` functions, Data API exposure, RLS policy targeting, and missing foreign-key indexes before production reconciliation.
6. Perform the production evidence/reconciliation procedure under a separate explicit approval. Stop before repair or push until schema equivalence, backups, immutable commit, staging QA, and exact dry-run output are signed off.
