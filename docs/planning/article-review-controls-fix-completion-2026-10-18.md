# Article review controls fix — 2026-10-18

## Summary / debug report
Symptom: production article review checkboxes and Add to draft controls appeared disabled.
Root cause: the saved review queue retains suggestions after addition to Locker articles. Antoine Cason’s two displayed suggestions were already persisted in article_edits. The UI counted both as awaiting review, showed an unchecked disabled review checkbox and an In draft button, and kept a disabled bulk add workflow despite there being zero new articles. Duplicate prevention was correctly detecting their existing entries, but the presentation made completed additions look blocked.
Fix: show an accurate pending/already-added count; replace already-added review/add controls with clear status and an enabled Edit article action. It opens and focuses the matching existing editor using normalized URL/canonical/headline keys. Hide bulk review/add controls when no new articles remain, retaining selection and bulk dismissal. New articles still require review before adding. Card state resets when addition/removal changes its draft membership.
Evidence: reproduced on production Antoine Cason, then regression expectations failed against the original implementation before the fix. Targeted tests passed after the fix and prove existing article edits save without duplication.
Status: DONE.

## Files changed
- app/admin/preview-lockers/ArticlesSection.tsx — accurate counts, existing-editor references/navigation, conditional bulk add workflow, fresh card review state.
- app/admin/preview-lockers/NewsResults.tsx — distinguish already-added articles from pending reviews and provide Edit article.
- app/admin/preview-lockers/BulkReviewControls.tsx — optional hiding of add-only actions; default merchandise behavior unchanged.
- tests/preview-lockers/news-review-form.test.tsx — production regression, enabled editing, focus, Save draft and no duplicate creation.
- tests/preview-lockers/media-bulk-form.test.tsx — all-added news no longer shows a misleading disabled add button; selection/dismissal retained.

## Routes changed
Existing /admin/preview-lockers/[id]/edit and /admin/preview-lockers/new Media tab only. No new route or API changes.

## Database changes
None. No queue rows, player articles or existing player content are deleted or rewritten.

## Migrations
None.

## Environment variables
None.

## Permission changes
None. Existing Admin authorization, identity checks, revision checks, review requirement, capacity limits, duplicate detection, publication behavior and upload access remain intact.

## Tests run
Regression was demonstrated before the fix: two assertions failed on the old disabled workflow. Targeted tests: 12 passed across news-review-form and media-bulk-form, including reviewing new articles, adding, editing/saving, deduplication, stale identity/response guards, capacity, bulk dismissal and failed dismissal retention. Full suite passed: 210 files / 1,677 tests, 2 files / 24 tests skipped. Type checking passed. Lint passed with 0 errors / 297 existing warnings. Production build and whitespace check passed. Commit 68f5ad2fb4061cb4d8e957fd85a99390d77ae674 pushed to main from isolated branch codex/article-review-controls-fix-2026-10-18. Deployment dpl_85ziUgA5uYLwqWH5n3ZFsKd7bkCr is READY and assigned to bltz.vercel.app, bltz.me and www.bltz.me. Runtime error-log query returned zero entries. Unrelated root-workspace changes were excluded.

```text
Test Files  210 passed | 2 skipped (212)
Tests       1677 passed | 24 skipped (1701)
```

## Manual verification
Before fix: production Antoine Cason showed two suggestions, both already in persisted Locker article edits, both with disabled review checkboxes/In draft buttons. Save draft itself was enabled. After release: both saved suggestions correctly showed 0 awaiting review / 2 already added, with enabled Edit article controls. Edit article opened and focused the correct existing headline field. In an isolated temporary unsaved test, removed one retained edit from the local form, confirmed its review checkbox was enabled, checked it, confirmed Add to draft and Save draft were enabled, and clicked Add to draft successfully. Discarded those temporary edits through Reload saved version; did not submit Save draft or alter persisted article content. Reopened the saved Media tab and confirmed both original articles were retained. Select all enabled Dismiss selected; cleared selection without submitting a dismissal. Mobile actual width/document scrollWidth both 325 px; Edit article enabled and layout had no horizontal overflow. Saved proof: output/article-review-controls-enabled.png, output/article-review-controls-fixed.png, output/article-review-controls-mobile.png. Left a clean saved Media tab open for use.

## Known limitations
Review/Add remains unavailable during active requests, for stale player identities or at the article capacity limit. Add requires checking the review box; bulk review requires selecting a new article. These existing protections remain intentional. Already-added articles are edited and saved rather than added a second time.

## Deferred work
None required.

## Product direction / learning
Improves accurate, persistent athlete-to-news curation and the Player Locker review loop, without changing canonical Career Graph relationships or creating Moment/Value Graph schemas. Remains useful after an athlete leaves an organization. No mature third-party workflow duplicated or generalized media-management expansion. No conflict with docs/product/BLTZ_PRODUCT_DOCTRINE.md.

Investigation learning: a persistent search review queue and editorial Locker selections are independent. Queue membership must not imply an article still needs review/addition; show actionable current membership instead. Keep existing duplicate prevention and dismissal persistence.
