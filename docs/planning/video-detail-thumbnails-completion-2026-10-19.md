# Video detail sidebar thumbnails - October 19, 2026

## Objective and scope
Show the same real thumbnails on individual-video sidebar cards as in the Film Room. Product reference: user request and docs/product/BLTZ_PRODUCT_DOCTRINE.md. Reuse the existing shared VideoPreview renderer and supplied authorized video list. No ingestion, data model, server permission or layout redesign.

## Debug report
**Status: DONE (local implementation and verification).**

**Symptom:** Seven of Antoine Cason's 16 detail-page video cards showed a blue play placeholder despite corresponding Film Room cards having media.

**Root cause:** VideoListItem rendered only a persisted thumbnailUrl and otherwise immediately chose the placeholder. It omitted the Film Room's shared YouTube thumbnail derivation and uploaded-video first-frame rendering. Production DOM confirmed five discovered YouTube cards and two uploaded clips lacked thumbnail elements, while the Film Room had their images/frames.

**Fix:** The detail cards use VideoPreview with previewOnHover=false. Saved posters remain preferred; YouTube embeds derive the same hqdefault image as the Film Room; uploaded clips seek to a paused first frame using metadata preload. The existing play placeholder remains underneath for unavailable sources. Small sidebar cards do not start hover playback or create YouTube preview iframes. Film Room hover previews retain their default behavior. VideoListItem is exported for regression verification; no route contract changed.

**Regression evidence:** Before implementing the rendering fix, two new tests failed on the actual card: missing derived YouTube image and missing uploaded-video element. Both passed after the fix. Additional tests cover static sidebar hover behavior, metadata-only frame loading, existing posters, link/current-page semantics, title/duration and missing-source fallback.

## Completion report
1. **Summary:** Sidebar thumbnails now follow the existing Film Room rendering path for all players using the shared individual-video view.
2. **Files changed:** app/player/[slug]/videos/[videoId]/VideoDetailView.tsx; components/player/VideoPreview.tsx; tests/player/video-preview.test.tsx; new tests/player/video-detail-thumbnails.test.tsx; this report. Work is isolated in output/preview-merchandise-search; unrelated primary-checkout edits are preserved.
3. **Routes changed:** Presentation in existing /player/[slug]/videos/[videoId] and /preview-lockers/[slug]/videos/[videoId]. No new route, navigation or filtering behavior.
4. **Database changes:** None. No athlete data written.
5. **Migrations:** None.
6. **Environment variables / dependencies:** None added or changed. Ignored local Vite harness uses actual application components and DOM-visible source URLs; it passes no preview analytics ID and makes no application API writes.
7. **Permission changes:** None. Existing server-provided video eligibility, preview visibility, rights labels, source attribution, follow authorization and analytics remain. No rights, publication or financial mutation; no new audit requirement.
8. **Tests run:** Focused thumbnail/preview tests: 10 passed. Full suite: 221 files / 1,774 tests passed; 2 files / 24 existing tests skipped. Full lint: zero errors, 297 existing warnings. Production Webpack build including TypeScript and CRLF-aware whitespace validation passed. Existing nonfatal HappyDOM disabled-iframe diagnostic remains.
9. **Manual verification:** Actual detail-page component rendered locally with Antoine's DOM-visible Film Room sources. All 14 images loaded and matched their Film Room URLs; both uploaded clips showed readyState 4 frames at 0.001 seconds (1920px and 1080px source widths), remained paused, and matched original source URLs. Sidebar had zero iframes. Expanded Collegiate and Professional groups showed real images. A 390px iframe confirmed 14 loaded images, two paused frames and no horizontal overflow. Existing source, empty-state, title and link behavior also passed regression tests. Evidence in primary checkout: output/video-thumbnails-desktop.png and output/video-thumbnails-proof.json. No production save or deployment performed.
10. **Known limitations:** Sources without any usable image, YouTube embed or uploaded clip retain the placeholder. Frame extraction requires a reachable playable source; source availability remains external. Physical mobile hardware was not tested. Browser verification used a local actual-component harness, not a hosted release.
11. **Deferred work:** Production deployment was not requested for this change. No requested implementation remains. No scraper or source-policy changes were needed.

## Product direction check
Improves discoverability of existing athlete-connected career films across affiliations. No Career, Moment or Value Graph relationships or schemas added or altered. Useful after an athlete leaves a team, with no provider-workflow duplication or generalized media-management expansion.
