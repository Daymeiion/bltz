# NFL statistics disclosure

## Objective and scope
Match the College Football disclosure in the shared Locker Stats view and place NFL first. Both remain collapsed initially, including when season data is pending. Source attribution, season tables, totals, and nested postseason/preseason sections are preserved.

## Completion report
- Files: components/player/StructuredStats.tsx, tests/sportradar/render.test.tsx, this report.
- Routes: existing /player/[slug] and /preview-lockers/[slug]; no new routes.
- Database, migrations, environment variables, permissions: none.
- Validation: production build and TypeScript pass; lint zero errors, 209 existing warnings. Full suite 708 passed, 24 skipped, same 9 pre-existing failures across four auth/Film Room/preview-fixture files. Existing rendering tests pass.
- Manual check: open Stats/Career, confirm NFL appears above College Football and each disclosure opens independently. Production browser verification follows deployment.
- Limitations/deferred: no new statistical data or provider changes. No schema or access changes requiring separate audit events.
- Product: improves display of persistent athlete-season history; no new Career, Moment, or Value Graph relationships. Useful after organizational departure; no duplicated third-party workflows or media-management scope drift.
