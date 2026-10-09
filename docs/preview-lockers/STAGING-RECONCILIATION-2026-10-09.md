# Preview tracking release checkpoint — 2026-10-09

This is the current handoff for the limited preview-locker sprint. It supersedes earlier staging-unavailable findings and earlier held-candidate status. Keith Rivers and future individually invited previews remain the intended scope. CSV ingestion, Organization Console, CRM, the Intelligence engine, rights/value/payment schemas and historical backfill are excluded.

## Verified targets

Production is `drxtzxnwdtgxwueiqygf`. Its read-only preflight captured 74 migration versions, latest `20261001035756`, system identifier `7537636994966709920`, and ordered comma-separated version MD5 `3c14f6ad90f124633fa36d47cac4719d`.

The intended staging branch is `yevihzsgqagvuulymqum`, listed under production's branches. Opening it through that listing succeeds. Its preflight captured 58 versions, latest `20261006043000`, system identifier `7666007964130682852`, and version MD5 `13c8004548aea6b3fbe8a672bbe65c01`. Existing import-related applied versions are preserved; no further import work is included.

The separate project named `bltz-staging`, `mktmlqrfpefluoquntze`, is unrelated to this release. Its missing history/schema must not be bootstrapped or restored as a substitute. No new instance, backup restore, branch merge or credential replacement was needed. A system identifier alone does not establish logical project identity.

Both intended targets proved the three old transport versions and four replacement versions absent, transport objects absent, existing preview/analytics prerequisites present, and the original private claim version present. The normalized existing claim body MD5 `8533cee03ddbd8819447939830d9983d` is a BEFORE-replacement provenance guard.

## Applied staging checkpoint

The complete four-version packet applied to staging in one transaction with identity/history/provenance guards, a history-table lock, five-second lock timeout, 45-second statement timeout, complete source bodies in history, and final permission/capture checks:

1. `20261009003442_analytics_delivery_transport.sql`
2. `20261009003448_analytics_delivery_production_environment.sql`
3. `20261009003454_preview_sprint_delivery_bridge.sql`
4. `20261009022458_preview_claim_browser_session.sql`

Hosted readback immediately after migration confirms 62 versions, latest `20261009022458`, ordered version MD5 `68ac42ff0579f9156f142a519d9d2f0e`, all four complete source bodies, zero outbox/batch rows at that point, capture environment NULL, RLS enabled, no anonymous outbox access, and no authenticated access to the service-only event recorder. The replaced claim function retains PostgreSQL owner, authenticated execute ACL, security-definer status and empty search path. Corrected body MD5 is `cf93750c0d2bb0016c381f53fe7d6ffe`. No Intelligence engine table was created.

SQL result: https://supabase.com/dashboard/project/yevihzsgqagvuulymqum/sql/d871ec56-8643-4633-9a67-b73b9d502910

No production migration, capture activation, deployment promotion or real-player submission has occurred at this checkpoint. Hosted QStash delivery remains a separate gate.

## Source reconciliation and application scope

The unapplied old `20261005183837` retains only its exact engine tail. Old `20261005231340` and `20261006040117` are retired. Four exact reviewed forward candidates now live in the authoritative `supabase/migrations` directory. The applied historical claim migration is unchanged. Engine chronology and fixtures are verified; a full repository migration push remains outside the approved release.

The application candidate starts from the actual live build `889df1ba2eb6eaecfb1376c6b0527a1b57789a2a`, overlays only reviewed preview instrumentation, claim acknowledgment, queue/worker adapters and required dependencies, and preserves live UI and authentication. It excludes later CSV/enrichment/CRM/engine changes. Production analytics flags remain false. The ignored assembly manifest records exact paths and hashes; it must accompany the clean Git release checkpoint.

The primary checkpoint branch is `codex/preview-sprint-events-2026-10-05`; its source reconciliation retains the historical engine tail but does not authorize deploying it. The isolated release branch is `codex/preview-tracking-release-2026-10-09`, based directly on the live commit above. It contains only the reviewed application scope, four transport/session migrations and scoped hosted types. Reproduce future builds from that clean Git branch; do not rerun an older assembly against stale source or merge the full coordinator branch into production. The committed scoped manifest records hashes and sanitized evidence, without runtime secrets.

## Validation and remaining gate

The clean candidate passes TypeScript, all 102 tests across nine focused files, and a Webpack production build. One stale mock acknowledgment was corrected; no product behavior was changed by that fixture repair. The initial local Turbopack build could not follow the external dependency junction; three actual Vercel default builds subsequently reached READY, including the diagnostics patch. Source reconciliation passes 53 SQL tests across six files and scoped ESLint. Existing catalog outputs match after in-memory CRLF normalization; ordinary catalog `--check` still reports a line-ending mismatch. No generated contract content was changed.

Hosted Supabase CLI type generation failed with a transport error. A bounded read-only catalog query then captured the actual three affected tables, 32 columns, four foreign keys and ten RPC signatures. `types/preview-delivery.generated.ts` is generated from that hosted snapshot, with a reproducible generator and source hash. Its TypeScript and deterministic generation checks pass. It is a scoped authoritative snapshot, not a replacement for the older full-database snapshot; no fixture-derived contracts were substituted.

The existing Vercel project's protected preview worker is deployed at `https://bltz-preview-sprint-2026-10-09.vercel.app`, using staging Supabase and development-only Tinybird credentials. Existing protection is preserved; its existing automation credential is forwarded only to the fixed worker. No project-wide environment, production setting or schedule was changed.

One synthetic form submission saved successfully through the hosted API, generated exactly locker-view/accepted/claim-submit facts with one browser session, and preserved event IDs/hashes on retries. Unauthorized-preview and invalid-consent requests produced no exports. Email and free text were absent from exported envelopes. The database contains only the explicit empty-media synthetic fixture; no real player form was submitted.

The first hosted dispatch returned 503. Safe HTTP/network/acknowledgment codes were added without changing the endpoint, signatures, retries, dedupe or response contract; its 31 focused tests, TypeScript and lint pass. The updated protected deployment `dpl_CgAMMCXU7whk9H2cpdd5RCjF35Uv` reached READY. One registered retry reused the existing batch without another form submission and identified QStash HTTP 400. Current durable state is batch `099363f6-e66c-4bb7-abfa-745ce8338f1f`, three immutable events, two publish attempts, zero worker attempts, no message ID, and `qstash_publish_http_400`. This is not confirmed delivery. New staging capture remains NULL. Credentials verify and a bounded provider-log lookup found no entries. Do not blindly republish, resubmit the form or restart either one-shot helper. The publish rejection must be resolved before a new registered attempt or production activation.

Production deployment/activation must retain its own fresh identity/history gate and isolated runtime resources. Do not relabel local mocks or earlier direct Tinybird tests as hosted delivery evidence.

## Completion record

- Files: four active migrations, retired old transport sources, retained engine tail, directly affected SQL fixtures/generator, packet helper, one client test fixture, release manifest and this handoff. Runtime receipts/logs/secrets remain ignored in `output/preview-sprint-events-2026-10-05`.
- Routes: prepared preview event and internal dispatch/deliver/reconcile APIs plus existing inquiry/preview instrumentation; production routes unchanged so far.
- Database/migrations: staging four-version checkpoint above; no production change or backfill.
- Environment: no production values changed. Existing staging/provider credentials and an ignored dispatch secret configure the protected Preview deployment only; new database capture is off after the controlled form test.
- Permissions: existing service-only scope for queue/recorder; existing private claim authorization preserved; no new user principal or public exposure.
- Manual verification: live branch identity, read-only complete preflights, successful atomic staging execution and hosted metadata readback.
- Limitations/deferred work: QStash publish rejection, signed hosted delivery and production activation. A scoped hosted catalog/type snapshot is complete; regeneration of the older full database snapshot is not claimed. All excluded product work remains excluded.

This measures preview activity and the invitation/interest/claim loop without conflating preview IDs with canonical Athlete Career IDs or verified ownership. No Moment or Value Graph relationships are introduced. It remains useful across organization changes and reuses QStash/Tinybird rather than duplicating their workflows.
