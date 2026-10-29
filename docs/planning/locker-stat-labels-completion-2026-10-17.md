# Locker statistics heading and coverage cleanup

## Summary

Applies the user's four browser annotations to every player Locker through the existing shared statistics component: removes the inner NFL/NCAA statistics heading and the year-range/unknown-value coverage paragraph. Existing league disclosures and phase labels remain. Product reference: BLTZ Product Doctrine, existing athlete career/Locker presentation. Scope excludes statistics data, calculations, imports and unrelated presentation changes.

## Files changed

- `components/player/StructuredStats.tsx`: removes the two marked element templates for both leagues and all season phases.
- `tests/sportradar/render.test.tsx`: updates the college section expectation and checks the absence of inner headings and coverage text in the existing NFL/NCAA rendering test.

Implementation uses the isolated `output/preview-merchandise-search` checkout. This local report is outside the release commit.

## Routes changed

No route definitions changed. Shared display applies to existing `/player/[slug]` and `/preview-lockers/[slug]` Career statistics and existing statistics import-review previews in `/admin/preview-lockers/new` and `/admin/preview-lockers/[id]/edit`.

## Database changes / migrations / environment variables / permissions

None. No database writes, schema changes, migrations, generated types, environment variables, dependencies, authentication, RLS or permission changes. No sensitive action or audit behavior changes.

## Tests run / manual verification

Full suite: 195 test files passed, 2 skipped; 1,602 tests passed, 24 skipped. TypeScript noEmit/noincremental, production webpack build and whitespace check passed. Lint passed with zero errors and 290 existing warnings. Logs use `output/locker-stat-labels-{tests,lint,types,build}.log`. The suite emits the existing disabled YouTube iframe diagnostic while passing. Read the installed Next.js component guide before editing.

Commit `cd5c82800ff03b74e64b08e35ac5c2a8dd55f2a3` on `codex/trim-locker-stat-labels-2026-10-17` was fast-forwarded to production main. Deployment `dpl_JE2R1tgdibj8Fo6wL9W56BsFRpLo` is READY with production aliases `bltz.me`, `www.bltz.me` and `bltz.vercel.app` assigned. Deployment URL: https://bltz-m095y3u0c-daymeiions-projects.vercel.app. Framework: Next.js 16.3.6; build duration: 85 seconds.

Verified the live Antoine Cason Locker in the existing in-app browser. Both league disclosures expand. Neither contains an inner h2 or coverage text. NFL retains 21 columns, eight team-season rows and two footer rows; college retains 12 columns, four season rows and one footer row. All season and total rows align with the header columns. Source attribution remains. Regression tests cover the existing pending-data state; no data or access paths changed.

Verified desktop and mobile screenshots. With a requested 390 × 844 mobile override, effective CSS page width and scroll width both measured 325, and horizontal overflow stays within the table regions. Reset the viewport afterward and left both leagues expanded on Career → Stats. No live data was added or saved. Browser warning/error logs were empty. A deployment-scoped runtime error scan returned no entries. Drains and ongoing monitoring configuration were not audited or changed.

Evidence: `output/locker-stat-labels-deployment.json`, `output/locker-stat-labels-desktop.png`, `output/locker-stat-labels-mobile.png`, `output/locker-stat-labels-mobile-proof.json`, and `output/locker-stat-labels-runtime-errors.log`. The Vercel CLI update-check warning did not prevent deployment inspection or log retrieval.

## Known limitations / deferred work

No feature work deferred. Existing unknown values, statistical coverage and horizontal table scrolling remain. No new loading, error or authorization paths are introduced by removing static elements.

## Product direction

Improves presentation of existing athlete → team/season → statistics history. No new Career, Moment or Value Graph relationships are introduced. The history remains useful after organization changes. No mature third-party workflow is duplicated; no generalized media-management scope is added.
