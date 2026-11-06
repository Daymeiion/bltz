# Combine-only Locker and builder - October 18, 2026

## Summary / objective
Remove Pro Day results from the shared player Locker and private preview builder while retaining Combine results, source review and existing data. Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md and the user's explicit request. This is a small presentation/discovery scope change, not a destructive historical-data deletion.

## Files changed
- app/admin/preview-lockers/CombineResultsForm.tsx: Combine-only heading/count, fields, add action; no event-type selector. Existing Pro Day objects stay in the saved collection when Combine is edited.
- app/admin/preview-lockers/CombineSearchReview.tsx: Combine-only search labels and reviewed candidates, including older mixed responses.
- components/player/CombineResults.tsx: render only Combine cards, with pending fallback when none exist.
- app/player/[slug]/LockerView.tsx: Bio summary can only use a Combine event.
- lib/enrichment/combine.ts: Combine-focused queries; filter Pro Day events before returning search suggestions.
- lib/player/combine-review.ts: refuse to add Pro Day suggestions, preserving all current saved events and measurements.
- tests/preview-lockers/combine-form.test.tsx, combine-discovery-form.test.tsx, combine-discovery.test.ts and renderer.test.tsx: updated behavior and retention regressions.

## Routes changed
Existing /admin/preview-lockers/new and /admin/preview-lockers/[id]/edit; existing POST /api/preview-lockers/[id]/combine; shared /preview-lockers/[slug] and /player/[slug] display. No new route. Combine manual editing, review and save remain available.

## Database changes / migrations
None. Historical Pro Day data is retained in the existing combine_results collection for backwards compatibility, hidden from both surfaces, excluded from summaries, and never converted into Combine data. Editing/saving visible Combine results preserves hidden entries. Existing migration 20261018230222 remains unchanged; no production table edits.

## Environment variables / dependencies
None added or changed.

## Permissions
No auth, RLS, role, source-policy or grant changes. Existing Admin-only discovery/save gates and read permissions remain intact. No new protected action.

## Tests run
Full regression suite: 219 passed files / 1,758 passed tests; 2 files / 24 existing skips. Focused form/discovery/renderer tests: 35 passed. Includes Pro Day first in saved data, exclusion from Locker summaries/cards, no selector or form fields, stale mixed search responses, Combine-only discovery, rejection at review-merge, and unchanged legacy data after saving Combine edits. Full lint: zero errors / 297 existing warnings. TypeScript and exact production build passed. Whitespace checks passed with tracked line endings preserved. Existing nonfatal HappyDOM iframe warning remains unchanged.

## Manual verification
Local QA used actual builder, review and Locker components with a previously saved mixed Combine/Pro Day fixture, disconnected from production. Builder showed one Combine event and no Pro Day text/option. Search returned only Combine review groups, even when the fixture response included both event types. Locker showed only Combine cards; existing manual 4.60 and zero-bench QA values remained intact. Screenshot: output/combine-only-qa.png. Existing public/private shared renderer behavior is covered by tests.

Production verification passed in Antoine Cason's builder and public preview Locker. The builder shows Combine results, Search Combine results and Add Combine event, with no Pro Day fields or selector. All 422 other editor fields were unchanged across deployment, and both saved NFL and college stats imports remained present. Live search returned Combine 2008 candidates from Wikipedia and DraftScout, with no Pro Day suggestions. The Locker's Measurables section shows only Combine 2008, preserving saved measurements; the absent Combine 3-cone value shows pending rather than using a Pro Day value. No Add or Save action was performed, and no athlete data was written during verification. Evidence: output/combine-only-production-builder.png, output/combine-only-production-locker.png and output/combine-only-production-proof.json. Post-release runtime error query returned zero entries.

## Known limitations / deferred work
Historical Pro Day records and schema compatibility remain stored; they are not exposed by the changed UI or allowed through review additions. Parsing still recognizes event types so Pro Day numbers cannot be mislabeled as Combine numbers. Existing total-event storage bounds remain unchanged. No historical data cleanup or new schema is required for this request.

## Product direction
Preserves athlete-to-measurement/source information and simplifies the Locker workflow without introducing Career, Moment or Value Graph schema changes. The remaining Combine records stay useful after an athlete leaves a team. No third-party workflow duplication or generalized media-management expansion; no doctrine conflict identified.

## Release verification
Prepared in the isolated output/preview-merchandise-search worktree from production commit c8dee87. Committed as 3498c66c30925c53de8e15c0035628bbec7663cf on codex/combine-only-2026-10-18; worktree clean. Automatic approval review initially rejected the production push because the previous approval covered the discovery feature rather than this removal. The user then explicitly approved deploying 3498c66, and the exact commit was pushed successfully to production main. Vercel deployment dpl_Gqc12QyjWG6ZgY9eEoKXb94K7wyo reached READY for production, serving bltz.vercel.app, bltz.me and www.bltz.me. Hosted build and live verification passed. No migration required.
