# One-click private preview Locker build

## Objective and authorization
Implement the audited Build & search all workflow using the user's explicit choice: automatically save private draft progress so saved-identity News, Merchandise and Combine discovery can follow the main builder scraper. Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md and preview-locker-one-click-scraper-audit-2026-10-26.md.

Included: one coordinator, additive merge and private save, concurrent search workers, bounded provider calls, task status, cancellation, unfinished-search retry, existing review UI, preservation regression tests and local browser QA. Excluded: production deployment, live paid searches, automatic invite publication/approval, CSV uploads, enabling the unavailable Sportradar subscription, Pro Day, durable pending Combine review and background jobs after the editor closes.

## Final behavior
1. Build & search all appears above the existing editing tabs for any athlete with a valid name.
2. Main preview discovery overlaps three source workers, preserving the registry's stable result priority for synthesis. Existing onboarding callers keep their prior sequential default.
3. Existing data wins through mergeSuggestions. Already-published legacy article cards are retained as draft article entries before saving, preserving their existing edits/hide choices. A capacity failure stops before a provider call rather than dropping published articles.
4. Save one validated private content snapshot using the existing create/PATCH path and compare-and-set revision. The new deferEnrichment control avoids an implicit news discovery during this save. It is never stored in Locker content. Existing callers retain automatic enrichment by default. No enrollment payload is added by the coordinator; existing create/referral rules still apply.
5. The new saved-snapshot build-search endpoint runs Awards + News, Merchandise and Combine concurrently. Awards and news use one shared enrichment operation, avoiding competing writes to the same enrichment row. Every child retains its existing admission, source, revision and persistence protections.
6. One request-scoped limiter admits up to four provider searches at a time across the child workers, including queued calls from each worker's existing internal batching. Existing discovery quotas/cooldowns are unchanged and each search type is still accounted for separately.
7. News and merchandise suggestions are saved in their separate review queues, with the established merge/dedupe/dismissal rules. Combine evidence populates the existing Stats review controls. No new article, product or measurement is automatically added to the Locker. Existing measurements, including zero-valued results, remain protected.
8. Task rows distinguish completed, partial, failed and cancelled work. Retry unfinished searches requests only selected unfinished secondary groups without another biography scrape or private save. Awards and news are one retry group. The independent existing tab controls remain available.
9. Cancel stops pending work. An admitted private save is allowed to finish, and its revision acknowledgement is retained before remaining searches stop. Request signals propagate to the secondary workers and queued provider work. The main executor stops scheduling further sources; already-running legacy source adapters may finish their own bounded fetches.
10. The UI explicitly states that existing invite links/viewers can see saved updates. Automatic private saving is not described as invisible to existing recipients. Manual review remains available after the run, with no editor reload.

## Completion report
1. Summary: implemented and locally validated the complete authorized one-click workflow. Work is isolated on codex/preview-build-all-2026-10-26, based on 06c8c3fef06160e3277dd918c3527b9b6d232f8b. Unrelated primary-workspace changes were left untouched.
2. Files changed: listed below. Existing transport/worker logic was extracted for reuse by standalone and coordinated endpoints; no parallel scraper adapters or backend were introduced.
3. Routes changed: added POST /api/preview-lockers/[id]/build-search. Extended existing POST /api/preview-lockers and PATCH /api/preview-lockers/[id] with an optional deferEnrichment boolean; legacy defaults preserved. Existing discovery endpoint now opts into three source workers. Existing combine/merchandise endpoints delegate to shared workers. Builder behavior changes apply to /admin/preview-lockers/new and /admin/preview-lockers/[id]/edit. No public Locker layout changes.
4. Database changes: none. Reused existing preview tables, audit-producing admission/enrichment/queue functions, source references and content fields. No production rows queried or mutated during implementation/QA. Automatic saving at runtime uses the existing authorized preview APIs.
5. Migrations/generated database types: none required or added.
6. Environment variables/dependencies: unchanged. Existing TAVILY_API_KEY configuration remains required for web search. Local validation used the installed Node system CA support through NODE_OPTIONS=--use-system-ca to resolve the existing Google Fonts certificate failure; certificate verification stayed enabled, and no deployment or application environment configuration changed. Secrets and local environment files were ignored and not staged.
7. Permission changes: none. New endpoint validates internal Admin access, same-origin JSON, UUID, saved revision and a bounded unique task list before work. Caller-supplied identities/URLs are rejected. Source policies, queue capacity/deduplication and measurement review remain. End-of-run revision validation prevents applying another editor's results. The coordinator preserves content instead of forcing a reload on conflict.
8. Tests run: final suite 235 files / 1,887 tests passed; 2 files / 24 skips. Lint zero errors / 297 warnings. Production build and TypeScript passed. The initial build failed to verify the Google Fonts certificate; retry with system certificate authorities passed. git diff --check passed. New regressions cover source overlap and stable priority, aggregate search limit and queued cancellation, server authorization/stale responses/parallel tasks/failure isolation, deferred create/PATCH saves, additive save ordering, real NFL/college imports, upload paths/image overrides/author edits, saved revision propagation, measurement review and zero-value preservation, legacy published articles and capacity failure, selected-only retry and cancellation during a save. Existing review/merge/preservation tests also pass. Local validation logs remain in the ignored output directory.
9. Manual verification: used a local instance of the actual PreviewLockerForm with simulated source/save/search responses and synthetic athlete data. One click completed all stages. Confirmed article review is enabled in Media; the existing bench measurement is locked and a missing 40-yard result is available for explicit review in Stats. At a 390x844 viewport, the run completed, task labels/messages wrapped, and body scroll width equaled client width (390px). Restored the normal browser viewport. A simulated merchandise failure retained completed news/Combine; Retry unfinished searches completed the merchandise task. A delayed main source could be cancelled and the editor became editable again. Screenshots in the primary workspace output/preview-build-all-desktop.png and output/preview-build-all-mobile.png were visually inspected. No production search credits, uploads or data writes were used.
10. Known limitations: not deployed. Pending Combine suggestions remain session-only as before; approved measurements must be added and saved for persistence. Request-owned runs do not survive closing the editor as resumable background jobs. Runtime quotas still apply to each child search, and provider/source availability can yield partial results. Source adapters already in flight may finish their bounded reads after cancellation, but no further source workers are scheduled. Actual production per-athlete duration was not benchmarked; concurrency is verified, not a promised percentage speedup. Legacy published article retention stops safely at the existing 40-edit capacity. Private auto-save follows existing draft/referral behavior and does not introduce a new enrollment workflow.
11. Deferred work: production deployment when requested. Durable pending Combine review, background resume, expanded quota policy and production speed benchmarking were outside this implementation; no requested implementation is deferred.

## React and architecture review
One run owns busy/pending state and the captured saved revision. The new task panel reuses the existing buttons, disclosure sections and wrapping styles. Combine review can be controlled by the parent while standalone use still works; selection validity derives from its review key instead of a synchronization effect. Provider state is scoped to one server request; no cross-user module cache is introduced. New route conventions and client behavior were checked against the locally installed Next.js 16.3.6 documentation. Existing authenticated Supabase update/filter/return patterns were preserved.

## Product direction
Strengthens accurate athlete-school/team, jersey, achievement, article, merchandise and testing-result relationships while preserving prior career reconstruction work. Those relationships remain useful across transfers and retirement. No new Moment or Value Graph entities or economic relationships are introduced. Existing source integrations are reused, and no DAM, editing, social-publishing or generic storage product is duplicated. There is no generalized media-management scope drift.

## Files
- app/admin/preview-lockers/CombineSearchReview.tsx
- app/admin/preview-lockers/PreviewLockerForm.tsx
- app/api/preview-lockers/[id]/combine/route.ts
- app/api/preview-lockers/[id]/merchandise/route.ts
- app/api/preview-lockers/[id]/route.ts
- app/api/preview-lockers/discovery/route.ts
- app/api/preview-lockers/route.ts
- lib/pipeline/run.ts
- lib/player/combine-review.ts
- lib/preview-lockers/enrichment.ts
- lib/preview-lockers/stream-client.ts
- tests/preview-lockers/api.test.ts
- tests/preview-lockers/enrichment-api.test.ts
- app/admin/preview-lockers/BuildAllPanel.tsx
- app/api/preview-lockers/[id]/build-search/route.ts
- docs/planning/preview-locker-one-click-scraper-audit-2026-10-26.md
- lib/enrichment/search-limiter.ts
- lib/preview-lockers/build-client.ts
- lib/preview-lockers/search-server.ts
- tests/pipeline/preview-concurrency.test.ts
- tests/preview-lockers/build-all-form.test.tsx
- tests/preview-lockers/build-client.test.ts
- tests/preview-lockers/build-search-api.test.ts
- tests/preview-lockers/search-limiter.test.ts
- docs/planning/preview-locker-build-all-completion-2026-10-26.md
