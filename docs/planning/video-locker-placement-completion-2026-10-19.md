# Video placement in Podcast and Social

## Objective and scope
Add a dropdown to each expanded preview video so Admin can also show that video in Podcast, Social, or both. Existing videos default to Film Room only. This is an incremental preview Locker improvement under the Product Doctrine; no new Media Graph model or social publishing workflow.

## Implementation
- The Videos tab offers **Also show in Locker media** with Film Room only, Podcast, Social, and Podcast + Social.
- Saved selection stays on the existing video as optional `lockerPlacement: podcast | social | both`. Clearing removes the property.
- Podcast and Social show thumbnail cards linking to the video's existing detail page. Film Room placement, hero selection, category, and manually added social posts remain independent.
- External videos and private uploads use existing source parsing, signing and access gates. No new uploads, source fetches, or duplicate media rows are created.
- Repeat discovery keeps saved videos and their chosen placements. Removing the video also removes its derived category cards.

## Files changed
- `app/admin/preview-lockers/PreviewLockerForm.tsx`: expanded video dropdown.
- `app/player/[slug]/LockerView.tsx`: shared thumbnail card and Podcast/Social rendering.
- `lib/preview-lockers/validation.ts`: optional enum for both external and stored video formats.
- `lib/preview-lockers/types.ts`: legacy preview video shape.
- `lib/preview-lockers/mapper.ts`: legacy projection preserves placement; current mapper already preserves video metadata.
- `types/preview-lockers.generated.ts`: schema verification note; videos remains Json.
- `supabase/migrations/20261019205911_preview_video_locker_placement.sql`: guarded validator extension.
- `scripts/verify-preview-video-placement.mjs`: disposable PostgreSQL migration, persistence, audit and RLS verification.
- `tests/preview-lockers/video-locker-placement.test.tsx`: seven workflow/regression tests.
- This completion report.

## Routes affected
Existing `/admin/preview-lockers/[id]/edit` Videos panel and `/preview-lockers/[slug]` Media categories. Cards use existing `/preview-lockers/[slug]/videos/[videoId]`. Shared Locker rendering supports the optional placement metadata; canonical video ingestion is unchanged. No new routes.

## Database and migration
Migration **20261019205911** extends `private.preview_items_valid(text,jsonb)` to permit the optional placement enum on existing preview video JSON objects. No columns, tables, storage policies, grants, or athlete rows change. Existing video values remain valid. Apply this migration before releasing the application change. It is guarded against unexpected function definitions and safe to reapply. Public database TypeScript signatures stay unchanged because the existing JSONB column is represented as Json; domain types and Zod validation carry the new shape.

## Environment and permissions
No environment variables or permission changes. Existing Admin-only save authorization, read-only assigned viewers, private signing, share-link access and audit/revision triggers remain in force. The new presentation choice does not approve rights or publish media publicly.

## Automated validation
- `npm test`: 224 files / 1,795 tests passed; 2 files / 24 tests skipped as before. Existing nonfatal HappyDOM iframe diagnostic remains.
- `npm run lint`: 0 errors; 296 existing warnings.
- `node scripts/verify-preview-video-placement.mjs --generate-types`: passed on disposable PGlite PostgreSQL; validates external/stored formats, legacy records, enum bounds, duplicate and item limits, save/read, audit revisions, unchanged grants, Admin updates, assigned viewer read-only, outsider isolation and anonymous denial. Retested after adding current school-display validator to the baseline.
- `npm run build`: passed, including TypeScript and production page generation. The first attempt caught a test-only type imported from the wrong module; corrected before the successful build.
- `git diff --check`: passed.
- React review: module-level card component, derived lists without redundant state/effects, stable video keys, labelled native select, native keyboard links with focus outlines, existing thumbnail component reused with hover autoplay disabled.

## Manual verification
Local fixture harness renders actual builder and Locker components without hosted athlete edits. Confirmed expanded video dropdown, all four options, selection change, Podcast card and both Social cards with existing detail links. Actual 390px iframe has scrollWidth 390px: no horizontal overflow, cards fit their columns. Automated component tests cover save/reload, explicit clearing, signed upload mapping, video removal and scraper preservation. Browser screenshots are in repository-root `output/video-placement-{builder,social,mobile}.png` (local fixtures).

## Limitations and deferred work
Not deployed and migration not applied to production. Production rollout is deferred until requested. Source thumbnail or playback availability remains dependent on its provider; no new provider ingestion or social publishing is included. Local test YouTube IDs are fixtures, so provider playback was not used as acceptance evidence. Private uploaded playback retains existing expiring signed URLs.

## Product direction check
Strengthens the athlete-to-existing-career-video relationship by making curated interviews and social clips easier to find in the Locker. Remains useful after an athlete leaves an organization. No Moment or Value Graph changes. No mature third-party workflow was duplicated and no scope expansion into generalized media management.
