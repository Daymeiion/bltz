# News article new-tab links - October 19, 2026

## Objective
Open Locker news articles directly in a new tab while retaining the Locker. Remove the leaving-BLTZ warning and automatic same-tab redirect. Product reference: user request and docs/product/BLTZ_PRODUCT_DOCTRINE.md.

## Completion report
1. **Summary:** Both the Media article grid and the View all articles archive pass validated destinations to the shared EditorialCard. Read article is a native anchor with target=_blank, rel=noopener noreferrer and an accessible new-tab label. Removed warning dialog, countdown state, timer, redirect and associated scroll-lock/listener effect.
2. **Files changed:** app/player/[slug]/LockerView.tsx; components/player/EditorialCard.tsx; tests/player/news-renderer.test.tsx; this report. Implementation is isolated in output/preview-merchandise-search on codex/news-article-new-tab-2026-10-19. Unrelated primary-checkout edits preserved.
3. **Routes:** Existing /player/[slug] and /preview-lockers/[slug] share this rendering change. No new routes.
4. **Database changes:** None. Article records and review queues unchanged.
5. **Migrations:** None.
6. **Environment variables / dependencies:** None changed.
7. **Permissions:** None changed. Existing URL validation and server article eligibility remain. No data, publication, rights or financial mutation; no new audit requirement.
8. **Tests:** Full suite: 221 files and 1,774 tests passed; 2 files and 24 existing tests skipped. Updated existing public/preview Locker news tests to verify destinations, new-tab attributes, accessible label and absence of warning. Loading, empty and unavailable states pass. Full lint: zero errors and 296 existing warnings. Production Webpack build including TypeScript passed. CRLF-aware diff whitespace check passed. Initial sandbox attempts blocked Next build directory creation and Vitest temporary cache renames; reruns with required access passed. Existing nonfatal HappyDOM iframe diagnostic unchanged. React best-practices review completed: standard semantic links, no new hooks/effects, visible focus retained, no added dependencies.
9. **Manual verification:** Ignored local Vite harness rendered the actual LockerView and shared card with a sample article. Media link exposed the exact destination, target=_blank, rel=noopener noreferrer, accessible new-tab label, and no alertdialog. After clicking, original Locker remained on Media at its original URL, with no leaving warning. Browser tab inventory did not expose a new destination tab, so a separately loaded destination page was not verified. Screenshot capture was unavailable in this browser session. No production saves or deployments performed.
10. **Known limitations:** Browser preferences decide whether target=_blank opens a tab or window. Physical mobile interaction and production behavior have not been verified for this change. Existing card layout/focus styling is retained.
11. **Deferred work:** Production deployment is pending; this request did not ask to deploy. No requested implementation remains.

## Product direction
Improves access to athlete-connected career news across affiliations and remains useful after an athlete leaves an organization. No Career, Moment or Value Graph relationships or schemas added or altered. No third-party workflow duplication or generalized media-management expansion.
