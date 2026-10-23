# Saved merchandise review — completion report

## Summary

Scraped merchandise suggestions now have a durable Admin review queue, separate from Locker merchandise. Opening the builder loads the saved snapshot without searching. The queue includes search time and evidence labels; review checkboxes reset on reopen. Dismissals persist. A usable new search refreshes the snapshot; failed searches and empty partial searches retain the prior snapshot. A complete zero-match search may replace it. Matching dismissals carry forward for the same identity. Stale identity results stay visible but cannot be added until refreshed.

## Source and files changed

Commit `1aff622cbdb864aad3cc43469a4d8ef0cba7d7d9`, branch `codex/persist-merchandise-review-2026-10-17`, isolated checkout `output/preview-merchandise-search`. Unrelated root changes are preserved. Fourteen committed files:

- `app/admin/preview-lockers/MerchandiseResults.tsx`
- `app/admin/preview-lockers/MerchandiseSection.tsx`
- `app/admin/preview-lockers/PreviewLockerForm.tsx`
- `app/admin/preview-lockers/[id]/edit/page.tsx`
- `app/api/preview-lockers/[id]/merchandise/route.ts`
- `lib/preview-lockers/merchandise-review.ts`
- `lib/preview-lockers/merchandise-review-server.ts`
- `lib/search/errors.ts`
- `tests/preview-lockers/merchandise-api.test.ts`
- `tests/preview-lockers/merchandise-form.test.tsx`
- `supabase/migrations/20261017033348_preview_merchandise_review_queue.sql`
- `supabase/tests/preview_merchandise_review.sql`
- `types/merchandise-review.generated.ts`
- `docs/planning/preview-merchandise-saved-review-2026-10-17.md`

## Routes, database, migration and environment

Existing Admin editor route loads the queue. Existing POST `/api/preview-lockers/[id]/merchandise` persists a successful usable snapshot. New PATCH on that same endpoint saves dismissals with revision and queue-version guards. No new public route.

New `public.preview_merchandise_searches` stores one bounded snapshot per preview, with FK/primary key, identity hash, source revision, result JSON, dismissed URLs, version and timestamps. Security-invoker save/dismiss RPCs lock the preview first, guard stale updates and prevent older searches overwriting newer ones. A private trigger writes existing `audit_logs`.

Migration `20261017033348_preview_merchandise_review_queue` was applied atomically to production `drxtzxnwdtgxwueiqygf`. Guarded postflight confirmed migration count 84, RLS enabled, zero initial queue rows and every existing preview row unchanged. Official Supabase types were regenerated from production and scoped into a new type file. No environment-variable or dependency changes; existing server-only `TAVILY_API_KEY` remains in use.

## Permissions and separation

Existing internal Admin authorization controls reads and writes. Anonymous access and direct deletion are denied. Non-Admin authenticated users cannot read or change the queue. Existing roles and organizational access are unchanged. Public/private Locker renderers never select review results; they continue to consume only curated `merchandise`. A review checkbox, Add to draft and normal Save draft remain explicit. Dismissal never removes a curated Locker product. No service-role key reaches the browser.

## Tests run

- Full suite: **1,543 passed, 24 skipped, zero failures**, 187 passed/two skipped test files.
- TypeScript and production build passed; lint had zero errors and the existing 290 warnings.
- SQL migration tests passed in an isolated PGlite fixture: save/reload, dismissal, dismissal retention on refresh, identity reset, stale queue/preview versions, out-of-order search, empty failure preservation, Admin/non-Admin/anonymous behavior, audit count, RLS, deletion privilege and no Locker writes.
- API/form tests cover saved-result hydration without a fetch, unchecked reviews after reopening, invalid result responses, storage failure retention, stale updates and strict dismissal payloads.
- Whitespace checks pass with existing CRLF line endings preserved in the two affected Windows source files.

Evidence under local `output/merchandise-queue-*`: full/focused tests, SQL tests, types, lint, build, generated types and exact guarded production migration packet. No temporary test source or secret was committed.

## Manual verification and deployment

Production deployment `dpl_2BVzCGHTzGTWfdmSd6cuWHherkrM` is **READY** on exact commit `1aff622cbdb864aad3cc43469a4d8ef0cba7d7d9`, URL `https://bltz-li4g02sr3-daymeiions-projects.vercel.app`, with `bltz.me`, `www.bltz.me` and `bltz.vercel.app` assigned. Hosted compilation, type checking and all 98 static pages completed successfully.

A real authenticated search saved three current Antoine Cason suggestions: the NFL Chargers game-issued jersey, an Arizona Wildcats SAGE rookie autograph card from SportsMemorabilia, and the Arizona Press Pass rookie autograph card from Amazon. All three remain in the review queue. No review checkbox, Add to draft, Save draft or Dismiss action was taken on the user's behalf.

The editor was fully reloaded and Media → Merchandise reopened without another search. The same three links and exact search timestamp (`2026-10-17T03:45:14.308+00:00`) returned. All review boxes remained unchecked and all Add to draft buttons remained disabled. Existing five news articles remained present and Locker merchandise remained zero. The persisted queue version stayed 1, source/current preview revisions both stayed 2, and exactly one `preview.merchandise_review` audit entry existed. These observations confirm the reload did not run or save another search.

Production access checks: anonymous direct table read HTTP 401; anonymous dismissal PATCH HTTP 401, private/no-store. A read-only production transaction using a non-Admin authenticated role saw no review rows. SQL tests cover saved dismissal and write denial without hiding any real user suggestion. Browser console and bounded Vercel error checks showed no errors. At a 390px mobile viewport, document width stayed 390px; temporary sizing was restored.

The result tab was left open for the user. Screenshots: `output/merchandise-ui-proof/saved-review-after-reload.png` and `saved-review-mobile.png`. Actual receipts: `output/merchandise-queue-migration-receipt.json`, `merchandise-queue-reload-proof.json`, and `merchandise-queue-production-proof.json`. The owned SQL browser tab was closed; unrelated user tabs were preserved. Release checkout is clean.

## Known limitations and deferred work

The queue stores the latest usable search of up to twelve results, not unlimited search history. Seller prices, stock and identity may become stale and still require review. Saved results for a changed athlete identity cannot be added without a new search. No unlimited candidate archive, inventory tracking, checkout, purchase, rights or financial allocation is included.

## Product-direction check

Strengthens persistent athlete → college/team career context → sourced merchandise review references, useful after departure from an organization. No Moment or Value Graph entitlement is inferred. External commerce stays with sellers; no generalized media-management or mature commerce workflow is duplicated.
