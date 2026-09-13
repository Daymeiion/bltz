# Combined released-GTM / Admin-auth candidate

2026-08-31 UTC. Local release candidate only; no original-tree delivery, push, merge, deployment, hosted database change or production approval.

## Summary and authority

The user explicitly authorized bringing the reviewed Admin/auth/logout/navigation improvements into the **already released** GTM Admin experience. This narrow exception to the earlier GTM preservation boundary does not authorize generic CRM expansion or later product phases. Existing design and released business behavior remain intact.

- New isolated worktree: `C:/Users/Administrator/bltz-worktrees/admin-gtm-auth-release`.
- Branch: `codex/admin-gtm-auth-release`.
- Base: `737331a5352cdd6bdaf7a7376f15af36f82354b7`; confirmed with read-only `git ls-remote origin refs/heads/main` before implementation.
- Reviewed preservation source: `f56e5664e6bc74b8d3fa86d9215a68dcb539bde2`; selected changes originated in `1d9209f` (recovery), `1d15222` (login feedback), `31657d2` (logout/account controls). No whole-branch merge/cherry-pick.
- `1979b8f`: reconcile recovery and session rejection on released GTM (18 auth/runtime/test files).
- `d08d6ea23f4a13779d376b673810804953cc14ef`: retain GTM navigation with accessible account controls (5 navigation/control/test files). This is the exact built application source.

## Files and routes changed

Runtime paths (13):

```text
app/api/admin/login/route.ts
app/api/admin/logout/route.ts
app/auth/admin/page.tsx
app/auth/callback/route.ts
app/auth/confirm/route.ts
app/auth/error/page.tsx
components/admin/AdminSidebar.tsx
components/forgot-password-form.tsx
components/logout-button.tsx
components/ui/navbar.tsx
components/update-password-form.tsx
lib/auth/admin-session-cookies.ts
lib/auth/redirects.ts
```

Test paths (10):

```text
tests/admin/gtm-sidebar.test.tsx
tests/auth/admin-login-feedback.test.tsx
tests/auth/admin-login-route.test.ts
tests/auth/admin-logout-route.test.ts
tests/auth/admin-session-rejection.test.ts
tests/auth/logout-controls.test.tsx
tests/auth/password-recovery-callback.test.ts
tests/auth/recovery-confirm.test.ts
tests/auth/recovery-form.test.tsx
tests/auth/redirects.test.ts
```

This report is the only additional documentation path. No route was deleted or newly introduced. Changes affect the existing login/logout/callback/confirmation/error routes, password-form behavior, shared account control and Admin navigation.

## Compatibility decisions

- Keep released login's **rejected reauthentication clears the prior browser session** behavior. Add safe error classification without raw upstream details or credential lengths in logs. Reject non-admin/failed authorization results, and expire this project's incoming and staged auth-cookie chunks even if local sign-out fails. Other projects' cookies remain untouched. A stateful cookie-jar regression proves initially permitted staff access becomes denied after rejection, not a hard-coded denial mock.
- Retain `/api/admin/logout` and native POST forms. Local-scope sign-out avoids affecting other devices; always expire this browser's auth cookies and test-auth cookie. An Auth service failure produces truthful `logout_unavailable` feedback rather than a false confirmed-server-sign-out message.
- Retain `getPasswordRecoveryRedirectUrl(origin)` and the released `/auth/callback?next=%2Fauth%2Fupdate-password` reset-email destination. The callback still exchanges PKCE codes with optional `sb_flow_id`, requires a returned user/session, preserves safe ordinary OAuth/app destination queries, strips credential/error query fields and fragments, blocks self-loops, and returns fixed private/no-store/no-referrer errors. No provider, allow-list or email-template changes.
- Token-hash recovery confirmations go only to the password form after verification. Other valid email types preserve their existing home/safe-path flow. The update form verifies the actual user, rejects unresolved callbacks, rechecks the same account before a save, prevents duplicate submissions and offers explicit sign-in links on success. A URL flag never authenticates or authorizes anyone.
- Retain every released sidebar destination and the GTM subtree-active predicate. Use the existing Sheet primitive for modal focus containment/Escape/restoration and named controls. Retain native server Admin logout; the shared non-Admin account control uses the reviewed local-scope logout with failure/retry feedback and a full-document navigation to discard client router cache. No redesign.
- `AdminThemeShell` remains unchanged, including Beta/GTM workspace handling and GTM-specific styling. No older candidate shell overwrote it.

The Supabase skill guided verification against the installed clients and [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)/[local sign-out](https://supabase.com/docs/guides/auth/signout) contracts. Installed Next.js docs guided response/cookie handling and the temporary QA launcher. React review retained existing shared primitives and session guards.

## Retained release invariants

- `/admin/gtm`, `/admin/gtm/contacts`, `/admin/gtm/players`, `/admin/gtm/imports` and `/admin/beta` remain present. All 98 existing page/route files remain present; no unexplained deletion.
- Released GTM Overview/intelligence, Contacts, Player Master prospecting, CSV Imports, action implementations, matching/import/scoring rules and canonical `nfl_players` / `players` references remain unchanged.
- `requireInternalAdmin`, `is_internal_admin`, role assignments, RLS, database types, shared Supabase clients, packages/lockfile, Next configuration and GTM styling remain unchanged. The coordinator independently compared 89 protected files; all match released Git blobs. A separate implementation check of 61 protected GTM/schema/dependency paths found no differences.
- All **27 migration versions are unique** and remain byte-identical to the release. The new disposable verifier contains exact file copies and the complete matching applied version sequence.
- The unrelated stabilization migration `20260825000000_video_participant_attribution_hardening.sql` was not imported; the released version `20260825000000_gtm_relationship_intelligence_foundation.sql` is retained. Thus no duplicate-version collision was introduced.
- Unreleased `fe38a8d` / `1aebe55`, matching extensions, resumable import review, preview/Locker/attribution/organization/landing changes and broad cleanup were excluded.
- Original root `C:/Users/Administrator/bltz` and prior `f56e566` candidate were not edited. Post-work checks found zero mismatches across the original dirty19 plus previously delivered12 paths; prior candidate HEAD is unchanged. Existing GTM worktrees were never written.

## Database, migration, environment and permission changes

**Production/application:** none. No DDL, migration addition/edit, environment-file edit, SDK change, hosted configuration, role grant, contact/player write, CSV import/reupload, outreach or payment action.

**Disposable QA only:** created a distinct project `bltz-admin-gtm-20260831` at `C:/tmp/bltz-admin-gtm-20260831`, API `127.0.0.1:56321`, database port `56322`. Applied the unchanged release chain to a new empty database, then created three synthetic accounts (assigned staff, ordinary, legacy-profile-only admin), two labeled Player Master rows, one private canonical player and one labeled contact. No production data was copied. Existing stacks on 54321/55321 and original localhost:3000 / QA3107 were left running and unchanged.

## Tests and exact build

| Evidence | Result |
| --- | --- |
| Full available `npm test` | **493 passed, 24 live-gated skipped**; 64 files passed / 2 skipped |
| Independent coordinator auth/Admin/GTM suite | **212 passed in 27 files**, exit 0 |
| `npx tsc --noEmit --incremental false` | Pass |
| `npm run lint` | Pass, 0 errors / 199 existing warnings |
| Scoped diff whitespace check | Pass |
| Production build of clean `d08d6ea` | Pass, Next.js 16.3.1/Turbopack, TypeScript passed, 85 pages generated |
| Build-source comparison | All 714 tracked files match the exact commit: 89 byte-exact, 625 CRLF-only differences, zero substantive differences |
| Released migration verification | 27 unique versions, exact verifier file hashes and applied sequence |
| Real local Auth/HTTP/RLS checks with independent cookie jars | **44 passed** |
| Independent coordinator browser QA on isolated alias / exact `d08d6ea` build | **Pass**, desktop and 390×844 mobile, synthetic fixtures only |

Build ID: `C43H1XPyNWMxLu0F2Y6vU`. Build directory: the new isolated candidate's `.next`. Only disposable local verifier values were injected into the process; no `.env` was present or loaded. No build output/dependencies/credentials were committed. Existing CSS warnings remain for `@custom-variant` and `@theme`.

The 44 native `next start` checks establish all five protected routes deny anonymous/ordinary/legacy-profile-only users, direct Contacts reads expose no private rows to them, assigned staff can read all destinations and fixtures, sessions survive repeated requests, cross-site logout is rejected without logging the user out, local logout denies subsequent access, and a prior staff browser session is removed after both invalid-credential and non-admin reauthentication. Missing callback/confirmation credentials produce fixed safe errors. Final counts stayed one contact, two NFL references, one canonical player, zero import jobs. No import was performed.

Existing GTM tests include pure classification/matching/import tests and static/component workflow contracts. They are not evidence of a real LinkedIn import or production data correctness. Recovery tests exercise synthetic/mocked failures and state transitions; real hosted signup/OAuth/email delivery is not proven by them.

## Isolated preview and manual verification

Preview: **`http://admin-gtm.localhost:3117/auth/admin`**. Use synthetic credentials from `C:/tmp/bltz-admin-gtm-20260831/fixtures.json` through the coordinator's approved private local QA mechanism. Never request or use the user's password. Do not publish fixture credentials, auth cookies or tokens in reports.

The installed NextURL implementation explicitly normalizes numeric loopback to `localhost`; `next start` also builds `initURL` from the configured server hostname. An initial numeric-loopback sign-in therefore switched cookie hosts despite successful authentication. This is a local preview constraint, not a production-source change. Native checks passed on canonical `localhost:3117` before switching launchers.

For browser isolation, the coordinator approved a **TEMP-only** custom launcher using the documented `next({dev:false, dir, hostname:'admin-gtm.localhost', port:3117})` API while binding the listener to `127.0.0.1`. It accepts only that alias Host and serves the **same existing production build**. Chromium resolves the alias natively; no hosts-file/DNS change. Only this task's verified 3117 process was restarted. No production custom-server architecture or package-script change is proposed. The supported production deployment remains the existing Vercel configuration.

Launcher: `C:/tmp/bltz-admin-gtm-20260831/serve-isolated-alias.mjs`. Credential-free callback probing confirms the alias is retained. The implementation owner's isolated Playwright browser loaded the login page and was closed before any sign-in; the coordinator independently completed authenticated browser QA to avoid same-host cookie races.

Independent browser acceptance passed on the isolated alias and exact `d08d6ea` application build:

- Staff sign-in reaches Beta; sidebar GTM reaches Relationship intelligence. Contacts shows one explicitly labeled local QA contact and GTM retains `aria-current="page"`. Players shows two fixture rows; a nonmatching name filter shows zero results with a clear empty state.
- Imports retains seven steps, disables Read headers without a file and retains the approval gate. No file was uploaded and no import was performed.
- At 390×844, the importer remains 390 pixels wide without horizontal overflow. The named Sheet trigger/dialog work; Tab wraps Close → Dashboard, Shift+Tab wraps Dashboard → Close, and Escape closes the dialog and restores focus to Open admin navigation. Selecting the mobile GTM link closes the menu.
- Mobile native POST logout reaches Admin sign-in and a direct Contacts request is denied. Desktop staff login/logout followed by Back stays on Admin sign-in without a GTM link.
- Reauthenticating a staff browser as the ordinary synthetic account is rejected with `not_admin`; direct GTM access is subsequently denied.
- With the current verified synthetic session, `/auth/update-password` completes initialization, displays New password and enables Save. No password was entered or changed; this is not proof of a real recovery email exchange.

The coordinator reset the viewport afterward, captured `qa/admin-gtm-fixture-preview.png`, and left a marked GTM Overview preview tab using the staff fixture. All requested independent browser checks completed without findings requiring a code change. No real credentials, password change, production read or production write was involved. Initial numeric-loopback/alias sign-in failures were preview host normalization only; the temporary launcher resolved them without any application source or build change.

External local evidence: `http-proof.json`, `migration-proof.json`, `build-source-proof.json`, `verify-http.mjs`, `setup-fixtures.mjs`, `run-candidate.mjs`, and the temporary alias launcher in the verifier directory. The coordinator retains independent test/browser evidence in its QA directory.

## Production promotion plan — not executed

1. Recheck live remote main and current Vercel production deployment SHA/ID. If either advanced beyond the verified release base, stop and reconcile these path-limited commits against that later release in a new checkpoint; never overwrite later work or force-push.
2. Confirm the intended Vercel project and Supabase project from authorized deployment configuration. `bltz.vercel.app` / project ref `drxtzxnwdtgxwueiqygf` and the successful `737331a` deployment are coordinator-provided release evidence, not a new hosted verification by this task.
3. Record the rollback deployment ID and confirm a recoverable provider backup/snapshot before promotion. Read-only compare hosted migration history with the unchanged released chain and verify required `is_internal_admin`/GTM functions and grants. **This candidate needs no schema migration or data backfill.** Unexpected schema drift is a stop condition, not permission to apply the candidate's unrelated stabilization chain.
4. Reconfirm package/lockfile/clients and all protected GTM paths remain unchanged; re-run tests/build for the exact promotion source and intended environment. Verify the existing production callback and update-password URLs are allowed and existing templates/providers target the expected flow. Do not guess or change hosted templates/allow-lists without separate authority.
5. Obtain final release authorization before push/PR/main merge or deployment. GitHub CLI authentication is currently unavailable per coordinator; restore authorized access separately. Do not solve access by copying credentials or changing roles.
6. After an authorized deployment, verify anonymous/non-admin denial, assigned-admin sign-in/session/logout, Overview/Contacts/Player Master/Imports/Beta reads, existing GTM navigation and approved mobile accessibility checks. Compare read-only baseline data counts; do not run import confirmation, promotion, contact mutations or real CSV uploads as a smoke test. The historical 24,740 NFL rows are not a fresh verified count.
7. Let the user privately exercise any real password recovery and sign-in; agents observe only non-secret outcomes. If error or authorization checks regress, roll the application back to the recorded prior Vercel deployment. Do not roll back or delete released migrations/data: this candidate changes none. Reconcile the Git application commits through normal reviewed revert/forward-fix workflow if separately authorized.

## Remaining limits and deferred work

No production deployment, hosted database/redirect/template verification, real email/OTP exchange, real OAuth-provider round trip, import confirmation/reimport or outreach was performed. Local QA fixture access is not evidence of production access for every account. Full-system security certification and unrelated legacy/Locker/product-focus containment are outside this narrow Admin integration. Independent manual browser acceptance passed; final promotion authorization remains coordinator-owned. No production release approval is claimed by this report.
