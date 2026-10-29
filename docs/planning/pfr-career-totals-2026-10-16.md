# PFR reported career totals — production completion

## Summary and product scope

The user requested importing the career totals included in the CSV so the Locker can display PFR's reported tackles, passes defended and other metrics despite missing season cells. This follow-up extends the approved manual Preview Locker CSV workflow and its production rollout. Product authority remains `docs/product/BLTZ_PRODUCT_DOCTRINE.md` and the bounded career-enrichment scope under `docs/BLTZ_BUILD_ORDER.md`.

The full career summary is stored separately from season rows, with explicit review and source attribution. The compact table shows **PFR career** for source-reported values and **Season sum** for calculated available-season values. Missing season data is not backfilled with zeros. Existing imports without summaries retain their previous Totals row.

## Source and deployment

- Isolated branch: `codex/pfr-career-totals-2026-10-16`.
- Source checkout: `C:/Users/Administrator/bltz/output/pfr-career-totals-release`.
- Previous production/main commit: `b4abe77e9d13ddaca2685b80abb39c09345e2b3e`.
- Released commit: `8ab8e07ca29485056d20a6e4b0f2aa7d11e346f3`.
- Published with a normal fast-forward push to main after verifying its expected prior commit. No force push, rebase or overwrite of the user's root index/working branch was used.
- Vercel team/project: `daymeiions-projects/bltz`, `prj_4XjBiHku6plWves1zXdbT8bXj3y6`.
- Production deployment: `dpl_HRtGCP4u1p6Jgm71hkywLNPm5VNg`.
- Build URL: https://bltz-4eotppke4-daymeiions-projects.vercel.app.
- [Vercel release](https://vercel.com/daymeiions-projects/bltz/HRtGCP4u1p6Jgm71hkywLNPm5VNg).
- Final state Ready; both `bltz.me` and `bltz.vercel.app` independently resolve to this deployment. Git-triggered build metadata matched the exact released commit.

Automatic approval review rejected copying eight files back into the already-dirty root workspace because it could overwrite unrelated uncommitted work. That copy did not run and was not retried through another method. All implementation, validation and publication continued safely in the isolated checkout. **Main and the isolated checkout are the source of truth for this follow-up; the root source files were intentionally not synchronized.** This new completion report is the only root-workspace file created by this follow-up.

## Implementation and files changed

Nine committed files:

1. `lib/preview-lockers/pfr-csv.ts`: optional validated `careerTotals`, source summary detection, consistency checks, and merging into the display model.
2. `lib/player/structured-stats-types.ts`: optional `reportedCareerTotals` on the shared display model.
3. `app/admin/preview-lockers/StatsCsvImport.tsx`: review copy, included-summary indicator, confirmation language, and draft badge.
4. `components/player/StructuredStats.tsx`: distinct source/computed footer rows, source-only columns, phase scoping and explanatory copy. Compact labels, sticky year/team column and attribution remain.
5. `tests/preview-lockers/pfr-career-totals.test.tsx`: source-summary and rendering regressions.
6. `tests/preview-lockers/pfr-cason.test.tsx`: Cason's source totals versus incomplete season sums.
7. `tests/preview-lockers/pfr-form.test.tsx`: summary add/save/reload, replacement and removal.
8. `tests/preview-lockers/api.test.ts`: server acceptance/persistence and rejection of conflicting/unsupported summaries before database access.
9. `scripts/verify-preview-pfr-csv.mjs`: actual PostgreSQL persistence/RLS/audit/revision/atomic-create proof now carries a career summary.

This report is retained locally without triggering a documentation-only deployment.

## Rules and data behavior

- Recognizes a single Career, Total, Totals, or numeric Yr/Yrs summary row per imported table, using the same reviewed column mapping and numeric/size bounds as seasons.
- Stores optional `careerTotals: { gamesPlayed, gamesStarted, statistics, seasonCount? }` inside the existing reviewed import. It never turns that summary into a season row.
- Numeric Yr/Yrs counts must match the distinct included years. Complete additive metrics and game counts must match available season rows. Known nonnegative partial sums cannot exceed the reported summary, and longest returns cannot be below a known stint maximum. Contradictory or duplicate summaries are rejected.
- Missing summary fields stay unknown rather than silently falling back to calculated values in the PFR career row. Source-only metrics still get a column, even if all season cells are blank.
- Rates are accepted as source-reported career values; they are not summed, averaged or recomputed from season rates.
- Team-career summaries, average rows and duplicate multi-team aggregates remain excluded, preventing double counting.
- Category summaries merge by statistic, rejecting contradictory overlapping reported totals. Values shared by multiple categories are retained once, not added. GP/GS are shown only when the available category summaries agree; their counts are never summed across categories.
- Career values apply only to the regular-season table, not preseason/postseason tables. Existing provider-backed and college behavior remains unchanged.

## Routes, database, migrations, environment and permissions

No new routes. Existing `/admin/preview-lockers/new`, `/admin/preview-lockers/[id]/edit`, `/preview-lockers/[slug]`, and POST/PATCH `/api/preview-lockers` use the extended import model. The shared stats component also remains available to the public `/player/[slug]` route, without introducing canonical PFR ingestion.

Database/schema changes: none. Migrations: none. Generated database-type changes: none, because the existing `pfr_stats` column remains JSONB. Application environment-variable changes: none. Role, RLS and permission changes: none. The existing authenticated Admin write, revision, audit, private read and atomic-create boundaries remain in place. No production SQL mutation, athlete-record save, publication, API-provider request or automated source fetch was performed during rollout.

## Validation

- Full isolated production-release suite: **1,354 passed, 24 skipped; zero failures**, across 172 passed and two skipped test files.
- Focused parser/Cason/career-summary run: 22 passed.
- TypeScript: passed (`tsc --noEmit --incremental false`).
- Lint: passed, zero errors and 290 existing repository warnings.
- Source whitespace check: passed.
- Local production build: passed with the existing webpack build configuration.
- Vercel remote production build: passed, Build Completed in 57 seconds, then reached Ready.
- Coverage includes authentic Cason values, absent season fields, source-only columns, unknown summary cells, aliases, source rates, duplicated/contradictory summaries, truncated/formula cells, split-team seasons, legacy imports, cross-category conflicts, phase separation, API validation and authorization, save/reload/replacement/removal, PostgreSQL round trips, revisions and audit creation.
- React review: no new effects, client fetches, dependencies or credentials; source data remains typed and the existing server/client composition is preserved. Full header meanings remain accessible despite compact labels.

The initial Cason render assertion was updated to expect the new PFR career row followed by Season sum. Final checks passed after that expected behavior change.

## Live manual verification

A fresh authenticated production editor tab reviewed Antoine's exact original pasted CSV, including its `7 Yrs` row. The deployed UI reported eight season/team rows, career totals included, ten skipped columns/summary rows, and a confirmation checkbox explicitly covering reported career totals. Add reviewed statistics remained disabled until confirmation.

The source row matched the CSV: GP 110, GS 60, interceptions 16, interception return yards 362, interception TD 2, longest return 80, passes defended 63, forced fumbles 8, fumbles 1, recoveries 5, fumble return yards 59, fumble return TD 0, sacks 0, combined tackles 381, solo tackles 318, assists 63, TFL 7, QB hits 0, safeties 0 and AV 30. The separate Season sum row retained unknown totals for passes defended, tackles, solo/assisted tackles, TFL and QB hits because BAL's season row omits them.

Desktop: document width matched the 1,859px viewport; the compact 769px table remained inside a 673px scrolling region. Mobile at an actual 390px viewport: document width stayed 390px, with a 769px table inside a 210px region. Browser sizing was restored afterward. Attribution remained beneath the table.

Recent bounded Vercel production error-log query returned no entries. The fresh editor tab is left open for user review, with the original CSV loaded and confirmation unchecked. Original editor tabs and saved records remain untouched.

Evidence: `output/cason-stats-review/production-career-totals.png`, `production-career-mobile.png`, `career-tests.log`, `career-types.log`, `career-lint.log` and `career-build.log`.

## Operator steps, limitations and deferred work

Review the prepared tab or reimport the full CSV including the career summary. Confirm the review, choose **Add reviewed statistics to draft**, then **Save draft**. Existing saved imports cannot recover the formerly skipped career row automatically because raw CSV is not stored by the application. Saving/replacing a category without a summary intentionally removes that category's previous reported career totals.

Career-only CSVs with no season rows, team-specific career summary displays, new stat definitions/categories, string/context and awards fields, postseason/per-game imports, automated collection, permanent provider replacement and canonical career ingestion remain deferred. Partial exports that contradict the source career summary are rejected with a request to include the full season table. Human source/player/regular-season review remains required.

Career relationships strengthened: athlete → sourced career/season/team performance and provenance. The work remains useful after retirement or organizational departure. Moment and Value Graph relationships are unchanged; AV remains a football performance metric. No mature media-management workflow was duplicated and no generalized media scope was added.
