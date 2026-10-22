# Simplified Award Image Library — October 18, 2026

## Objective and scope
Simplify the existing preview-demo artwork workflow: multiple-image upload plus all uploaded images in Admin, and one image picker per award in the preview builder. The user's explicit demo decision removes image source, display-review, and permission-entry steps for preview artwork.

Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md. This improves persistent achievement presentation on Player Lockers without introducing a DAM or a new media schema.

Included: existing Supabase bucket and image registry, duplicate-safe uploads, image gallery/search, one-click award selection, preview-specific display behavior, and existing draft persistence. Excluded: new catalog administration, new rights workflows, storage restructuring, canonical identity changes, and changes to athlete award records.

Acceptance criteria: multiple images upload independently; all 26 existing registered images can be browsed; demo images need no source or approval; choosing an image closes the picker; Save draft preserves the image reference; public canonical artwork rules and Admin access remain scoped correctly.

## Summary
- Admin library now contains one multiple-file uploader and an image gallery. Removed visible import panels, filename matching, metadata/review modal, approval controls, catalog mapping, and award-definition forms.
- Builder picker now shows the library, image search, and an upload link. Clicking an image selects it and closes the popup. Remove image remains available next to the chosen thumbnail.
- Removed competing per-award photo dropdown, URL input, and direct upload controls. Existing photo/URL selections remain supported and preserved.
- Preview-demo display resolves uploaded library images without source/license/credit or approval requirements, through the existing conceptual permission API.

## Files changed
Release worktree: C:/Users/Administrator/bltz/output/preview-merchandise-search

- app/admin/award-images/AwardImageLibrary.tsx
- app/admin/preview-lockers/AwardImagePicker.tsx
- app/admin/preview-lockers/AwardsSection.tsx
- app/admin/preview-lockers/PreviewLockerForm.tsx
- lib/award-images/model.ts
- lib/award-images/server.ts
- lib/enrichment/permissions.ts
- lib/preview-lockers/enrichment.ts
- tests/award-images/model.test.ts
- tests/award-images/ui.test.tsx
- tests/award-images/display.test.ts
- tests/preview-lockers/form.test.tsx

## Routes changed
Existing /admin/award-images, /admin/preview-lockers/new, /admin/preview-lockers/[id]/edit, and preview Locker award rendering. No new routes. Existing upload/read APIs are reused.

## Database changes and migrations
No schema changes, production data edits, or migrations. No bucket objects or historical metadata deleted. The image registry continues to provide stable IDs for existing saved award choices; storage remains the existing award-library bucket.

## Environment variables
None added or changed.

## Permission changes
Preview demo artwork no longer requires source/license/credit metadata or approved display status. Admin authorization, private bucket access, signed URLs, file type/size/byte validation, existing audit triggers, and canonical public artwork gates remain in place. No RLS or grants changed. Archived images remain unavailable for new selections/display.

## Tests and validation
- Focused award picker/model/server tests: 13 passed.
- Builder integration suite: 31 passed, including selecting an unreviewed image, saving, and reopening the selection after reload; existing media preserved.
- TypeScript: passed.
- Lint: 0 errors, 296 existing warnings.
- Production build: passed.
- Full suite: 207 test files passed, 2 skipped; 1,657 tests passed, 24 skipped.
- Initial full-suite run identified one integration test using the removed photo dropdown; updated it to exercise the actual library-selection/save/reload workflow and reran the suite successfully.
- Existing happy-dom external iframe warning and lint warnings remain non-fatal.

Supabase changelog and current signed-URL documentation checked. Installed Next.js server/client documentation read. React checklist applied: client-only interaction, lazy picker data loading, disabled unavailable choices, semantic dialog/title/description, labels/focus states, contained image sizing, loading/error handling, and responsive grids.

## Known limitations and deferred work
PNG/JPG/WebP uploads are limited to 10 MB per image. The existing registered bucket images are all included; future uploads should use this page so stable image references are saved automatically. Existing catalog mappings and old administrative endpoints remain behind the scenes for compatibility; this screen no longer exposes their workflows. No new matching or review workflow is deferred as part of this request.

## Product direction check
Career Graph: strengthens achievement-to-artwork presentation and durable award image references. Moment Graph and Value Graph: no changes. Remains useful after an athlete leaves an organization. Reuses Supabase storage; no mature third-party DAM workflow duplicated and no expansion toward generalized media management.

## Deployment and manual verification
Commit: 09f8d726d4cbb19780c52bab5379ca22f2d2d4c0, fast-forwarded to main. Vercel production deployment dpl_3WrEJvvz55buRh6eP42ZNRyP61HB reached Ready; its build completed successfully.

Verified https://bltz.vercel.app/admin/award-images displays one multiple-image uploader and All images (26), with no review/source/catalog panels. Production gallery loads and signs existing Supabase artwork. Verified the Antoine Cason builder's Career > Awards section has one image chooser per award, with the former photo dropdown/URL/upload controls removed. Opened the chooser and selected the uploaded all-american image that previously had placeholder status: it was enabled, selection closed the popup, and the chosen thumbnail appeared. Discarded this temporary unsaved test selection using the explicit reload-saved-version action; no athlete award data was changed. Save/reload persistence was verified in the integration test, not by modifying production athlete data.

At a 390 x 844 viewport, all 26 gallery images were present in a two-column layout; document width was 390 with no horizontal overflow. Restored the viewport. Existing authenticated Admin API reads and the live image requests succeeded; new-deployment runtime error query returned no entries. Native browser multi-file upload was not repeated in production; its failure/duplicate/continuation flow and server validation are covered by tests.

Screenshots:
- C:/Users/Administrator/bltz/output/simple-award-library.png
- C:/Users/Administrator/bltz/output/simple-award-picker.png
- C:/Users/Administrator/bltz/output/simple-award-library-mobile.png

Release worktree clean after commit. Unrelated changes in the main workspace were not staged or deployed.
