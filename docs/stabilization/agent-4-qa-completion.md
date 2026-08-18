# Agent 4 — QA/Review completion report

Date: 2026-08-18  
Branch: `codex/stabilization-2026-08-16`  
Base commit: `faad4a4ee8ad7373087a61c2594ef46d6e5b62bf`  
Verdict: **READY TO MERGE**

Focused product fixes for public-locker analytics targeting and `/auth` chrome were applied and re-verified. Staging live `/admin/beta` and live multi-role RLS both passed. This does not authorize production `db push`.

## 1. Summary

Reviewed the merged analytics / Beta Intelligence stabilization cycle, then applied two coordinator-approved focused fixes.

Static gates still pass. Staging ingestion was independently re-proven earlier in this session. Anonymous `/admin/beta` still redirects. Admin login no longer shows the global navbar, and document height matches 1280×720, 375×812, and 390×844. The demo Locker now sends `POST /api/analytics/events` using `athleteSlug`.

Staging live `/admin/beta` and live multi-role RLS are proven. Production promotion remains a separate Agent 1 procedure.

## 2. Files changed

Application:

- `app/client-shell.tsx`
- `app/auth/admin/page.tsx`
- `app/player/[slug]/LockerView.tsx`
- `app/player/[slug]/videos/FilmRoomView.tsx`
- `app/player/[slug]/photos/PhotoRoomView.tsx`
- `app/player/[slug]/videos/[videoId]/VideoDetailView.tsx`
- `app/api/admin/login/route.ts` — server-only sanitized Auth failure log; public error copy unchanged
- `tests/auth/admin-login-responsive.test.ts`
- `tests/auth/client-shell-navbar.test.ts`
- `tests/analytics/public-locker-slug-target.test.ts`
- `tests/database/beta-rls-live.test.ts` — `node` environment so the service-role read is not treated as a browser request
- `scripts/verify-staging-beta-rls.mjs` — disposable staging identities, live suite, zero leftover cleanup
- `TODOS.md`

Report and evidence:

- `docs/stabilization/agent-4-qa-completion.md`
- `docs/stabilization/evidence/agent-4-qa/`

## 3. Routes changed

- `/auth/*`: global navbar hidden.
- `/auth/admin`: full `min-h-svh` after navbar removal.
- `/api/admin/login`: logs sanitized Auth failure reason (`code`, `status`, `message`) without credentials. Public redirect still uses `invalid_credentials`.
- Public locker views: `athleteSlug` added to existing `trackProductEvent` calls. No route path changes.

Routes verified after the fixes:

| Route | Result |
| --- | --- |
| `/auth/admin` 1280×720 | 200. No Search / New Widget. `scrollHeight` 720. |
| `/auth/admin` 375×812 | 200. No navbar chrome. `scrollHeight` 812. |
| `/auth/admin` 390×844 | 200. No navbar chrome. `scrollHeight` 844. |
| `/player/test-null-user-id` | 200. `POST /api/analytics/events` now fires. Local runtime returned 503 because `.env.local` does not expose the staging analytics RPC. |
| `/admin/beta` (anonymous) | Redirects to `/auth/admin?next=%2Fadmin%2Fbeta`. |
| `/admin/beta` (authenticated admin, `.env.local`) | Session handoff **PASS**. Live RPC missing on `drxtzxnwdtgxwueiqygf`; error boundary says no fixture data was substituted. |
| `/admin/beta` (authenticated staging admin) | **PASS.** Dedicated `staging-admin@bltz.test` on `yevihzsgqagvuulymqum`. Live empty-cohort dashboard: "See the signal before the noise.", snapshot 18 Aug 2026, no fixture fallback. |

## 4. Database changes

None.

## 5. Migrations

None added or edited. Canonical files remain:

- `supabase/migrations/20260816000000_beta_intelligence_foundation.sql`
- `supabase/migrations/20260817000000_beta_analytics_qa_hardening.sql`

## 6. Environment variables

No new committed variables. Live RLS JWTs are minted by `scripts/verify-staging-beta-rls.mjs` for one run and never written to env files.

## 7. Permission changes

None.

Verified:

- Anonymous `/admin` traffic is redirected by middleware to `/auth/admin?next=...`.
- Operator admin sign-in sets the Supabase auth cookie and redirects to `/admin/beta`.
- Dedicated staging admin `staging-admin@bltz.test` was created on `yevihzsgqagvuulymqum` with `profiles.role = admin`. Password sign-in succeeded against staging Auth.
- `getBetaIntelligenceDashboard` still calls `requireRole("admin")` before `createServiceClient()`.
- When the aggregate RPC is missing, the page fails closed and does not substitute fixtures.
- Against staging, the authorized page renders the live empty-cohort dashboard (`source: live`, 0 athletes).
- Public locker events can now target by slug when `athleteId` is null.
- Live RLS: anonymous, athlete A, athlete B, and non-admin cannot read raw analytics/feedback/insights; platform admin can; service-role reads succeed; `sb_secret_` with browser metadata is rejected.

Not verified:

- Production project `drxtzxnwdtgxwueiqygf` still lacks the Beta Intelligence RPC. That is a later promotion step, not this merge gate.

## 8. Tests run

Node `v24.3.0`.

- `npm test` — PASS, 24 files passed / 2 skipped; 132 tests passed / 17 skipped.
- `npx tsc --noEmit` — PASS.
- Focused ESLint on changed files — 0 errors. Pre-existing Locker/Photo `any` and `<img>` warnings only.
- `node --use-system-ca scripts/verify-staging-analytics-ingestion.mjs` — PASS earlier this session, 5 live tests.
- `node --use-system-ca scripts/verify-staging-beta-rls.mjs` — PASS, 12 live tests, leftoverRows 0, runId `ba65e7b3`.

## 9. Manual verification

- `/auth/admin` no longer renders Search, New Widget, or a user avatar.
- Admin login document height equals the viewport at 1280×720, 375×812, and 390×844.
- `/player/test-null-user-id` now issues `POST /api/analytics/events`. Local 503 is an environment gap, not the previous client drop. Staging ingestion already proved persistence.
- Operator admin login first returned `invalid_credentials` because `next dev` was started without `--use-system-ca`; the route's GoTrue `fetch` failed and was mapped to that public error. Restarting Node 24 with `--use-system-ca` made sign-in redirect to `/admin/beta`.
- Authenticated `/admin/beta` on `.env.local` rendered the Dashboard unavailable state: "No fixture data was substituted." Server log: `get_beta_intelligence_dashboard` missing on project `drxtzxnwdtgxwueiqygf`.
- Staging browser login as `staging-admin@bltz.test` opened `/admin/beta` with Phase one beta, live snapshot 18 Aug 2026, and the empty-cohort card. `.env.local` was moved aside for that run and restored afterward.
- Disposable staging RLS identities for run `ba65e7b3` (athlete A/B, fan, admin) were created, proven, and deleted. Auth users and profiles read back empty.

Evidence:

- `docs/stabilization/evidence/agent-4-qa/admin-login-1280x720-after.png`
- `docs/stabilization/evidence/agent-4-qa/admin-login-375x812-after.png`
- `docs/stabilization/evidence/agent-4-qa/admin-login-390x844-after.png`
- `docs/stabilization/evidence/agent-4-qa/admin-beta-authenticated-desktop.png`
- `docs/stabilization/evidence/agent-4-qa/admin-beta-authenticated-mobile.png`
- `docs/stabilization/evidence/agent-4-qa/admin-beta-staging-live-desktop.png`
- `docs/stabilization/evidence/agent-4-qa/admin-beta-staging-live-mobile.png`

## 10. Known limitations

- Dedicated staging admin credentials were created for dashboard login and were not written into the repo. Keep them out of git.
- Operator production credentials were used only for the earlier `.env.local` session check. Rotate that password before commit.
- On this Windows machine, `next dev` must be started with `node --use-system-ca` or GoTrue `fetch` fails and the login page reports invalid credentials.
- Local `.env.local` project does not currently expose analytics ingestion or the Beta Intelligence RPC. Staging already proved those contracts.

## 11. Deferred work

After this merge, production promotion still needs the Agent 1 procedure in `docs/stabilization/supabase-production-promotion.md`: evidence, schema/history reconcile, dry-run, and a separate approval before any production migration. Docker blank-reset validation and CLI type generation remain blocked in this environment.

## Defects

### Blockers

| ID | Issue | Status |
| --- | --- | --- |
| B1 | Authenticated `/admin/beta` browser session not verified | **fixed** — staging live empty cohort proven; `.env.local` still lacks the RPC |
| B2 | Live multi-role RLS not independently proven (JWT fixtures missing) | **fixed** — 12/12 on staging, leftover 0 |
| B3 | Demo/public locker analytics drop when `athleteId` is null | **fixed** — views now pass `athleteSlug` |

### Non-blocking

| ID | Severity | Issue | Status |
| --- | --- | --- | --- |
| N1 | High | Anonymous `/auth/admin` shows Search, New Widget, and a user avatar | **fixed** |
| N2 | Low | Desktop admin login document is 6px taller than 1280×720 | **fixed** by navbar removal |
| N3 | Low | Next/Image width-or-height-only warnings on logo assets | open |
| N4 | Low | Pre-existing `@custom-variant` / `@theme` CSS parse warnings | open |

## Ship readiness

**READY TO MERGE.**

Staging ingestion, live `/admin/beta`, and live RLS all passed. Production `db push` is not authorized by this verdict.
