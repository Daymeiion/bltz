# Larger Getty row images - October 18, 2026

## Objective and scope
Enlarge the Getty film-row images and deploy to production, including the previously requested continuous faster loop. Product reference: user request and docs/product/BLTZ_PRODUCT_DOCTRINE.md. Reuse the existing related-media strip, image-ratio logic, controls and eligibility. No new route or schema.

## Completion report
1. **Summary:** Desktop cards increase from 172px to 260px high; mobile cards increase from 148px to 208px. Row height reserves 12px for scrolling. Card width follows each source image's measured ratio, and object-fit contain remains. Includes tested continuous-loop commit 0f7b477, at 36px/second, with existing hover, manual-input, focus, modal, reduced-motion and explicit pauses.
2. **Files changed:** components/player/related-media-strip.module.css and this report. The pending continuous-loop release also changes components/player/RelatedMediaStrip.tsx, components/player/use-film-row-scroll.ts, tests/player/film-row-scroll.test.tsx, tests/player/related-media-strip.test.tsx and its completion report. All changes are isolated in output/preview-merchandise-search; unrelated primary-checkout work is preserved.
3. **Routes changed:** Existing /preview-lockers/[slug]/photos presentation for all players using the Getty row. No new route or eligibility changes.
4. **Database changes:** None; no athlete edits or stored duplicate photos.
5. **Migrations:** None.
6. **Environment variables / dependencies:** None added or changed.
7. **Permission changes:** None. Existing source eligibility, private-preview access and Getty handoff remain. No rights, publication, attribution or financial mutation; no new audit requirement.
8. **Tests run:** Full suite: 220 files and 1,768 tests passed, 2 files / 24 existing tests skipped. Includes continuous-seam, fractional-width/resize, doubled speed, input pause, repeated-control and cached-image sizing regressions. Full lint: zero errors, 297 existing warnings. Production Webpack build including TypeScript and CRLF-aware diff whitespace checks passed. No implementation-mirroring CSS test added. Existing nonfatal HappyDOM disabled-iframe diagnostic remains.
9. **Manual verification:** Production baseline confirmed 37 photos and 172px cards. Actual-component local browser checks confirmed desktop cards 260px, row 272px, full contain images and identical 2865.296875px sequence widths. A 390px mobile iframe confirmed 208px cards, 220px row and contained horizontal overflow. Pausing remained functional. Production release and live verification are recorded after deployment.
10. **Known limitations:** Physical touch hardware and native pointer-hover browser checks were not available; input behavior is covered by the regression suite. Native scrollbar offset wraps while repeated photo content stays continuous. Source loading can adjust widths before dimensions become known. Existing Getty showcase opens athlete search rather than exact-asset checkout.
11. **Deferred work:** Authorized production deployment and live verification are the remaining release steps. No requested implementation deferred; provider integration remains separately scoped.

## Product direction check
Improves browsing of existing athlete-connected career media across affiliations. No Career, Moment or Value Graph relationships or schemas changed. Remains useful after team departure. No mature provider workflow duplicated and no generalized media-management expansion.
