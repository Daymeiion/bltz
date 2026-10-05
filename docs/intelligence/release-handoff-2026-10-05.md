# Reviewed release handoff — October 5, 2026

## Released authentication/security checkpoint

Code commit: `889df1ba2eb6eaecfb1376c6b0527a1b57789a2a`.
Remote branch: `codex/auth-security-production-2026-10-05`.
Managed checkout: `C:/Users/Administrator/.codex/worktrees/auth-security-production/bltz`.
Published source baseline: `bc12fadb2c7de49d15b440c80abe4e2c8f7cf2cc`.

Production deployment `dpl_ENerkCAjvM3KoLsbvu5gFpJkDJj9` is READY and was promoted
to `https://bltz.vercel.app` on October 5, 2026. The Vercel alias API confirmed
the mapping at 23:36:23 UTC. The production deployment URL is
`https://bltz-2y5r9n2n5-daymeiions-projects.vercel.app`.
Rollback deployment: `dpl_95pdtfr5Ka2BR9qZHuiS9EGhJ9Hr`.

An independent comparison verified all 1,089 uploaded source files against the
reviewed clean checkout: zero missing, unexpected or mismatched files. Local
credentials, build/dependency artifacts and new analytics delivery routes were
excluded. Next.js 16.3.6 and the fixed deployment configuration were verified.

All four flags remain explicitly false:

- `BLTZ_ANALYTICS_PIPELINE_ENABLED`
- `BLTZ_ANALYTICS_PRODUCTION_ENABLED`
- `BLTZ_INTELLIGENCE_WORKFLOWS_ENABLED`
- `BLTZ_INTELLIGENCE_WORKFLOWS_PRODUCTION_ENABLED`

Eight candidate HTTP checks passed, including trusted-origin empty sign-in
rejection with synthetic stale-cookie expiry and cross-origin denial. Eight
public-domain GET smoke checks passed at 23:37:00 UTC: home, Admin sign-in,
forgot-password and the known Keith Rivers preview Locker returned 200;
anonymous Admin pages redirected to same-origin sign-in; the intelligence API
returned 401; an invalid callback redirected to the safe error page. Response
bodies and real session cookies were not recorded. No passwords were used and
no recovery email was sent. These checks do not attest a valid-session sign-in,
recovery email or Supabase callback allowlist.

Authentication/session rejection, recovery callback routing, bounded CSV import,
dependency fixes and tests are detailed in `auth-security-release-2026-10-05.md`.
Published Locker, photo-room, Admin and Lab UI were preserved. No new Organization
Console/CRM changes, database changes, migrations, roles or grants were released.

## Preserved production-support checkpoint

Reviewed source/documentation checkpoint:
`37a9b59294a66859e92d5314cf8bdd111d5f75e8`.
Remote branch: `codex/analytics-production-support-2026-10-05`.
Managed checkout: `C:/Users/Administrator/.codex/worktrees/analytics-production-support/bltz`.

The additional handoff documentation commits do not alter either tested source
checkpoint. The production-support branch is committed and pushed; it was not
released to the live production domain. Delivery, measured reads and review
workflows now support explicit environment isolation, separate production opt-ins,
bounded authenticated dispatch and environment-safe database relationships.
QStash/Tinybird signed delivery and review permissions remain fail-closed.

The authoritative source manifest is
`production-support-source-manifest-2026-10-05.json`. It records the reviewed
implementation and its documentation as of the source checkpoint above; this
later handoff is a release receipt, not an additional runtime source change.
See `production-support-checkpoint-2026-10-05.md` for routes, migrations,
environment variables, permission checks and acceptance limitations.

No remote migrations, Tinybird definitions, QStash schedule, analytics flags,
cloud resources, campaign publication or commercial entitlement were activated.
Existing legacy analytics behavior was retained with the new pipeline off.

## Validation and remaining limits

- Security candidate: 1,052 tests passed, zero failed, 24 skipped.
- Production-support candidate: 1,406 tests passed, zero failed, 24 skipped.
- Both clean candidates passed TypeScript and production builds; lint had zero
  errors, with 287 and 288 warnings respectively.
- Both runtime dependency audits had zero findings. Seven high findings remain
  in the unpatched build-tool `braces` chain; a separate compatible tooling upgrade
  is required. Do not feed untrusted build configuration/patterns into that chain.
- Production-support offline Tinybird generation and both database type
  reproduction checks passed. No hosted analytics end-to-end canary is claimed.

## Continue from a clean checkpoint

The original checkout `C:/Users/Administrator/bltz` remains on its existing mixed
branch with prior uncommitted work preserved. Do not reset it, broadly stage it,
or use it as proof of the published release. Continue production-support work in
the corresponding clean managed checkout above, and use the security checkout
for a security-only hotfix. Do not merge unrelated local Organization/CRM work.

Vercel's Git production branch remains `main`; this approved release used the
exact reviewed clean source and an explicit CLI promotion. Do not redeploy a stale
`main` or assume that pushing a checkpoint branch changes the production alias.
A future Git production-branch alignment requires a separately reviewed source
comparison; preserve the current live deployment until that comparison passes.

The next analytics gate is the checklist in `production-release-plan-2026-10-05.md`:
read-only migration-history preflight, isolated hosted staging, scoped Tinybird
tokens/resources, fixed reachable worker and regional signing keys, real signed
delivery plus acknowledgment/replay/lost-ack reconciliation, and monitoring and
auditable recovery ownership. Do not enable by changing only flags. Live analytics
activation and schema application still require their reviewed release gate.

Manual athlete refresh remains partial coverage. Growth stays suppressed without
coverage attestation; only nine of 46 rules exist. Broader Moment/asset events,
trusted referrals/distribution, complete playback, rights/commerce and payments
remain deferred. The work strengthens persistent Career-ID measurement lineage
and review provenance without inferring ownership, earnings or publication rights.

## Local verification receipts

Ignored evidence under `output/auth-security-release-2026-10-05/` includes
`verified-source.json`, `verified-http.json`, `verified-live.json` and
`candidate-status.json`. Test/build/type/lint/audit logs for both clean candidates
are in their respective output release directories. The committed source,
manifests and reports are durable in the pushed checkpoint branches; ignored
local evidence is not an application dependency or a credential source.
