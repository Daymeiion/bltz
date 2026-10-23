# Merchandise queue merge completion — October 17, 2026

## Summary and release

Deployed commit `05e8b3edcc25c445dd74cf288c3767cf5c2a0483` to production through the existing main-branch Vercel integration. Deployment `dpl_91RhCeyba2jFHFgyThyp33C2ShGk` is READY on `bltz.me`, `www.bltz.me` and `bltz.vercel.app`.

New merchandise searches atomically merge unique listings into the saved private review queue. Existing pending listings keep their original details. Canonical/alternate URLs, tracking variants and retailer item IDs consolidate into a single listing. Persistent alias keys keep dismissed listings dismissed across future searches. Results remain separate from curated Locker merchandise.

[Open Antoine Cason's Media tab in the preview builder](https://bltz.vercel.app/admin/preview-lockers/a471cb24-5d17-4e3f-b165-f1b97c77d69e/edit).

## Files changed

Implementation is in the isolated release checkout `C:/Users/Administrator/bltz/output/preview-merchandise-search`; unrelated changes in the root checkout were preserved.

- `app/admin/preview-lockers/MerchandiseSection.tsx`: merge copy, latest-search date, duplicate detection against draft using listing keys.
- `app/admin/preview-lockers/PreviewLockerForm.tsx`: validates accumulated queues above twelve listings.
- `app/api/preview-lockers/[id]/merchandise/route.ts`: maps atomic capacity errors to safe HTTP 422 responses.
- `lib/preview-lockers/merchandise-review.ts`: bounded queue schema and shared listing identity keys.
- `lib/search/errors.ts`: preserves-results capacity message.
- `types/merchandise-review.generated.ts`: official regenerated scoped database types.
- `supabase/migrations/20261017035825_preview_merchandise_queue_merge.sql`: schema/helper/RPC changes.
- `supabase/tests/preview_merchandise_review.sql`: persistent dismissal expectations.
- `supabase/tests/preview_merchandise_merge.sql`: merge, deduplication, dismissal aliases, empty search and overflow regression fixtures.
- `tests/preview-lockers/merchandise-merge.test.ts`: URL identity and queue schema tests.
- `tests/preview-lockers/merchandise-api.test.ts`: capacity response and failed-save admission handling.
- `tests/preview-lockers/merchandise-form.test.tsx`: large queue display, failed-search retention and draft alias duplicate controls.
- `docs/planning/preview-merchandise-queue-merge-2026-10-17.md`: scope, acceptance criteria and validation plan.

## Routes changed

Existing `/admin/preview-lockers/[id]/edit` Media section and existing POST/PATCH `/api/preview-lockers/[id]/merchandise`. No new route and no public Locker rendering change.

## Database changes and migration

Applied `20261017035825_preview_merchandise_queue_merge.sql` to Supabase production project `drxtzxnwdtgxwueiqygf`. Migration history advanced from 84 to 85. The existing table gains `dismissed_keys`; queue and dismissal constraints expand, a pure listing-key helper is added and the existing invoker save/dismiss functions are replaced. No new table/index.

The guarded migration checked the database identifier and migration history, locked consistently with the save workflow, and verified hashes of every existing preview and saved queue row. All existing result data and Locker data were preserved during migration. The new column is the only row-shape addition.

Searches remain limited to twelve results. Pending review queues are bounded at 200 listings / 2 MB; alias and dismissal-key bounds prevent unbounded data growth. Overflow fails atomically instead of replacing or dropping saved work. Dismissals free pending capacity on the next merge. Existing identity-change reset behavior remains to avoid mixing results for different player identities.

## Environment variables and permissions

No new environment variables or dependencies. Existing provider configuration and search admission limits are unchanged.

Admin-only RLS, same-origin validation, server-side Admin authorization, private/no-store responses and existing audit creation remain. All mutation functions are security invoker. The helper is authenticated-only and performs no data access or external requests. Anonymous queue SELECT remains denied and authenticated DELETE is still not granted. Search/dismiss operations never write Locker merchandise.

## Tests run

- Isolated PGlite migration + both SQL fixture suites: PASS. Covered append/retention, original metadata, normalized URLs, Amazon/eBay/NFL Auction/seller IDs, transitive canonical bridges, foreign-host separation, persistent dismissals, successful empty searches, queues above twelve, 200-item overflow atomicity, capacity recovery, stale versions/revisions/search ordering, identity reset, Admin/non-Admin/anonymous access, audit creation, RLS and no Locker writes.
- Focused merchandise tests: 26 passed. Final form optimization rerun: 10 passed.
- Full Vitest suite: 188 test files passed, 2 skipped; 1,553 tests passed, 24 skipped.
- TypeScript `--noEmit --incremental false`: PASS.
- ESLint: 0 errors; 290 existing warnings.
- Final production webpack build with regenerated database types: PASS. Vercel production build and alias promotion: PASS.
- Git whitespace check and CRLF preservation check: PASS. Release checkout clean after commit.

## Production manual verification

1. Captured Antoine Cason's existing queue: three pending items, version 1, one audit, preview revision 2, zero curated Locker merchandise.
2. Ran a real merchandise search from the deployed Media tab. It completed with a partial-provider warning because some seller pages could not be checked.
3. Confirmed all three original listings and every original detail were retained. No additional unique listing was found in this live search; duplicate-key pairs remained zero. Queue version advanced to 2 and audit count to 2; source and preview revision remained 2.
4. Reopened the page without searching again: the same three saved URLs and latest search timestamp loaded, with all review checkboxes unchecked and Add to draft disabled until explicit review.
5. Confirmed curated Locker merchandise stayed at zero. No real review item was dismissed or published during verification.
6. Anonymous POST and PATCH returned 401 with private/no-store; anonymous direct queue access returned 401. A production read-only authenticated non-Admin transaction could see no queue rows.
7. Verified desktop controls and mobile at 390 × 844: document width 390, readable listing details and visible review/Add/Dismiss controls. Restored desktop viewport and left the builder tab open.
8. Vercel runtime error query returned no error entries. Browser captured one listener-channel-closed message, without an application failure; normal queue loading/search/reopen succeeded.

## Known limitations and deferred work

Retailer IDs are recognized for the documented URL formats; unknown seller aliases rely on normalized/canonical URLs. Distinct marketplace sellers remain separate listings. Existing saved prices/details are deliberately preserved and can become stale; the UI states this. Search provider/seller availability still varies. No extra commerce, automated publication, pricing refresh or generalized media-management scope was added. No required work remains deferred for this request.

## Product direction check

Strengthens persistence of player identity → discovered merchandise → explicit review → optional Locker enrichment. It remains useful after an athlete leaves an organization. No Moment Graph, rights, ownership, licensing or Value Graph relationship is inferred or introduced. No mature commerce workflow was duplicated and no generalized media-management scope drift was introduced.

## Evidence

Local release evidence is under `C:/Users/Administrator/bltz/output/merchandise-merge-*`: migration proof, official generated types, before/after database and UI snapshots, duplicate/detail comparison, reopened state, test/build/lint logs, deployment metadata and screenshots.

![Saved merchandise review controls](C:/Users/Administrator/bltz/output/merchandise-merge-desktop.png)

![Mobile merchandise review controls](C:/Users/Administrator/bltz/output/merchandise-merge-mobile.png)
