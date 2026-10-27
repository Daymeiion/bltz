# Desktop Photo Room grid enlargement — 2026-10-27

1. **Summary:** Enlarge preview Photo Room gallery photos only at viewport widths of 1024px and above. Increase the proportional flex basis from 180px to 280px and the minimum tile width from 120px to 180px. Natural aspect ratios and existing photo selection/licensing controls are preserved.
2. **Files changed:** `app/player/[slug]/photos/photo-room.module.css` and this report.
3. **Routes changed:** No new routes. Shared preview Photo Room styling affects `/preview-lockers/[slug]/photos`, including Dante Hughes. The main Locker grid, product examples and canonical public gallery retain their current styling.
4. **Database changes:** None.
5. **Migrations:** None.
6. **Environment variables:** None changed.
7. **Permission changes:** None.
8. **Tests run:** Existing Photo Room renderer, related-media strip and photo-pagination access suites: 3 files / 46 tests passed. Full ESLint: zero errors, 298 existing warnings. Final production build, including TypeScript and 107 static pages, passed. One sandboxed attempt returned EPERM creating a generated build folder; the authorized rerun passed. CRLF-aware diff check passed. No new implementation-mirroring tests added for this CSS-only change.
9. **Manual verification:** Before-change desktop measurements recorded from the live Dante gallery at 1864px viewport width: first row had five photos, predominantly 188px high. Live after-change verification pending publication.
10. **Known limitations:** Physical touch/mobile browser verification has not been performed. Mobile and tablet behavior is preserved by placing all enlargement declarations inside the new min-width:1024px query; the existing two-column mobile layout is unchanged.
11. **Deferred work:** No requested work deferred.

## Product direction check

This presentation change improves browsing of existing career-connected media. No Career, Moment or Value Graph records or rights assumptions are changed. It remains useful after an athlete leaves an organization. No third-party workflow or generalized media management capability is duplicated.
