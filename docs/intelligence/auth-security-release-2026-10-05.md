# Authentication/security release — October 5, 2026

## Summary and scope

Approved by the user: selective reviewed release from published checkpoint
`bc12fadb2c7de49d15b440c80abe4e2c8f7cf2cc`, preserving published Locker, photo room,
Admin and Intelligence Lab interfaces. Release branch:
`codex/auth-security-production-2026-10-05`. This report records predeployment
validation; the coordinator's deployment receipt records the resulting deployment.

## Files changed

`app/api/admin/login/route.ts`, `components/forgot-password-form.tsx`,
`lib/gtm/import.ts`, `package.json`, `package-lock.json`, `eslint.config.mjs`,
`vercel.json`, `.gitignore`; authentication regression tests, GTM import tests,
and three inherited published-behavior test repairs. This report is included.

## Routes and behavior

No new routes. Rejected Admin sign-in clears this project's old browser session,
chunks and PKCE verifier cookies even if Auth fails, without clearing another
project or device session. Responses are private/no-store. Successful authorization
still uses `is_internal_admin`. Forgot-password uses the existing PKCE server
callback before opening `/auth/update-password`. CSV import rejects disguised ZIP
and OLE Excel workbooks while retaining textual IDs/dates and bounded file sizes.

## Database, migrations and permissions

No database records/schema changed and no migrations applied. No authorization
roles, grants or RLS weakened. Supabase callback allowlisting and actual recovery
email remain live operator checks; this release sends no recovery email itself.

## Dependencies and environment

Next.js 16.3.6; official SheetJS 0.20.3 runtime distribution; Vitest/UI 4.1.11;
aligned native Next ESLint 16.3.6 and compatible patched audit dependencies.
Five additional React compiler diagnostics remain warnings; existing Hooks
correctness rules remain enforced. No secrets included. Source ignore rules
exclude local credentials, dependencies, builds, evidence and workspace metadata.

All four flags are explicitly `false` in the released Vercel configuration:
`BLTZ_ANALYTICS_PIPELINE_ENABLED`, `BLTZ_ANALYTICS_PRODUCTION_ENABLED`,
`BLTZ_INTELLIGENCE_WORKFLOWS_ENABLED`,
`BLTZ_INTELLIGENCE_WORKFLOWS_PRODUCTION_ENABLED`.
The new pipeline, migrations, scheduler and production-support code are excluded.

## Validation

- Clean isolated dependency install and compatible updates.
- Full suite: 1,052 passed, zero failed, 24 skipped, 143 test files.
- TypeScript: passed. ESLint: zero errors, 287 warnings (including inherited UI
  warnings and the newly visible compiler diagnostics).
- Production build: passed, Next.js 16.3.6.
- Runtime audit: zero findings. Full audit: seven high findings in the unpatched
  build-tool `braces` dependency chain; no forced Tailwind migration.
- Independent source review and targeted tests: rejected Admin sessions, recovery
  callback/errors, bounded CSV input, and preserved published UI behavior.
- Vercel dry-run source inspection excludes `.env.production.local`, `.git`,
  `.vercel`, `.next`, dependency folders and caches.

Three pre-existing tests had drifted from the verified published implementation:
the preview list's short-link query mock, source-link rights label, and demo-video
fixture categories. Only those tests were corrected; corresponding runtime files
remain exactly the published source. Assertions retain filtering, fail-closed
publication state, accessibility, safe source links and all-level classification.

## Manual verification, limitations and deferred work

Production deployment will be built with domain assignment withheld, checked for
anonymous Admin/API denial and safe auth redirects, then promoted using the existing
approval. Actual successful sign-in and recovery email require an authenticated
operator; no credential from chat will be reused. Keep deployment
`dpl_95pdtfr5Ka2BR9qZHuiS9EGhJ9Hr` as rollback target.

Separate production-support checkpoint and hosted analytics canaries remain
deferred from this deployment. No Organization Console/CRM changes, outreach,
commercial publication, inferred rights, or financial behavior are included.
This protects access to persistent Career IDs and their Lockers; no new Moment
contribution or Value Graph entitlement is created and no mature workflow is
duplicated.
