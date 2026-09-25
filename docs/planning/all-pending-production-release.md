# Complete pending production release — 2026-09-25

## Scope and source

Capture all current application source, tests, migrations, verification scripts, design references, and planning edits from the shared workspace on a release branch based on current main. Preserve existing production features deployed directly through Vercel. The runtime addition beyond the latest production deployment is the Spotify preview badge and its Locker integration. Most other pending Git changes were already live, including preview media categories, photo placement, awards/social presentation, YouTube playback, and claim entry points.

Local credentials, dependency folders, nested worktrees, build output, logs, and generated presentation/export artifacts are not application changes and are excluded from Git and deployment. No pending source edit is intentionally deferred.

## Validation

- Next.js 16.3.1 production build passed using webpack locally. The release build on Vercel uses the normal configured build.
- Lint: zero errors, 211 existing warnings.
- Full suite: 784 passed, 10 failed, 24 skipped. Existing failures: six admin-session rejection expectations, one recovery callback expectation, one mock Film Room category expectation, one legacy preview stats expectation, and one YouTube source-link expectation. The same ten failures were present before this release.
- Focused release tests cover Spotify preview, preview Locker/route rendering, YouTube normalization/error handling, social content, photo placement, builder forms, and claim flow.
- Supabase production project confirmed against the single public Vercel URL setting: drxtzxnwdtgxwueiqygf. All six migrations dated September 16–22 are already recorded in production. Required cfb_stats/social columns, photo placement validator, and preview Locker RLS verified. No database mutation needed.

## Impact

- Routes: existing private preview Locker, Photos, Film Room, video-detail, and admin builder surfaces; no new route URLs.
- Database/migrations: preserve and version existing applied migrations; none newly applied.
- Environment/header/permission changes: none beyond the already deployed source baseline.
- Product: supports existing persistent identity, career presentation and claim loop. No new Moment/Value Graph entities or commodity media workflow.
- Deferred work: pre-existing suite failures and dedicated mobile viewport verification.
- Safety: automatic approval rejected a full production environment export as unnecessarily broad; only the public Supabase URL was subsequently read, with no secret export.
