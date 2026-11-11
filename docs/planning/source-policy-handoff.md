# Source-policy architecture handoff — 2026-09-29

**Status: user-authorized production deployment completed on 2026-09-30; bltz.me is READY on dpl_8zxWQjsmp3aGTxGQrY9o1GHK3gKN. Both award/news migrations are applied.**

Current production report: [Production deployment](production-deployment-2026-09-30.md). The staging-only statements below describe earlier history.

Staging completion report: [Discovery, aliases, hero and responsive verification](staging-verification-2026-09-30.md). Earlier evidence: [Approved staging verification](staging-verification-2026-09-29.md). All eight earlier test failures are resolved. Production now runs the verified release.

Workspace: `C:/Users/Administrator/.codex/worktrees/preview-news-release/bltz`.
Local branch: `codex/preview-source-policy`, based on deployed commit `f6e8e85bc1b26a724d638ff8d34e13c6c4987fe8`.
The prior enrichment release changes remain in this worktree. The approved follow-up fixed the admin rejection cleanup and stale tests, applied three existing staging preview prerequisites, and deployed staging-only previews. Production remains unchanged. No commit or push has been made. See the staging verification addendum for current release evidence.

## 1. Existing architecture discovered

The initial inspection is in [source-policy-inspection.md](source-policy-inspection.md). The actual stack is Next.js 16.3.1 App Router, TypeScript, existing Supabase server/service clients, authenticated Preview APIs, and Vercel. Existing JSON metadata/report columns can carry provenance without a schema change.

Initial identity discovery and saved-preview news are separate stages. The scraper registry runs cached nflverse and CFBD roster lookups, Wikipedia search/summary/article HTML, ESPN search/profile JSON, and YouTube result-page link extraction. Synthesis merges those suggestions. No browser scraper runs in this flow. Subsequent news discovery uses Tavily Search and direct bounded metadata fetching, not Tavily Extract or Crawl.

**Inspection addendum:** a manual college CSV importer also accepted Sports Reference tables. It is a storage path, despite making no source network requests. The initial automated-scraper audit alone would have missed this. New imports through that path are now restricted too; existing saved tables are retained.

## 2. Main initial scrape/search entry point

`POST /api/preview-lockers/discovery` → `executePipeline` → scraper registry → shared guarded transport → normalized results → policy-checked synthesis → reviewable draft. Onboarding uses the same runner. Initial discovery has no preview UUID yet; its audit uses the existing discovery admission ID. Base preview creation then supplies `preview_id` to persisted award/news enrichment.

## 3. SourcePolicy integration

`lib/source-policy/policy.ts` is the typed policy service, version `2026-09-29.1`. It distinguishes source type, discovery, metadata/fact extraction, reference use, metadata/fact persistence, crawling, bulk ingestion, remote asset reference and asset download. Decisions include allowed/blocked actions, attribution, policy ID/version, review status, reason, update date and a separate technical rate-limit slot.

External initial adapters now use `fetchSourceFacts`. It evaluates permissions before HTTP and disallows automatic redirects and persistent fetch caches. Unknown sites cannot use that raw-response interface. The legacy `fetchHtml` helper is also guarded. Roster-cache reads are checked against their upstream policy before lookup; existing cached history is not reimported or deleted.

News HTML transport is private. The public `fetchArticleMetadata` boundary checks each URL before DNS/HTTP, including every redirect, retains DNS pinning/body/time bounds, and exposes only the metadata projection. The parser and persistence orchestration recheck policy, including canonical URLs. The initial runner also checks source results before synthesis/persistence. Exported Wikipedia award extraction is gated.

`canSaveStatsImports` checks new CSV storage on both create and update. A restricted historical table may be retained unchanged during other edits or explicitly removed; it cannot be expanded or replaced with new restricted data. Normal CSV parsing remains available for configured provider sources. This is application pipeline enforcement, not a new database-wide source-policy trigger.

## 4. Tavily flow

Tavily remains search-only. Domain hints are checked before search; each valid result receives a policy decision before leaving the adapter. News independently reevaluates candidate URLs, so a mocked/new provider cannot confer permission. Reference-only sources can appear in discovery but never reach news extraction. Provider snippets/scores are not used as athlete identity evidence. Final relevance still requires name plus saved affiliation in publisher metadata.

## 5. Previous PFR / Sports Reference usage

PFR was a default Tavily discovery hint. The nflverse cache retains a `pfr_id` crosswalk, which is not a scraper. No automated PFR player/team/stat-page extractor or crawler was found. However, the separate college CSV flow explicitly accepted and stored Sports Reference player tables. Existing Locker data can therefore contain historical manually imported Sports Reference statistics.

## 6. Changed reference behavior

The six specified Sports Reference domains and their subdomains are one reference-only family. Discovery, citation/reference verification and limited reference metadata storage remain allowed. Automated metadata/fact extraction, crawling, bulk ingestion, new statistics-table storage and asset references/downloads are denied. There is no automated limited-page verification adapter in this release; VERIFY means reference use, not permission to fetch page contents. No proxies, rotation, robots bypasses or crawling were introduced.

New Sports Reference CSV imports are blocked during review and on server save. Existing records and crosswalk identifiers are preserved. Domain-family checks reject deceptive suffix matches.

## 7. Current primary stats sources

Structured NFL season stats remain the existing authenticated Sportradar integration, imported through its explicit admin review workflow. Stored ingestion JSON now records policy provenance; existing provider request logs preserve endpoints and timestamps. NFL identity/roster context comes from the nflverse cache; college identity/roster context from CFBD. Existing manual career totals and legacy college CSV records remain readable. New college CSVs require a configured source that permits fact storage, such as the existing CFBD provider; no new external API integration was added.

Live NCAA Sportradar requests remain disabled for the existing cohort. Missing data remains missing; PFR is not a replacement population source. Existing scheduled roster-cache synchronization was inspected but not redesigned or granted broader rights by this task.

## 8. News behavior

Unknown publishers default conservatively to bounded metadata extraction/storage, with review required for broader use. There is no giant publisher allowlist. News persists headline, publisher, canonical/source URLs, permitted remote thumbnail reference, author/date, short description and provenance. Full article bodies and fetched HTML do not leave the sanctioned network boundary. No publisher crawling or photo copying occurs.

Provider failure preserves prior matching articles. A completed discovery with only blocked/unrelated results can legitimately produce an empty accepted set; diagnostics distinguish policy rejection from provider failure. Base preview creation remains successful when optional enrichment fails.

## 9. Awards behavior

Wikipedia evidence retains raw award text and source URL through normalization. Stored metadata adds domain/type, provider/evidence origin, processing timestamp, attribution and policy ID/version/decision. Evidence remains unverified. Catalog matching confidence is not proof that an athlete won an award; provenance confidence remains unknown for admin-supplied evidence.

Trophy image selection still uses the existing `resolveMediaPermissions` catalog gate. Discovered page images never become catalog trophy assets. Existing same-award/year/edition deduplication remains; this task does not create a multi-evidence award graph.

## 10. Media/asset behavior

A page's extraction permission does not authorize asset download. Remote references are a distinct action; all current source policies deny automatic asset download. Discovered photo projection now retains its source page; pipeline provenance also records the asset URL. Blocked remote asset URLs become placeholders/null references. News images remain browser references, and explicit admin uploads remain the separate existing storage workflow. No new asset storage jobs were added.

## 11. Files and routes

The exact source-policy task files are listed in the appendix below. The complete worktree release manifest (including preceding enrichment work) is `output/news-release/manifest.json`; this task's subset is `output/news-release/source-policy-manifest.json`.

Existing routes changed: `/api/preview-lockers/discovery`, `/api/preview-lockers` and `/api/preview-lockers/[id]`. Existing admin builder/edit diagnostics consume the new decisions. No route was added for source policy. Locker page render paths remain persisted-data consumers.

## 12. Database, migrations, configuration and permissions

No new database table, migration, environment variable or RLS/role change was introduced for source policy. Existing `player_articles.metadata`, `preview_award_links.metadata`, `preview_enrichments.report`, stats ingestion JSON and pipeline event JSON carry provenance/diagnostics. Unsaved preview discovery emits one bounded structured source audit per adapter, keyed by the existing admission ID. Admin diagnostics show source counts/reasons, last attempt, accepted news, mapped/unmapped awards and safe provider failures.

The prepared release still contains the two pre-existing enrichment migrations, which production lacked at the prior hosted check. This task did not apply them. Tavily and Sportradar credentials remain server-only, and the local build used the existing placeholder environment.

Rate configuration is separate from permission. No verified source-specific numeric limit was supplied, so registry limits are null (unknown, not unlimited). Existing request budgets/cooldowns, timeouts and bounded batches remain active. Numeric limits must be verified before adding future source adapters or raising scope.

## 13. Original policy-pass tests (superseded by approved follow-up)

- Full Vitest run: **950 passed, 8 failed, 24 skipped**, 136 files.
- Focused source-policy, preview, pipeline and stats run: **388 passed, 1 failed**, 52 files; the failure is the pre-existing preview-list mock below.
- All **38 newly added policy/redirect/persistence/fail-soft tests pass**.
- TypeScript `tsc --noEmit`: pass.
- ESLint: **0 errors, 220 existing warnings**.
- Next production build (`--webpack`): pass, 93 static pages generated.
- Local PGlite enrichment SQL verification: pass, including actual award/article provenance JSON round-trip, rollback, idempotency, revision conflicts, failure preservation, audit creation, image constraints and admin/viewer/stranger/anonymous/expired access.
- `git diff --check`: pass (Windows line-ending notices only).
- One read-only live ESPN historical profile request over HTTPS: HTTP 200, Joe Ayoob/QB. This supports upgrading the old HTTP URL. No live Tavily spend or remote database writes were used for this correction.

Logs: `output/news-release/source-{full-final,focused-final,types-final,lint-final,build,sql-final}.log`.

## 14. Original regression results (resolved in approved follow-up)

No newly introduced test failures remain. The eight failures match the pre-task release baseline:

- Six `tests/auth/admin-session-rejection.test.ts` cases expect a different sign-out/cookie contract than the committed route.
- One `tests/auth/recovery-form.test.tsx` case expects callback-mediated recovery rather than the current direct update-password URL.
- One `tests/preview-lockers/list.test.tsx` case lacks `.in()` support for the already-deployed short-link query.

Those production contracts/tests were not changed merely to turn the suite green. Existing preview authorization, failure, news, award, stored rendering, college statistics and pipeline tests were run. The historical college page fixture still uses a saved Sports Reference record and remains renderable. New server tests prove an unrelated bio edit preserves that record but changing its figures is rejected.

## 15. Original release risks and deferred work (deployment status superseded below)

The entire release is still local and includes the previously prepared enrichment changes. This policy correction has not been deployed to staging or production; deployed desktop/mobile behavior and live news retrieval on the corrected build are unverified. The eight baseline failures need resolution or explicit review disposition before release sign-off.

The registry is application policy, not proof of contractual permission. Existing ESPN/YouTube/CFBD/nflverse adapter access and Sportradar redistribution entitlements need owner review. Unknown metadata references remain conservative but do not assert image ownership. Existing historical material is not retroactively deleted. Direct privileged database writes and legacy scheduled cache sync jobs are outside the initial enrichment boundary and do not receive a new database policy engine in this task.

The authoritative doctrine file is absent from this checkout; supplied AGENTS product instructions were followed. No migrations were edited retroactively. Future admin-controlled policy configuration, distributed per-domain rate scheduling and licensed limited-page reference verification are deferred.

## 16. Founder decisions

Confirm provider entitlements for the retained bounded adapters and public presentation; decide retention/public exposure of historical Sports Reference imports; select an approved primary NCAA statistics source where coverage is missing. Any future permission for Sports Reference ingestion must explicitly update the registry and relevant tests after permission/licensing review. Technical request limits must not be treated as ingestion rights.

## 17. Original browser verification status (superseded by addendum)

The earlier live browser check established that production was still on the pre-enrichment deployment. This corrected source-policy code is not deployed, so an authenticated deployed Preview Locker verification of it is currently unavailable. No staging, mobile or production browser pass is claimed for this task. Component/API/SQL tests and the production build are local evidence only.

After approved deployment: create a preview from real identity discovery; verify source diagnostics and stored provenance; refresh news with configured Tavily; check known/unknown/reference-only results and safe failure; edit a historical college preview without changing its table; attempt a new restricted import; inspect phone and desktop layouts; reload the Locker and confirm no provider requests occur on render. This task does not authorize that deployment.

## 18. CTO readiness and product direction

The requested core integration is implemented and locally testable. Career Identity accuracy improves through source-attributed biography, awards, stats and article relationships. Source photo relationships are retained. This remains useful after an athlete leaves an organization. No Moment or Value Graph schema was added, no mature media workflow was duplicated, and there is no expansion into generalized media management.

At the original policy-pass boundary, formal handoff sign-off was blocked by eight failures and missing deployed verification. All eight test failures are now resolved; current deployment and browser results are recorded in the addendum. Founder source entitlement/legacy-publication decisions remain visible above. The implementation is available for inspection, but it is not represented as a fully verified release.

## Exact files changed by this correction

- `lib/source-policy/policy.ts`
- `lib/source-policy/fetch.ts`
- `lib/source-policy/results.ts`
- `lib/source-policy/preview-stats.ts`
- `lib/pipeline/fetch.ts`
- `lib/pipeline/run.ts`
- `lib/pipeline/types.ts`
- `lib/pipeline/claude.ts`
- `lib/pipeline/scrapers/wikipedia.ts`
- `lib/pipeline/scrapers/espn.ts`
- `lib/pipeline/scrapers/youtube.ts`
- `lib/pipeline/scrapers/nflverse.ts`
- `lib/pipeline/scrapers/cfbverse.ts`
- `lib/sportradar/client.ts`
- `lib/sportradar/service.ts`
- `lib/search/tavily.ts`
- `lib/enrichment/safe-fetch.ts`
- `lib/enrichment/article-metadata.ts`
- `lib/enrichment/news.ts`
- `lib/enrichment/awards.ts`
- `lib/preview-lockers/enrichment.ts`
- `lib/preview-lockers/discovery.ts`
- `lib/preview-lockers/stream-client.ts`
- `lib/preview-lockers/cfb-csv.ts`
- `app/admin/preview-lockers/EnrichmentPanel.tsx`
- `app/admin/preview-lockers/CfbCsvImport.tsx`
- `app/api/preview-lockers/discovery/route.ts`
- `app/api/preview-lockers/route.ts`
- `app/api/preview-lockers/[id]/route.ts`
- `tests/source-policy/policy.test.ts`
- `tests/source-policy/stats-persistence.test.ts`
- `tests/preview-lockers/enrichment-fetch.test.ts`
- `tests/preview-lockers/tavily-workflow.test.ts`
- `tests/preview-lockers/tavily.test.ts`
- `tests/preview-lockers/cfb-csv.test.ts`
- `tests/preview-lockers/cfb-page.test.tsx`
- `tests/preview-lockers/form.test.tsx`
- `scripts/verify-preview-enrichment.mjs`
- `docs/planning/source-policy-inspection.md`
- `docs/planning/source-policy-handoff.md`

**NOT READY FOR CTO COORDINATOR REVIEW**

## Approved staging verification addendum

See [staging-verification-2026-09-29.md](staging-verification-2026-09-29.md) for final deployment, 959 passing tests, live Tavily retrieval, browser evidence, temporary access cleanup and remaining limitations. Earlier sections labeled original retain the historical pre-approval findings and are superseded by this report for release status.

