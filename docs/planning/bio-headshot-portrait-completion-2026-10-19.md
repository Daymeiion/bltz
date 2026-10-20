# Portrait Bio headshot

## Objective and scope
Use a portrait-shaped frame with object-fit: contain for the Bio / All headshot on mobile and desktop so the complete image remains visible. Product reference: explicit user request and docs/product/BLTZ_PRODUCT_DOCTRINE.md. Keep Hero images, separate image controls, sources, uploads and persistence unchanged.

Acceptance criteria: a 4:5 image area at mobile and desktop sizes; entire image shown without cropping or stretching; desktop portrait width capped so player details have remaining space; existing checks pass. Validation: npm run test, npm run lint, npm run build, git diff --check, and actual-component browser checks.

## Completion report
1. Summary: Bio uses a centered contained image inside a 4:5 navy frame. The existing rounded border and year footer remain. Mobile retains adjacent player details; desktop caps the portrait column at 220px. The information card stretches with the row. Hero presentation is unchanged.
2. Files changed: app/player/[slug]/LockerView.tsx and this report. Reused the existing shared view and source fallback; no new component or dependency.
3. Routes changed: presentation on /player/[slug] and /preview-lockers/[slug], including existing and future Lockers. No new routes or builder workflow changes.
4. Database changes: none; no saved image choices changed.
5. Migrations: none required.
6. Environment variables and dependencies: unchanged.
7. Permission changes: none. Existing authentication, access gates and private image signing remain unchanged. This change does not add data or alter protected actions.
8. Tests run: 225 files / 1,806 tests passed, with 2 files / 24 existing skips. Lint passed with zero errors and 296 existing warnings. Production build, TypeScript and page generation passed. git diff --check passed. Existing nonfatal HappyDOM iframe diagnostic remains. No implementation-mirroring CSS unit test added; browser layout checks verify the visual behavior.
9. Manual verification: rendered the real shared Locker with different existing bundled BLTZ images for Hero and Bio. At 390px and 1223px fixture widths, the Bio image loaded, computed fit was contain, position was center, image-area ratio was 0.8, and neither fixture had horizontal overflow. The full 150 x 250 test image was visible in the portrait frame. Visually reviewed mobile and desktop screenshots. Evidence in the primary workspace: output/bio-headshot-portrait-mobile.png, output/bio-headshot-portrait-desktop.png and output/bio-headshot-portrait-proof.json. No hosted athlete records edited.
10. Known limitations: local implementation, not deployed. Images with proportions different from 4:5 leave navy space within the frame; this preserves the complete image without distortion. No per-device crop editor added.
11. Deferred work: production deployment when requested. No requested implementation deferred.

## Product direction
Improves accurate presentation of the athlete's existing identity image relationship. No new Career, Moment or Value Graph entities. Useful across teams and retirement. No mature third-party workflow duplicated or scope drift toward general media management.
