# Getty partnership PR #19 review

## Objective and scope

Review and release the temporary `/admin/getty-partnership` meeting presentation. Product references: `docs/product/BLTZ_PRODUCT_DOCTRINE.md` and `docs/BLTZ_BUILD_ORDER.md`. This is a discussion concept, not a Getty integration, licensing engine, or revenue implementation.

Included: both existing logos, desktop distribution diagram, responsive stacking, sidebar navigation, shared server authorization, regression validation, preview and production deployment. Excluded: dashboard redesign, schema changes, provider APIs, transactions, rights decisions, and unrelated local dashboard/login work.

## Review and implementation

- PR head `3b8f1c0c` already includes main `1cdad4be`; merging main reports no conflicts.
- The first PR deployment failed on a stray `test` token in commit `a9374777`. Subsequent PR commits removed it.
- The legacy admin shell adds an unrelated operations hero and ticker and overrides white text in light mode. An exact-route workspace exception now preserves the dark presentation without changing other admin routes.
- Distribution cards stack below 1280px and headings/badges wrap. Stacked cards use a single downward connector; desktop cards retain the two-branch diagram.
- Both logos reuse existing local assets: `/images/getty-images-logo.svg` and `/bltz-white-logo.svg`. No new assets or dependencies.
- Route metadata identifies the presentation and excludes indexing.
- The unchanged shared Admin layout authorizes via `getCurrentAuthorizationProfile`, which resolves the `is_internal_admin` assignment predicate rather than trusting `profiles.role`. Anonymous, fan, and player layout tests reject access; an authorized-admin test renders the page. Existing authorization contract tests cover the assignment boundary.

## Acceptance and validation

Acceptance: readable logos; two-column desktop presentation; no narrow-screen overflow; current sidebar entry and working mobile navigation; denied non-admin access; existing dashboard regression checks; healthy preview and production route.

Commands: `vitest run`, full ESLint, `tsc --noEmit`, `next build --webpack`, Git whitespace validation, Vercel deployment inspection, and browser desktop/mobile checks. Tests require the existing Windows workaround of setting `TEMP` and `TMP` to a workspace output directory.

Initial full-suite result: 235 files passed, 2 skipped; 1,902 tests passed, 24 skipped. Disabled YouTube iframe diagnostics are inherited. Final build, browser, and deployment evidence will be appended after release.

## Change impact

1. Summary: isolated, responsive, temporary admin meeting presentation and navigation entry.
2. Files: page, sidebar, exact-route shell exception, focused page/shell/sidebar tests, and this report.
3. Routes: only `/admin/getty-partnership` added. Existing admin destinations preserved.
4. Database: none.
5. Migrations: none.
6. Environment variables: none added or changed on the hosted project.
7. Permissions: none changed; existing platform-admin assignment required.
8. Tests: results above; final validation evidence below.
9. Manual verification: recorded below after browser checks.
10. Known limitations: discussion concept only; licensing, merchandise, collectibles, and use depend on provider approval and third-party rights. No financial entitlements are inferred.
11. Deferred work: provider integration is outside this task and requires its own authorized phase.

## Removal after the meeting

Delete `app/admin/getty-partnership/`, remove the Getty link and `IconPresentation` import from `components/admin/AdminSidebar.tsx`, and remove the exact Getty workspace condition/return from `components/admin/AdminThemeShell.tsx`. Delete the page test and Getty-specific cases in the shell/sidebar tests. Keep both shared logo assets: other Locker/Photo Room surfaces use them. No database rollback, environment cleanup, or dashboard changes are needed.

## Product direction check

No Career, Moment, or Value Graph relationships or schemas are created by this presentation. Its concept centers persistent athlete identity and athlete-connected media across affiliations. Getty retains the mature licensing workflow. No DAM, publishing suite, financial allocation, or generalized media-management functionality is duplicated.

## Approved Gene Foca wording update — October 22, 2026

The user approved applying the suggested wording from the review of Gene Foca's sports sponsorship and fandom post. The headline now ends with “commercial value”; the subtitle explains making existing content work harder across channels, audiences, and an athlete's lifetime. Getty's label starts with “Authentic visual content”; the channel labels use “Deeper fan connection” and “Year-round sponsorship value”; the footer reads “Fan connection · Attribution · Commercial value.” Athlete identity, Lifetime Player Lockers, attribution, and the concept/rights qualifier remain prominent.

Files changed for this follow-up: the Getty page, the existing footer-content test assertion, and this report. Route affected: `/admin/getty-partnership` only. Database, migrations, environment variables, permissions, dependencies, and graph relationships: no changes. The existing removal instructions still apply. No further feature work is included or deferred. Validation and production release results are reported in the task completion record.
