# Merchandise Image Uploads — October 18, 2026

## Objective / product reference
Allow an Admin to upload or replace each preview Locker merchandise image, retaining the scraped image as the default and allowing restoration. Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md; bounded improvement to existing Locker merchandise presentation.

Included: product image preview, single-image upload/replacement, restore-default action, persisted private override, authorized signing on reads, and migration validation. Excluded: changes to merchandise discovery/review queues, new buckets, inventory/checkout, rights workflows, image-library expansion, and athlete record edits during testing.

Acceptance: scraped image displays initially; upload replaces it; Save draft persists the override; reloading preserves it; reset restores the default; failed/invalid uploads retain the current image; merchandise images do not enter Photos or hero slideshows; unauthorized/cross-Locker storage references are rejected.

## Summary
The Media tab's Locker merchandise items now show their current image and an upload/replace control. Uploads save a separate imageStoragePath while preserving imageUrl as the default. Use default image clears the override. Uploaded images reuse preview-locker-photos storage, without consuming photo-gallery slots or adding gallery/hero images. Draft save and revision/audit handling remain the existing workflow.

## Files changed
Release worktree: C:/Users/Administrator/bltz/output/preview-merchandise-search

- app/admin/preview-lockers/MerchandiseSection.tsx
- app/admin/preview-lockers/PreviewLockerForm.tsx
- app/admin/preview-lockers/[id]/edit/page.tsx
- app/api/preview-lockers/[id]/uploads/route.ts
- lib/preview-lockers/validation.ts
- lib/preview-lockers/server.ts
- lib/preview-lockers/merchandise-images.ts
- supabase/migrations/20261018184205_preview_merchandise_image_uploads.sql
- scripts/verify-preview-media.mjs
- tests/preview-lockers/merchandise-images-form.test.tsx
- tests/preview-lockers/media-persistence.regression-1.test.ts
- tests/preview-lockers/media-read.regression-1.test.ts
- tests/preview-lockers/uploads-api.regression-1.test.ts

## Routes
Existing Admin preview builder create/edit screens, /api/preview-lockers/[id]/uploads, existing preview-save API, and preview Locker merchandise rendering. No new routes.

## Database changes and migration
Migration 20261018184205 permits an optional nullable merchandise imageStoragePath, validates a photo path, and adds a validated constraint restricting that path to the owning preview. Existing required metadata and unknown-field checks remain. No new tables, columns, public RPCs, buckets, or storage policies. Existing merchandise audit records include the new override on save.

Applied to production project drxtzxnwdtgxwueiqygf with a transaction, 5-second lock timeout, 30-second statement timeout, schema-history lock, advisory lock, latest-migration guard, and validator-function fingerprint guard. Production result: ownership constraint validated, helper security definer=false, anonymous execute=false, authenticated private-schema usage=false, bucket public=false, six preview records retained. Source SHA256: 2467f2bdfd334207e9dd5b7074754413da8384aec1523f8061aa7f16a3ccedcb.

Scoped database types regenerated from the isolated PostgreSQL schema; declarations were unchanged because this extends existing JSON metadata and private validation functions.

## Environment variables
None added or changed.

## Permissions
Existing server-side Admin authorization and Storage RLS continue to gate uploads. Uploads accept JPG/PNG/WebP up to 10 MB. Save verifies object ownership and existence. Preview read signing occurs after existing visibility checks and is bounded to the remaining preview/viewer lifetime. The new private immutable SECURITY INVOKER helper validates values only; no data-reading capability or public API is added. No service credentials are exposed to the browser.

## Tests run
- Focused UI/API/read/persistence/database tests: 19 passed.
- Full suite: 208 files passed, 2 skipped; 1,662 tests passed, 24 skipped.
- Isolated PostgreSQL migration verification passed: private-path ownership, foreign/video/malformed rejection, defaults retained, reset, revision conflicts, RLS, audit history, and existing enrollment paths.
- TypeScript passed.
- Lint: zero errors, 297 warnings (existing warnings plus the standard image-element warning for the new private thumbnail).
- Production build passed. Existing happy-dom external iframe warning is non-fatal.
- UI integration test uploads, saves, reloads, and restores the scraped default without adding Photos or saving an expiring signed URL. Invalid/oversized/failed upload tests retain the current image.

Supabase changelog/current signing documentation and installed Next.js server/client guidance checked. Supabase Postgres and React skill checklists applied. No new dependency.

## Manual verification and deployment
Release commit: fac6776c3cafc3eb91735353e5c3cec1ec9b186a. Production deployment dpl_BACqtPrvaRT4AxrQhvDfeNfj7jff reached Ready; Vercel build completed successfully. Verified the live Antoine Cason builder Media tab: five merchandise items each expose an enabled image uploader; the two items with existing scraped images show those default images and Replace merchandise image controls. Existing product values were not changed. At 390 x 844, document width and scroll width were both 390 and all five uploaders were present/enabled. Temporary viewport restored. New-deployment runtime error query returned no entries. Save/reload/reset and actual upload/failure flows were verified by integration/API/database tests; no real player product image was replaced for a smoke test.

After the migration committed, a separate read-only production query confirmed latest migration 20261018184205, own image allowed=true, foreign image allowed=false. No product or player data was edited in production.

Screenshots: C:/Users/Administrator/bltz/output/merchandise-image-upload.png and C:/Users/Administrator/bltz/output/merchandise-image-mobile.png. Migration proof: C:/Users/Administrator/bltz/output/merchandise-image-migration.png.

Release worktree is clean. Unrelated changes in the main workspace were not staged or deployed.

## Known limitations / deferred work
PNG/JPEG/WebP only, 10 MB per upload; save the draft once before uploading. Uploads remain draft changes until Save draft. Replaced/unreferenced private objects are retained under the existing non-destructive storage workflow; storage cleanup is outside this task. No scraper or pending-review queue images are mutated. No new media management workflow is deferred.

## Product direction
Improves stable merchandise-to-image presentation on the athlete's persistent Locker. No canonical Career ID, Moment Graph, Value Graph, ownership, or earnings changes. Useful after the athlete leaves an organization. Reuses Supabase object storage and existing review/save flows; no mature DAM workflow duplicated and no generalized media-management scope expansion.
