# Authentication fixes and QStash local setup

October 5, 2026, America/Los_Angeles. The user authorized fixing the eight inherited failures and QStash setup. This follows the initial [Measured Intelligence milestone](measured-loop-completion-2026-10-05.md); it does not authorize a dirty-tree production release or imply a working hosted delivery pipeline.

## 1. Summary

All eight inherited failures are resolved with two application fixes and a corrected, stronger preview regression assertion. Rejected admin reauthentication now removes the local session instead of retaining an older staff session. Password-reset requests target the existing server recovery callback. The preview test verifies the actual college name and sourced statistics without changing the working mapper or Locker UI.

QStash runtime credentials for **US / us-east-1** are configured in ignored `.env.local`. The publisher token and both signing keys came from the same existing regional instance through the authenticated read-only Upstash MCP tool. A real `GET /v2/keys` verified authorization and exact current/next key agreement. Repeated setup returned no changed names. No key or token was printed, committed, copied into source, or stored in the recovery archive. The account Developer API credential remains only in its pre-existing credential store; it was not used as the application publisher token.

The latest full suite has **1,438 passing tests, zero failures and 24 skips**. Production compilation, TypeScript and lint pass. Live analytics delivery remains disabled: the reachable development HTTPS callback and scoped Tinybird runtime settings are still absent, and the prepared migrations/resources have not been applied remotely.

## 2. Files changed

| Files | Change |
| --- | --- |
| `app/api/admin/login/route.ts` | Locally sign out on every trusted-origin rejection, expire only this project's auth/session/chunk/verifier/user cookies, withhold rejected staged values, keep successful login and CSRF checks |
| `components/forgot-password-form.tsx` | Reuse `getPasswordRecoveryRedirectUrl` for `/auth/callback?next=%2Fauth%2Fupdate-password` |
| `tests/auth/admin-login-route.test.ts`, `admin-session-rejection.test.ts`, `recovery-form.test.tsx` | Exercise actual cookie removal, protected-access denial, local sign-out errors, authorization errors, success and CSRF; recovery targeting and safe retries |
| `tests/preview-lockers/media-stats.regression-1.test.tsx` | Strictly verify full school data and rendered college/games/tackles/sacks; no production component/mapper change |
| `scripts/qstash-env.mjs` | Conflict-safe region/key planning, dotenv preservation and bounded read-only authorization/key verification |
| `scripts/qstash-status.mjs` | Privately load local development settings and print only redacted connection status |
| `scripts/configure-qstash-local.mjs` | Private saved-account authentication pipe, read-only MCP credential retrieval, verification before an atomic ignored local-file replacement |
| `tests/qstash/setup.test.ts` | 62 meaningful configuration, dotenv, privacy, transport and error tests |
| `package.json`, `.env.example` | Add `qstash:setup` / `qstash:status` commands and nonsecret regional endpoint guidance; no dependency version change in this follow-up |
| Intelligence handoff/readiness documents | Supersede historical test/configuration status without discarding the initial milestone |
| `.env.local` — ignored, excluded from source artifacts | Seven local setup variables; all unrelated environment settings preserved |

The full current scoped recovery inventory is `docs/intelligence/auth-qstash-source-manifest-2026-10-05.json`, with hashes against the verified published source. Its archive at `output/auth-qstash-closeout-2026-10-05/source-overlay.zip` contains **103 source files plus its manifest**. Every archived source hash and the embedded manifest were verified; `overlay-verification.json` records the archive hash. The earlier 89-file archive remains preserved separately. Neither archive is a Git checkpoint or an approved release overlay; complete selected files can retain pre-existing related work. Runtime environment files and credentials are excluded.

## 3. Routes changed

- `POST /api/admin/login`: local browser-session cleanup on rejected reauthentication; private no-store redirects.
- `/auth/forgot-password`: the existing form sends the existing recovery callback as its reset redirect target.
- `/auth/callback`, `/auth/confirm` and `/auth/update-password` are unchanged; their PKCE, token and verified-session safeguards remain in place.

No Organization Console/CRM, publishing, payment, scraper, new public route, or QStash delivery route was added or changed by this follow-up. Previously prepared analytics routes remain disabled by their development gate.

## 4. Database changes

None. No row, role grant, RLS rule or remote schema was changed. The local session fix uses existing Supabase Auth behavior and the existing internal-admin authorization RPC.

## 5. Migrations

None added or applied by this follow-up. The initial two measured-delivery/workflow migrations remain prepared source only. Historical graph/source-review migration files in the recovery inventory are supporting source, not permission to reapply them remotely.

## 6. Environment variables

| Local variable | Status |
| --- | --- |
| `QSTASH_URL` | `https://qstash-us-east-1.upstash.io` |
| `QSTASH_TOKEN` | Configured privately; actual read-only runtime authorization verified |
| `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | Configured privately; exact regional key pair verified, no rotation |
| `BLTZ_ANALYTICS_DISPATCH_SECRET` | Generated server-only random secret, preserved on repeat setup |
| `BLTZ_ANALYTICS_PIPELINE_ENABLED` | `false` |
| `BLTZ_ANALYTICS_ENVIRONMENT` | `development` |

Still absent: `BLTZ_ANALYTICS_WORKER_URL`, `TINYBIRD_ANALYTICS_URL`, `TINYBIRD_ANALYTICS_INGEST_TOKEN`, and `TINYBIRD_ANALYTICS_QUERY_TOKEN`. No workspace-admin Tinybird token is reused as a runtime token. No Vercel environment was changed.

The configured QStash origin, token and both keys must remain from one region; the default legacy origin is EU. See [official region guidance](https://upstash.com/docs/qstash/howto/multi-region). All setup/status requests retain TLS verification and reject redirects. No AVG exception or OAuth/account authentication change was made.

Repeat read-only verification with `npm run qstash:status`. `npm run qstash:setup` uses the existing Codex saved-account helper and fails closed if it is unavailable or existing values conflict; it is a local operator command, not an application runtime dependency. Do not edit environment files concurrently with setup. Snapshot comparison detects observed changes before atomic replacement, but does not guarantee a compare-and-swap against every uncooperative editor. Windows privacy relies on filesystem ACLs; a read-only check found no direct read grant for Everyone, Authenticated Users or BUILTIN Users. No ACL was modified.

## 7. Permission changes

No platform role, organization permission or database grant changed. On a rejected admin sign-in, `signOut({ scope: "local" })` targets the current browser session. Cookie expiry still occurs if sign-out fails; other projects' cookies are not cleared. Cross-site requests remain denied before authentication/client work, so the cleanup is not an added cross-site logout path.

QStash setup performs only existing account metadata/credential retrieval and `GET /v2/keys`; it does not publish, schedule, rotate keys, alter account resources or send data to a destination. Runtime keys are server-only and absent from the source recovery archive. Their presence is not a live-delivery proof or an approval to enable the pipeline.

## 8. Tests run

| Verification | Result |
| --- | --- |
| Full repository suite after all changes | **1,438 passed, 0 failed, 24 skipped**; `output/intelligence-auth-qstash-final-tests.log` |
| Focused admin login/session suite | **40 passed across 6 files** |
| Recovery/callback/confirm/redirect/preview suite | **84 passed across 5 files** |
| QStash setup helpers | **62 passed** |
| Full TypeScript | Passed; `output/intelligence-auth-qstash-final-typecheck.log` |
| Full ESLint | **0 errors, 213 warnings**; `output/intelligence-auth-qstash-full-lint.log` |
| Scoped lint including all new operator scripts | Passed with no issues; `output/intelligence-auth-qstash-final-scoped-lint.log` |
| Next.js 16.3.6 production compilation | Passed, including TypeScript and 97 static pages; `output/intelligence-auth-qstash-final-build.log` |
| Script syntax and both additive migration type reproducibility checks | Passed |
| Scoped tracked-file whitespace check | Passed; unrelated dirty-tree whitespace debt preserved |
| Real QStash setup + repeat | Read-only regional authorization/key comparison passed; repeat changedNames was empty; `output/intelligence-qstash-setup-verification.log` |
| Browser bundle secret scan after configured build | **133 browser asset files checked against all 4 configured QStash/dispatch secrets; zero matches** |

The initial 23 dependency audit findings remain separately open (0 critical, 16 high, 6 moderate, 1 low). This follow-up changed no dependency versions, and does not claim the dependency tree or production release is security-cleared. Existing test-environment `act` warnings, two build CSS warnings and stale Browserslist metadata remain visible.

## 9. Manual verification

Verified real QStash connection metadata without printing credentials; confirmed both final and temporary environment filenames are Git-ignored, the pipeline gate is false, its environment is development and the four live runtime values above remain missing. The production build was rerun after credentials were configured; a private scan found none of the four exact secret values in 133 browser asset files. Independent read-only review and synthetic probes found dotenv escaped-quote, dotted/hyphenated-key and colon-assignment edge cases; the planner now preserves unrelated parsed values as well as their untouched raw lines and tests those cases. Higher-priority development-local/process settings are checked for conflicts before saving.

No live browser admin login, actual password-reset email, remote Supabase mutation, queued delivery, Tinybird ingest or financial write was performed. Tests cover application behavior locally; live auth/redirect allowlisting and hosted delivery require their separate environment checks.

## 10. Known limitations

- Source fixes and the Next.js security patch remain local and uncommitted. The latest verified published checkpoint remains `bc12fadb2c7de49d15b440c80abe4e2c8f7cf2cc`, which declares Next.js 16.3.1; no production remediation is claimed here.
- Local cookie removal does not guarantee remote token revocation during a Supabase outage; the route attempts local sign-out and fails closed for this browser.
- Supabase must allow the existing recovery callback URL. No Auth dashboard setting or email template was changed in this task.
- QStash connection setup is complete, but the hosted analytics delivery path is not enabled or verified. Account API access alone is not a queue acknowledgment, worker signature proof or Tinybird delivery receipt.
- The broad dirty checkout and mixed package/source history still require classified promotion onto the verified published baseline; passing this checkout is not proof that a reconstructed release candidate will pass.

## 11. Deferred work and live gate

Before turning on development delivery, establish an isolated development Supabase project and reviewed migration preflight, provision the isolated Tinybird datasource/four pipes with append/query-scoped runtime tokens, and configure a reachable fixed HTTPS worker URL. Verify any preview deployment protection compatibility without globally disabling protection or tunneling an app backed by production data. See [official callback reachability/signature guidance](https://upstash.com/docs/qstash/quickstarts/vercel-nextjs).

Then run one bounded operational canary in the isolated development environment: atomic acceptance → durable batch → QStash publish → actual raw-body signature → acknowledged batch → exact Tinybird ID/content reconciliation. Verify one acknowledged-reference replay without assuming transport deduplication. Hold ambiguity in quarantine; do not automatically release or republish it without the operator recovery procedure. A dispatcher schedule and production rollout remain separate reviewed work.

## Product direction check

Career identity/claim access and canonical Locker measurements become safer and easier to validate. No new Moment/contribution, rights ownership, brand agreement or Value Graph entitlement is inferred. The existing persistent Career ID and third-party delivery infrastructure are reused; no DAM, social publishing suite or organization CRM is duplicated.
