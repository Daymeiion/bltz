# Approved production release plan — October 5, 2026

The user explicitly approved preparing reviewed release checkpoints, implementing
production support, and releasing the authentication/security fixes with the new
analytics pipeline disabled. This supersedes the previous development-only task
boundary for those changes. It does not approve live analytics activation, a new
Organization Console/CRM, campaigns, inferred rights or financial participation.

## Two checkpoints

1. `codex/auth-security-production-2026-10-05`: exact published checkpoint
   `bc12fadb2c7de49d15b440c80abe4e2c8f7cf2cc` plus selected authentication/recovery,
   dependency-security, import-validation, test maintenance and source-ignore
   changes. Preserve the published Locker, Admin and Intelligence Lab UI.
   No schema changes. Release with all four analytics/workflow flags explicitly
   false. Build in the Production environment without assigning domains, verify,
   then promote. Keep the previous deployment as the rollback target.
2. `codex/analytics-production-support-2026-10-05`: build from the released security
   checkpoint, add reviewed measured-loop and production environment support,
   migrations and tests. Validate separately. Keep delivery and workflow flags
   false. Commit/push source for durability; do not deploy or apply its new schema
   to production until migration preflight and hosted staging canaries pass.

## Validation and operational gates

Each checkpoint requires its own clean install, full suite, TypeScript, lint,
production build, dependency audit and source review. A green mixed checkout does
not validate a reconstructed release. Independent review covers environment
isolation, service-only RLS/grants, signature verification, bounded dispatch,
immutable retries, private projections and denied commercial publication.

Next.js is patched to 16.3.6. SheetJS uses its official patched 0.20.3 distribution;
CSV import continues to preserve textual identity/date values and rejects ZIP/OLE
workbooks. Native Next ESLint 16 preserves existing Hooks correctness enforcement.
Five new compiler diagnostics remain visible as warnings so the security release
does not rewrite unrelated UI. Unpatched build-tool `braces` findings require a
future isolated tooling upgrade; do not accept untrusted build patterns/config.

## Hosted analytics prerequisites

- Isolated staging database and reviewed migration-history preflight. The two
  measured-loop migrations and the two forward production-environment migrations
  are versioned source, not proof of remote application. Preserve canonical IDs
  and all existing migration history; never repair drift by editing old migrations.
- Environment-specific Tinybird datasource/query resources and narrow runtime
  append/query tokens. Workspace-admin and account-management credentials are not
  application credentials.
- Fixed reachable HTTPS worker URL; matching regional QStash token and both signing
  keys. Optional Vercel automation bypass is forwarded as a header only to this
  fixed destination. No query secrets or global protection disabling.
- Production additionally requires `VERCEL_ENV=production`, matching environment
  settings, and separate analytics/workflow production opt-ins. All flags remain
  false until the canary is approved. Tracked release configuration also pins them
  false; remove/replace those defaults deliberately in the enablement release.
- `CRON_SECRET` authenticates the cron-ready GET dispatcher; a schedule is not
  created or enabled by the source change. POST dispatch retains its own secret.
- Acceptance → batch → real QStash signature → Tinybird acknowledgment → exact
  ID/content reconciliation, including replay, timeout and lost-ack tests.
- Monitoring/alert ownership, backlog sizing, retention, key rotation, auditable
  quarantine/dead-letter recovery and rollback. Reconciliation currently reports
  evidence; it must not automatically replay ambiguous deliveries.

## Product boundaries

Identity and Locker measurements gain durable environment-safe attribution to
existing Career IDs. Reviewing a proposed activation never grants publication
rights or economic entitlement. Manual athlete refresh remains partial coverage;
Moment/asset ingestion, trusted referral/distribution, complete exposure/playback,
37 additional rules and commercial/payment infrastructure are deferred. Synthetic
examples are never production audience or earnings. These relationships remain
useful after an athlete leaves an organization; mature delivery infrastructure is
integrated rather than duplicated.
