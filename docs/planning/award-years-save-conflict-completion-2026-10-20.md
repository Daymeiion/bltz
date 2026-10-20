# Award years and save-conflict guidance

## Objective and scope
Remove "Unverified evidence" from Locker award cards while retaining award years. Investigate J.J. Arrington's save conflict and provide accurate recovery guidance without bypassing version checks or losing an unsaved draft. Product reference: explicit user request and docs/product/BLTZ_PRODUCT_DOCTRINE.md. Reuse existing Locker, builder, save API, authorization and optimistic concurrency behavior.

Acceptance criteria: award years remain; unverified display text is absent across Locker modes; duplicate URL conflicts and stale-editor conflicts receive distinct explanations; recovery opens separately and leaves the original draft intact. No schema, enrollment, scraper or persistence redesign.

## Completion report
1. Summary: removed the unverified-evidence label from shared Locker award metadata. Verified-award labels and internal evidence status remain. PATCH uniqueness violations return slug_conflict, while an unsuccessful revision match still returns preview_conflict. The builder explains each case and offers a new-tab latest-version link for stale saves. It does not retry automatically or advance the draft revision.
2. Files changed: app/player/[slug]/LockerView.tsx; app/api/preview-lockers/[id]/route.ts; app/admin/preview-lockers/PreviewLockerForm.tsx; tests/preview-lockers/api.test.ts, form.test.tsx and renderer.test.tsx; this report. Unrelated primary-checkout work excluded.
3. Routes changed: award display on /player/[slug] and /preview-lockers/[slug]; existing Admin preview new/edit save-error presentation; existing PATCH /api/preview-lockers/[id] error classification. No new routes.
4. Database changes: none. No hosted Locker or athlete data edited. Revision-matched updates and saved metadata remain unchanged.
5. Migrations: none required.
6. Environment variables and dependencies: unchanged.
7. Permission changes: none. Existing Admin authorization, RLS, source-policy validation, audit mechanisms and optimistic revision protection remain. Recovery links use a known saved UUID, noopener and noreferrer, and do not reload the unsaved editor.
8. Tests run: regression cases first failed on the original behavior (three failures: duplicate URL classification, stale-save guidance and private award label). After implementation, 67 focused tests passed. Full final suite: 226 files / 1,814 tests passed, with 2 files / 24 existing skips. Lint: zero errors / 296 existing warnings. Production build including TypeScript and page generation passed. git diff --check passed. Existing nonfatal HappyDOM iframe diagnostic remains. Added tests cover stale/duplicate distinctions, retained edits and revisions, new-tab link attributes and year retention in both Locker modes.
9. Manual verification: inspected J.J. Arrington's existing open editor without reloading or saving it, then opened the same saved Locker in a separate tab. The original editor's saved-navigation URL still had its old generated slug; the fresh saved editor showed j-j-arrington. This confirms the original editor predates a persisted update. The original draft also held unsaved changes including a school-logo upload and slug edit. Local actual-component browser checks verified year-only award labels and a simulated 409 that retained an edited Hometown field and showed the latest-version link. Screenshots: output/award-years-preview.png and output/save-conflict-recovery-preview.png in the primary workspace. The local fixture did not send production save requests.
10. Known limitations: not deployed. The current J.J. draft still needs reconciliation with the latest saved version. Keep the original tab open, compare the latest version in a new tab, and transfer unsaved edits before saving from that latest editor. Do not use the discard/reload link before preserving edits. No automatic force-save or conflict merge introduced.
11. Deferred work: production deployment when requested. No requested implementation deferred. User editorial choices remain for review rather than being copied over newer saved content automatically.

## Debug report
Symptom: one generic 409 message listed slug, GTM enrollment and revision causes for every save failure.
Root cause: J.J.'s editor was stale relative to the persisted Locker; the revision guard blocked overwriting it. Separately, PATCH collapsed duplicate slug errors into the same code, and the UI reused create/enrollment wording for edits.
Fix: preserve conflict guards, distinguish duplicate slug errors, and provide a new-tab comparison/reapply path with retained unsaved edits. No evidence of a broken GTM relationship in this case.
Evidence: old versus current saved-navigation slugs in separate production tabs; failing-then-passing regression tests; local browser state retaining an edit after a simulated conflict.
Status: code and local verification complete; production deployment and editorial reconciliation remain separate actions.

## Product direction
Improves award presentation and protects persistence of existing athlete career data when editors conflict. No new Career, Moment or Value Graph entities. Useful across affiliations and retirement. No duplicated third-party workflow or generalized media-management scope.
