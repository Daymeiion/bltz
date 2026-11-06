# Bulk restore dismissed Media — production completion

## Summary

Implemented as `67f6cec2be5fb63bd5c6d697c80720e4d9c1c749`, followed by official database type regeneration in `47832286a938257961a16f52cc55cff66d301107`, on branch `codex/bulk-restore-media-2026-10-17` in `C:/Users/Administrator/bltz/output/preview-merchandise-search`. Both commits were fast-forwarded to remote main after explicit user approval. The isolated working tree is clean. Unrelated root-checkout work was preserved.

Dismissed news and merchandise cards now have selection checkboxes and a page-scoped toolbar: Select all on page, Clear selection, selected count and Restore selected. A batch uses one request and one atomic database operation. Individual restore remains available. Selection resets on queue, identity or page changes and successful restoration; failures retain selection. Restored suggestions remain separate from Locker content and require ordinary review and Save draft before display.

The user explicitly approved “Apply migration and deploy” after the earlier automatic approval rejection. Migration `20261017075740` is now applied; all migration data-preservation and privilege checks passed. Production deployment `dpl_4Wim8jhxJffpuPaVvqpkN9DzdnYd` is READY at final commit `47832286a938257961a16f52cc55cff66d301107`, with aliases promoted to https://bltz.me, https://www.bltz.me and https://bltz.vercel.app. Production status evidence: `output/media-bulk-restore-deployment.json`.

## Files changed

Sixteen source files in the isolated checkout:

- UI: `app/admin/preview-lockers/DismissedReviewList.tsx`, `ArticlesSection.tsx`, `MerchandiseSection.tsx`, `PreviewLockerForm.tsx`.
- Existing APIs: `app/api/preview-lockers/[id]/news/route.ts`, `app/api/preview-lockers/[id]/merchandise/route.ts`.
- Validation: `lib/preview-lockers/review-dismissal.ts`.
- Schema projections: `types/news-review.generated.ts`, `types/merchandise-review.generated.ts`.
- Migration: `supabase/migrations/20261017075740_preview_media_bulk_restore.sql` (new).
- Database verification: `scripts/verify-preview-media-bulk-restore.mjs`, `supabase/tests/preview_media_bulk_restore.sql` (new).
- Tests: `tests/preview-lockers/media-restore-form.test.tsx`, `enrichment-api.test.ts`, `merchandise-api.test.ts`.
- Scope/acceptance: `docs/planning/preview-media-bulk-restore-2026-10-17.md` (new).

This completion report is local root-checkout documentation, separate from the release commit.

## Routes changed

Existing `/admin/preview-lockers/[id]/edit` Media tab and news/merchandise PATCH APIs. PATCH supports either one `url` or a unique array of 1–200 `urls` with `action: "restore"`, saved revision and queue version. Existing single and bulk dismissal requests remain compatible. No new public routes.

## Database changes and migration

Applied migration `20261017075740_preview_media_bulk_restore.sql` to Supabase project `drxtzxnwdtgxwueiqygf`; migration history now has 89 entries. First validated it in isolated PGlite. Adds security-invoker `restore_preview_news_articles(uuid,int,int,text,text[])` and `restore_preview_merchandise_results(uuid,int,int,text,text[])`. Existing single restore RPCs become wrappers through the same batch core, preserving their signatures and grants.

Functions validate the entire batch, lock preview then review state, enforce revision/version/identity, require every selected URL to be dismissed and retained in the selected preview, check capacity before mutation, update review state atomically and increment queue version once. Existing audit triggers create one article audit per restored article and one merchandise queue audit per batch. Alias keys are retained on restored items and removed only from their dismissal set. No Locker content is written.

No tables, columns, indexes or policies change. Existing table privileges remain unchanged. Executed production packet `output/media-bulk-restore-production-migration.sql`, which checked target database identity, migration history and previous single-function definitions, compared all saved-data hashes before/after, and checked invoker and anonymous-execution settings. Every check passed. Evidence: `output/media-bulk-restore-migration-proof.json` and `output/media-bulk-restore-migration.png`.

## Environment variables and permissions

No environment variables, credentials or public exposure changed. Existing server-side Admin authorization, RLS, same-origin JSON checks and private/no-store responses remain. New RPCs grant authenticated EXECUTE with internal-Admin authorization; anonymous/PUBLIC execution is revoked. No rights or publication permissions are added.

Regenerated official database types from the production public schema after migration, then refreshed the existing scoped news/merchandise projections. Generated RPC signatures match the implementation and the exact release build passed TypeScript.

## Tests run

- Full Vitest: **193 files passed, 2 skipped; 1,587 tests passed, 24 skipped** (`output/media-bulk-restore-tests.log`).
- Focused form/API/bulk compatibility: 41 passed (`output/media-bulk-restore-focused.log`).
- TypeScript noEmit/noincremental: passed (`output/media-bulk-restore-types-final.log`).
- Lint: zero errors, 290 existing warnings, no new warnings (`output/media-bulk-restore-lint.log`).
- Production webpack build: passed (`output/media-bulk-restore-build.log`).
- Exact production build after official type regeneration: passed (`output/media-bulk-restore-release-build.log`).
- Isolated SQL harness: passed, including previous bulk dismissal/single restore regressions (`output/media-bulk-restore-sql.log`). Covers 200-item restoration from the archive, versions, audit counts, invalid/null/duplicate/empty/oversized/foreign/accepted URLs, wrong preview/identity, stale versions/revisions, repeat restoration, alias deduplication, atomic capacity failure, single compatibility, non-Admin/anonymous denial and unchanged Locker content.
- Git whitespace check with CR-at-EOL support: passed; local release checkout clean.
- Post-migration production security advisor check: zero error-level issues (`output/media-bulk-restore-advisors.log`, successful CLI exit).
- Live anonymous batch-restore PATCH and direct bulk RPC calls: all blocked with 401; API responses private/no-store (`output/media-bulk-restore-anonymous-proof.json`).
- Production runtime error-log check: no errors (`output/media-bulk-restore-production-errors.jsonl`). Browser warning/error log: empty.

## Manual verification

Form tests verify selection, rapid checkbox changes, clearing, one-request payloads, failure retention, disabled concurrent controls, capacity errors and reset on queue/page changes. All positive batch operations and security boundaries were verified against isolated SQL fixtures. The initial production attempt was blocked; it was applied only after the user explicitly authorized the migration and deployment.

Verified production bulk dismiss → bulk restore for two news articles and two merchandise listings under authenticated Admin RLS inside an explicit transaction, then rolled back every test mutation. Mixed valid/foreign batches failed without partial restoration, queue versions incremented exactly once per successful batch, and Locker content stayed unchanged (`output/media-bulk-restore-live-qa-proof.json`).

Compared read-only snapshots before and after rollback QA: all saved-data hashes and queue versions match exactly (`output/media-bulk-restore-before-data.json`, `output/media-bulk-restore-after-data.json`). Antoine remains at revision 2 with five accepted news articles, two pending news articles, three pending merchandise listings, news version 3 and merchandise version 2; zero manual article edits or Locker merchandise. Non-Admin queue isolation also passed. Closed the owned SQL tab after verification. No persistent review or Locker changes were made by QA.

Opened a dedicated production Media editor after deployment promotion. Reload saved articles successfully returned five accepted articles, retained both pending articles, and displayed no errors. Both dismissed disclosures and empty states work; all three pending merchandise listings remain present. Verified keyboard Enter toggling and both dismissed sections at 390×844 with document and scroll width exactly 390. Restored the original desktop viewport and left the verified Media editor open. Did not perform persistent UI dismissals, restoration or Save draft on the user's data.

Production screenshots: `output/media-bulk-restore-news-desktop.png`, `output/media-bulk-restore-merchandise-desktop.png`, `output/media-bulk-restore-news-mobile.png`, `output/media-bulk-restore-merchandise-mobile.png`.

## Known limitations

Selection applies to the current page, up to 200 items. Changing pages clears selection. Whole batches exceeding available review capacity fail together and retain the selection; select fewer items or free review capacity before retrying. Existing historical merchandise metadata that was pruned before the earlier archive migration remains recoverable only when rediscovered. Existing skipped tests and lint warnings remain.

Antoine currently has no dismissed items. Populated checkbox/Restore selected interactions were verified through form tests; real production multi-item restoration and atomic failure behavior were verified with rollback-only database QA. Manual production UI inspection covered the current empty dismissed views and retained pending cards.

## Deferred work

No required implementation or release work remains. Cross-page selection is intentionally excluded; selection is scoped to the displayed page.

## Product direction

Strengthens persistent player → discovered coverage/products → reviewed Locker enrichment by making multiple mistaken dismissals recoverable. Useful after an athlete leaves an organization. No Moment or Value Graph schemas, rights or economic entitlements are introduced. No mature third-party DAM/commerce/publishing workflow is duplicated, and no generalized media-management scope drift was introduced.
