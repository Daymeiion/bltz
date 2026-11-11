# Preview enrichment stabilization — September 29, 2026

Latest follow-up: [Tavily connection validation](#tavily-connection-validation--september-29-2026). The original local-only report below predates [the completed staging/browser pass](preview-enrichment-staging-verification.md); its original deployment boundary is historical.

## Outcome and release boundary

Local stabilization is complete. No commit, push, deployment, hosted migration, production read/write, or staging mutation was performed. The draft migration remains unapplied outside isolated PGlite verification. Staging execution requires the user's authorization. The full suite remains red on seven demonstrably pre-existing authentication conflicts; release approval must not treat this as a green suite.

The Product Doctrine file is absent in this checkout. The supplied AGENTS.md governs this bounded private-preview exception; no future-phase graph schemas were added.

## Behavior

- Publisher metadata must contain the athlete's full name (or explicit alias) and a saved school/team affiliation. Same name plus football, position, or league is insufficient. This is candidate relevance, not identity verification.
- `p_articles = NULL` preserves the previous matching active articles after unavailable or skipped discovery. A successful discovery supplies an array, including `[]`. The save transaction retires the old active set and inserts the new deduplicated set. Partial publisher-metadata discovery with usable articles also replaces the set and retains its partial status. After the Tavily follow-up below, any failed search query or expired overall time budget preserves the prior set instead of replacing it with incomplete results.
- Inactive rows remain as history. Partial unique indexes enforce canonical URL and normalized headline uniqueness among active rows. Retirement counts and attempt diagnostics are audited in the same transaction. Invalid items roll back the entire transaction.
- Preview awards carry `evidenceStatus: unverified` through the mapper and enrichment reader. Cards say “Unverified evidence”; empty previews say “No award evidence.” The UI forces private-preview evidence to remain unverified even if a caller supplies a verified flag. Catalog normalization, approved trophy imagery, and canonical-player linkage do not verify an achievement. No canonical achievement is inserted or approved.
- The saved report describes the latest attempt. Its database-managed `last_news_success` preserves the prior usable discovery and counts on failure/skip, clears across identity changes, and advances on a successful empty result. Refresh responses return the persisted report. The panel labels attempts and prior success separately and exposes failures.
- Preview revision checks and row locking remain. Strict start-time ordering rejects older or equal-timestamp conflicting writes. A fingerprint-identical equal-timestamp replay returns the saved report without another write/audit entry. Null/nonfinite/future timestamps, malformed identity keys, unsafe URL schemes, credentials in URLs, oversized metadata/text and malformed item fields are rejected. Existing foreign-key, numeric-range, count, and size limits remain.
- Locker reads query only persisted, accepted, current-revision results. They do not invoke discovery providers or write RPCs.

## Files changed in this stabilization

Runtime:

- `lib/enrichment/news.ts`
- `lib/preview-lockers/enrichment.ts`
- `lib/preview-lockers/mapper.ts`
- `lib/preview-lockers/types.ts`
- `app/player/[slug]/LockerView.tsx`
- `app/admin/preview-lockers/EnrichmentPanel.tsx`

Database and validation:

- `supabase/migrations/20260929205021_preview_awards_news_enrichment.sql` (existing uncommitted draft)
- `types/enrichment.generated.ts` (regenerated from isolated applied SQL)
- `scripts/verify-preview-enrichment.mjs`
- `tests/preview-lockers/enrichment.test.ts`
- `tests/preview-lockers/enrichment-ui.test.tsx`
- `tests/preview-lockers/enrichment-persistence.test.ts` (new)
- `tests/player/public-video.test.ts`
- `tests/preview-lockers/media-stats.regression-1.test.tsx`
- `tests/preview-lockers/video-source.test.tsx`
- This report and the link in `preview-awards-news-enrichment.md`.

Existing unrelated edits in these shared files were preserved. No whole-file replacement from another branch, staging, or commit was performed.

## Routes, schema, environment and permissions

No new route in this stabilization. Existing private Locker `/preview-lockers/[slug]`, admin editor `/admin/preview-lockers/[id]/edit`, and create/update/refresh APIs consume the corrected behavior. The shared public Locker component has neutral award empty-state wording; verified styling requires explicit status.

The draft migration now adds inactive article status, active-only deduplication indexes, a request fingerprint on `preview_enrichments`, validated transactional replacement, and a JSON report return value from `save_preview_enrichment`. The already-planned tables and canonical award links remain otherwise scoped as before. Generated types match the local migration. If this draft has been applied to any other environment, reconcile its migration history and use a new forward migration before deploying; do not edit an applied remote migration in place.

No environment variables, dependencies, authentication roles, RLS grants, storage buckets, or service-role boundaries changed. The save RPC remains authenticated-internal-admin-only, with an explicit `auth.uid()` check and fixed empty search path. Anonymous access and ordinary-user writes remain denied. Article reads additionally filter current revision even for admin page reads.

## Validation results

| Check | Result |
| --- | --- |
| Focused enrichment and three corrected baseline files | 57 tests passed in 8 files |
| `node scripts/verify-preview-enrichment.mjs --generate-types` | Passed: SQL apply, grants/RLS under fixture policy, admin/assigned/unassigned/expired/anonymous access, dedupe, FK behavior, audit, rollback, unsafe fields, empty/reduced replacement, failure/skip preservation, revision carry-forward, identity diagnostics reset, old/equal timestamp rejection and exact retry |
| `npx tsc --noEmit --incremental false` | Passed |
| `npm run lint` | Passed: 0 errors, 211 existing warnings |
| `npm run build` | Passed; existing CSS parsing warnings remain |
| Initial `npm test` | 828 passed, 10 failed, 24 skipped |
| Final `npm test` | 840 passed, 7 failed, 24 skipped across 128 files |

Ignored machine-readable baseline/final results are in `output/enrichment-baseline.json` and `output/enrichment-final.json`; companion logs and SQL/lint/type/build logs use `output/enrichment-*` names. UI regressions exercise real components in Happy DOM: award labels, empty states, failed diagnostics, original-publisher navigation, and image fallback. Orchestration tests prove a persisted read calls neither the search adapter nor save RPC. React review found no new effect-driven fetching, hook-order changes, or client runtime imports of server credentials.

Manual verification limits: no new real-browser/mobile session, live publisher request, hosted Supabase/PostgREST test, or logged-in staging check was performed in this stabilization. PGlite reconstructs relevant baseline tables and a representative preview RLS policy, not the complete deployed Supabase service. Prior implementation browser-fixture results are historical, not evidence of this revision's staging behavior.

## Full-suite investigation

The ten failures were reproduced **before editing**. Three stale expectations were corrected without changing product runtime:

1. Mock-video category test required high-school/off-field footage absent from `MOCK_VIDEOS`. The test now asserts its supplied college/pro categories; the separate category-classification test still covers all four levels.
2. YouTube preview test expected removed “Watch on YouTube” copy. It now verifies the exact original destination and current “Open source · rights unverified” fallback.
3. School/stat regression expected the full school name in compact pills. It now verifies the full name survives in `data.school`, the intended abbreviated branding renders, and the original sourced-stat assertions still pass.

Seven failures remain, in files byte-identical to committed HEAD `6b74fb6` and present in the initial baseline:

- Six cases in `tests/auth/admin-session-rejection.test.ts`: rejected login is expected to sign out locally and expire prior/staged cookies. `app/api/admin/login/route.ts` returns a redirect without those operations, while `tests/auth/admin-login-route.test.ts` explicitly expects **no** Set-Cookie on rejection. The two test contracts conflict. The documented release candidate in `docs/gtm/ADMIN-AUTH-RELEASE-CANDIDATE.md` favors session invalidation; reconciling that auth release work requires changing runtime and the contradictory tests together.
- One case in `tests/auth/recovery-form.test.tsx`: the form uses `/auth/update-password` directly while the test and release-candidate documentation require `/auth/callback?next=%2Fauth%2Fupdate-password`. The test also expects different fixed failure/success copy. This is a committed recovery implementation/release-contract mismatch.

Verified with `git diff --exit-code HEAD` for both runtime files, the auth cookie/redirect helpers, and the three relevant auth test files. No tests were disabled or skipped to hide failures. Auth reconciliation remains a release blocker; it is not asserted to be harmless merely because it predates this task.

## Staging verification checklist — subsequently executed

See [September 29 staging and browser verification](preview-enrichment-staging-verification.md) for actual results, fixes, environment boundaries, evidence, cleanup and remaining limitations. The checklist below is retained as the original plan; it is not a claim that every listed variant was exercised in the browser.

Use only an explicitly approved disposable/staging project and synthetic athlete identities. Record project ref, app commit/file manifest, migration checksum and prerequisite migration versions. Do not use the production project or real athlete data. Obtain user authorization before applying migrations, inserting fixtures, changing provider configuration or deploying to staging.

1. **Migration and API exposure.** Review the exact draft SQL and all prerequisite preview/identity/award migrations; apply through the approved migration workflow. Regenerate types against staging and compare the scoped output. Check PostgREST discovers the JSON-returning RPC after schema cache reload. Inspect `pg_policies`, `information_schema.role_table_grants`, `pg_indexes`, and `pg_proc.proconfig`. Check `has_function_privilege('anon', 'public.save_preview_enrichment(uuid,integer,text,timestamptz,jsonb,jsonb,jsonb)', 'EXECUTE') = false` and the corresponding authenticated privilege is true. This grant does not confer admin authorization.
2. **Role matrix via actual Data API and application sessions.** Anonymous callers cannot read evidence/articles/diagnostics or execute save. Authenticated unassigned viewers see no private evidence/articles; assigned, unexpired viewers see only current accepted rows and no diagnostics. Expire that viewer and retry with the existing token: private rows disappear. Ordinary viewers cannot write tables or execute save successfully. An internal admin can refresh and read diagnostics. Cross-origin refresh returns 403 before discovery. Service-role credentials remain server-only; never embed or print them in a browser fixture.
3. **Persistence and verification UI.** Save synthetic awards (mapped alias and unknown honor) and two deterministic matching news fixtures A/B. Reload and open another assigned session. Verify labels, URLs, publisher/date, absent-image fallback, and “Unverified evidence” on every preview award. Existing canonical award verification flags and total canonical achievement count stay unchanged. Confirm empty award text, keyboard focus, refresh loading/error feedback, and mobile widths 375/390px without horizontal overflow.
4. **Replacement and deduplication.** Refresh A/B → B: only B is visible through both the Locker and direct viewer Data API. Refresh B → `[]`: no articles visible and an honest news empty state. Inspect inactive rows with privileged SQL and audit retirement counts. Submit URL/headline duplicates and verify one active row per key. Retry the exact save payload/timestamp: no duplicate rows/audit event. Do not rely on live search to deterministically produce these sets; use fixture payloads through the same admin RPC in the approved staging test harness.
5. **Failure/skip preservation and diagnostics.** Starting with A/B, simulate provider failure, missing provider config, rate-limit rejection and skipped discovery on a new content revision. Each save uses SQL NULL articles, preserves the matching active set, and carries its revision forward. The latest attempt exposes its status/error while prior success counts/time remain intact. Successful empty discovery replaces prior success with zero. Change identity and fail: old-identity success diagnostics must not appear as the new athlete's result.
6. **Validation, rollback and races.** Submit invalid schemes, URL credentials, oversized metadata/publisher/award label, malformed fields, out-of-range confidence, unknown FK, null/future start time, and stale preview revision. Verify no partial retirement, evidence update or audit survives rejection. Race newer/older start times using separate connections in both completion orders; older final saves reject. Race equal timestamps with different payloads: one succeeds and the other rejects; identical payload retries are idempotent. Concurrent revision edit causes stale save rejection.
7. **No provider calls on reads.** Instrument the staging search adapter with a request counter/log sink and outgoing-network capture. Record count after one authorized refresh. Reload Locker, open a second viewer, navigate private rooms and request the read routes again: the count must remain unchanged, with only persisted database reads. Verify this while search credentials are absent/unavailable too. Confirm no API keys or private diagnostic records appear in browser requests/HTML.
8. **Audit and evidence receipt.** Record sanitized role-matrix results, active/inactive counts, rejected race results, report JSON, provider-count before/after, desktop/mobile screenshots and exact tested migration/app versions. Preserve audit/history rows. Do not promote or mutate production until these checks and auth release blockers have been reviewed.

## Product direction and deferred work

Strengthened Career Graph relationships: athlete identity → saved affiliation → relevant publisher coverage; athlete/preview → award reference → explicitly unverified evidence. These are persistent career-recovery relationships and remain useful after departure from a school/team. Moment and Value Graph relationships are unchanged. No rights, contribution, revenue entitlement or payment inference was added. No mature media-management workflow was rebuilt and no DAM scope was introduced.

Deferred: authorized staging execution, live-provider quality sampling, real-browser/mobile verification, the seven auth failures, and any commit/release approval. Strict timestamp ordering protects persisted results but still relies on application-server clocks; an equal-millisecond distinct request may need a retry, and a server-issued admission sequence remains a possible later improvement. Matching affiliation in metadata reduces false positives but does not conclusively verify identity or awards.

## Tavily connection validation — September 29, 2026

### Outcome and environment boundary

Completed the existing Tavily integration incrementally in the current dirty checkout. The server-only local key was present and one isolated development search succeeded: **one request, HTTP 200, one result**. It used the current wrapper, a public athlete query restricted to `calbears.com`, basic search, and a one-result limit. It did not call the application or any database, persist publisher bodies, or print credentials. No other live Tavily request was made. Automated tests mock all Tavily responses.

No deployment, push, commit, remote environment change, or production/staging database mutation occurred in this follow-up. The earlier staging changes are described separately in the staging report. Local key presence was checked without printing it; no public-prefixed Tavily variable was found. `.env.staging.local` has no Tavily key. The Vercel project link names `bltz`; remote environment values/presence were not inspected or changed.

### Implementation and contract

- The wrapper now enforces `server-only`, rejects missing/blank keys without networking, and sends Bearer authentication only to the fixed HTTPS search endpoint. Redirects are rejected and caching is disabled.
- Search explicitly uses `basic`, `general` and `auto_parameters=false`, with raw content, answers and images disabled. This keeps historical-career discovery available and prevents automatic depth escalation. Query length, result count/field lengths and response bytes are bounded; requests time out after five seconds. No automatic billable retries were added.
- The adapter passes only URLs into discovery, dropping provider ranking scores and snippets. The existing SSRF-safe fetcher and athlete-name plus saved-affiliation check remain intact. Only extracted publisher metadata crosses the persistence boundary; relevance is not verified identity, attribution, rights or award evidence.
- Malformed JSON/result sets are failures, not successful empty discovery. Safe codes distinguish missing config, 401/403, 429, quota statuses 432/433, invalid requests/responses, interruption, timeout and temporary provider failure. Provider bodies and transport messages never enter diagnostics or logs.
- Any failed query stops discovery and preserves the entire previous article set, including when a prior query succeeded. Overall discovery timeout also preserves the prior set. A successful empty search still retires prior articles. Publisher-level metadata failures retain the existing partial-result policy.
- The admin panel adds plain-language explanations alongside diagnostic codes and preserved last-success counts.

Validated against the [official Tavily Search contract](https://docs.tavily.com/documentation/api-reference/endpoint/search), the installed Next.js 16.3.1 environment/server-component guides, and [Vercel environment-variable documentation](https://vercel.com/docs/environment-variables). No SDK or dependency was needed.

### Exact application files changed in this follow-up

1. `.env.example` — new secret-free template, including optional `TAVILY_API_KEY`.
2. `lib/search/tavily.ts` — server boundary, bounded request/response handling and safe provider failures.
3. `lib/search/errors.ts` — typed safe diagnostic codes and human-readable messages.
4. `lib/enrichment/search-provider.ts` — blank-key handling and URL-only projection.
5. `lib/enrichment/news.ts` — preserve saved news on incomplete provider discovery or total timeout.
6. `app/admin/preview-lockers/EnrichmentPanel.tsx` — explanatory status text.
7. `tests/preview-lockers/tavily.test.ts` — mocked request contract, success/empty/malformed results, missing key, status codes, timeout/abort and output bounds.
8. `tests/preview-lockers/tavily-workflow.test.ts` — real create-route/enrichment/provider flow with mocked database boundary and publisher transport; base-save survival, retained prior articles, mixed-query failure, metadata-only success, empty replacement and namesake rejection.
9. `tests/preview-lockers/enrichment-ui.test.tsx` — meaningful provider status messages with retained success diagnostics.
10. `docs/SETUP.md` — current local/Vercel instructions; marks obsolete awards-kit setup as archival.
11. This report.

Temporary scripts, logs and sanitized live-check receipt are ignored under `output/tavily-validation/`. `.env.example` is eligible for version control; no commit was made. Existing unrelated files and prior stabilization changes were preserved.

### Routes, schema, environment and permissions

No new route. Existing preview create/update/refresh paths consume the corrected adapter; the admin editor displays its status. Public/private Locker reads remain persisted-data reads with no provider call.

No schema, migration, generated database type, role, grant, RLS or authorization changes. Existing create-first/enrich-second behavior remains. `TAVILY_API_KEY` is the only provider variable, already used by the integration; the new template documents it. No `NEXT_PUBLIC_` secret or client-accessible provider credential is introduced.

### Validation and manual checks

| Check | Result |
| --- | --- |
| Focused provider/enrichment/API/UI/SSRF tests | 106 passed across 7 files |
| Full Vitest suite | 896 passed, 7 failed, 24 skipped across 130 files |
| TypeScript `--noEmit --incremental false` | Passed |
| ESLint | 0 errors, 211 existing warnings |
| One isolated live development request | HTTP 200, 1 result; no database access |
| Isolated Next.js production build (`--webpack`) | Passed |
| Client build inspection | 211 files checked; no Tavily credential or server request implementation |

The seven full-suite failures are still six admin-session-rejection cases and one recovery-form case documented above; this follow-up did not change their implementation or expectations. They remain release blockers. Detailed logs are `output/tavily-validation/focused.log`, `full-tests.log`, `types.log` and `lint.log`; the sanitized live result is `live-result.json`.

The production build passed from an isolated source snapshot with placeholder Supabase values and no provider/database credentials. The initial attempt hit a Windows temporary-cache permission error; its successful retry used a workspace-owned temporary directory. Inspection of 211 client build files found neither the local Tavily credential nor the server-side Tavily endpoint/environment access. Build output is `output/tavily-validation/build-final.log`; sanitized file hashes and bundle results are in `final-manifest.json`.

No new authenticated browser session or remote database smoke test was run in this follow-up. Admin status rendering is covered by actual component tests; the earlier Chromium desktop/mobile findings remain in the separate staging report. The one live call verifies authentication/request/response compatibility, not broad athlete relevance or end-to-end publisher reachability.

### External rollout and deferred work

Local configuration is ready. To activate a hosted Preview deployment, ensure **TAVILY_API_KEY** is set for the linked `bltz` project's intended **Preview** environment/branch, then redeploy that Preview deployment. Exact dashboard/CLI steps and the post-deploy admin check are in `docs/SETUP.md`. Remote key presence and deployment have not been verified; no remote action was taken. Production configuration/deployment, changes to remote databases, and committing changes remain outside this follow-up's authorization.

Deferred: hosted configuration/deployment and authenticated post-deploy verification; broad live-provider quality sampling; the seven existing auth failures. Career identity → saved affiliation → publisher coverage is strengthened and remains useful after an athlete leaves an organization. No Moment or Value Graph relationship, canonical identity, economic entitlement, media-management workflow, or rights claim was added.
