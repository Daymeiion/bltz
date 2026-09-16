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

Production verification: commit 2fe051445f706753bdcfcc40958c89f3a1c98b85 deployed READY at bltz.vercel.app. Signed-in private Locker showed NFL above College Football, both initially collapsed; opening NFL displayed its season-table empty state while College remained collapsed. No athlete records modified.

## NFL games placement correction
Moved the existing career Games card and Games Played by Season fallback into the NFL disclosure using a typed ReactNode slot. NFL season records replace the fallback when present; college-only imports no longer suppress it. Shared LockerView and StructuredStats changed; existing routes, data, permissions, environment and schema unchanged. Production build and TypeScript pass; lint 0 errors/209 existing warnings; full suite 708 passed/24 skipped/9 unchanged failures. No new data or graph relationships. Production manual verification checks both blocks are hidden when NFL is closed and visible only inside NFL when expanded.
