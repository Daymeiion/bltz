# Intelligence Lab captions and metadata — October 4, 2026

## Summary and files
`app/admin/intelligence/career-workspace.module.css`: increase all eleven explicit 9px Barlow/inherited caption declarations to 12px and standardize all nine JetBrains Mono font declarations at 11px. Keep the previously approved 14px descriptions and card details. The more-specific evidence paragraph style continues to render source subtitles at 14px. At widths up to 360px, position the mobile watchlist below the taller header so the larger text does not overlap search.

`scripts/prepare-intelligence-captions-release.cjs`: package a separate source-verified copy of the latest production deployment. Production advanced during this task with Locker/photo/test changes and two new RelatedMediaStrip files. The first font deployment passed verification, then a concurrent Locker deployment restored the earlier stylesheet. The final package is rebased on `dpl_H5roXfoQtk1aLYuHw5TfjWVaBi2b` and its exact 1,079 source hashes, at `output/intelligence-captions-mobile-release`. Only the Intelligence stylesheet changes; the newest Locker work is preserved. Earlier snapshots/proofs and shared Locker working output remain untouched. Tooling and this report are excluded from the runtime upload.

The earlier `scripts/prepare-intelligence-career-release.cjs` packaging guard also gained explicit caption proof names and an immutable baseline path. This report and the release snapshots/evidence are local supporting files.

## Routes, data and permissions
Existing `/admin/intelligence`; no new routes, database changes, migrations, environment variables, dependencies, permission changes or accounts. Existing server-side authorization and private projections remain intact. No onboarding, provider, graph, organization or Locker workflow changes are included.

## Validation and deployment
Published `dpl_DUuhfhjiHwfceYibbLJ65t3EHM1o` to https://bltz.vercel.app/admin/intelligence. Production build passed compilation, TypeScript and generation of 93 pages in 1m 36s. All 1,079 candidate source hashes and 67 established Intelligence overlays were verified, including the newest Locker files. The final alias check and promoted-package guard passed.

- Core Intelligence, platform authorization, preview renderer and player preview suite: 253 tests passed across 19 files.
- TypeScript: passed.
- Scoped lint: zero errors; 32 inherited warnings in unchanged Locker files.
- Broader player checks: 310 passed, one existing `tests/player/public-video.test.ts` mock-video category check failed. Its test, mapping and mock inputs match the exact H5 baseline; this CSS update does not change them.
- Anonymous access: page redirects 307 to existing admin login; API returns 401 with private/no-store, nosniff and Vary: Cookie.

Evidence is saved under `output/intelligence-captions-mobile-release/output`, including `captions-mobile-validation.json`, `captions-mobile-production-checks.json`, source/build attestations and `production-lab-captions.png`.

## Manual verification
Verified the live deployment in the existing authenticated Chrome session. Athlete and Moment captions render at 12px; all detected JetBrains Mono text renders at 11px. Provenance labels are 12px, UUID values are 11px and wrap without overflow. Moment performance labels are 12px, dates are 11px, and previously approved descriptions remain 14px. Both desktop outer column gaps remain 17px. Dark/light controls work. Desktop and 320px/390px responsive checks show no horizontal overflow. At 320px the opened watchlist now starts 10.11px below search, resolving the observed 8px overlap. Temporary viewport changes were reset. Fresh browser logs show no warnings or errors. Saved and inspected the live screenshot; left the production tab open.

## Product direction, limitations and deferred work
This adjustment improves inspection of existing athlete → Moment → evidence → signal → opportunity relationships without adding factual Career, Moment or Value Graph relationships. It remains useful after an athlete leaves an organization. No third-party workflow is duplicated and no generalized media-management scope is introduced. Existing data limitations remain in the original workspace release report. The unrelated baseline preview-video test and inherited lint warnings remain outside this typography task; no requested work is deferred.
