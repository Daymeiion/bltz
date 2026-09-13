# Preview Locker UI parity — September 12, 2026

## Scope and result

The admin-generated preview Locker already renders the latest public `LockerView`, and its photos page already renders `PhotoRoomView`. The gaps were an extra global navbar, hardcoded public gallery/return links, and missing preview Film Room routes. The development mock Locker also uses the shared public views.

Previews now use the same standalone shell, galleries, Film Room, and video-detail components. An optional `lockerHref` carries preview navigation through these shared components; public callers retain their existing route defaults. Preview YouTube links use embedded playback, and supported video-file URLs use the existing player. Preview photos retain their publication restriction labels; video descriptions explicitly identify uncleared preview content.

The Product Doctrine path referenced by AGENTS.md is absent in this checkout. This task follows the supplied AGENTS.md and existing Locker implementation. No new design direction or data model was introduced.

## Files and routes

- Updated `app/client-shell.tsx` and the four shared views under `app/player/[slug]`: `LockerView.tsx`, `photos/PhotoRoomView.tsx`, `videos/FilmRoomView.tsx`, and `videos/[videoId]/VideoDetailView.tsx`.
- Updated `lib/preview-lockers/mapper.ts` and the `PublicVideo` type in `lib/player/public-video.ts`; added `lib/preview-lockers/video.ts`.
- Added `/preview-lockers/[slug]/videos` and `/preview-lockers/[slug]/videos/[videoId]` page files. Existing preview Locker and photo routes consume the updated mapping.
- Added `tests/player/preview-locker.test.tsx` and `tests/player/preview-locker-routes.test.tsx`, plus this report.

## Data and permissions

No database changes, migrations, environment variables, or permission changes. No new writes or audit events. Existing preview queries use the request-scoped Supabase client and RLS; inaccessible or missing records resolve to not found. Preview video detail has no canonical player write target.

The existing migration grants anonymous SELECT on preview records. These URLs are currently publicly readable previews, not authenticated private pages. This task does not change that policy. A privacy/access-control change remains a separate product decision.

## Validation

- Ten focused tests pass: shared rendering and preview links, public route defaults, embedded sources, empty media, invalid URLs, missing/inaccessible records, and video ownership within a preview.
- TypeScript check and production build pass. Lint passes with repository warnings.
- Full suite: 346 passed, 24 skipped, one failure in `tests/player/public-video.test.ts`, whose mock-category expectation conflicts with the existing mock video dataset. This task does not alter that dataset.
- Production build reports existing `@custom-variant` and `@theme` CSS warnings.
- Live verification was attempted with the configured anonymous Supabase client; the endpoint returned `fetch failed`, including outside the sandbox. Desktop/mobile visual inspection and real-record playback remain unverified.

## Manual verification still needed

Open an existing preview at desktop and mobile widths. Confirm only the Locker app bar appears, switch Bio/Media/Stats, open Photos and return, then open Film Room, select a film, open details, and return. Check an empty preview, an invalid slug/video ID, and a YouTube video whose owner permits embedding. Compare the same surfaces with a public Locker. Confirm restricted photo labels remain visible.

## Product direction and deferred work

This strengthens presentation continuity for athlete identity, career history, and connected media. No Career, Moment, or Value Graph relationships were added or changed. The shared presentation remains useful after an athlete leaves an organization. No third-party workflow was duplicated and there was no drift into generalized media management.

Deferred: privacy-policy changes, the unrelated mock-data test failure, existing CSS/lint warnings, richer per-video metadata, and live visual/playback verification. YouTube availability depends on the source owner's embedding settings. Arbitrary external webpages are not treated as playable video files.

## Follow-up: natural photo proportions

Removed ratio clamping, absolute image sizing, cover cropping, and the obsolete fixed-row CSS from the main Locker photo strip in `app/player/[slug]/LockerView.tsx`. The flex layout uses each image's natural ratio to allocate width; the image determines its own height. No route, schema, migration, environment, permission, or graph relationship changes.

Verified the desktop demo Locker in the browser using both a screenshot and natural-versus-rendered image dimensions. Ten focused tests and TypeScript pass; targeted lint has no errors. The separate Photos page still uses its existing fixed bento layout; this follow-up addresses the main Locker photo strip. Mobile inspection remains deferred.

## Follow-up: private preview team branding

Confirmed against the saved Keith Rivers preview: school is USC, schools is empty, and pro_teams contains Cincinnati Bengals, New York Giants, Buffalo Bills, and Dallas Cowboys with null logos and the same generic color. The live schema has no school_info column. Existing code assumed pre-resolved branding and only looked up NFL codes; the shared Career team row was also hidden when structured statistics existed.

Updated lib/player/locker-format.ts to resolve NFL full names, codes, and historical SD/OAK/STL aliases. Added lib/preview-lockers/branding.ts and school-branding.ts to normalize colors, resolve unambiguous school-directory references, shorten pill labels, and deduplicate team entries. Updated lib/preview-lockers/mapper.ts and app/preview-lockers/[slug]/page.tsx to enrich existing records at render time. Updated app/player/[slug]/LockerView.tsx to reuse the hero pill rendering in Career and keep team history visible with structured statistics. Added tests/player/preview-branding.test.ts.

Routes affected: existing /preview-lockers/[slug] and shared /player/[slug] Career presentation; no routes added. No database writes, migrations, new environment variables, permission changes, or audit events. Team affiliations are not inferred or changed; only their display branding is resolved. Career identity presentation is strengthened; Moment/Value Graph relationships are unchanged, usefulness persists after organization departure, and no commodity workflow was duplicated.

Validation: 16 focused tests pass, including the live preview's data shape and inaccessible directory fallback. TypeScript and production build pass. Lint has no errors, with existing repository warnings. Browser verification confirms loaded team logos, abbreviations, and correct mapped background colors in the shared Career pills. An authenticated inspection of the saved private preview and mobile inspection remain deferred. Unknown/ambiguous schools retain fallback branding rather than receiving an unrelated logo.

Correction to the initial access report: the local migration did not reflect live permissions. A live anonymous query is denied; previews are not anonymously readable in the configured database. Read-only service-client inspection was used to diagnose the saved record, without exposing credentials or changing access. The local server was restarted with Node's --use-system-ca option to use Windows trusted certificates; Supabase requests now connect without disabling certificate verification.

## Follow-up: desktop Team History rotation and local review

Removed the phone-only overflow measurement and desktop manual-scroll override in app/player/[slug]/LockerView.tsx. Overflowing Team History now animates on desktop and mobile while in view; reduced-motion preferences retain manual access. No routes, database, migrations, environment, permissions, or graph relationships changed. No commit or push performed.

Opened the local Keith Rivers private preview. The unauthenticated request returned 404; opened standard sign-in with the preview URL as its return destination (use an authorized admin account). Authenticated private-preview visual verification remains pending user sign-in. Sixteen focused tests pass; targeted lint has no errors; production build and TypeScript pass after correcting a test-fixture type assertion. Existing unrelated full-suite failure remains documented above.


## Follow-up: private preview 404 after successful sign-in

Browser/server evidence confirmed database error 42501 (permission denied for table preview_lockers) while is_internal_admin returned true. The page incorrectly converted database failures into not-found responses.

Added lib/preview-lockers/read.ts and applied it to all four existing preview pages (Locker, photos, Film Room, and video detail). The reader authenticates the session, verifies the existing database admin predicate, then uses the existing server-only service client. Signed-out users go to sign-in; unauthorized users fail closed; only missing records produce a record-not-found response. Operational read failures now surface as errors. No grants, roles, schemas, migrations, environment settings, or stored records changed. This enforces existing internal-admin intent in application code; no public access was added.

Added tests/player/private-preview-access.test.ts and updated preview-locker-routes.test.tsx. All 21 focused tests pass; targeted lint passes. Verified the authenticated Keith Rivers preview and its Film Room in the local browser, including a loaded YouTube embed. This supersedes the earlier claim that user sign-in alone was the blocker. No graph relationships changed, no workflow duplication, and no commit or push performed.

## Follow-up: video preview frames and desktop hover

Added components/player/VideoPreview.tsx and connected it to Locker film cards and Film Room shelf cards. Updated app/player/[slug]/LockerView.tsx, app/player/[slug]/page.tsx, app/player/[slug]/videos/FilmRoomView.tsx, and lib/preview-lockers/mapper.ts so the renderer receives video sources. Removed the unrelated-photo fallback for real videos. Direct video files without a thumbnail load paused for an opening-frame preview. Existing thumbnails remain visible until hover. Mouse hover on a desktop with a fine pointer starts muted playback; leaving pauses/resets it. Touch/mobile and reduced-motion preferences do not trigger hover autoplay. Hidden documents stop previews.

YouTube links use their supplied/provider thumbnail and a muted embed on desktop hover. Raw first-frame extraction is not available from a YouTube page link; this is a provider limitation. Missing media without a playable source cannot produce a first frame.

No new routes, schemas, database writes, migrations, environment variables, permissions, or audit events. Existing public-video query adds the already-existing playback_url field. Career/Media presentation improves; no Career, Moment, or Value Graph relationships were added, no scope drift or third-party workflow duplication, and behavior remains useful after organization departure.

Added tests/player/video-preview.test.tsx. All 25 focused preview/access/branding/video tests pass; TypeScript and build pass; targeted lint has no errors. The simulated YouTube iframe generated a Happy DOM teardown warning, without test failures. Browser confirms the private Locker and supplied video thumbnail images render. Physical desktop hover and a mobile-device check remain manual verification items. Existing CSS build warnings and unrelated full-suite mock-category failure remain as documented. Nothing committed or pushed.
