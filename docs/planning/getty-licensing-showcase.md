# Getty licensing showcase — October 14, 2026

## Objective and scope

Implement the user's requested call-demo interaction on the existing related-media thumbnails in Photo Room. Reference: October 14 user request, `docs/product/BLTZ_PRODUCT_DOCTRINE.md`, and existing phase boundaries in `docs/media/MEDIA-GRAPH-ROADMAP.md`.

Included: Getty credit above the related row, corner controls on hover/focus, persistent controls on touch devices, pointer cursors, an accessible licensing showcase modal, and an athlete-specific external Getty search link. Excluded: main photo-grid redesign, Getty API ingestion, actual purchases/licenses, verified asset matching, rights-engine/schema changes, transactions, and deployment.

Existing preview photo route and authorized photo inputs are reused. No new server permissions are needed. The existing full-thumbnail and eye controls call the same slideshow-selection callback; the Getty control opens its own modal without selecting the slideshow image.

## Completion report

1. **Summary:** Moved “Powered by Getty Images” above the related-media heading/row. Each related thumbnail has a bottom-left eye button and a bottom-right official Getty wordmark plus key/license icon. Controls appear on hover and keyboard focus, stay visible for touch/coarse pointers, and use a pointer cursor. A compact modal darkens the page and links to the athlete's Getty search. Escape, the close control, backdrop dismissal, focus trapping, and focus restoration use the existing Radix dialog primitives.
2. **Files changed:** `components/player/RelatedMediaStrip.tsx`, `components/player/related-media-strip.module.css`, `public/images/getty-images-logo.svg`, `tests/player/related-media-strip.test.tsx`, and this report. Previous room edits and unrelated local work are preserved.
3. **Routes changed:** Presentation in existing `/preview-lockers/[slug]/photos` only, under the existing preview condition. No routes added; the related controls remain absent from the main Locker and canonical public gallery.
4. **Database changes:** None.
5. **Migrations:** None.
6. **Environment variables:** None added or changed. Local validation uses the existing temporary-directory and certificate-store workarounds.
7. **Permission changes:** None. Existing preview images retain their supplied provenance; no rights, publication, ownership, or economic entitlement is inferred or written. The new external destination has a fixed Getty HTTPS origin and URL-encoded athlete name, with `noopener noreferrer` on its new-tab link.
8. **Tests run:** 43 relevant tests passed across four suites, including five new tests for credit order, whole-thumbnail/eye selection, licensing-selection isolation, selected-image modal content, external-link safety, Escape/close/focus restoration, failed-image empty state, and encoded athlete names. The five new tests passed again after correcting their mock's TypeScript annotation. `npx tsc --noEmit`, full ESLint (zero errors, 289 warnings), scoped whitespace validation, and production build passed. Initial modal-semantic and test-mock typing failures were corrected before completion. Build retains the two existing global CSS at-rule warnings. The previously documented unrelated full-suite limitation in the primary checkout was not rerun.
9. **Manual verification:** Local Keith Rivers Photo Room rendered the credit above the row, licensing modal with official wordmark and darkened page, selected photo preview, and correct Getty search URL. Keyboard activation opened the modal; Escape closed it. The eye selected the matching slideshow image and exposed Resume. A narrow viewport override confirmed the modal fits its viewport and remains usable, with its external link and close control visible. The close control worked; viewport override was reset and the local preview tab retained. No external licensing transaction was submitted.
10. **Known limitations:** This is a showcase of the external search handoff. The selected preview photo is not mapped to a verified Getty asset; availability, image choice, rights, and licensing terms are determined on Getty. The Getty search destination for Keith Rivers was verified from Getty's public page. Physical touch-device verification was not performed. Implementation was initially reviewed locally; the subsequent October 14 user request authorizes production publication.
11. **Deferred work:** Exact-asset matching and live provider integration belong to a separately authorized phase. No requested showcase behavior is deferred. Release status and live verification are recorded in the production release evidence.

## Sources

- Athlete search: https://www.gettyimages.com/photos/keith-rivers
- Official header logo source: https://www.gettyimages.com/components/global-nav/static/static/GettyHeaderLogo-b076fb35c404869a.svg

## Product direction check

No Career, Moment, or Value Graph relationships or schemas were introduced. The existing athlete-connected media remains centered on persistent athlete identity; the external discovery/licensing pathway stays useful after organizational affiliations change. Getty handles the licensing workflow rather than BLTZ duplicating checkout or creating a premature rights engine. No generalized media-management scope was added.

## Production release preflight — October 14, 2026

The user's subsequent request authorizes commit, push, and production publication of this showcase. A clean release branch was prepared from live/main commit `81334b17677a1305921b6b64c3c0c7ea68666106`, preserving the prior room release and all unrelated primary-checkout work.

Final independent review is clear after increasing the eye/license actions and modal close control to 44px clickable targets. Icon/logo sizes are unchanged. Fresh full tests passed: 170 files passed, two skipped; 1,337 tests passed, 24 skipped. The production Webpack build including TypeScript passed. Full ESLint passed with zero errors and 290 warnings; CRLF-aware whitespace validation passed. Existing CSS/font, Node-engine and disabled-test-iframe diagnostics are inherited or tooling-related and are recorded in validation logs.

The release contains only the two related-media UI files, official logo asset, focused interaction tests, and this report. No schema, migration, hosted environment, permission, rights, or transaction changes are included. The clean baseline's successful full-suite verification supersedes historical primary-checkout test limitations for this release.

Publication uses the existing main-branch Git/Vercel integration. Live deployment identity, smoke checks, and browser verification are recorded separately in the production release evidence after publication.

## Related-row cleanup release preflight — October 14, 2026

1. **Summary:** Removed the Related Media heading and uploaded-photo subtitle. Replaced the visible Resume slideshow text with a Play icon in a 44 × 44px button, retaining its accessible name, title, focus indicator, callback, and paused-slideshow eligibility. Getty credit remains above the thumbnails. No hero-blur edit was needed; the user confirmed the effect returned.
2. **Files changed:** `components/player/RelatedMediaStrip.tsx`, `components/player/related-media-strip.module.css`, `tests/preview-lockers/renderer.test.tsx`, and this report. Code commit `f286bde` is prepared on `codex/photo-room-row-cleanup` from production/main `7a2ac46`; unrelated primary-checkout work is preserved.
3. **Routes changed:** Presentation on existing `/preview-lockers/[slug]/photos` only. No route definitions added or changed.
4. **Database changes:** None.
5. **Migrations:** None.
6. **Environment variables:** None added or changed; validation retains existing local tooling workarounds.
7. **Permission changes:** None. Existing image eligibility, provenance, Getty handoff, and dialog behavior remain.
8. **Tests run:** Fresh clean release validation passed: 170 test files passed, two skipped; 1,337 tests passed, 24 skipped. The production Webpack build including TypeScript passed; full ESLint passed with zero errors and 290 warnings. Independent review found no introduced issues. The updated renderer test checks the absent labels, accessible icon button, and successful slideshow resume.
9. **Manual verification:** Local desktop and mobile browser checks confirmed the labels are removed, the Play control appears when paused, and activating it resumes the slideshow. Production smoke and browser checks are pending publication.
10. **Known limitations:** This report records preflight evidence, not completed production verification. Existing provider-demo and physical-touch-device limitations above remain. GitHub CLI is unauthenticated; publication follows the established main-branch Git/Vercel integration.
11. **Deferred work:** Authorized production publication and live verification remain with the release coordinator. No requested UI behavior is deferred; exact-asset matching and provider integration remain separately scoped.

No Career, Moment, or Value Graph relationships changed. Athlete-connected media remains useful across affiliations; no mature third-party workflow was duplicated and no generalized media-management scope was added. Core documentation requires no change for this cosmetic cleanup.
