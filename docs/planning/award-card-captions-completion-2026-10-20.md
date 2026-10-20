# Award card reference-artwork captions

## Objective and scope
Remove the annotated generic BLTZ reference-artwork captions from award cards across all Lockers. Product reference: user browser annotations and docs/product/BLTZ_PRODUCT_DOCTRINE.md. Reuse the shared EditorialCard display; no data or permission changes.

Acceptance criteria: neither "BLTZ-provided reference artwork" nor its "original creator not recorded" variant appears on award cards; award images, headings, descriptions, years and article links remain; genuine creator credits and the licensed Super Bowl illustration credit remain. Validate with repository tests, lint, production build and a browser fixture.

## Completion report
1. Summary: the shared award card suppresses the two generic reference-artwork caption variants. This applies to every Locker using that card without editing stored awards or catalog metadata. Matching ignores capitalization and surrounding whitespace and accepts a final period.
2. Files changed: components/player/EditorialCard.tsx, tests/player/editorial-card.test.tsx and this report. No unrelated primary-checkout work included.
3. Routes changed: presentation on existing /player/[slug] and /preview-lockers/[slug] Locker award surfaces. No new routes.
4. Database changes: none. Stored attribution, source, permission and award data remain unchanged.
5. Migrations: none required.
6. Environment variables and dependencies: unchanged.
7. Permission changes: none. Existing image eligibility and access checks remain unchanged; actual creator and license credits remain visible. No protected actions or private data added.
8. Tests run: 226 test files / 1,810 tests passed; 2 files / 24 existing skips. Four new shared-card checks cover both annotated captions, retained award details and article links, genuine creator credits and the required illustration license link. Lint passed with zero errors / 296 existing warnings. Production build including TypeScript and route generation passed. git diff --check passed. Existing nonfatal HappyDOM iframe diagnostic remains.
9. Manual verification: opened Career / Awards in a local fixture using the real shared Locker and two image-loaded award cards carrying the annotated caption variants. Both cards show their images, year/evidence metadata, headings, descriptions and working destination links, with neither generic caption in the DOM. Visually reviewed output/award-card-captions-preview.png in the primary workspace. No hosted athlete data edited.
10. Known limitations: local implementation, not deployed. This removes generic BLTZ boilerplate, not genuine creator or license attribution.
11. Deferred work: production deployment when requested. No requested implementation deferred.

## Product direction
Improves presentation of existing athlete-to-achievement relationships. No new Career, Moment or Value Graph entities or relationships. Remains useful across affiliations and retirement; no mature third-party workflow duplicated or generalized media-management scope introduced.
