# Preview builder media disclosures

## Scope and layout

Primary user: internal administrator preparing a private athlete preview.
Primary action: expand a photo or video, inspect it, and edit its existing metadata.
Secondary actions: add links, upload files, remove items from the draft, save.
Critical information: title, media count, source, private-upload status, hero placement.
Mobile priority: stack the preview above the editor; truncate long row titles and hosts.
Exclusions: public Locker redesign, new media workflows, rights/schema changes, permanent file deletion.

```text
Photos 12/40                                      v
  [thumbnail] Career photo / source       Preview & edit
  [thumbnail] Another photo              Preview & edit
    [large preview] [existing metadata and link fields]
                    [Remove photo from draft]
  [Add photo]
Videos 8/24                                       v
```

Reuse the existing card, muted, border, typography, input and button tokens,
with the existing gold accent on focus and expanded rows. Sections start closed;
new blank items start expanded. Expanded players unmount when closed. External
thumbnails load lazily, and private URLs are requested only for opened previews.

## Completion report

1. Summary: collapsible media sections and compact expandable rows replace the always-expanded fields. Photo previews, direct-video playback, YouTube embeds, unsupported-provider links, and failure/loading states are included. Existing draft save/removal behavior is preserved.
2. Files changed: `app/admin/preview-lockers/PreviewLockerForm.tsx`, new `app/admin/preview-lockers/MediaDisclosure.tsx`, `tests/preview-lockers/form.test.tsx`, new `tests/preview-lockers/media-disclosure.test.tsx`, and this report. Pre-existing changes in the form and tests were preserved.
3. Routes: existing `/admin/preview-lockers/new` and `/admin/preview-lockers/[id]/edit` form consumers; no route definitions added or changed.
4. Database changes: none.
5. Migrations: none.
6. Environment variables: none.
7. Permission changes: none. Private signed previews use the existing authenticated client and storage SELECT policy; no service-role client or public bucket is introduced. Temporary URLs stay out of the saved draft.
8. Tests: 26 focused tests passed across form, media disclosure, and private-preview access suites. TypeScript and production build passed. Lint: zero errors, 209 warnings. Full suite: 712 passed, 24 skipped, nine failures in four suites outside the edited components (`admin-session-rejection`, `recovery-form`, `public-video`, `media-stats.regression-1`). These failures were not repaired in this layout task.
9. Manual verification: local production server started successfully. Browser navigation initially failed because no server was listening, then timed out after startup; live admin, mobile, and actual private-storage verification remain unconfirmed. Before release, open both media sections at desktop and mobile widths, expand items using keyboard, edit a link, collapse/reopen, remove an item, save and reload. Verify private upload previews with an authorized account and denied access without it.
10. Known limitations: third-party sources may block images or embeds; browser codec support varies. Private signed URLs last one hour; reopening refreshes them. Private uploads display an icon in the compact row and load their image/video when expanded. The Product Doctrine path referenced by AGENTS.md was absent; supplied product instructions guided this scoped change.
11. Deferred work: live visual/storage verification and unrelated full-suite failures. No new product feature deferred.

## Product direction

This improves private Locker preparation and media review. It adds no canonical
Career, Moment, or Value Graph relationships, creates no ownership or earnings
inferences, and remains useful for former athletes. It duplicates no third-party
workflow and introduces no generalized media-management scope.
