# Preview Locker claim and card refresh — 2026-09-14

## Main mobile photo fit correction

- Cause: proportional main-grid sizing applied only above 640px; mobile retained fixed spans, fixed height, and object-fit cover.
- Files: `app/player/[slug]/LockerView.tsx` now computes each mobile pair's proportional width and natural tile height, with contain fitting and no hover zoom. This report updated.
- Route: private main Locker below 641px. Three rows/two photos each retained; the middle mobile pair is visually reversed so the wider tile alternates left/right/left. Desktop/tablet and Photo Room unchanged.
- Database/migrations/environment/permissions: none. No graph changes, duplicated workflows, or scope expansion; persistent athlete presentation improved.
- Validation: TypeScript passed. Browser at 371px measured three rows, six natural-ratio tiles, and contain fitting throughout. Whitespace check passed. Browser also confirmed middle-row reversal with all six images still using contain. No new tests for this CSS/layout correction.
- Release: user approved production deployment. Production build passed, scoped lint passed with 24 warnings/zero errors, renderer tests passed 2/2. Base ba1f5e0 verified before push. No migrations needed. Natural row heights replace fixed mobile height to avoid cropping; source-image crops cannot be recovered.

## UI release validation

- User approved production deployment of the accumulated photo grid, mobile Photo Room columns, affiliation contrast, See all links, complete inline articles, metadata placement, award spacing, and Basic Info heading removal.
- Release contains four UI source files and this report. No database migrations, environment changes, or permission changes.
- Production base verified at 691740a. Final production build passed, scoped lint passed with 29 warnings/zero errors, preview renderer tests passed 2/2. Prior local browser measurements documented below.
- Supersedes the local-only status of the UI entries below; production deployment status will be reported after Vercel completes.

## Remove Basic Info heading

- Removed the selected BASIC INFO heading in `app/player/[slug]/LockerView.tsx`; bio fields retained. Shared main Locker Bio route presentation only; this report updated.
- No database, migration, environment, permission, or graph changes. No workflow duplication or scope expansion.
- Validation: whitespace check passed; no new tests for a text removal. Local only, not deployed; no additional deferred work.

## Award card bottom spacing

- Summary/files: `components/player/EditorialCard.tsx` removes the fixed 400px award height and flexible body growth, leaving 12px total bottom padding below the action or unknown-source fallback. Width remains 260px. This report updated.
- Routes: private Locker Career/Awards. Database, migrations, environment, permissions: none.
- Validation: whitespace check passed. Browser measured both sample cards at approximately 334px high and 12px below the footer, replacing the previous unused bottom space. Samples have unknown-source fallbacks. No new tests for this style-only edit.
- Limitations/deferred: cards now vary in height with their content, as requested. Local only, not deployed. No graph changes, duplicated workflow, or scope expansion; persistent career presentation improved.

## Award action spacing

- Files/summary: `components/player/EditorialCard.tsx` replaces the award action's auto margin with 12px spacing below the description. Link padding, gap, rounded background, typography, and arrow treatment match the article button. Unknown-source fallback also uses 12px spacing. This report updated.
- Routes: private Locker Career/Awards. Fixed 260x400 card dimensions retained. Database/migrations/environment/permissions: none.
- Validation: whitespace check passed; browser measured both sample award cards at 260x400 with 12px description-to-footer gaps. These samples lack source links, so actual anchor appearance was checked by comparing its classes with the article button; no external link was opened. No new tests for this styling edit.
- Limitations/deferred: local only, not deployed. No graph changes or workflow duplication; career presentation remains useful across affiliations. No scope expansion.

## Photo link and complete inline article list

- Files/summary: `app/player/[slug]/LockerView.tsx` now labels the Photos link See all. Private preview articles render the complete list and omit View all articles. Individual article buttons use the existing safe external-article flow directly. This report updated.
- Routes: main Locker Photos link and private preview Media/Articles. Public article archive behavior preserved.
- Database, migrations, environment variables, permissions: none. No graph relationships changed or third-party workflow duplicated; persistent career presentation improved without scope expansion.
- Validation: TypeScript passed; browser confirmed See all, four inline article cards (previously three), and no View all articles button. Existing responsive card and natural container height rules retained. No new tests for this presentation change.
- Limitations/deferred: local only, not yet deployed. Articles without a valid destination omit the read action.

## Film Room link and article metadata

- Summary/files: `app/player/[slug]/LockerView.tsx` replaces the Film Room arrow with See all, retaining its video destination. `components/player/EditorialCard.tsx` reduces article metadata to 9px and normal capitalization, preserving recognized outlet acronyms. Article metadata is now below the Read article button; browser geometry verified all three sample cards place metadata below the button. Awards unchanged. This report updated.
- Routes: shared main Locker and private preview. Database, migrations, environment, permissions: none.
- Validation: scoped lint passed with warnings before capitalization helper; whitespace check passed. Browser verified See all and The Athletic / ESPN / Team Site metadata at 9px with normal capitalization. No full build repeated for these small presentation edits.
- Limitations/deferred: local only, not deployed; acronym handling covers common sports/news outlets. No graph relationships changed, no workflow duplicated, and no media-management scope added; presentation remains useful across career affiliations.

## Team logo pill contrast

- Summary/files: `app/player/[slug]/LockerView.tsx` adds a subtle 1px light edge and soft dark drop shadow to NFL/NCAA rotating pill logos; logo and pill dimensions unchanged. Affiliation label text also uses a subtle 0 1px 2px dark text shadow. This report updated.
- Routes: main private preview and shared Player Locker rotating affiliation pills.
- Database/migrations/environment/permissions: none. No Career/Moment/Value Graph changes, duplicated workflow, or scope expansion; career presentation remains useful across affiliations.
- Validation: local browser confirmed the new filter on all three rendered affiliation logos at their existing 22px size; whitespace check passed. No new tests or repeated full build for this inline style-only adjustment.
- Limitations/deferred: local only, not deployed. Shadow cannot repair missing logo assets.

## Mobile Photo Room portrait columns

- Summary/files: `app/player/[slug]/photos/photo-room.module.css` now uses two flowing columns below 641px for private Photo Room tiles. Portraits cannot stretch across a whole row; all photos preserve their natural aspect ratio and 12px spacing. This report also updated.
- Route: `/preview-lockers/[slug]/photos` only. Main Locker, tablet/desktop layout, and claim modal unchanged.
- Database, migrations, environment, permission changes: none.
- Manual verification: mobile 390px, 17 photos including seven portraits; all tiles measured 153px wide across two columns, natural aspect ratios preserved within 0.001, no horizontal overflow. Screenshot reviewed; tablet 768px retains flex layout. Viewport reset.
- Tests: whitespace check passed; production build passed. No new unit tests for CSS-only layout.
- Limitations/deferred: columns flow top-to-bottom; an odd image count may leave unequal column ends, without duplicating photos. Local only, not deployed.
- Product impact: presentation improvement remains useful throughout an athlete's career. No graph relationship changes, duplicated third-party workflow, or media-management scope expansion.

## Photo grid fit correction

- Summary: private main Locker desktop/tablet tiles now use each photo's natural aspect ratio to divide two rows. Row heights grow with the images instead of forcing a 420px crop. The existing mobile six-photo/three-row layout remains intact. Photo Room uses wrapping, aspect-ratio-sized tiles on all devices; full images fit their tiles without hover zoom cropping.
- Files: `app/player/[slug]/LockerView.tsx`, `app/player/[slug]/photos/PhotoRoomView.tsx`, `app/player/[slug]/photos/photo-room.module.css`, and this report.
- Routes: `/preview-lockers/[slug]` and `/preview-lockers/[slug]/photos`. Public styling preserved. Claim modal unchanged.
- Database, migrations, environment variables, permissions: none.
- Validation: TypeScript passed; scoped ESLint passed with 27 warnings and zero errors; preview renderer tests 2/2 passed; production build passed; git diff whitespace check passed.
- Manual verification: desktop 1440px and tablet 768px main tiles use contain and proportional widths; mobile 390px main remains six images in three rows with no horizontal overflow. Photo Room's 17-photo category at desktop and mobile matches natural photo ratios within 0.001, with no mobile page overflow; desktop screenshot reviewed. Temporary viewport reset.
- Known limitations: initial tiles use a square fallback until image dimensions load. Fixed desktop container height is intentionally replaced by natural row heights to avoid cropping and letterboxing. Existing source image quality and upstream crops cannot be restored by layout changes.
- Status/deferred: local only; this correction has not been committed or deployed to Vercel. No schema work is needed.
- Product direction: improves existing athlete media presentation and remains useful after organizational changes. No Career, Moment, or Value Graph relationships were changed, no third-party workflow duplicated, and no media-management scope added.

## Desktop/tablet hero headshot alignment

- Fixed private hero portrait cropping in `app/player/[slug]/LockerView.tsx`. At widths above 640px, the full portrait uses `object-fit: contain` in a 282px stage anchored directly above the name block. Removes dependence on the clipped, viewport-wide image and fixed offset on these devices. Existing mobile positioning and public Locker rendering retained.
- Route: private preview main Locker. No database, migration, environment, permission, or graph changes; no workflow duplication or media-management expansion. Claim modal unchanged.
- Validation: TypeScript and component lint passed (existing warnings). Browser checked desktop 1440px and tablet 768px; tablet measured portrait bottom aligned to heading top, entirely inside hero. Temporary viewport reset. No additional unit tests/full build for this CSS/layout correction.
- Status: local change, not yet committed or deployed. No other deferred work from this correction; prior release limitations remain documented below.

## Production database activation — 2026-09-14

- User explicitly approved the production Supabase dashboard and GitHub destination. The dashboard verified BLTZ / main / PRODUCTION (`drxtzxnwdtgxwueiqygf`). Physical backup available: 2026-09-14 08:03:47 UTC.
- Read-only preflight: 56 migration versions, latest `20260911223514`, ordered-history fingerprint `36e83bcd55c22cb0c2e930d4b95b10ac`; candidate table and new configuration columns absent.
- Corrected pending SQL dollar-quoting and a PL/pgSQL alias ambiguity before activation. Full migration packet passed a transaction ending in ROLLBACK, including award/video JSON validators, duplicate-device rejection, candidate RLS/grants, and zero anonymous media TTL.
- Applied the identical guarded packet atomically with migration statements recorded in the ledger. Read-back confirmed all four versions: `20260914184728`, `20260914213500`, `20260915003000`, `20260915010000`. No reset or history-only repair. These migrations are now immutable.
- Existing CLI transport failure still prevents full schema type regeneration. Live authenticated role/persistence walkthrough beyond migration assertions remains to be verified; no production test identities or fabricated claims were created.

## Release preparation — 2026-09-14

- Production Git base verified: `origin/main` = `b610291ed19393e754982383ffc84b0d5a39ab28`; Vercel project `bltz`, production alias `bltz.vercel.app`.
- Target check: local Supabase CLI points to staging `yevihzsgqagvuulymqum`; production inventory and `.env.local` identify `drxtzxnwdtgxwueiqygf`. No database mutation performed.
- Release validation: production build passed; full lint passed with warnings. Full suite: 692 passed, 9 failed, 24 skipped. All nine remaining failures reproduce in the untouched production baseline (authentication test expectations, development Film Room categories, and abbreviated team-label expectation). Baseline: 669 passed, 12 failed, 24 skipped. Updated stale private route mocks, photo fixture, and DTO expectations; no claim-modal design changes.
- Four forward migrations remain pending: `20260914184728`, `20260914213500`, `20260915003000`, `20260915010000`. No migration reset/history repair performed. Live schema, backups, RLS, audit creation, save round trips, and generated database types must be checked before production activation.
- Blocker: current CLI fails login-role transport. Automatic approval review rejected opening production SQL dashboard, requiring explicit approval for the exact production project and browser access path. Release branch can be pushed; production merge/deployment held to prevent shipping application code ahead of required database contracts.
- No environment or permission changes applied. Production browser verification deferred until migration and deployment. Prior feature sections document files/routes and Career Graph impact; no additional product scope added by this release preparation.

## Responsive main hero photos and video selection

- Objective / scope: apply the Photo Room fit-and-blur treatment to the private main slideshow; configure mobile portrait and larger-screen landscape hero videos. Existing product direction and shared Locker components retained. Claim modal excluded and unchanged.
- Files: `app/player/[slug]/LockerView.tsx`, `app/player/[slug]/page.tsx`; `lib/preview-lockers/mapper.ts`, `validation.ts`, `video.ts`; `app/admin/preview-lockers/PreviewLockerForm.tsx`; `app/dashboard/settings/HeroVideoSettings.tsx`, `settings-client.tsx`; `app/api/locker/hero-videos/route.ts`; two `tests/preview-lockers/hero-*.test.ts` files; migration below.
- Routes: private main Locker; public Player Locker consuming athlete selections; current preview admin editor; `/dashboard/settings`; new `/api/locker/hero-videos` GET/PUT. Mobile breakpoint is below 768px. Empty device selection falls back to photos; public legacy hero is retained until athlete configures the new settings. Playback failure also restores photos. Preview legacy direct hero URL remains desktop-only fallback.
- Data: preview video JSON gains optional `heroDevice` with at most one assignment per device; private uploaded sources retain signed URL/access expiry flow. Player Locker config references existing video IDs rather than duplicating video records. Portrait/landscape orientation is explicitly chosen by the editor, not automatically re-encoded or inferred.
- Database/migration: `20260915010000_locker_hero_devices.sql` adds nullable mobile/desktop video references, indexes, a configuration flag, validates same-athlete public playable video references, and audits changes. Existing RLS and admin guards retained. No new environment variables or broadened permissions.
- Validation: 9 targeted tests passed (device mapping, signed URLs, duplicate assignments, anonymous/non-owner rejection, origin/input checks, invalid choices, clearing selections, failed persistence). TypeScript passed; targeted lint passed with existing image/any warnings. Production build passed; subsequent fallback/validation refinements checked with TypeScript and targeted tests. Browser verified contain foreground and 28px blurred cover background on mobile and desktop; original viewport restored.
- Known limitation / deferred activation: migration NOT APPLIED. Linked database CLI access previously failed with TransportError in this task. Live database constraints, persisted dashboard/admin round trips, audit creation, and generated database types require verification/regeneration after migration deployment. Generated files were not hand-edited. Actual supplied portrait/landscape videos still need selection and playback QA; no production push or deployment performed.
- Product impact: improves athlete control of existing Locker-to-video presentation and the claim surface; remains useful across organizations. No new Career, Moment, or Value Graph entities/relationships, workflow duplication, or generalized media-management expansion.

## Award descriptions and scraper support

- Summary: each private award card displays an explanation. Reviewed manual text wins; known honors use definitions; unrecognized awards explicitly say “Description pending review.” All-American describes one of the best players at their position, not an exclusive national winner. Definition does not verify an athlete's award receipt.
- Files: `lib/preview-lockers/award-descriptions.ts`, `types.ts`, `validation.ts`, `discovery.ts`; `lib/pipeline/types.ts`, `lib/pipeline/scrapers/wikipedia.ts`; `app/admin/preview-lockers/PreviewLockerForm.tsx`; `app/player/[slug]/LockerView.tsx`; `components/player/EditorialCard.tsx`; `tests/preview-lockers/award-descriptions.test.ts`, `award-source.test.ts`; migration below.
- Routes: current private Locker and admin preview build/editor. Description field accepts up to 160 characters. Existing five recognized scraper awards gain descriptions, looking for definition sentences in the fetched source before using known definitions; other pipeline-provided descriptions persist through preview projection. No separate generalized web crawler introduced.
- Database/migration: authored `20260915003000_preview_award_descriptions.sql`, extending existing JSON validation with optional description while retaining year/label requirements and source URL support. NOT APPLIED due the unresolved linked Supabase TransportError previously verified in this task. Live SQL validation and type regeneration deferred; existing generated award column remains Json. Custom-description save round trip is therefore unverified and requires migration activation.
- Environment/permissions: unchanged; admin authorization and private-preview access remain intact.
- Validation: TypeScript, 17 targeted tests, lint (image warnings), and production build passed. Refreshed browser verified All-American and Lott descriptions below titles. Maintained 260 × 400px cards by reducing image region to 180px. No claim-modal changes.
- Sources: [AFCA awards](https://www.afca.com/awards/), [Heisman balloting](https://www.heisman.com/about-the-heisman/balloting-info/), [Lott award sponsor announcement](https://ausnewsroom.aus.com/news/finalists-announced-for-2025-lott-impact-trophy-presented-by-allied-universal). Known definitions are explanatory copy; source article links still refer to the athlete's award evidence separately.
- Limitations/deferred: manual review needed for unknown awards and scraper candidates; definition extraction only searches fetched source prose, not every award website. No deployment or database mutations. Earlier pending migrations remain pending.
- Product: improves understanding of career achievements and admin enrichment; no new Career/Moment/Value Graph schema, still useful after affiliation changes. No duplicated third-party workflow or generalized media-management drift.

## Awards page scrolling

`app/player/[slug]/LockerView.tsx`: removed the private-preview awards container's 440px height and inner vertical scrolling; hid its decorative scrollbar. Container now grows around all cards on mobile and desktop, retaining fixed card sizes and alignment. Existing route only; no database, migration, environment, permission or graph changes. ESLint passed with existing warnings. No additional tests/build or browser verification for this layout edit. Claim modal unchanged, no deployment or new deferred work; prior database activation pending. No workflow duplication or scope drift.

## Sticky room headers

`components/preview-lockers/PreviewRoomNav.tsx`, `app/player/[slug]/photos/PhotoRoomView.tsx`, and `app/player/[slug]/videos/FilmRoomView.tsx`: shared fixed mini-header appears after 320px of page scrolling, matching the Locker threshold, dark blurred surface, athlete image/name, search and CLAIM. Normal logo header remains at page top. Scroll listener cleaned up on unmount; hidden mini-header is not keyboard-focusable. Existing room routes only; no database, migration, environment, permission or graph changes. TypeScript and component lint passed with image warnings; no full build or browser/device verification. Claim modal unchanged. No deployment or new deferred work; prior database activation pending. No workflow duplication or scope drift.

## Darker Film Room scroll gradient

`app/player/[slug]/videos/film-room.module.css`: private-preview scroll overlay now darkens the upper hero as well, reaching 92% black at 48% and the opaque surface at 72%. Existing scroll-driven opacity retains an unobscured hero at page top. Existing route only; no database, migrations, environment, permission or graph changes. CSS reviewed; no tests/build or browser verification for this gradient adjustment. No deployment or new deferred work; prior database activation pending. Modal unchanged; no workflow duplication or scope drift.

## Opaque Film Room shelves

`app/player/[slug]/videos/film-room.module.css`: private-preview video-row stack uses the opaque Film Room surface with stacking isolation, covering the sticky hero behind rows and their gaps during page scrolling. Existing video route only; no database, migration, environment, permission or graph changes. Scoped CSS reviewed; no tests/build or browser verification for this background-only edit. Claim modal unchanged. No deployment or new deferred work; prior database activation pending. No workflow duplication or scope drift.

## Matched photo/film room navigation

Added shared `components/preview-lockers/PreviewRoomNav.tsx`; used by `app/player/[slug]/photos/PhotoRoomView.tsx` and `app/player/[slug]/videos/FilmRoomView.tsx` for private previews. Matches main Locker topbar: supplied 30px logo, 22px search, gold CLAIM, 16px action gap and 16px/12px vertical padding. Logo returns to Locker; CLAIM reuses current modal trigger. Public navbars and modal design untouched. Existing photo/video routes only; no database, migration, environment, permission or graph changes. TypeScript and lint passed (image warnings). Film Room browser verified CLAIM opens modal; no submission. No full build/device matrix; prior database activation pending. Existing YouTube Error 153 observed separately, not caused by navigation. No deployment, workflow duplication or scope drift; supports existing claim entry across rooms.

## Recovered Film Room shelves

- Summary: found existing shared `FilmRoomView` with the requested featured hero and horizontal career shelves; private preview had bypassed it for a source list. Reconnected it instead of creating a duplicate layout.
- Files: `app/preview-lockers/[slug]/videos/page.tsx`, `app/player/[slug]/videos/FilmRoomView.tsx`, `film-room.module.css`, `lib/preview-lockers/mapper.ts`, this report.
- Route: existing `/preview-lockers/[slug]/videos`. Photo-room-sized hero, HS/CFB/PRO/OFF THE FIELD rows, honest empty categories, horizontal shelf scrolling and natural vertical page flow. Claim section at bottom. Existing preview detail routes retained. Public analytics excluded for private previews.
- Database, migrations, environment and permission changes: none. Existing private server access checks and conversion flag retained. No records edited or published.
- Validation: TypeScript and 9 focused preview/video tests passed. ESLint passed. Production build passed before final empty-category/detail-link adjustments; final build rerun recorded in `output/preview-change-validation-20260914/film-layout-build.log`.
- Manual: local browser showed categorized shelves, HS empty state, and selecting PRO updated the featured video/title/detail link. Actual third-party playback could not be confirmed (embedded frame reports about:blank). Full device matrix and multi-item shelf scrolling unverified with this three-video sample.
- Limitations/deferred work: categories use existing title-based inference, defaulting to CFB; no explicit per-video category editor added. Provider playback restrictions remain possible. Existing unrelated database migrations still pending; no deployment.
- Product: improves existing career-media presentation and claim entry; no new Career/Moment/Value Graph schema. Remains useful after team changes, reuses current player, no third-party workflow duplication or generalized media-management drift.

## Wide mobile hero photos

`app/player/[slug]/photos/photo-room.module.css` and `PhotoRoomView.tsx`: all private-preview hero photos now use contain sizing without zoom at every screen width. Wide mobile images remain fully visible with existing blurred backdrop filling above/below; portraits retain side fill. Removed obsolete portrait-only class reference. Existing route only; no database, migration, environment, permission or graph changes. TypeScript passed; no new tests/build or browser verification for this sizing change. No deployment or new deferred work; prior database activation pending. Claim modal unchanged; no workflow duplication or scope drift.

## Mobile blurred portrait edges

`app/player/[slug]/photos/photo-room.module.css`: enabled the existing decorative blurred backdrop at all screen sizes. Mobile portrait foreground remains contained, with empty sides filled by the same darkened blurred photo. Existing private-preview photo route only; no database, migration, environment, permission or graph changes. CSS reviewed; no tests/build or browser verification for this breakpoint-only change. No deployment or new deferred work; prior database activation pending. Claim modal unchanged; no workflow duplication or scope drift.

## Mobile portrait hero fit

`app/player/[slug]/photos/PhotoRoomView.tsx` and `photo-room.module.css`: detect portrait hero photos from actual loaded dimensions (or supplied dimensions) and contain them without zoom cropping, including on mobile. Landscape behavior and desktop blurred backdrop retained. Existing route only; no database, migration, environment, permissions or graph changes. TypeScript checked; no new tests/build or browser verification for this sizing fix. No deployment or new deferred work; prior database activation pending. Claim modal unchanged; no workflow duplication or scope drift.

## Blurred photo viewer sides on larger screens

`app/player/[slug]/photos/PhotoRoomView.tsx` and `photo-room.module.css`: at 900px and above, private-preview featured photos remain fully visible with contain sizing; a blurred, darkened copy of the active photo fills the container behind them. Backdrop follows selection/slideshow and is decorative for accessibility. Mobile presentation and claim modal unchanged. Existing route only; no database, migrations, environment, permission or graph changes. TypeScript and ESLint passed (image warnings); no added tests/build or manual browser verification for this presentation change. No deployment or new deferred work; prior database activation pending. No workflow duplication or scope drift.

## PNG tiles without text overlays

`app/player/[slug]/photos/PhotoRoomView.tsx`: interpreted request as no visible text on transparent PNG tiles. Private-preview PNGs identified by MIME type or URL extension now omit title/license text and shading overlays; alt text and accessible button labels remain. Applies to all recognized PNGs because transparency metadata is unavailable; other photo formats unchanged. Existing route only, no database, migrations, environment, permission or graph changes. TypeScript passed; no additional tests/build or browser verification for this conditional presentation edit. No deployment; prior database activation pending. No workflow duplication or scope drift.

## Dimension-driven photo bento

`app/player/[slug]/photos/PhotoRoomView.tsx` and `photo-room.module.css`: private-preview tiles use supplied dimensions or loaded natural image dimensions rather than an index-based repeating pattern. Landscape photos span two columns, portraits span two rows, near-square photos use one cell. Images fill rounded tiles with cover cropping; grid grows vertically and retains gaps. Public gallery unchanged. Existing route only; no database, migrations, environment, permissions or graph changes. TypeScript and lint passed (image warnings); no new tests/build or browser verification. Tiles may rearrange when previously unknown dimensions load; cover can crop edges. No deployment or new deferred work beyond prior database activation. No workflow duplication or scope drift.

## Rounded and spaced photo tiles

`app/player/[slug]/photos/photo-room.module.css`: private-preview bento tiles now have 20px corner radii and 12px gaps. Existing photo route only; no database, migration, environment, permission or graph changes. Scoped CSS reviewed; no tests/build or manual browser verification for this simple styling edit. No deployment or new deferred work; prior database activation pending. Claim modal unchanged; no workflow duplication or scope drift.

## Removed photo-room source list

`app/preview-lockers/[slug]/photos/page.tsx`: removed the visible source-and-credit list and its heading beneath the gallery. Back link and bottom claim section retained; stored source/credit metadata unchanged. Existing route only; no database, migration, environment, permission or graph changes. ESLint passed; no additional tests/build or browser verification for this markup removal. No deployment or new deferred work; prior database activation pending. No workflow duplication or scope drift.

## Photo room page flow

Moved `ConversionSurface` after the gallery and source-credit section in `app/preview-lockers/[slug]/photos/page.tsx`. `PhotoRoomView.tsx` and `photo-room.module.css` scope natural-height gallery behavior to private previews: no inner height cap or scrolling, two mobile/four desktop bento columns fitting available width, and no translated gallery offset. Existing photo-room route only; no database, migration, environment, permission or graph changes. Modal design and source credits retained. TypeScript passed before final CSS-only adjustment; ESLint passed with image warnings. Full browser/device verification not performed; no new tests/build or deployment. Prior database activation remains pending. No workflow duplication or scope drift; presentation remains useful across team affiliations.

## Supplied navigation logo

Copied user-supplied PNG to `public/images/preview-nav-logo.png` and updated `lib/preview-lockers/mapper.ts` to use it on the main private-preview Locker. Existing 30px logo height and navbar spacing preserved. No route, database, migration, environment, permission or graph changes. ESLint passed; no additional tests/build or browser verification for this asset replacement. Modal unchanged, no deployment or new deferred work; prior database activation pending. No workflow duplication or scope drift.

## Main topbar CLAIM button

`app/player/[slug]/LockerView.tsx`: replaced the private-preview main topbar user image with a gold CLAIM button invoking the existing claim-modal trigger. Sticky navigation, public Locker avatar and modal design preserved. Existing route only; no database, migrations, environment, permission or graph changes. TypeScript passed; no added tests/build or browser verification for the reused trigger. Requires existing conversion feature flag. No deployment or new deferred work; prior database activation pending. Supports the existing claim loop without new graph entities, workflow duplication or scope drift.

## Photo count pill position

`app/player/[slug]/LockerView.tsx`: consolidated duplicate `.locker-photo-more` rules whose combined top/bottom offsets stretched the pill. Count now uses bottom-right offsets, content-sized dimensions and no wrapping. Shared Locker photo presentation only; no new routes, database, migration, environment, permission or graph changes. Claim modal untouched. ESLint passed with existing warnings; no additional tests/build or browser verification for this CSS fix. No deployment or new deferred work; prior database activation remains pending. No workflow duplication or scope drift; presentation remains useful across affiliations.

## Navigation CLAIM action

`app/player/[slug]/LockerView.tsx` changes private-preview navigation FOLLOW to CLAIM with dialog semantics; clicking invokes the existing footer claim trigger in `components/preview-lockers/ConversionJourney.tsx`. Reuses the same modal, form setup and claim-click tracking. Public Locker follow behavior and modal design remain unchanged. Existing routes only; no database, migrations, environment, permissions or graph changes. Requires existing `PREVIEW_CONVERSION_ENABLED` configuration. TypeScript, five conversion tests and lint passed (existing warnings). Browser verified navigation CLAIM opens the existing form; no form submitted. No production build/deployment for this small interaction change. Prior database activation remains pending. Strengthens entry into the existing claim loop; no new graph entities, workflow duplication or scope drift.

## Responsive unboxed bottom claim section

`components/preview-lockers/ConversionJourney.tsx`: bottom CTA heading is bold, gold, uppercase and a single line, scaling with the section width up to 48px. Removed section background and border. Claim modal and trigger behavior untouched. Existing preview route only; no database, migration, environment, permission or graph changes. Component ESLint passed; narrow browser verified single-line heading and unboxed section. No additional tests/build for this styling-only edit. No deployment or new deferred work; prior award-source database activation remains pending. No workflow duplication or scope drift; presentation remains useful across team affiliations.

## Horizontal article cards on mobile only

`app/globals.css`: below 640px, preview articles stack in one column with a small square thumbnail on the left and left-aligned text/action on the right. Rounded black styling retained; larger-screen card layout unchanged. Applies to main articles and archive, not awards or the claim modal. Existing routes only; no database, migration, environment, permission or graph changes. TypeScript passed and narrow browser screenshot verified the horizontal stacked layout. No new tests/build for this CSS-only edit. Existing failed remote article image remains; prior database activation pending. No deployment, workflow duplication, scope drift or new deferred work. Presentation remains useful beyond affiliations.

## Unclipped article copy

`app/globals.css`: removed article title/description two-line clipping and prevented text flex shrinking. Article cards now use 400px minimum height with automatic growth, preserving two columns and existing image dimensions. Existing private-preview route and article archive only; no database, migrations, environment, permissions or graph changes. Claim modal unchanged. TypeScript passed; narrow local browser screenshot confirmed full text and buttons in both columns. No additional tests/build for this CSS fix. No deployment or new deferred work; prior database activation remains pending. Existing remote image failure observed separately. No workflow duplication or scope drift; presentation remains useful across affiliations.

## Two-column articles on smaller screens

`app/player/[slug]/LockerView.tsx` and `app/globals.css`: main preview article grid keeps two columns below 900px, each capped at 260px and shrinking to fit. Card height remains 400px; compact action spacing fits narrower cards. “View all articles” still spans both columns and centers underneath. Existing route only, claim modal unchanged; no database, migrations, environment, permission or graph changes. ESLint passed with existing warnings. No new tests/build or manual browser verification for this CSS-only layout adjustment; no deployment or new deferred work. Prior award-link database activation remains pending. No workflow duplication or scope drift; presentation remains useful across affiliations.

## Centered compact media widths

Changed `app/player/[slug]/LockerView.tsx` and `app/globals.css` to center private-preview media groups and cap widths: articles remain 260 × 400px at every breakpoint; Shorts/Podcasts use columns capped at 220px, Social at 244px, shrinking on narrow screens. Sections retain automatic height/page scrolling, existing card aspect ratios and podcast height. Article archive uses the same compact article dimensions. Claim modal unchanged. Existing route only; no database, migrations, environment, permissions or graph changes. TypeScript and lint passed (existing warnings). Browser verified centered Social cards in the current viewport; full device matrix not tested. No added tests/build for CSS layout changes, no deployment, new deferred UI work, duplicated workflows or scope drift. Prior award-link database activation remains pending; changes remain useful beyond team affiliation.

## Page scrolling for media sections

`app/player/[slug]/LockerView.tsx`: private-preview Shorts and Social use automatic content height and visible overflow instead of 408px inner scroll areas; their decorative scrollbar indicators are removed. Podcasts already have an unconstrained grid and retain page scrolling. Card dimensions and viewer dialogs remain unchanged. Existing preview route only; no database, migration, environment, permissions or graph changes. TypeScript and lint passed (existing lint warnings); no new tests/build for this layout change. Local browser confirmed Shorts renders its four entries; full device-matrix scrolling verification not performed. No deployment, new workflow duplication, scope drift or deferred UI work; prior award-source database activation remains pending. These presentation changes remain useful across team affiliations.

## Centered article archive button

`app/player/[slug]/LockerView.tsx`: private-preview “View all articles” spans every grid column and centers beneath the cards at all breakpoints. Existing route only; no database, migration, environment, permission, or graph changes. Claim modal untouched. ESLint passed with existing warnings; no additional tests/build or manual browser verification for this layout-only change. Not deployed. No new limitations, workflow duplication, scope drift or deferred UI work; prior database activation remains pending.

## Compact articles on smaller devices

Private-preview articles below 640px now use centered, non-stretching 260 × 400px black rounded cards in both the main page and article archive. Fixed 230px photos leave room for source, title, description and action; long copy is visually clamped. Changed `components/player/EditorialCard.tsx`, `app/player/[slug]/LockerView.tsx`, and `app/globals.css`. Existing preview route only, no database/migration/environment/permission changes. Claim modal untouched. Component lint passed with image warnings; TypeScript passed before final padding-only adjustment. Browser verified centered compact articles at the current narrow viewport. No new tests or build for this responsive styling change. No deployment, graph changes, workflow duplication or media-management scope drift. Remains useful beyond team affiliation. Full device matrix unverified; prior award-source database activation still pending.

## Fixed preview award cards and bottom claim heading

- Summary: bottom CTA heading is uppercase BLTZ gold. Claim modal markup and behavior were not changed in this task. Optional proposed CTA polish: a thin gold border and larger action button, not implemented.
- Files: `components/preview-lockers/ConversionJourney.tsx`, `components/player/EditorialCard.tsx`, `app/player/[slug]/LockerView.tsx`, `app/admin/preview-lockers/PreviewLockerForm.tsx`, `lib/preview-lockers/{types,validation,discovery}.ts`, `tests/preview-lockers/award-source.test.ts`, and the migration below.
- Routes: existing `/preview-lockers/[slug]` awards and `/admin/preview-lockers` editor. Fixed 260 × 400px cards, 264px photo region, rounded black design, gold year above title, source action or literal “unknown”. Cards wrap centered below 640px and align left above; no stretch to scroll-container height. Shared public award presentation preserved.
- Database/migration: `20260914213500_preview_award_sources.sql` extends existing JSON award validation with optional HTTPS `sourceUrl`, preserving required year/label and existing permissions. **Not applied**: linked Supabase CLI fails login-role initialization with `TransportError`, including after resolving local telemetry permissions. Generated column types remain JSON; live regeneration and database round-trip verification deferred until connection is restored.
- Environment and permissions: no changes. No production deployment or records modified.
- Validation: TypeScript passed; component lint has no errors (image/existing warnings). Production build passed before final padding-only adjustment. Focused tests: 33 passed, 1 existing failure expecting the removed `privateDemo` property. New source/year preservation and unsafe URL tests passed.
- Manual verification: local browser showed gold CTA and fixed award cards. Existing Keith Rivers awards have no saved year or source, correctly displaying unknown; no year inferred or article fabricated. Complete responsive device-matrix verification and source persistence remain unverified.
- Limitations/deferred work: apply migration before saving award links; previously dropped sources cannot be restored automatically. Use admin year/article fields or review a new scraper result. No further modal changes authorized.
- Product direction: preserves award-to-source references in preview/claim workflow, useful beyond team affiliation. No Moment/Value Graph changes, duplicated third-party workflows, or generalized media-management expansion.

## Reduced heading top spacing

`components/preview-lockers/ConversionJourney.tsx`: reduced inner top padding by 12px on mobile and 16px on larger screens, preserving close-icon and scrollbar alignment. Component ESLint passed; no additional tests, build or manual browser verification for this spacing-only edit. Existing preview-locker route only; no database, migration, environment, permission or graph changes. The claim flow remains useful across organization changes; no third-party workflow duplication or media-management scope drift. Not deployed; prior backend activation remains pending. No new limitations or deferred UI work.

## Responsive referral notes

`ReferralEditor.tsx`: both note lines scale with the player-entry container, capped at 12px. The permission sentence explicitly stays on one line; the submission note retains its separate line. Lint and TypeScript checks run; no additional tests/build or browser verification for this typography-only edit. Existing modal only; no route, database, migration, environment, authorization or graph changes. Not deployed; prior backend activation remains pending. No new workflow or deferred UI work.

## Smaller permission text

`ConversionJourney.tsx`: reduced permission text from 14px to 12px, preserving left alignment and checkbox size. Component lint run; no additional tests or manual verification for this typography-only edit. Existing modal only; no route, database, migration, environment, authorization or graph changes. Not deployed; prior backend activation remains pending. No new limitations or deferred UI work.

## Permission text alignment

`ConversionJourney.tsx`: permission text now aligns left while retaining the centered checkbox/text group. Lint passed; no additional tests or manual verification for this alignment-only edit. Existing modal only; no route, database, migration, environment, authorization or graph changes. Not deployed; prior backend activation remains pending. No new limitations or deferred UI work.

## Gold Calendly invitation

`CalendlyBooking.tsx`: invitation text changed to BLTZ gold (`#ffbb00`); responsive single-line sizing retained. Component lint run; no additional tests, build or browser verification for this color-only edit. Existing modal only; no route, database, migration, environment, permission or graph changes. No deployment. Prior backend activation remains pending; no new limitations or deferred UI work.

## Single-line Calendly invitation

`CalendlyBooking.tsx`: invitation now uses a no-wrap line with font sizing relative to its container, capped at 14px. Verified at the current narrow browser width; lint and TypeScript passed. No additional tests/build for this text-sizing-only edit. Existing modal only; no route, database, migration, environment, authorization or graph changes. Not deployed; prior backend activation remains pending. No new workflow or deferred UI work.

## Gold availability notice

`ConversionJourney.tsx`: set the 48-hour notice to BLTZ gold (`#ffbb00`). Lint passed; no additional tests or browser verification for this color-only change. Existing modal only; no route, database, migration, environment, authorization or graph changes. Not deployed. Prior backend activation remains pending; no new limitations or deferred UI work.

## Responsive heading and notice follow-up

`ConversionJourney.tsx`: added a line break after “This is not a claim to rights.”, reduced the 48-hour notice to 12px, and made CLAIM YOUR LOCKER a single line with responsive clamped font sizing. Kept the longer self-referral heading able to wrap. Browser verified the single-line title at the current narrow viewport and separate notice lines in the accessibility tree. Lint, five existing form tests and production build validation run (`output/preview-change-validation-20260914/modal-text-build.log`). Existing modal only; no routes, database, migrations, environment, authorization or graph changes. No deployment or real submission; prior backend activation remains pending. No new workflow introduced.

## Equal action widths follow-up

`ReferralEditor.tsx` and `ConversionJourney.tsx`: both Add a player and CLAIM NOW now use a fixed 176px width, capped to available space. Preserved the referral button's current outlined appearance. Browser verified matching visible widths. Existing form tests, lint and build validation run (`output/preview-change-validation-20260914/equal-buttons-build.log`). Existing modal only; no route, database, migration, environment, permission or graph changes. No deployment or real submission; prior backend activation remains pending. No new workflow introduced.

## Required referral email follow-up

Changed `ReferralEditor.tsx`, `ConversionJourney.tsx`, shared `conversion.ts` validation and `claim-details.test.ts`: referred player name/email have asterisks and are required; phone is explicitly optional. Both checkmark validation and the claim API reject phone-only referrals. The outgoing referral payload includes its required email. Reduced the rights notice's top margin by 24px. Browser verified labels and spacing; 12 focused API/form/schema tests passed, lint and type checking passed. Build log: `output/preview-change-validation-20260914/referral-required-build.log`. Existing modal/API routes only; no new routes, database/migration, environment or authorization changes. No deployment or real submission. Existing database rollout limitations remain; no new graph schema or duplicated third-party workflow.

## Referral note placement follow-up

`ReferralEditor.tsx`: moved the two-line permission/submission note inside the expanded Add a player container, above its fields. Existing modal route only; no database, migration, environment, permission or graph changes. Lint, type checking and existing form tests run; build log: `output/preview-change-validation-20260914/referral-note-build.log`. No new browser verification or real submission for this text relocation. No deployment; prior backend activation remains pending. No additional workflow or UI scope introduced.

## Mobile scrollbar visibility follow-up

Changed `ConversionJourney.tsx` and `app/globals.css`: below 768px, the modal scrollbar is transparent until scrolling, then hides after 900ms of inactivity. Scrollbar space is retained to avoid layout shifts; desktop appearance is unchanged. Timer is cleared on close/unmount. Added a visibility lifecycle test to `conversion-journey.test.tsx`; five tests, type checking and lint passed. Build log: `output/preview-change-validation-20260914/mobile-scroll-build.log`. Local page loads; mobile timing is covered by the automated test, not a physical-device check. Existing modal only: no routes, database, migrations, environment, authorization or graph changes. No deployment or real submissions. Prior backend activation remains pending; no duplicated external workflow.

## Close control inset follow-up

`ConversionJourney.tsx`: moved the close icon and scrollbar 12px inward together, and the close icon 8px down from the top edge. Adjusted inner scroll height to preserve modal bounds. Browser verified alignment and clearance. Type checking, lint and four existing form tests passed; build log: `output/preview-change-validation-20260914/close-inset-build.log`. No route, database, migration, environment, authorization or graph changes. No deployment or real submission; prior backend activation remains pending. No additional UI work deferred or workflow duplicated.

## Larger close icon follow-up

`ConversionJourney.tsx`: increased the close SVG from 22px to 28px with a heavier stroke; adjusted its button width/offset to preserve the scrollbar centerline. Browser verified at mobile width; lint and type checking passed. Existing conversion tests/build run recorded in `output/preview-change-validation-20260914/close-icon-build.log` (build). No routes, database, migrations, environment, authorization or graph changes; no deployment. Prior backend rollout remains pending. No new workflow or deferred UI work.

## Permission and field-size follow-up

`ConversionJourney.tsx`: centered permission label/checkbox as a group, increased checkbox from 16px to 20px, marked Email with an asterisk and retained required validation/accessibility label, reduced Email and missing-content field text to 14px, enlarged close icon from 16px to 22px while retaining its scrollbar-column alignment. Browser verified. Type checking, lint and four conversion-journey tests passed; build log: `output/preview-change-validation-20260914/modal-permission-build.log`. Existing modal route only; no database, migration, environment, permission or graph changes. No deployment or real submissions; prior backend rollout remains pending. Presentation refinement only, with no duplicated third-party workflow.

## Close-button and invitation follow-up

Changed `ConversionJourney.tsx`, `CalendlyBooking.tsx` and `ReferralEditor.tsx`: the modal's own accessible close button now sits above the scrollbar in the same vertical column; invitation reads “There’s more inside. Book a call to see.”; referral heading margin reduced by 8px; claim action margin increased by 12px. Verified visually in the browser. Type checking, lint and four conversion-journey tests passed. Build log: `output/preview-change-validation-20260914/modal-invitation-build.log`. Existing modal only; no route, database, migration, environment, permission or graph changes. No deployment or real submission; existing backend activation remains pending. No external workflow duplicated.

## Inset scrolling follow-up

`ConversionJourney.tsx` now keeps scrolling in an inner container, inset 8px from the modal shell, preserving the rounded border and stationary close button. `ReferralEditor.tsx` adds 8px above the gold referral heading and an explicit line break after the contact-permission sentence. Existing modal routes only; no database, migration, environment or permission changes. Browser verification confirmed scrollbar placement, spacing, color and line break. Type checking, lint and four conversion-journey tests passed; build log: `output/preview-change-validation-20260914/modal-scroll-build.log`. No deployment; previously pending backend work unchanged. Presentation-only claim-loop refinement with no new graph relationships or duplicated workflows.

## Compact referral editor follow-up

Modal title is now **CLAIM YOUR LOCKER**. `ReferralEditor.tsx` provides a smaller add-player button, compact gray fields with left-aligned placeholders, a checkmark to validate and add a player to the pending list, and accessible × controls to cancel an entry or remove a listed player. `ConversionJourney.tsx` retains the list for the final claim payload and blocks claim submission while an entry is unfinished. `conversion.ts` shares the existing referral validation schema with the editor. Updated the conversion-journey tests for invalid-entry rejection, list confirmation and removal.

The checkmark records a pending entry in the current form; durable submission still occurs with CLAIM NOW and remains subject to the previously documented database rollout blocker. No new routes, database fields, migrations, environment variables or permissions. Type checking, component lint and six focused UI/validation tests passed; production build log is `output/preview-change-validation-20260914/referral-editor-build.log`. Browser verification confirmed compact fields, placeholders, checkmark and disabled claim button while editing; no real contact submitted. No commit/deployment. This refines the existing career-referral/claim loop without adding graph schemas or duplicating third-party workflows.

## Modal polish follow-up

Changed `ConversionJourney.tsx` and `app/globals.css`: centered BLTZ-gold title; Email and What's missing prompts inside gray controls with screen-reader labels retained; centered referral section/button; smaller gap above Not interested; transparent scoped scrollbar track. Updated existing preview modal only, with no route, database, migration, environment or permission changes. Browser verification confirmed the mobile presentation. Type checking, component lint and three conversion-journey tests passed. Build log: `output/preview-change-validation-20260914/modal-polish-build.log`. No claim was submitted or deployment made; prior backend activation remains deferred. Presentation-only improvement to the claim loop; no new graph relationships or duplicated external workflow.

## Modal layout follow-up

Updated `ConversionJourney.tsx` and `CalendlyBooking.tsx`: email directly below the heading, followed by missing-content feedback and contact permission; removed the dashboard-interest checkbox and its outgoing field. Calendly, the gold **CLAIM NOW** action, and the shortened rights/demo notice are centered. The modal uses the Locker's navy surface, gold focus/action treatment, subtle borders and rounded containers. Referral inputs and required contact permission remain available. Updated the existing conversion-journey test to reflect the removed checkbox.

Routes: existing preview claim modal only. No new database, migration, environment or authorization changes. Browser verification confirmed ordering, centering and removal of the requested disclaimer paragraph. Type checking and all three conversion-journey tests passed; component/test lint passed. Build log: `output/preview-change-validation-20260914/modal-layout-build.log`. No real request submitted, commit or deployment. Prior database activation limitations remain unchanged. This is a presentation refinement to the Locker claim loop; no new Career, Moment or Value Graph relationships or duplicated third-party workflows.

## Calendly follow-up

The supplied `https://calendly.com/godchoseme20/15min` is now connected directly in `components/preview-lockers/CalendlyBooking.tsx`, rendered by `ConversionJourney.tsx` inside the claim dialog. The blue badge uses the requested “Schedule time with me” label, white text and Calendly branding. Clicking expands Calendly's official inline widget inside the existing modal so its focus trap does not block a separate vendor popup. The widget script loads on demand; a direct booking link remains available as a fallback. The earlier booking-URL setup instructions below are superseded for this modal.

Browser verification: the calendar loaded, displayed available dates and identified the event as **Dashboard Review, 30 min**. No appointment was booked and no claim/referral data was forwarded to Calendly. Closing the calendar preserves form fields. Type checking, component lint and the three existing conversion-journey tests passed. Production build validation is recorded in `output/preview-change-validation-20260914/calendly-build.log`.

This follow-up changes the existing preview modal only: no new routes, database changes, migrations, environment variables or authorization changes. It supports the Locker review/claim loop; no Moment or Value Graph changes or duplicate scheduling backend. Prior database activation remains pending. Booking confirmation synchronization is deferred; the link opening is not a verified booking. No commit or deployment was made.

## Summary and status

Implemented locally: clean hero (no grid), first-frame previews for playable hosted videos, the bottom claim CTA and accessible modal, email/contact consent, dashboard review interest, feature requests, up to ten player nominations, and article/award cards following the supplied black-card reference.

The database migration is authored but **not applied or database-tested**. Docker Desktop timed out starting; Supabase CLI queries and project listing failed with transport errors. Do not deploy the application changes before validating and applying the migration. Claim submission checks for migration readiness so an old RPC cannot acknowledge a request while dropping its new fields. Admins may still inspect drafts when the expiry RPC is not installed; athlete requests fail closed.

## Files changed

- `app/player/[slug]/LockerView.tsx`: shared hero/card updates and a footer slot inside the scrolling Locker.
- `components/player/EditorialCard.tsx`: shared article and honor presentation.
- `components/player/VideoPreview.tsx`: paint/restore the opening frame without autoplay; retain desktop mouse-hover playback.
- `lib/preview-lockers/mapper.ts`: pass playable video URLs to the component; remove the private-demo fallback from the hero level label.
- `app/preview-lockers/layout.tsx`: remove the top notice while retaining authentication, noindex and no-referrer.
- `app/preview-lockers/[slug]/page.tsx`: position the claim surface at the bottom.
- `components/preview-lockers/ConversionJourney.tsx`: dialog, request details, referrals, disclaimer, pending/error/saved states, existing self-referral flow.
- `lib/preview-lockers/conversion.ts`, `app/api/preview-conversion/route.ts`: input bounds and migration-readiness guard.
- `lib/preview-lockers/server.ts`: bound signed links to remaining access lifetime.
- `app/admin/preview-lockers/requests/page.tsx`, `app/admin/preview-lockers/page.tsx`: private request/referral review queue and navigation.
- `app/admin/preview-lockers/PreviewViewerAccess.tsx`: explain expiration and renewal.
- Tests: `claim-details.test.ts`, `conversion-api.test.ts`, `conversion-journey.test.tsx`, `media-read.regression-1.test.ts`, `viewer-access.test.tsx` under `tests/preview-lockers`.

## Routes

Changed `/preview-lockers/[slug]` and shared `/player/[slug]` visuals; `/api/preview-conversion`; Admin preview list/editor. Added `/admin/preview-lockers/requests`. The queue links each request to its originating preview editor and groups referred candidates under that request. Photo/film rooms retain their existing conversion surfaces.

## Database and migration

`supabase/migrations/20260914184728_preview_claim_requests_and_expiry.sql` adds a bounded `feature_requests` field and normalized `preview_locker_candidates`, linked to the referring preview response. The existing transaction writes responses, nominations and an audit event atomically. Existing response serialization prevents duplicate nominations on retries. These are contact suggestions, not confirmed claims or permission to contact a nominee automatically.

The RLS viewer predicate expires grants 48 hours after `assigned_at`. Assigning the same account after expiration renews access; assigning it again while active preserves the original deadline. Staff remain able to edit drafts. Signed uploaded-media links are capped at the remaining deadline (maximum 15 minutes). Previously downloaded/cached bytes cannot be revoked.

Pending: validate migration against a database, apply it through the normal migration workflow, regenerate Supabase types, and perform database permission/expiry/persistence checks. Do not apply unrelated historical migrations blindly.

## Environment and permissions

Local untracked `.env.local`: `PREVIEW_CONVERSION_ENABLED=true` to show the form for review. Production flag unchanged. Existing conversion campaign enrollment is required before athletes can submit interest; Admin/test activity remains excluded. `PREVIEW_BOOKING_URL` is optional and still unset. No secrets added to tracked files.

New candidate reads are restricted to internal Admin by RLS and server authorization. Viewers cannot list referral contact details. The database expiry rule narrows existing viewer access. No canonical identity, ownership, media-rights, or account-role changes.

## Scheduling

For Google Meet, create a Google Calendar **Appointment schedule**, choose availability and Google Meet conferencing, save, and copy its booking-page URL into `PREVIEW_BOOKING_URL`. See https://support.google.com/calendar/answer/10729749 and https://support.google.com/calendar/answer/10733297 . An existing Microsoft Bookings URL can also be used for Teams. A booking-link click is tracked separately from a confirmed appointment; no automatic meeting confirmation integration was added. Without a link, the saved dashboard review request lets BLTZ coordinate directly.

## Validation and manual verification

- Production build passed (existing `@theme` / `@custom-variant` CSS warnings).
- Type checking and `git diff --check` passed.
- Full lint: zero errors, 201 warnings.
- Focused claim, API, media-expiry, video, renderer, branding tests: 24 passed; an additional readiness test passed with the five-test API suite. Viewer-access tests: two passed after updating renewal-button wording.
- Full suite initially: 671 passed, 13 failed, 24 skipped. One failure was the changed renewal label and is fixed/verified. Remaining failures concern existing auth/recovery behavior, old preview-route mocks, public-video demo categories, and preview mapper/stat expectations. The full suite is not green.
- Browser: authenticated local Keith Rivers Locker loads; top notice absent; bottom CTA opens dialog; add-player fields and scrollable mobile layout verified; Escape closes dialog; updated article card checked visually. No real claim/referral was submitted. Desktop layout and actual video decoding were not visually verified.

## Known limitations and deferred work

Database activation, regenerated types, SQL/RLS tests and end-to-end saved-request verification remain blocked by database connectivity. Scheduling needs the user's booking URL. Provider embeds use provider thumbnails; a literal first frame is available for directly playable hosted video files. No production deployment or commit performed in this task.

## Product direction

The work strengthens Locker interest and career-recovery referral provenance without creating duplicate athlete identities. It remains useful after athletes leave organizations. No Moment/Value Graph schema or generalized media-management workflow was introduced. The referenced Product Doctrine file is absent in this checkout; this incremental work follows the supplied AGENTS.md product direction.
