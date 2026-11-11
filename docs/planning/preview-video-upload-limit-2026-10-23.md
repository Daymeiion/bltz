# Preview video upload limit repair

Date: October 23, 2026

## Objective

Restore private preview video uploads through the existing 250 MiB boundary and show the storage service's actual error reason when a photo or video transfer fails.

## PRD reference

User-authorized repair of the existing Player Locker preview workflow. Governed by `docs/product/BLTZ_PRODUCT_DOCTRINE.md` and the Phase 1 stabilization boundary in `docs/BLTZ_BUILD_ORDER.md`.

## Included

- Production Supabase global upload limit: 52,428,800 bytes (50 MiB) to 262,144,000 bytes (250 MiB).
- Local Supabase storage configuration aligned with the existing video bucket and API limit.
- Photo/video transfer failures include the SDK's error message, with a fallback for an empty reason.
- Failed batches clear the stale uploading message and retain previously completed uploads in the unsaved draft.
- Regression coverage for error reasons, partial success, and the exact API size boundary.

## Excluded

Application deployment, uploading or saving the athlete's original files, transcoding, resumable uploads, new storage buckets, rights changes, and future Media Graph schemas.

## Required routes

Existing `/admin/preview-lockers/[id]/edit` and `/api/preview-lockers/[id]/uploads`. No routes added or removed; the editor's failure behavior changes.

## Required data

Existing preview JSON and private storage objects. No schema, canonical athlete data, generated database types, migrations, or environment-variable changes.

## Required permissions

Existing internal-admin authorization and signed upload tickets remain in place. No role, RLS, bucket visibility, allowed MIME type, or permission changes. The photo bucket retains its separate 10 MiB limit; the video bucket retains its existing 250 MiB limit.

## Root cause and production change

Dante Hughes's `Hughes_General Restoration Model_1622x1080.mp4` is 80,386,847 bytes. A same-size synthetic transfer returned HTTP 413, `EntityTooLarge`, with the message `The object exceeded the maximum allowed size`. The form discarded that reason.

Production project `drxtzxnwdtgxwueiqygf` had a global `fileSizeLimit` of 52,428,800 bytes, despite the video bucket and application allowing 262,144,000 bytes. Applied only `{"fileSizeLimit":262144000}` through the official Supabase Management API. Readback confirmed the new limit and unchanged storage features. No broad CLI configuration push was used; local project-link metadata points at different projects.

The existing CLI credential was used in memory for the Management API request. No credential was printed or committed. Diagnostic JSON and command logs are under the ignored `output/upload-diagnostics/` directory.

## Files changed

- `supabase/config.toml`
- `app/admin/preview-lockers/PreviewLockerForm.tsx`
- `tests/preview-lockers/multi-upload-controls.regression-1.test.tsx`
- `tests/preview-lockers/uploads-api.regression-1.test.ts`
- This verification record.

## Acceptance criteria and verification

- Production global limit read back as 262,144,000 bytes.
- A synthetic multipart signed upload of exactly 262,144,000 bytes succeeded in the existing private video bucket. Stored object metadata confirmed the exact size. The diagnostic object was deleted and its absence verified.
- Three error-message regressions failed before the form change and passed afterward: size rejection, network failure, and an empty storage error. They also verify that completed files remain in the draft and the stale uploading message disappears.
- API regression accepts exactly 250 MiB and rejects one byte above it. Existing upload tests continue to reject anonymous and non-admin ticket requests.

## Validation commands

- Focused upload tests: 16 passed.
- `npm test`: 230 files passed, 2 skipped; 1,872 tests passed, 24 skipped. Happy DOM emitted its existing iframe-loading limitation during the run.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with 0 errors and 296 repository-wide warnings.
- `npm run build`: passed.
- `git diff --check` scoped to this repair's files: passed. Unrelated working-tree changes were preserved.

## Manual verification and limitations

The live storage repair is active and verified with an actual transfer at the maximum size. The original athlete media and saved preview records were not changed. The new error text was verified through component tests; it is not yet deployed to the live application. Normal admin uploads should be retried through the existing editor and saved after review.

## Deferred work

Deploy the application code through the normal release workflow. This repair does not deploy unrelated working-tree changes or implement new media-management infrastructure.

## Product direction check

This restores an existing private Locker media workflow and supports preserving athlete career media across organizational affiliations. No canonical Career Graph relationships were added, and no Moment Graph or Value Graph relationships changed. No mature third-party workflow was duplicated, and the repair introduces no generalized media-management scope.
