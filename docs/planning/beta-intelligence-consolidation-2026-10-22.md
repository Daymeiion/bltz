# Consolidate preview tracking in GTM

## Objective and product reference

The October 22, 2026 user decision authorizes removing the separate Beta
Intelligence dashboard when existing GTM reporting covers preview-funnel tracking.
Follow `docs/product/BLTZ_PRODUCT_DOCTRINE.md` and the active athlete invite funnel
workstream in `docs/BLTZ_BUILD_ORDER.md`. Reuse the existing operating workflow;
do not create another dashboard or infer verified identity from preview interest.

## Coverage comparison

| Need | Existing GTM implementation | Retirement decision |
| --- | --- | --- |
| Cohort membership and invitations | `gtm_player_prospects` selects prospects; `preview_conversion_campaigns` enrolls preview/contact pairs and records sent status | Keep these distinct stages in GTM; selecting a prospect alone is not a sent invitation or preview enrollment. |
| Locker, photo, film and video engagement | `PreviewActivityPanel` and `loadPreviewFunnelReport` select a preview and isolate analytics by preview ID, environment, scope, event version and a displayed report window | Reuse the existing panel, including previews shared outside the conversion cohort. |
| Conversion measures | `FunnelWorkspace` reports views, claim clicks, interest acceptance/submission, declines, dashboard requests, booking clicks/confirmation and walkthroughs | Keep distinct-preview numerators, sent-preview denominators and repeat event counts. |
| Referrals and follow-up | Existing queues, per-preview timelines, referral preparation and contact links | Keep the existing workspace and detail sheets. |
| Invitation and analytics delivery | `PreviewInvitationEmailPanel` and the activity panel separately report invitation evidence and analytics transport | Preserve the distinction between SMTP/email evidence and QStash/Tinybird acknowledgment. |
| Research interviews, ratings, recorded problems and case-study flags | Legacy `athlete_feedback`, `athlete_insights`, `beta_participants` and baseline snapshots; no application entry workflow found | Preserve historical records and admin-only query contracts. These fields are not prerequisites for preview tracking and are not migrated or fabricated in GTM. |
| Canonical Locker claims, edits and return activity | Legacy Beta query uses `players.id` and `analytics_events`; GTM uses preview/contact identities | Do not equate claim interest with verified ownership, merge identities by name, or claim these are equivalent metrics. |
| Digital-presence scoring | Beta displayed an intentional “Not scanned” placeholder | Remove the placeholder with the dashboard. Intelligence Lab remains a separate authorized workstream. |

## Included and excluded

Included: remove the Beta sidebar destination and dashboard component, remove its
dedicated shell/loading/error UI, redirect `/admin/beta` to `/admin/gtm/funnel`,
update both default admin-login paths, and use general BLTZ Admin sign-in copy.

Excluded: changes to GTM metrics, enrollment, capture, invitations, permissions,
database schemas, historical beta records, canonical claims, Intelligence Lab,
interview collection, or new pages. Retain protected legacy Beta queries and their
tests for historical data; do not run their aggregate when opening the old route.

The follow-up task also repairs validation dependencies: restore the declared email
packages, correct the lockfile's incompatible esbuild resolution, and declare the
existing SQL regression scripts' `@electric-sql/pglite` import as an exact development
dependency (`0.5.11`). Application dependency requirements remain unchanged.

## Routes, data and permissions

- `/admin/gtm/funnel` remains the single preview reporting destination.
- `/admin/beta` is a compatibility redirect, protected by the existing Admin layout.
- `/auth/admin` and `/api/admin/login` now land approved admins in the GTM funnel.
- Default role-based admin navigation also points to that same destination.
- No database changes, migrations, environment variables, grants, RLS or permission
  changes. No historical data is deleted. No Career, Moment or Value Graph
  relationships change. No third-party workflow is duplicated.

## Acceptance criteria and manual verification

1. An authorized admin opening `/admin/beta` reaches `/admin/gtm/funnel` without a
   Beta RPC request. A non-admin remains blocked by existing server authorization.
2. Desktop and mobile Admin navigation omit Beta Intelligence and retain GTM;
   the GTM Preview funnel navigation remains active on the funnel route.
3. Dedicated and role-based admin sign-ins land in GTM. Sign-in copy says BLTZ
   Admin. Existing explicit safe `next` paths remain honored, including old Beta
   bookmarks which redirect on arrival.
4. Existing engagement, conversion, delivery, empty/error, test-exclusion and
   per-preview isolation tests continue to pass. No historical records are changed.
5. In a configured authenticated environment, select two different shared previews
   and confirm separate engagement/delivery reports, inspect cohort filters and a
   timeline, and check mobile navigation and unauthorized access.

## Validation commands

- `npm test`
- `npm ci --dry-run --ignore-scripts --no-audit --no-fund`
- `npm run lint`
- `npx tsc --noEmit --incremental false`
- `npm run build`
- `git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check`

Live database and authenticated browser verification require a reachable Supabase
configuration. The local endpoint failed DNS resolution during the initial audit;
do not interpret that as evidence of production data absence.

## Completion report

1. **Summary:** removed the separate Beta dashboard and consolidated access to
   preview tracking in the existing GTM funnel. Dependency repair and local
   deployment validation are complete for the isolated cleanup. Not deployed.
2. **Files changed:** `app/admin/beta/page.tsx`, `app/api/admin/login/route.ts`,
   `app/auth/admin/page.tsx`, `components/admin/AdminSidebar.tsx`,
   `components/admin/AdminThemeShell.tsx`, `lib/auth/redirects.ts`, the Admin shell,
   sidebar, login and redirect tests, `package.json`, `package-lock.json`, and this
   report. Deleted the Beta loading,
   error and dashboard components. Replaced `tests/admin/beta-dashboard.test.tsx`
   with `tests/admin/beta-route.test.tsx` to cover compatibility and authorization.
3. **Routes changed:** old Beta URL redirects to the existing GTM funnel; dedicated
   and default role-based admin sign-in destinations now use the funnel.
4. **Database changes:** none; historical research and analytics records preserved.
5. **Migrations:** none.
6. **Environment variables:** none added or changed.
7. **Permission changes:** none; Admin layout and existing funnel authorization remain.
8. **Tests run:** final isolated full suite passed: **227 files passed, 2 skipped;
   1,829 tests passed, 24 skipped; zero failures**. The skipped suites are opt-in
   hosted analytics/RLS checks requiring explicit test fixtures. The five isolated
   PostgreSQL regression failures reproduced with missing PGlite and all passed
   after declaring it. Standalone `tsc --noEmit --incremental false` passed. The
   production build passed, including its TypeScript check and 105 static pages.
   Full lint passed with zero errors and 296 existing warnings. Whitespace
   validation passed with CRLF-aware Git settings. The repaired lockfile passed
   `npm ci --dry-run`; a clean dependency install completed before final validation.
   npm registry TLS failures were resolved by invoking npm with Node's
   `--use-system-ca`, retaining certificate verification. The lock repair separates
   esbuild `0.28.2` and Tinybird's `0.25.12` requirements; unrelated lockfile metadata
   rewrites were excluded. No application dependency requirement was upgraded.
9. **Manual verification:** reviewed the complete GTM reporting data paths, all
   active Beta route references, default login destinations and server guards.
   Production-server HTTP smoke checks passed: `/auth/admin` returned 200 with
   BLTZ Admin sign-in copy, and anonymous requests to both `/admin/beta` and
   `/admin/gtm/funnel` returned 307 redirects to Admin authentication. Authenticated
   browser and hosted persistence checks were not performed; use the manual steps
   above after deployment with approved fixtures.
10. **Known limitations:** other work modified Intelligence signal contracts during
    validation and temporarily caused unrelated type errors in the shared checkout.
    Those edits were preserved and excluded from the deployment candidate. Final
    checks ran in `output/beta-cleanup-validation`, based on commit `980fcc25`, with
    only this cleanup and its dependency repair applied. Results do not certify
    unfinished Intelligence changes or any later shared-checkout edits. Research
    interviews and verified canonical claims remain distinct from preview conversion.
11. **Deferred work:** deployment and authenticated hosted smoke checks; optional
    research collection or historical schema retirement only under a separate task.
    No new Career, Moment or Value Graph relationships; persistent athlete identity
    and existing preview history remain intact.

## Validation evidence

The ignored `output/` directory contains `beta-cleanup-install.log`,
`beta-cleanup-lock-validation.log`, `beta-cleanup-isolated-tests.log`,
`beta-cleanup-isolated-build.log`, `beta-cleanup-isolated-types.log`,
`beta-cleanup-isolated-lint.log`, and `beta-cleanup-smoke.json`. The isolated
validation checkout contains the complete cleanup without unrelated work. The local
production server was stopped after the smoke checks.

## Deferred work

If structured interviews or research findings become necessary, add only the
approved fields to the existing GTM workflow with explicit identity links and
permissions. Verified ownership and canonical-career engagement remain separate
from preview conversion. Legacy schema removal requires its own data-retention
review and migration; it is not part of this UI retirement.
