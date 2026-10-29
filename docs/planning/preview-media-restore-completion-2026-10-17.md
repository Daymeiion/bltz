# Dismissed Media restoration — production completion

## Summary

Implemented as `487968d`, followed by official database type regeneration in `d9874d098fb0bff5860790671aee47b433c3418d`, on branch `codex/restore-dismissed-media-2026-10-17` in `C:/Users/Administrator/bltz/output/preview-merchandise-search`. Both commits were fast-forwarded to remote main. That isolated working tree is clean. Unrelated root-checkout work was preserved.

Both Media sections have a collapsed dismissed list with title, publisher/retailer, source link and Restore to review. Restoration saves the review state immediately and never adds content to the Locker. Normal review and Save draft remain necessary to add a restored suggestion. Existing bulk and individual review controls remain available. Dismissed news is paginated server-side; merchandise archives are paginated client-side, 200 items per page.

**Deployed to production after explicit user approval: “Apply migration and deploy.”** Migration `20261017073440` is applied. Vercel deployment `dpl_87NUobiTS4fGrXSWzwLcujqvaihs` is READY with production aliases promoted, including https://bltz.me and https://bltz.vercel.app. It serves final commit `d9874d098fb0bff5860790671aee47b433c3418d`. The earlier automatic approval rejection was resolved by the user's explicit authorization before any production mutation.

## Files changed

Twenty-two files in the isolated checkout:

- UI: `app/admin/preview-lockers/DismissedReviewList.tsx` (new), `ArticlesSection.tsx`, `MerchandiseSection.tsx`, `PreviewLockerForm.tsx`.
- Existing APIs: `app/api/preview-lockers/[id]/news/route.ts`, `app/api/preview-lockers/[id]/merchandise/route.ts`.
- Review DTO/readers: `lib/preview-lockers/news-review.ts`, `news-review-server.ts`, `merchandise-review.ts`, `merchandise-review-server.ts`, `review-dismissal.ts`.
- Schema projections: `types/news-review.generated.ts`, `types/merchandise-review.generated.ts`.
- Database migration: `supabase/migrations/20261017073440_preview_media_restore.sql` (new).
- Database verification: `scripts/verify-preview-media-restore.mjs`, `supabase/tests/preview_media_restore.sql` (new).
- Tests: `tests/preview-lockers/media-restore-form.test.tsx` (new), `news-review-reader.test.ts`, `enrichment-api.test.ts`, `merchandise-api.test.ts`, `merchandise-form.test.tsx`.
- Scope/acceptance: `docs/planning/preview-media-restore-2026-10-17.md` (new).

This report is local root-checkout documentation, separate from the release commit.

## Routes changed

Existing `/admin/preview-lockers/[id]/edit` Media tab and PATCH news/merchandise APIs. PATCH accepts `action: "restore"` with one URL and the saved revision/queue version. Existing requests without an action still dismiss. News GET accepts a bounded `dismissedOffset` to page through rejected articles. No new public routes.

## Database changes and migration

Applied migration `20261017073440_preview_media_restore.sql` to Supabase project `drxtzxnwdtgxwueiqygf`; migration history now has 88 entries. It was first verified in isolated PGlite. Adds `preview_merchandise_searches.dismissed_items` JSONB with an empty-array default. It preserves existing rows and dismissal keys. Merchandise search merging retains dismissed metadata and aliases rather than pruning the metadata. Existing pending queues remain capped at 200; archive bounds are 2,000 items, 2 MB and the existing 2,000 dismissal keys.

Adds security-invoker `restore_preview_news_article(uuid,int,int,text,text)` and `restore_preview_merchandise_result(uuid,int,int,text,text)`. Both lock the preview before review state, authorize Admins, validate revision/version/identity and exact saved item, enforce capacity atomically, increment version once and invoke existing audit triggers. Accepted news, Locker article edits and curated merchandise are unchanged by restoration.

Executed the guarded production packet at `output/media-restore-production-migration.sql`; it checked database identity, migration history and the existing merge-function definition, compared saved-data hashes, verified the empty archive default and validated invoker/anonymous-execution settings. Every check passed and existing preview, article, merchandise and enrichment data remained unchanged. Evidence: `output/media-restore-migration-proof.json` and `output/media-restore-migration.png`.

## Environment variables and permissions

No environment variables or credentials changed. Existing Admin authentication, RLS, same-origin JSON checks and private/no-store responses remain. News UPDATE policy permits `review` and `rejected` transitions for Admins and continues to block `accepted` publication. New restore RPC EXECUTE is authenticated-only and includes a server-side internal-Admin guard. Merchandise keeps existing Admin-only table permissions. No public permissions were added.

Regenerated official TypeScript types using `supabase gen types --project-id drxtzxnwdtgxwueiqygf --schema public`, then refreshed the existing scoped news and merchandise projections. The generated column/RPC signatures match the implementation, and the exact release build passed TypeScript.

## Tests run

- Final full Vitest: **193 files passed, 2 skipped; 1,582 tests passed, 24 skipped** (`output/media-restore-tests-final.log`).
- Focused restore/paging form and reader tests: eight passed; prior focused form/API/bulk suite: 37 passed.
- TypeScript `--noEmit --incremental false`: passed (`output/media-restore-types-final2.log`).
- Lint: zero errors, 290 existing warnings, no new warnings (`output/media-restore-lint-final.log`).
- Final production webpack build: passed (`output/media-restore-build-final.log`).
- Production webpack build after official type regeneration: passed (`output/media-restore-release-build.log`).
- Isolated SQL harness: passed, including all previous bulk regressions (`output/media-restore-sql-final.log`). Covers dismiss → search → restore → subsequent search, preserved metadata, alias deduplication, immediate restoration, stale revision/version/identity, foreign URL, repeated restore, capacity overflow, audit counts, RLS/non-Admin/anonymous denial, blocked accepted publication and no Locker writes.
- Git whitespace check with CR-at-EOL support: passed; local release working tree clean.
- Post-migration security advisor check: zero error-level issues (`output/media-restore-advisor-proof.json`).
- Post-deploy anonymous restore PATCH requests and direct restore RPC calls: all rejected with 401; API responses private/no-store (`output/media-restore-anonymous-proof.json`).
- Vercel production runtime error-log check: no errors (`output/media-restore-production-errors.jsonl`). Browser warning/error log: empty.

## Manual verification

Verified the actual production dismiss → restore functions for one pending news article and one pending listing under authenticated Admin RLS in an explicit transaction, then rolled back every QA mutation. The initial QA fixture's SELECT-star was correctly denied by existing column privileges; corrected the fixture to select permitted columns without changing permissions. The lifecycle check then passed for both queues and confirmed no Locker content changed (`output/media-restore-live-qa-proof.json`).

Compared read-only snapshots before and after rollback QA: all saved-data hashes and versions match exactly (`output/media-restore-before-data.json`, `output/media-restore-after-data.json`). Antoine Cason remains at revision 2, five accepted news articles, two pending news articles, three pending merchandise listings, news review version 3 and merchandise version 2; zero manual article edits or Locker merchandise. Non-Admin queue isolation also passed.

Opened a dedicated live builder tab after promotion, checked both dismissed-list disclosures and empty states, confirmed existing pending results remained present, and checked keyboard Enter toggling. Verified both sections at 390×844 with document/client width exactly 390 and no horizontal overflow; restored the original desktop viewport. No Save draft or persistent UI dismiss/restore actions were performed on the user's queue. Positive UI restore/failure/reopen/pagination cases are covered by form tests; positive production database operations are covered by the rollback-only test.

Screenshots: `output/media-restore-news-desktop.png`, `output/media-restore-merchandise-desktop.png`, `output/media-restore-news-mobile.png`, `output/media-restore-merchandise-mobile.png`. Left the verified Media editor open and closed the owned SQL tab.

## Known limitations

Older merchandise searches may already have discarded dismissed listing details while retaining dismissal keys. Keys alone cannot reconstruct a title/source record. Matching listings found in a future search will now be retained in the dismissed archive. No existing dismissal keys are removed by migration.

Existing skipped tests and lint warnings remain. Antoine's dismissed queues are currently empty, so populated restore cards were tested through form tests and live database rollback QA; manual production UI inspection covered the empty dismissed views and existing pending cards.

## Deferred work

No required implementation or release work remains. Historical merchandise metadata already pruned before this release cannot be reconstructed from dismissal keys alone; rediscovered matching listings will now be retained in the dismissed archive.

## Product direction

Strengthens persistent player → discovered coverage/products → reviewed Locker enrichment by making mistaken review decisions recoverable. It remains useful after an athlete leaves an organization. No Moment or Value Graph schemas, rights or economic entitlements are introduced. No third-party commerce, DAM or publishing workflow was duplicated, and there is no generalized media-management scope drift.
