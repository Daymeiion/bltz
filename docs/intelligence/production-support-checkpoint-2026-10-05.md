# Production-support checkpoint — October 5, 2026

## Summary

Reviewed source branch `codex/analytics-production-support-2026-10-05` starts from
the published-source-based security commit
`889df1ba2eb6eaecfb1376c6b0527a1b57789a2a`. The measured loop now supports explicit
development/production isolation. This checkpoint is committed/pushed for durable
continuation; it is not the auth/security deployment and must remain disabled.

## Files and routes

The accompanying source manifest lists exact changed files and SHA-256 values.
Changes cover analytics producer/collector/outbox/delivery, Tinybird definitions,
measured snapshots and review workflows, existing Lab integration, bounded private
synthetic examples, generated contracts, migrations and regression tests. Locker,
photo-room and Organization/CRM runtime files remain the security baseline.

Relative to that published baseline, prepared routes include
`/api/internal/analytics/deliver`, `/api/internal/analytics/dispatch`,
`/api/internal/analytics/reconcile`, `/api/admin/intelligence/features`,
`/api/admin/intelligence/workflows`, and Admin-only non-production examples at
`/admin/intelligence/examples`. Existing collector/onboarding/Lab routes consume
the new contracts only through their server authorization and explicit gates.

## Database and migrations

The two original measured-loop migrations remain unmodified:
`20261005183837_intelligence_measured_delivery.sql` and
`20261005184406_intelligence_review_workflows.sql`.
Two forward migrations were created through the installed Supabase CLI:
`20261005231340_production_delivery_environment.sql` and
`20261005231344_production_review_environment.sql`.
The latter add scoped constraints/RPCs and composite foreign keys. Shared
authentication identities retain `auth.users.id`; no environment column is added
to authentication identity. Immutable context and engine/input lineage remain
enforced. Historical graph/source-review migration source is preserved for
reproduction and must be reconciled with actual history before any application.

No production records, database schema or migration history were changed.
Catalog-derived additive types reproduce against executable local PostgreSQL
migrations. They are not a remote-schema attestation.

## Environment and permissions

Production delivery requires enabled pipeline, environment `production`, Vercel
Production and separate `BLTZ_ANALYTICS_PRODUCTION_ENABLED=true`. Review workflows
require their own matching environment and production opt-in. All four flags
remain explicitly false in `vercel.json` and the example configuration.

`CRON_SECRET` authenticates bounded production GET dispatch; POST dispatch uses
its existing separate secret. Optional `VERCEL_AUTOMATION_BYPASS_SECRET` is bounded,
server-only and forwarded only as a header to the fixed worker URL. No schedule,
credential, remote environment setting, account or cloud resource was changed.

Existing platform Admin authorization, RLS and service-only grants remain.
Unauthorized, cross-environment and stale/replayed mutations fail closed. Raw-body
QStash signatures bind to the exact worker URL and configured regional keys.
Internal/bot activity is excluded from audience eligibility in production.
Current reviewed media permissions still control asset context; display approval
does not grant publication, licensing or financial rights.

## Validation

- Clean isolated candidate: 1,406 tests passed, zero failed, 24 skipped.
- TypeScript and production build passed. Lint: zero errors, 288 warnings.
- Offline Tinybird generation: two isolated datasources/eight pipes; no network
  access. No definitions were deployed remotely.
- Both catalog type reproduction checks passed.
- Runtime dependency audit: zero findings. Seven known unpatched build-tool
  findings remain inherited from the security checkpoint.
- Independent security review tested real local PostgreSQL mutations, environment
  constraints, signature/transport boundaries, private projections and denied
  publication. It caught/fixed actor lookup, table-specific trigger columns and
  production collector exclusion errors before this checkpoint.
- Authorization regression checks cover the new endpoints' assignment-gate
  delegation before service-client construction; no legacy check was removed.

## Manual verification, limitations and deferred work

No hosted end-to-end delivery, scheduler or production analytics canary is claimed.
Follow `production-release-plan-2026-10-05.md` for migration preflight, isolated
staging, scoped Tinybird provisioning, callback reachability, actual signed
delivery/acknowledgment/reconciliation, monitoring and auditable recovery.
Do not enable production by changing only flags. The tracked false deployment
defaults also require a deliberate enablement release after those gates pass.

Athlete refresh remains manual and coverage remains partial. Growth is suppressed
without complete coverage attestation. Only nine of 46 rules are implemented.
Broader Moment/asset instrumentation, verified distribution/referrals, complete
playback/exposure, rights/commerce adapters and commercial/payment outcomes remain
deferred. Reconciliation is read-only; ambiguous delivery is quarantined rather
than automatically replayed. These limitations do not block the separate
authentication/security release.

## Product direction

Canonical Career IDs gain persistent measurement lineage; existing athlete/Moment
evidence relationships and internal review history gain environment integrity.
No appearance/contribution, ownership or earnings is inferred. The work remains
useful after an athlete leaves an organization. QStash/Tinybird are integrated;
no DAM, social publishing system, Organization CRM or payment engine is duplicated.
