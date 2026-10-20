# Bio headshot container fill

## Objective and scope
Restore container fill for the Bio / All headshot on mobile and desktop, following the user's request now that Hero and Bio have separate image controls. Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md. Reuse the shared Locker component; no changes to image selection, upload, storage or data persistence.

Acceptance criteria: Bio images fill their existing containers without distortion at mobile and desktop widths; independent Hero and Bio sources remain supported; existing checks pass. Routes and permissions remain unchanged.

## Completion report
1. Summary: Bio headshots use object-fit: cover with object-position: 50% 12% at every screen size. Removed the desktop contain override. The image keeps its proportions and crops where necessary to fill the container.
2. Files changed: app/player/[slug]/LockerView.tsx and this report.
3. Routes changed: shared presentation on /player/[slug] and /preview-lockers/[slug]. No new routes or builder workflow changes.
4. Database changes: none; existing image source fields remain unchanged.
5. Migrations: none required.
6. Environment variables and dependencies: none changed.
7. Permission changes: none. Existing access gates, private image signing and server authorization remain unchanged.
8. Tests run: 225 test files / 1,806 tests passed; 2 files / 24 existing skips. Lint passed with zero errors and 296 existing warnings. Production build, including TypeScript and route generation, passed. git diff --check passed. Existing nonfatal HappyDOM iframe diagnostic remains.
9. Manual verification: rendered the actual Locker component with distinct bundled BLTZ Hero and Bio images at 390px and 1223px fixture widths. Both computed object-fit values are cover, with position 50% 12%; images loaded and neither viewport had horizontal overflow. Visually reviewed desktop and mobile screenshots in output/bio-headshot-fill-desktop.png and output/bio-headshot-fill-mobile.png in the primary workspace. No hosted athlete records edited.
10. Known limitations: local implementation only, not deployed. Filling the container intentionally crops portions of images. There is no per-device crop editor in this change.
11. Deferred work: production deployment when requested. No requested implementation deferred.

## Product direction
Improves presentation of the existing athlete identity and its selected image relationship. No new Career, Moment or Value Graph relationships. Remains useful after an athlete leaves an organization; no mature third-party workflow duplicated and no drift toward generalized media management.
