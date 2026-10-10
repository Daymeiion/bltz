# Preview tracking release checkpoint — 2026-10-09

This is the current handoff for the limited preview-locker sprint. The latest checkpoint below supersedes the historical execution record that follows. Keith Rivers and future individually invited previews remain the intended scope. CSV ingestion, Organization Console, CRM, the Intelligence engine, rights/value/payment schemas and historical backfill are excluded.

## Latest checkpoint: publish rejection fixed; production tracking active

QStash's sanitized rejection was `DeduplicationId cannot contain ':'`. The publisher now separates the fixed environment prefix, immutable batch UUID and attempt number with hyphens. Signatures, fixed destination, payloads, retry fencing, timeout and event identities are unchanged. Both development and production regression fixtures use the provider-compatible format.

The protected staging deployment `dpl_FujUvNjiwRoNtdBa3Kh7eihbs2MA` reached READY. One registered retry reused batch `099363f6-e66c-4bb7-abfa-745ce8338f1f` and its three original IDs/hashes. It was acknowledged after one signed worker execution: three physical Tinybird rows, one logical `locker_view`, one `accepted` and one `claim_submit`, all sharing one browser session. A repeated dispatch returned idle with zero events and no extra publish attempt. No second form submission or real player data was used. New staging capture remains NULL.

Production's exact four-version packet applied successfully after a fresh identity/history/provenance preflight and the staging delivery gate. Production now has 78 migration rows, latest `20261009022458`, version fingerprint `e4aa705c56a186d21492a9a23b50f069`. All 74 prior complete migration-row hashes are unchanged; all four complete new source bodies match their local files. The scoped production tables/RPC signatures match the generated hosted contracts. Existing private claim ownership, execute ACL, empty search path and security-definer behavior remain preserved. Capture remains NULL; before the internal canary, production's outbox and batch registry are empty.

Tinybird Main workspace `BLTZ_Intelligence` (`3bc3924b-2d7a-47b7-870e-95735fe8a8d8`) now has a live, data-ready deployment containing only `bltz_events_production_v1`, `bltz_events_production_batch_reconciliation_v1` and `bltz_preview_sprint_production_counts_v1`. No prior resource was overwritten or deleted. Its ingest credential has APPEND on that datasource only; its query credential has READ on those two endpoints only. Management credentials are not deployed to the app.

Thirteen server-side settings were saved for the existing Vercel project's production target only. The first bulk request was rejected without creating any keys because CLI61 sent a parsed array without JSON serialization. A local wire-format reproduction and fresh absent-key/unchanged-deployment gate preceded one corrected request. It passed, preserving all unrelated environment metadata, Supabase values, preview/development targets and Intelligence flags. Secrets were passed through stdin and never printed or committed. A separate production dispatch secret was created in ignored local output.

The isolated application release `84cbe275c43a970f2724bc389c99a80fdd8d8dcd` is committed and pushed on `codex/preview-tracking-release-2026-10-09`. Its latest delta is only the publisher fix, two regression expectations and removal of two hardcoded analytics-false Vercel overrides. Runtime activation still requires explicit production project settings. The clean release preserves the baseline general analytics writer, which has no queue-export code. The coordinator separately preserves a default-off legacy-production export safeguard and its tests; that broader writer is not copied into this release.

Updated clean-release validation passes all 102 tests in nine focused files, TypeScript, scoped ESLint and whitespace checks. The coordinator writer safeguard passes 11 focused tests. Earlier 53 SQL tests and scoped hosted-type generation remain applicable because no migration/type source changed in this fix. Sandbox temp-cache/Git-access failures were resolved by rerunning the scoped checks with access to the managed release worktree; the production separator fixture was corrected after its stale colon expectation failed. No failing check is relabeled as passing.

The committed clean source deployed successfully to the existing production project as `dpl_9wwx7ouVgSf26fBo6iUEMhqbHZeq`; `https://bltz.vercel.app` now points to it. Both unauthenticated worker and dispatch requests return 401. Existing deployment protection remains intact. The default Vercel production build passed.

One registered production internal canary passed while capture was off. Logical event `b17a0000-2026-4009-8000-000000000101`, batch `0c1df6f1-d78c-462f-bfb2-a33cc8ac3629`, reached Tinybird through the hosted signed QStash worker with the exact stored payload hash and one physical row. Two identical acceptance calls returned the same analytics identity and one outbox row. Redispatch returned idle/zero and preserved the acknowledged registry and Tinybird row. It is `legacy-v1`, internal-admin scoped, audience-ineligible, with no user/player/session/media identity; it is excluded from preview/public metrics. No real claim, account or player form was submitted.

After that proof, service-only preview capture was set to `production`. QStash schedule `bltz-preview-sprint-production-v1` dispatches to `https://bltz.vercel.app/api/internal/analytics/dispatch` every five minutes via POST, forwarding the separate dispatch Authorization secret. Provider logs redact that header. Destination, frequency, method, two retries, active state and forwarded authentication were read back. The production database's 78-row history, RLS, claim function and capture setting passed final readback. No Vercel cron or plan upgrade was added. At `2026-10-10T03:10:53.619Z`, provider readback confirmed the first clock-triggered run succeeded (`SUCCESS`) and the next run was scheduled; no extra manual message was created to obtain that result.

Eligible Keith Rivers and future published/authorized individually invited previews now use the same bridge automatically. Draft, unauthorized, Admin/test and bot activity remains excluded. No preexisting event backfill or guessed identity/session join was performed. This proves the tested event path and idempotency; it is not an exactly-once guarantee for every future network failure. Logical queries deduplicate immutable IDs and reject conflicting hashes before reporting.

Rollback is capture NULL first, pause this exact QStash schedule, then disable the two production analytics flags and deploy the reviewed release again. Do not delete event/audit history or roll back the guarded database migrations. Environment updates alone do not change an already deployed runtime. One-shot migration, canary, provisioning and activation receipts are retained locally; never rerun them after an ambiguous response.

GitHub `main` remains `438219905e7f28dc8d3811b79d9d99ba63177ec0` and diverges from the actual live-build baseline. It was not overwritten or merged wholesale. Continue this release from the isolated branch; do not deploy the coordinator branch or assume an unrelated future main build includes this checkpoint. Uncommitted pitch material remains preserved.

### Completion record for this fix

- Summary/files: publisher and two regression files, deployment configuration, coordinator-only writer safeguard/test, and this durable handoff/manifests. The isolated release preserves live Locker, Photo Room, Admin UI, statistics and authentication.
- Routes: existing internal `/api/internal/analytics/dispatch`, `/deliver`, `/reconcile`, preview collection/inquiry routes and preview instrumentation; no additional public workflow or claim permission is introduced by the rejection fix.
- Database/migrations: exactly the four already-reviewed forward versions now applied to both intended environments; no full repository migration push, import, backfill or future-phase schema.
- Environment: production-only QStash inputs, physically isolated Tinybird inputs, fixed hosted worker URL, separate dispatch secret and explicit runtime flags; no secret source upload. General legacy exports and Intelligence workflows remain excluded.
- Permissions: service-only queue/recorder access, unchanged private claim permissions, signed worker verification, no anonymous outbox access, and narrowly scoped Tinybird grants.
- Tests/manual verification: 102 release tests, TypeScript/scoped lint/whitespace, default hosted production build, original hosted staging batch delivery, one internal production canary with exact-ID/hash/physical-row and duplicate checks, unauthorized endpoint rejection, production migration/history/catalog/provider/activation readbacks, and read-only 200/HTML/content checks for Keith's published Locker and Admin sign-in. The HTML checks execute no client JavaScript and submit no form.
- Limitations/deferred: no new visual/mobile browser QA or real-athlete form exercise is claimed. Full database snapshot regeneration and reconciliation into divergent GitHub main are not claimed. External embedded videos measure opens, not verified playback; native video milestones have their existing reviewed semantics. CSV, CRM, Organization Console, engine, rights/value/payment work stays excluded.

This strengthens persistent preview activity and the invitation/claim-interest loop. It adds no Moment or Value Graph entities, no inferred ownership or earnings, and no replacement for third-party queue/analytics workflows. Preview UUIDs remain separate from canonical Athlete Career IDs; tab sessions are not people, and acceptance is not verified ownership.

## Historical execution record — superseded by the latest checkpoint above

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
