# School logo uploads — 2026-10-18

## Summary and scope
Added school/college logo upload and replacement controls to each school in the preview Locker builder. Scraped/directory logos remain the initial default. An uploaded replacement is saved separately and survives later discovery runs. Use default image restores the preserved URL. Schools and community colleges do not need a directory entry. This is per-Locker curation; shared directory logos are not changed.

Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md. This increment improves accurate historical school affiliations in the existing Player Locker workflow. No doctrine conflict was identified.

## Files changed
Release commit `2780f9b6a68cb645def3ec03bd94c853bfe9d63b` on `codex/school-logo-uploads-2026-10-18`:

- app/admin/preview-lockers/EditorialImageInput.tsx — reuse image controls with school labels and default guidance.
- app/admin/preview-lockers/PreviewLockerForm.tsx — school upload, default reset, preserved edits and disabled school insertion/removal during upload.
- app/admin/preview-lockers/[id]/edit/page.tsx — load signed thumbnails for saved logos.
- app/api/preview-lockers/[id]/uploads/route.ts — image-only school_logo upload tickets, without gallery-slot consumption.
- lib/preview-lockers/validation.ts — optional private school logo path, type/extension and ownership validation.
- lib/preview-lockers/types.ts — optional school logo override metadata.
- lib/preview-lockers/server.ts — object-existence checks and authorized, short-lived signing.
- lib/preview-lockers/branding.ts and school-branding.ts — selected uploaded logos take precedence over directory defaults.
- supabase/migrations/20261018191834_preview_school_logo_uploads.sql — JSON validator and same-Locker ownership constraint.
- scripts/verify-preview-media.mjs — real PostgreSQL migration, persistence, default and ownership proof.
- tests/preview-lockers/school-logo-form.test.tsx — upload/save/reload/reset/failure/empty-default/concurrency behavior.
- tests/preview-lockers/media-persistence.regression-1.test.ts — owned existing versus foreign/missing logo objects.
- tests/preview-lockers/media-read.regression-1.test.ts — authorized logo signing and Locker mapping.
- tests/preview-lockers/uploads-api.regression-1.test.ts — school tickets and file limits.
- tests/player/preview-branding.test.ts — preserve the selected primary school logo through directory enrichment.

## Routes changed
Existing routes only: /admin/preview-lockers/new, /admin/preview-lockers/[id]/edit, /api/preview-lockers/[id]/uploads and existing preview save/read routes, /preview-lockers/[slug]. No new route or separate application.

## Database changes and migration
Optional schools[].logoStoragePath in existing preview_lockers JSON. Original schools[].logo is retained. Updated private.preview_items_valid to permit bounded image-only paths. Added immutable SECURITY INVOKER value predicate private.preview_school_logos_owned and validated same-preview constraint for school/team arrays. No canonical player, school, team, Moment, media graph or financial schema changes.

Applied migration 20261018191834 to production drxtzxnwdtgxwueiqygf after latest-version and function-fingerprint preflight, transaction/advisory lock and bounded lock/statement timeouts. Source SHA256: 5b05404cd46274b984941d32e0fe5ceee073d5e18114501b5817263906754ac4. Post-commit query confirmed version 20261018191834, valid logo metadata=true and foreign logo allowed=false. Constraint validated=true. Private bucket public=false; anonymous helper execute=false; authenticated private-schema usage=false.

Regenerated public TypeScript database declarations from isolated PostgreSQL: unchanged because the change is JSON metadata and private validation only.

## Environment variables and permissions
No new environment variable. Existing Admin checks, RLS, upload bucket policies and preview access gates retained. JPG/PNG/WebP only, up to 10 MB. Existing private preview-locker-photos bucket; immutable generated paths and time-limited signed display URLs. Uploaded logo paths remain out of photo galleries and hero slideshows. No new public RPC, storage access, membership or publication grant. Private helper execution only for existing authenticated/service roles for constraint evaluation; no private schema usage granted. Existing preview revision/audit workflow retained.

## Tests and review
- Type check passed: npx tsc --noEmit --incremental false.
- Lint passed: 0 errors, 297 existing warnings.
- Full suite: 1,675 passed and 24 skipped initially; one migration-layout test exceeded its five-second limit under concurrency. Its standalone layout command and all five tests in that file passed on immediate rerun (1,676 unique passing tests in total).
- Final targeted regression run: 39 tests across eight files passed, including school, news and merchandise shared controls.
- Isolated PostgreSQL migration/RLS/persistence proof and type generation passed.
- Production build passed after final validation changes.
- Diff whitespace check passed; release worktree clean. Unrelated root-workspace changes were excluded.
- React review: existing shared component, functional state update after asynchronous upload, server authorization, bounded independent thumbnail signing, labeled file input, object-contain previews, loading/error states and upload-time school-index protection.

## Manual verification and deployment
Production Vercel deployment dpl_BJckaaa74thQ8T7freXE3NNhxWt1 is READY and assigned to bltz.vercel.app, bltz.me and www.bltz.me. Runtime error-log query returned zero entries.
Opened a fresh Antoine Cason builder in production; Career → School history displayed the Arizona logo as Default image, enabled Replace school logo file control, accepted JPG/PNG/WebP guidance, 10 MB limit and Save draft reminder. Checked desktop and narrow mobile: actual DOM width and document scrollWidth both 325 px, with no horizontal overflow. Saved screenshots output/school-logo-upload.png and output/school-logo-mobile.png; database proof output/school-logo-migration.png. Existing player data was not changed. Left the desktop School history section open for the user.

## Known limitations and deferred work
School controls apply to preview Lockers. Save a new draft once to enable uploads, and Save draft after choosing/resetting an image. SVG uploads remain excluded by the existing safe image format policy. No user-provided school logo file was available; actual native production file selection was not performed. UI upload/save/reload/reset and failures were covered by automated tests, API ownership/existence checks and real PostgreSQL persistence tests. No existing player data was changed for smoke testing. No required feature work deferred; shared canonical directory logo administration remains outside this task.

## Product direction completion check
Career Graph: strengthens persistent, accurate athlete-to-school affiliations in the Locker presentation; no new canonical relationships created. Moment Graph and Value Graph: no changes. Remains useful after an athlete leaves an organization, including community college history. Reused existing Storage and upload components; no mature third-party workflow rebuilt and no generalized media-management scope drift.
