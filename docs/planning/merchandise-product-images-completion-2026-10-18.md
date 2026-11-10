# Merchandise product images — October 18, 2026

## Summary / objective
Fix initial merchandise discovery so readable seller product shots are captured without downloading and re-uploading images. Preserve the existing Media review workflow, identity checks and uploaded overrides. Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md; bounded Locker enrichment, not a new media-management system.

## Root cause and evidence
The product parser only read JSON-LD and a subset of social image metadata. Amazon's readable listing uses landingImage and data-a-dynamic-image. The NFL auction returns an unresolved $fbImageURL while its real jersey photos are in productCarousel data-media. Its auction path also failed the parser's product-path check, causing a title-only fallback. Finally, the saved-review merge deliberately kept the oldest metadata, including an empty imageUrl, discarding newly found images.

Eight image regressions failed before the fix and passed afterward. A real safe-fetch pull now extracts Antoine Cason's NFL auction jersey image and retains the existing SportsMemorabilia card image. Amazon returned a 200 response with no product detail to the safe fetch during verification; no image is invented for that response. Its readable main-image markup is covered by a regression fixture based on the observed page.

## Files changed
- lib/enrichment/article-metadata.ts — expose the existing decoded-attribute reader for reuse; news extraction behavior unchanged.
- lib/enrichment/product-metadata.ts — product gallery fallbacks for Amazon, eBay and NFL auction; standard itemprop/lazy image and image_src metadata; alternate OpenGraph/Twitter keys; safe fallback through image arrays. Preserve exact CDN URLs and reject unsafe/placeholder images.
- tests/player/merchandise-images.test.ts — parser regressions plus real PostgreSQL before/after merge, deduplication, image retention, dismissal and non-Admin tests.
- scripts/verify-preview-merchandise-images.mjs — isolated PostgreSQL fixture invoked by the regression test, following existing repository scripts.
- supabase/migrations/20261018204700_preview_merchandise_missing_images.sql — fill empty review imageUrl on a repeated matching search, preserving all existing metadata, images, aliases, dismissals, revision/version checks and RLS.

## Routes changed
No new routes. Existing /api/preview-lockers/[id]/merchandise returns improved scraped defaults to Media > Merchandise.

## Database changes / migration
Function-body-only migration 20261018204700. No new tables, columns, signatures or grants. Does not write Locker merchandise or alter uploaded overrides. Existing review audit trigger records subsequent queue updates. Production packet uses a transaction, lock/statement timeouts, migration-history/advisory locks, latest-version and existing-function fingerprint guards.

## Environment variables
None added or changed. No new service, image-search subscription, marketplace credentials or dependency.

## Permissions
No permission changes. Server-side Admin authorization, source policy, public-address checks, pinned DNS, redirect checks, response-size limits and timeouts retained. External markup is parsed without executing seller scripts. Only product image references leave the parser.

## Tests run
Focused: 68 passed. Full suite: 211 files / 1,691 tests passed; 2 files / 24 tests skipped. TypeScript and production build passed; lint 0 errors / 297 existing warnings; diff whitespace check passed. Temporary live diagnostic test removed from the release; public product metadata proof saved in output/merchandise-product-images-live-proof.json. Regenerated production public database types after migration; the scoped merchandise review table and RPC declarations are unchanged.

## Manual verification / deployment
Applied migration 20261018204700 to production project drxtzxnwdtgxwueiqygf. Postflight: security_definer=false, anonymous execute=false, RLS enabled=true, all six previews retained. Source SHA256 31eec56271fc9b511bd4b9d1453208552ab205e9ef75cb7974a970c7e1f16786. Initial commit d2cfe1315316a4f5410312a9778ce94e9843dede failed Vercel type checking because its test imported locally available PGlite directly, which is not a deployment dependency. Moved the regression to the repository's existing isolated JavaScript-script pattern. Repeated the full suite (1,691 passed), type checking, changed-file lint and production build successfully. Correction commit c06693c014662520fe23fcbbf05a3594c1f0bcd7 pushed to main; production deployment dpl_5q12toGUuSuaWZuGG9kxsej7KVsx reached READY and serves bltz.vercel.app, bltz.me and www.bltz.me.

Ran Antoine Cason's Search merchandise on the new deployment. The saved review queue gained the previously missing Amazon Arizona Press Pass card image: three product images now appear, up from two. Verified the recovered image actually loaded, then reloaded the builder and confirmed its URL persisted in Media > Merchandise. All five original listing URLs remain, with no duplicates; Locker merchandise remained at five and no draft save, add, dismissal or publication occurred. The NFL auction image was extracted by the live safe-fetch diagnostic, but was not added to the production queue in this search run; some seller pages remained unavailable. Final production runtime error query returned zero entries. No separate mobile check was run because no UI layout changed.

Screenshot: output/merchandise-product-images-production-2026-10-18.png. DOM-backed before/after proof: output/merchandise-product-images-ui-proof.json. Release worktree clean; unrelated primary-workspace changes excluded. Status: DONE, with external seller availability limits noted below.

## Known limitations
Seller blocking, inventory changes and image hotlink restrictions can still prevent product shots. No CAPTCHA or access-control bypass. Already-added Locker products remain independent of review suggestions and are not rewritten by a search; uploaded images are retained. A later scrape fills only a missing saved review image, never replaces an existing one. No separate mobile layout change is introduced.

## Deferred work
No required work deferred. Seller-specific APIs, copying remote image bytes into Storage, inventory/checkout and automatic rewriting of existing Locker merchandise are outside this fix.

## Product direction
Improves athlete-to-merchandise discovery and review accuracy in the existing Locker workflow; useful across teams and after retirement. No canonical Career Graph, Moment Graph or Value Graph schema changes. Uses existing seller sources rather than duplicating commerce or generalized media-management workflows. No Product Doctrine conflict identified.
