# Getty row speed adjustment - October 18, 2026

## Objective and scope
Increase the Getty row speed slightly, retain hover/manual-scroll pauses, and deploy to production. Product reference: user request and docs/product/BLTZ_PRODUCT_DOCTRINE.md. Reuse the existing continuous-loop motion hook. No new workflow, route or schema.

## Completion report
1. **Summary:** Automatic speed increases 25%, from 36 to 45 CSS pixels/second. The seamless wrap and all existing pause conditions remain unchanged: hover, three-second manual-input idle period, dragging, keyboard focus, licensing modal, explicit Pause/Play and reduced-motion preference.
2. **Files changed:** components/player/use-film-row-scroll.ts (one speed constant); tests/player/film-row-scroll.test.tsx (updated speed and seam expectations); this report. Isolated output/preview-merchandise-search worktree; unrelated primary-checkout changes preserved.
3. **Routes changed:** Existing /preview-lockers/[slug]/photos row for all players using the component. No new route or eligibility change. Desktop/mobile card heights remain 260px/208px.
4. **Database changes:** None; no athlete edits or new stored records.
5. **Migrations:** None.
6. **Environment variables / dependencies:** None added or changed.
7. **Permission changes:** None. Existing source eligibility and Getty search handoff remain. No rights, publication, attribution or financial mutation; no new audit requirement.
8. **Tests run:** Full suite: 220 files / 1,768 tests passed; 2 files / 24 existing tests skipped. Production Webpack build including TypeScript passed. Full ESLint: zero errors, 297 existing warnings. CRLF-aware whitespace validation passed. Existing nonfatal HappyDOM disabled-iframe diagnostic remains. Existing tests cover configured speed, seam overshoot, fractional widths/resize, hover/resume, manual input, focus/modal, pointer release, explicit pause, reduced motion and nonoverflowing rows.
9. **Manual verification:** Live production verification pending release. No new manual-entry or upload workflow.
10. **Known limitations:** Physical touch hardware and native pointer-hover browser checks are unavailable; regression tests cover these input paths. Browser scheduling and reduced-motion preference can reduce or disable automatic movement. Existing provider showcase remains an athlete-search handoff.
11. **Deferred work:** Authorized production deployment and verification remain. No requested implementation deferred.

## Product direction check
Improves browsing of existing athlete-connected career media across affiliations. No Career, Moment or Value Graph relationships or schemas changed. Remains useful after team departure, without duplicating provider workflows or expanding generalized media management.
