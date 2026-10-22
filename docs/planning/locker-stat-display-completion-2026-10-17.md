# Shared Locker statistics display

## Summary / scope

Applies the user's Antoine Cason browser annotations to the shared NFL and college statistics renderer for every player Locker. Removes the grouped category header row (including INT / PD, FUM, TKL / SK and AV), the source/import metadata paragraph, the column/scroll instruction, and the visible career-total calculation explanation. Keeps every individual statistics column, season/team row, career and available-season total, accessible full column label, coverage indicator and source attribution link. Product reference: BLTZ Product Doctrine, existing Player Locker career-history presentation.

## Files changed

- `components/player/StructuredStats.tsx`: one aligned column-heading row; removes the marked descriptive paragraphs across all leagues and season phases.
- `tests/preview-lockers/pfr-cason.test.tsx`: verifies single-row headings, season/footer alignment, reported and unknown values, source attribution and removed visible copy.
- `tests/preview-lockers/pfr-career-totals.test.tsx`: updates header indexing while preserving reported/unknown totals checks.
- `tests/sportradar/render.test.tsx`: verifies the same simplified display for both NFL and NCAA records.

Implementation and release use the isolated checkout at `output/preview-merchandise-search`, preserving unrelated root-checkout changes. This local completion report is outside the release commit.

## Routes changed

No route definitions changed. Shared presentation affects existing `/player/[slug]` and `/preview-lockers/[slug]` Career statistics, plus the existing NFL/college import-review previews in `/admin/preview-lockers/new` and `/admin/preview-lockers/[id]/edit`.

## Database changes / migrations / environment variables / permissions

None. No database writes, schema changes, migrations, generated-type changes, dependency changes, environment variables, auth/RLS or audit-policy changes. Existing saved data, totals calculations and source records are preserved. No new protected action or private data is introduced.

## Tests run

Focused rendering tests: 8 passed. Full suite: 195 files passed, 2 skipped; 1,602 tests passed, 24 skipped. The initial full run identified an existing test's two-row-header indexing, which was updated before the successful rerun. TypeScript noEmit/noincremental, production webpack build and whitespace check passed. Lint passed with zero errors and 290 existing warnings. Final changed-test lint and TypeScript verification are recorded in the validation logs. The suite emits the existing disabled YouTube iframe diagnostic while passing.

Logs: `output/locker-stat-display-{tests,lint,types,build}.log`. Read the installed Next.js component guide. No data or calculation code changed.

## Manual verification / release

Commit `067b489ea072d1d0fd75035a4121fdf16c92b632` on `codex/simplify-locker-stat-tables-2026-10-17` was fast-forwarded to production main. Vercel project `bltz` uses Next.js and production branch `main`.

Deploy result: production READY, aliases assigned to `bltz.me`, `www.bltz.me` and `bltz.vercel.app`. Framework: Next.js 16.3.6 (webpack). Build duration: 94 seconds. Deployment: `dpl_35dsw5uur5ZGA4BneuPcquytppXn`, URL: https://bltz-oqcgnxxnj-daymeiions-projects.vercel.app, commit `067b489`.

Verified the live Antoine Cason preview Locker in the existing in-app browser. NFL has one header row with 21 columns and 21 cells in every season/footer row; college has one header row with 12 columns and 12 cells in every season/footer row. Both tables have zero grouped headers and no marked visible copy. All eight NFL team-season rows, both NFL total rows, four college seasons and the college total remain. Source attribution links remain. Both league disclosures work. Regression tests also verify the pending-data state and shared provider rendering.

Mobile viewport override requested at 390 × 844: the browser reported effective CSS width and document scroll width both 325, with horizontal overflow confined to the table regions (262 wide; content widths 768 and 461). Screenshot confirms readable rows and table scrollbars. Reset the override afterward and left Career → Stats with both leagues expanded for review. Browser warning/error logs were empty. Deployment-scoped runtime error scan returned no entries after the live checks. Drains and ongoing monitoring configuration were not audited or changed. No live statistics were edited or saved; no authorization path changed.

Evidence: `output/locker-stat-display-deployment.json`, `output/locker-stat-display-ui-proof.json`, `output/locker-stat-display-mobile-proof.json`, desktop/mobile PNGs, and `output/locker-stat-display-runtime-errors.log`. Vercel CLI's npm update-check warning did not prevent successful deployment inspection or log retrieval.

## Known limitations / deferred work

No required feature work deferred. Wide statistics tables continue to scroll horizontally, with sticky season/team labels. Unknown statistics remain unknown. This task changes presentation only; it does not alter source data, imports, scraper behavior or statistical coverage.

## Product direction

Improves the readability of existing athlete → team/season → statistics career history across all Lockers. No new Career Graph relationships or Moment/Value Graph entities. Career history remains useful after an athlete leaves an organization. No mature third-party workflow was duplicated and no generalized media-management scope was added.
