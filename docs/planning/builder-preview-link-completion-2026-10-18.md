# Builder preview link — 2026-10-18

## Summary
Add View preview locker next to the selected athlete name in the preview builder header. Opens the last saved Locker in a new tab with noopener/noreferrer, leaving the editor and unsaved changes in place. The link updates after a successful save, including a slug change; unsaved slugs do not replace the saved destination. A new preview gets a link after its first successful save. Header layout wraps on small screens.

## Files changed
- app/admin/preview-lockers/PreviewBuilderWorkspace.tsx — header link and current saved destination.
- app/admin/preview-lockers/PreviewSavedContext.ts — small client context to synchronize successful saves without reload.
- app/admin/preview-lockers/PreviewLockerForm.tsx — notify header after successful save.
- app/admin/preview-lockers/[id]/edit/page.tsx — pass the saved slug even if the sidebar roster cannot load.
- app/admin/preview-lockers/builder-workspace.module.css — wrap the name and link responsively using existing styles.
- tests/preview-lockers/builder-workspace.test.tsx — extend existing save/navigation regression to cover new-tab attributes, unsaved slug and updated saved slug.

## Routes changed
Existing /admin/preview-lockers/[id]/edit and /admin/preview-lockers/new UI only. Destination remains /preview-lockers/[slug]. No new route.

## Database changes
None. No data backfill or production player-data edits.

## Migrations
None.

## Environment variables
None.

## Permission changes
None. Existing Admin access and preview admission remain enforced. The link does not publish the Locker or grant new access.

## Validation
Type checking passed. Lint passed with 0 errors and 297 existing warnings. Full test suite passed: 210 files, 1,676 tests; 2 files/24 tests skipped. Production build and diff whitespace checks passed. React review confirmed existing styles, semantic new-tab link, saved-state synchronization, and no editor remount. Commit 688598a44ff6055b5311fae452033b57a7a5d4b5 pushed to main from isolated branch codex/builder-preview-link-2026-10-18. Production deployment dpl_Dd7c4cXVmPXN1jZUDJ5AXBiicxg8 is READY and assigned to bltz.vercel.app, bltz.me and www.bltz.me. Runtime error-log query returned zero entries. Unrelated root-workspace changes excluded.

## Manual verification
Verified the link beside Antoine Cason’s name on the live builder. Inspected correct saved href, target=_blank and rel=noopener noreferrer. Clicking it created a separate browser tab at /preview-lockers/antoine-cason, which visibly rendered Antoine Cason’s Locker, while the editor remained open. Verified narrow mobile layout at actual 325 px DOM width with document scrollWidth also 325 px; link stayed inside the viewport. Saved desktop proof output/builder-preview-link.png and mobile proof output/builder-preview-link-mobile.png. Left the desktop builder open for use. No player data was changed during manual checks.

## Known limitations
Preview shows the saved version; save the draft to view the latest edits. Browser tab preference may control whether the new tab receives focus.

## Deferred work
None required.

## Product direction
Improves the Player Locker editing/review loop and access to persistent athlete career information. No canonical Career Graph relationship/schema changes; no Moment Graph or Value Graph changes. Useful after an athlete leaves a team. Reuses existing routes and components; no third-party workflow rebuilt or generalized media-management scope drift. No conflict with docs/product/BLTZ_PRODUCT_DOCTRINE.md.
