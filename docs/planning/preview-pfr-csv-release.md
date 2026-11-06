# Preview Locker CSV production release — October 11, 2026

## Outcome and scope

The user approved the preview, then explicitly authorized applying the migration and deploying the CSV import. Manual Pro Football Reference NFL CSV imports are deployed to the Preview Locker builder. They strengthen sourced athlete → season → team statistics in the preview presentation. This supports persistent career recovery after retirement or departure from an organization. Moment and Value Graph relationships are unchanged; no media-management workflow or future-phase schema was introduced.

Product authority remains `docs/product/BLTZ_PRODUCT_DOCTRINE.md` and the bounded sprint workflow. Automated collection and a permanent provider replacement remain excluded.

The release starts from the exact previous production commit `4ec849a69f95c15da882cec9b8972619bbfdcca0`. Only CSV changes were overlaid, preserving the deployed builder folders and existing college importer. Unpublished source-policy, enrichment, intelligence, outreach and other workspace changes were excluded. The original implementation report describes the broader local workspace; this report describes the deployed version.

## Release identity

- Vercel project: `daymeiions-projects/bltz`, `prj_4XjBiHku6plWves1zXdbT8bXj3y6`.
- Code commit: `7a50949093127f7da3ca978f6e6769326f6fa960`.
- Branch: `codex/preview-pfr-csv-production-2026-10-11`, local isolated checkout in `output/pfr-csv-production-release`.
- Deployment: `dpl_9KY4Vr5QLZHinh5JWpZMeDkbAm7X`, https://bltz-glab6wco7-daymeiions-projects.vercel.app.
- Dashboard: https://vercel.com/daymeiions-projects/bltz/9KY4Vr5QLZHinh5JWpZMeDkbAm7X.
- Status: Ready, Production, Current; built remotely and promoted after staging checks.
- `bltz.me` and `bltz.vercel.app` independently resolve to this deployment. `bltz.me` and `www.bltz.me` returned HTTP 200.
- Existing root checkout/index and unrelated changes were preserved. No GitHub push, merge, or main-branch update was performed. Deployment metadata records the exact code commit and baseline.

## Files and routes

The deployed code commit changes these 20 files:

1. `app/admin/preview-lockers/PreviewLockerForm.tsx`
2. `app/admin/preview-lockers/StatsCsvImport.tsx`
3. `app/preview-lockers/[slug]/page.tsx`
4. `components/player/StructuredStats.tsx`
5. `lib/player/structured-stats-types.ts`
6. `lib/preview-lockers/cfb-csv.ts`
7. `lib/preview-lockers/mapper.ts`
8. `lib/preview-lockers/server.ts`
9. `lib/preview-lockers/validation.ts`
10. `lib/preview-lockers/pfr-csv.ts`
11. `lib/source-policy/preview-stats.ts`
12. `scripts/verify-preview-pfr-csv.mjs`
13. `supabase/migrations/20261011170240_preview_pfr_csv.sql`
14. `tests/database/preview-pfr-csv.test.ts`
15. `tests/preview-lockers/pfr-csv.test.ts`
16. `tests/preview-lockers/pfr-form.test.tsx`
17. `tests/preview-lockers/api.test.ts`
18. `tests/preview-lockers/cfb-page.test.tsx`
19. `types/preview-lockers.generated.ts`
20. `docs/planning/preview-pfr-csv-import.md`

This completion report and the rollout notice in the implementation report are documentation updates after deployment.

Existing routes extended: `/admin/preview-lockers/new`, `/admin/preview-lockers/[id]/edit`, `/preview-lockers/[slug]`, and validation/persistence through existing POST/PATCH `/api/preview-lockers` routes. No new endpoint, backend, dependency, or canonical player ingestion path. Raw CSV files stay local; reviewed parsed JSON is saved through the existing Admin workflow.

## Database and migration

Production Supabase project: `drxtzxnwdtgxwueiqygf` (BLTZ). The local CLI link pointed to a different staging project, so it was not used to select the migration target. The production project was verified explicitly in its authenticated dashboard.

Applied only `20261011170240_preview_pfr_csv.sql`, atomically with guarded preflight/postflight and its migration-history entry. LF-normalized migration SHA-256: `f840ecc36eda45fe8ec489959b7d251be5558d10b483b6645d8a675a41f89598`.

The additive change adds `public.preview_lockers.pfr_stats` JSONB, NOT NULL, default `[]`, with array/type, seven-table and 100 KB bounds. It extends the existing atomic preview creation/enrollment RPC and retry comparison. Existing authenticated column grants apply; there is no anonymous column read grant.

Verification confirmed migration history increased from 78 to 79 with every old entry unchanged, all three existing preview records retained unchanged values, RLS stayed enabled, original policies and audit/revision triggers stayed unchanged, and the RPC includes the new field. Independent postflight confirmed the live column, constraint, grants and RPC. No athlete CSV was imported into production during rollout.

Supabase CLI transport failures prevented hosted full type generation. The scoped types previously generated from the isolated PostgreSQL schema were compared with the hosted column's verified type, nullability and default. No migration-history repair or broad schema push was used. Sanitized postflight receipt: `output/pfr-production-postflight.json`.

## Environment and permissions

No application environment variable, billing plan, Node version setting, retention setting, role, RLS policy or public-access rule was changed. The importer retains existing server-side Admin authorization, revision conflict handling and audit creation. Source URLs and parsed nested data are server validated. CSV source URLs are linked for provenance and are not fetched automatically.

The deployment archive was checked to exclude environment files, Git state, local outputs/evidence, dependencies, build caches and private outreach/deliverables. Public system CA certificates were used for local TLS trust; certificate validation was not disabled.

## Validation and manual verification

- Release TypeScript check: passed (`tsc --noEmit --incremental false`).
- Release lint: passed, zero errors; 287 existing warnings.
- Focused seven-file suite: 30 passed before adding two further API persistence/auth cases; those cases also passed in the full suite.
- Full release suite: 1,167 passed, 24 skipped, one pre-existing failure in `tests/analytics/contracts.test.ts`. The coverage contract omits six already-emitted preview event names. The same mismatch was independently confirmed in the unchanged baseline.
- Isolated PostgreSQL tests exercise persistence, anonymous/unassigned denial, assigned read-only access, audit creation, revision conflicts, bounds and atomic create/retry.
- Local production build: passed using webpack because the isolated worktree shares dependencies through a junction outside its root. No framework configuration was changed.
- Vercel remote production build: passed using the project's normal Turbopack build, with inherited CSS and Node-version warnings.
- Whitespace check: passed.
- Staged HTTP checks: home 200, anonymous Admin builder 307 to sign-in, unauthenticated create API 401.
- Promoted HTTP checks: `bltz.me` and `www.bltz.me` home 200; anonymous new builder 307 to the Admin sign-in page.
- Browser: the reviewed localhost builder and synthetic importer harness verified mapping, review, confirmation, add-to-draft and responsive scrolling. The production builder correctly displayed the Admin sign-in screen because this browser has no production Admin session. No real athlete was edited to manufacture a smoke test.
- Vercel production error log query returned no entries for the past 24 hours before rollout and for the past hour after promotion. This describes available logs, not a guarantee about unobserved future requests.

Evidence and command logs are retained under ignored `output/`: `pfr-release-tests.log`, `pfr-release-build.log`, `pfr-production-postflight.json`, and screenshots in `pfr-csv-qa/`, including `production-release.png`, `production-migration.png`, and `vercel-storage.png`.

## Vercel error and storage investigation

The current successful deployment has four error markers in the dashboard's build-log index. The flagged messages are inherited CSS parsing warnings for unknown `@custom-variant` and `@theme` rules in `app/globals.css`. Neither file nor the PostCSS configuration was changed in this release. The build generated all 96 static pages and reached Ready. The Node 22 project setting is overridden by the existing package engine range, selecting Node 24; this is another existing warning. These findings do not establish the cause of an earlier failed build.

Notifications include an older 100% Deployment Storage warning (approximately 23 hours before inspection), a 75% warning dated October 4, and an October 5 failed preview deployment. The October 5 deployment `dpl_J7briFUz1FQVpxfLV51AdmRtSr4H` is no longer retained: inspection returned not found. Its exact failure cannot be recovered from available logs. The dashboard showed Deployment Retention enabled; the cause of the difference between the old warning and today's usage is not proven.

Current authenticated team usage, refreshed after deployment, for Last 30 Days (September 11–October 11):

| Metric | Reported usage | Included allowance | Used |
| --- | ---: | ---: | ---: |
| Deployment Storage | 606.48 MB | 10 GB | 6.06% |
| Functions Storage | 134.83 MB | 10 GB | 1.35% |
| Blob Storage | 0 B | 1 GB | 0% |

BLTZ project itself reported 601.28 MB Deployment Storage and 129.58 MB Functions Storage before the new deployment. Team limits apply across projects. Dashboard usage can be up to one hour old, so the new release may not yet be fully reflected. The successful deployment and promotion show there was no active quota block for this release.

[Vercel's Deployment Storage documentation](https://vercel.com/docs/deployment-storage) distinguishes deployment build outputs and function bundles from Blob object storage and explains GB-month measurement. These usage-period figures should not be treated as an exact instantaneous filesystem inventory. No deployments were deleted and no billing or retention setting was modified.

## Limitations and deferred work

The deployed bridge covers reviewed regular-season tables in seven supported NFL categories. Operators must check athlete identity, source page, mappings and coverage; incomplete imports produce available-season totals. Automated scraping, postseason/per-game ingestion, permanent provider replacement and canonical career-stat writes remain deferred. Existing deployed college behavior was preserved.

Authenticated production add/save/reload is ready for an approved Admin session; actual persistence and authorization are covered by automated API/database tests, not a live edit of an athlete record. A physical 390px device check remains unperformed; the earlier browser imposed a 520px minimum where internal table scrolling passed.

The unrelated analytics contract failure, inherited CSS warnings, dependency audit findings, Node-engine alignment, hosted full type generation and unrecoverable historical build logs are documented limitations/deferred work. Staging migration and main-branch reconciliation were not part of this production rollout.
