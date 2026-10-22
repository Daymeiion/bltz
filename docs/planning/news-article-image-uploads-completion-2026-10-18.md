# News Article Image Uploads — October 18, 2026

## Objective / product reference
Add the merchandise image workflow to news articles in the preview builder Media tab, preserving scraped images as defaults, then deploy to production. Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md. This is an incremental Locker presentation improvement.

Included: upload/replace preview, restore default image, scraped and manually added articles, persisted private paths, existing draft-save workflow, storage validation, and production deployment. Excluded: changes to discovery, pending/dismissed review queues, article publication decisions, catalog/rights workflows, new buckets, and player-data edits during verification.

Acceptance: scraped images remain initial defaults; replacement uploads save separately; image reset preserves other article edits; upload/save/reload/reset work; failed/oversized/invalid uploads preserve the current image; uploaded article images do not enter Photos or hero slideshows; storage references are owned by the correct preview and remain private.

## Summary
- Every scraped Locker article now exposes its image upload control directly when expanded, without first opening Edit article details. Added/manual articles use the same control.
- Uploading saves an imageStoragePath override while retaining the original imageUrl. Use default image clears only the override; headlines and other editorial fields remain.
- Merchandise and news share EditorialImageInput, upload handling, private storage, and signed thumbnail resolution. Existing merchandise behavior remains tested.
- Saved paths are signed after existing preview visibility checks, with URLs bounded to the preview/viewer lifetime. Expiring URLs are never saved in article metadata.

## Files changed
Release worktree: C:/Users/Administrator/bltz/output/preview-merchandise-search

- app/admin/preview-lockers/ArticlesSection.tsx
- app/admin/preview-lockers/MerchandiseSection.tsx
- app/admin/preview-lockers/EditorialImageInput.tsx (new shared control)
- app/admin/preview-lockers/PreviewLockerForm.tsx
- app/admin/preview-lockers/[id]/edit/page.tsx
- app/api/preview-lockers/[id]/uploads/route.ts
- lib/preview-lockers/editorial-images.ts (renamed/generalized from merchandise-images.ts)
- lib/preview-lockers/server.ts
- lib/preview-lockers/validation.ts
- supabase/migrations/20261018185632_preview_article_image_uploads.sql
- scripts/verify-preview-media.mjs
- tests/preview-lockers/article-images-form.test.tsx
- tests/preview-lockers/media-persistence.regression-1.test.ts
- tests/preview-lockers/media-read.regression-1.test.ts
- tests/preview-lockers/merchandise-images-form.test.tsx
- tests/preview-lockers/uploads-api.regression-1.test.ts

## Routes changed
Existing Admin preview builder create/edit screens, existing upload/save APIs, and preview Locker article rendering. No new routes.

## Database changes and migrations
Migration 20261018185632 permits optional nullable imageStoragePath on article edits and adds a validated ownership constraint using the existing private value-only ownership predicate. No columns, tables, RPCs, buckets, or grants added. Unknown-field checks and existing image path/type limits remain. Existing preview audit triggers capture the new override on save.

Applied to production drxtzxnwdtgxwueiqygf with a guarded transaction, 5-second lock timeout, 30-second statement timeout, advisory lock, migration-history lock, latest-version check, and validator fingerprint check. Result: ownership constraint validated=true, anonymous helper execute=false, authenticated private-schema usage=false, photo bucket public=false.

Migration source SHA256: f1e789f6c267383a44c64e1ce618ba3e75e53bb2e431776d6f551e50b1433254.

Scoped generated database types were regenerated from isolated PostgreSQL. Declarations were unchanged because this extends existing JSON metadata and private validation only.

## Environment variables
None added or changed.

## Permission changes
None. Uploads retain existing server-side Admin checks and Storage RLS. Owned object existence is checked before save. Shared private signing remains behind existing preview visibility and expiry gates. No public storage exposure or service credentials in clients.

## Tests run
- Focused article/merchandise upload, reset, signed reads and upload API suites: 18 passed.
- Full suite: 209 files passed, 2 skipped; 1,668 tests passed, 24 skipped.
- TypeScript passed.
- Lint: zero errors, 297 warnings (same total as before this change).
- Production build passed.
- Isolated PostgreSQL verification passed: new article field validation, own/foreign/video/malformed path checks, reset/default preservation, audit history, RLS, revision conflicts, and existing enrollment workflows.
- UI integration tests cover direct scraped-article upload, save/reload, restoring the default while preserving an edited headline, failure/size/type handling, manual articles without default images, and merchandise regression coverage.
- API persistence/read tests verify owned existing objects, reject missing/foreign objects, sign only after authorization, render overrides on Locker article cards, and leave Photos empty.

Supabase, Postgres, React, and Vercel skill guidance applied; installed Next.js server/client guidance read. Current Supabase documentation was checked during the preceding storage implementation in this same conversation. No new dependencies.

## Manual verification and deployment
Commit: 5db10ab57b367b8c506d6f60ffa7e61f47382f43, fast-forwarded to main. Production deployment dpl_D4ZQx3KUioiazBNJdSugDT6aWeAs reached Ready; its build completed successfully.

Verified the deployed Antoine Cason builder at Media > News articles. Seven article image uploaders are present. Expanded the scraped Ravens signing article: its existing scraped image is displayed, the Replace article image control is enabled, and Edit article details remains an independent action. No article metadata or images were changed during production verification. The 390 x 844 mobile check found document width=390 and scroll width=390, with seven uploaders and the sampled replacement control enabled. Restored the viewport and retained the desktop builder tab as a user-facing result.

A separate read-only production query confirmed committed migration 20261018185632, valid article image metadata=true, foreign image allowed=false. Runtime error log query for the new deployment returned no entries. Native file upload and persistence were exercised in integration/API/database tests, not by changing a real player article in production.

Screenshots: C:/Users/Administrator/bltz/output/news-article-image-upload.png and C:/Users/Administrator/bltz/output/news-article-image-mobile.png. Migration proof: C:/Users/Administrator/bltz/output/article-image-migration.png.

Release worktree is clean. Unrelated changes in the main workspace were not staged or deployed.

## Known limitations and deferred work
JPG/PNG/WebP, up to 10 MB. Save the draft once before uploading, then Save draft to persist replacements. Maximum 40 article edits; unedited scraped articles cannot create another override when that limit is reached. Unreferenced private upload objects are retained under the existing non-destructive storage workflow. Storage cleanup is outside scope. No review-queue changes or additional image-management workflows are deferred.

## Product direction check
Strengthens persistent athlete-to-news presentation and retained editorial image choices while preserving source article relationships. No canonical Career ID, Moment Graph, Value Graph, ownership, or earnings changes. Useful after athletes leave organizations. Reuses existing storage and editing infrastructure; no generalized DAM workflow duplicated or added.
