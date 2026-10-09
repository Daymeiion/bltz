# Current focus: 90-day preview-locker event delivery

The user has removed CSV ingestion and future-import optimization from the active task. Preserve its checkpoints and data; do not continue its migrations, retries, release preparation or imports. The current objective is reliable event logging for the small Wizard of Oz preview-locker player dataset through QStash and Tinybird.

## Verified findings

Read-only checks on October 5, 2026 (America/Los_Angeles):

- Local US QStash token and both signing keys verify against the existing regional instance. There are no US QStash schedules. Credentials being valid does not establish delivery.
- Local delivery is explicitly disabled. `BLTZ_ANALYTICS_WORKER_URL`, `TINYBIRD_ANALYTICS_URL`, `TINYBIRD_ANALYTICS_INGEST_TOKEN` and `TINYBIRD_ANALYTICS_QUERY_TOKEN` are absent. Tracked Vercel defaults also disable the pipeline and its production opt-in.
- The configured Tinybird management token successfully lists Data Sources and Pipes. No `bltz_events_*` resources are visible through that token in its current workspace/branch context. The SDK status command failed; do not misreport this as failed Tinybird authentication.
- Production has three preview-locker records and no `preview_link_inquiries` or general `analytics_events` rows. Delivery outbox/batch tables are unavailable through the REST schema cache. Protected conversion tables deny the service-role read, so their counts were not established; do not weaken permissions to read them.
- The protected conversion workflow durably records views, room visits, claim clicks, accepted/submitted/declined responses, booking/walkthrough stages and referrals in `preview_conversion_events`, but it has no export bridge into delivery.
- The newer public-link preview uses `PublicPreviewClaim` and writes only `preview_link_inquiries`. It bypasses the protected conversion journey and currently does not produce its views or claim-click events.

Read-only evidence is in ignored `output/preview-sprint-events-2026-10-05/readiness.json`. No secrets or contact data were printed or saved in that receipt. No production row, schema, permission, environment, schedule or deployment changed during this check.

## Bounded implementation scope

Use the existing preview IDs, conversion ledger and QStash/Tinybird delivery infrastructure. The user identified Keith Rivers as the currently built and published locker; future players will be individually invited. Capture follows published public previews or a current authorized private invitation, not a preloaded cohort, campaign enrollment, canonical Player link or CSV import. Drafts and internal/test activity remain excluded. The original conversion campaign model depends on GTM contacts; that model is not a prerequisite for measuring these previews.

Required measurements:

1. Sent-preview facts when explicitly recorded; do not invent a sent denominator from all draft records.
2. Visible Locker, Photo and Film room visits, photo opens and Career-tab/stat interactions; separate unique preview/session measures from raw event counts. Native video playback/progress/completion is separate from external-embed page opening.
3. Claim button interaction, persisted interest acceptance, form submission and decline as distinct facts.
4. Referral creation/copy, submitted intake, prepared preview and later accepted interest, preserving original referral attribution.
5. Booking clicks, Admin-confirmed bookings and completed walkthroughs as distinct facts.
6. Queue backlog, acknowledgments and failures, with a query that verifies exact event IDs received by Tinybird.

Bridge persisted facts durably, including events created by database triggers; a best-effort route-only call can miss referrals or lose events after a saved response. Add measurement to the current public-link branch without requiring canonical Player links or a CSV import. Preserve current private-viewer checks, public-link behavior and form persistence.

Every exported event must identify the preview and experiment explicitly and stay excluded from commercial/public audience metrics. Interest acceptance is not verified Locker ownership. Do not export email addresses, names, phone numbers, feature-request text, private responses, bearer/referral tokens or arbitrary URLs. Preserve bounded retries, signature verification and idempotency. Do not claim exact people counts from browser sessions or mistake a referral-link copy for acquisition.

## Release and acceptance

Prepare only the preview measurement bridge, required delivery foundation, Tinybird resources/query and hosted configuration. Do not bundle the unrelated Intelligence engine, Organization Console, rights/value schemas, payments, historical event backfills, CRM UI or CSV enhancements. Existing combined analytics/Intelligence migrations need a scoped release decision; do not blindly apply them just to obtain outbox tables.

Run focused preview-event and delivery checks once. Perform one controlled hosted canary: intended UI action -> persisted event -> durable outbox -> signed QStash delivery -> Tinybird acknowledgment -> exact-ID query. Replay the same intended event must not increase logical conversion counts. An unauthorized preview, Admin/test activity, failed form save or disabled configuration must not become a successful athlete conversion. Stop after a failed hosted canary and report its concrete blocker; do not repeat broad audits or import experiments.

Keith Rivers is the first case and future eligible previews use the same event path automatically. Hosted worker URL and scoped runtime tokens/resources must be configured before activation. Keep collection/delivery flags off until those prerequisites and the canary are established.

## Source checkpoint — October 5, 2026

Branch: `codex/preview-sprint-events-2026-10-05`. This is a source checkpoint based on the existing primary checkout, **not** a clean production release candidate. Do not deploy the whole branch: unrelated pre-existing changes differ from the live release.

Implemented:

- Visible hydrated Locker/Photos/Film visits, photo selection, Career/stat tab selection and public claim clicks. Preview events share the protected conversion form's anonymous tab-session UUID.
- Native video open/play, continuous watched 25/50/75% milestones and completion. Seeking and hidden-tab time do not earn progress. External embeds count page/detail opens only; decorative hero/hover playback is not counted.
- Server-only authorization, origin/body bounds, current public-link or private invitation checks, media membership, Admin/test/bot/prefetch exclusions, rate limits and immutable event IDs on retries.
- Atomic persisted public interest acceptance and form submission. Protected conversion/referral facts, including database-created stages, export through an AFTER INSERT bridge. Legacy ledger room-view exports are skipped because the uniform visible client tracker already covers them.
- Strict private preview envelopes and separate Tinybird reports. Logical IDs are deduplicated before counting. Sent, confirmed booking, completed walkthrough and prepared-referral facts remain operational milestones; operational browsing never counts as athlete activity. No emails, names, feature-request text, tokens, media URLs or files are exported.

### Files and routes

- Client: `lib/analytics/preview-client.ts`, `components/preview-lockers/PreviewEventTracker.tsx`, `PublicPreviewClaim.tsx`; optional preview hooks in existing `LockerView.tsx`, `PhotoRoomView.tsx` and `VideoDetailView.tsx`.
- Four existing `/preview-lockers/[slug]` page routes pass the existing authorized preview identity into instrumentation. Layout and styling are preserved.
- New POST `/api/preview-analytics/events`: `lib/analytics/preview-event.ts` and route. Existing POST `/api/preview-link-inquiries` uses a single saved-inquiry RPC.
- Envelope/reporting: `lib/analytics/bltz-event.ts`, `lib/analytics/preview-report.ts`, `lib/analytics/delivery/tinybird-definitions.ts`, `lib/tinybird.ts`. `lib/tinybird-preview-sprint.ts` is a scoped development manifest containing one canonical datasource and two pipes; it creates no duplicate model.
- Focused tests: analytics preview route/report, database preview delivery, preview client/tracker and public inquiry; one existing measured-server fixture is explicitly typed as a legacy event.

### Database and permission changes

Prepared migration: `supabase/migrations/20261006040117_preview_sprint_event_bridge.sql`. **Not remotely applied.** It requires the existing canonical queue foundation and production-environment support first; it deliberately fails if the prerequisite is missing.

The migration adds a private capture setting defaulting disabled, anonymous inquiry session/environment columns, an outbox lookup index, restricted private export helpers/triggers, and service-only scoped recording, inquiry-save and capture-configuration RPCs. Existing viewer permissions and protected-ledger SELECT restrictions are preserved. No Player, Moment, media ownership, rights or Value Graph schema is introduced. Authoritative database types must be generated after the scoped schema has been applied; they were not fabricated from local fixtures.

The new inquiry route requires the migration even when analytics flags are off. Do not release this route ahead of its database RPC. Do not record a partially applied combined migration as fully applied, edit applied history or apply unrelated Intelligence tables just to obtain the queue. The production release must resolve that dependency with a separately reviewed transport-only migration and history preflight.

### Validation and manual verification

- Backend: seven focused files, 112 tests passed, including PGlite authorization, atomic save/rollback, privacy, exclusions and immutable retry checks. The fixture loads the pending combined transport migration plus production support; this does **not** prove a future transport-only release packet.
- Client: 13 new client/component tests and 32 existing component/photo/video regression checks passed.
- Reporting/delivery: three focused files, 54 checks passed; the eight report checks were rerun after fixture and operational-milestone adjustments.
- TypeScript and targeted ESLint pass. CRLF-aware whitespace validation passes; original tracked line endings are preserved.
- Production compile/page generation passes. The local Node worker rejected a CLI certificate flag on the first attempt; a public Windows CA bundle via `NODE_EXTRA_CA_CERTS` preserves TLS verification and passes the compile. Two existing CSS at-rule warnings remain; no unrelated styling changes were made.
- Offline Tinybird generation passes (two environment datasources, ten pipes). Focused development manifest generates one datasource/two pipes.
- Authenticated Tinybird Forward workspace/branch inspection succeeds. An isolated branch `codex_preview_sprint_events_2026_10_05` was created. Its resource build failed; the pinned SDK did not expose a recognized validation error shape. Two bounded setup attempts stopped without promoting main or sending athlete events. Receipt: ignored `output/preview-sprint-events-2026-10-05/tinybird-development-build.json`.
- No live browser funnel or actual QStash-to-Tinybird canary has passed. Automated local tests are not live delivery evidence. Do not mark Keith's real activity as collected or historical tests as recovered.

### Environment, activation and deferred work

No application environment values or collection flags were changed. QStash credentials verify, but the hosted worker URL, scoped Tinybird append/query tokens and successful resource setup are still required. No schedule was created; no production database or deployment changed.

Remaining release work is limited to: resolve the transport-only migration/history dependency; resolve the isolated Tinybird resource validation failure; obtain narrow runtime tokens; assemble a clean candidate from the actual live release with only required event/transport files; configure and test one hosted signed-delivery canary; then deliberately enable production capture/dispatch and verify Keith plus future eligible previews. Preserve the old CSV checkpoint and held pitch files without continuing imports.

No new public-referral UI or provider video-player SDK integration was added. Existing protected referral stages are exported; copying a link never establishes acquisition. Interest acceptance is not verified ownership, tab sessions are not people, and stats-tab interaction does not certify the accuracy of player statistics. No historical backfill or new Admin analytics dashboard is included.

Career Graph contribution: measuring preview interest and eventual invitation/claim relationships while preserving canonical identity separation. This remains useful across an athlete's career. No Moment or Value Graph relationships or implied earnings were created. Existing QStash/Tinybird infrastructure is reused; there is no scope expansion into CRM, generalized media management or payments. Live event delivery remains incomplete.

## Verified continuation — October 8, 2026

This section supersedes the earlier failed Tinybird resource-build status; it does not establish live event collection.

- GitHub source checkpoint `03f9914f5b96fbd47589d007dec7a7e6842f9a57` was pushed and verified on `Daymeiion/bltz`, branch `codex/preview-sprint-events-2026-10-05`. Git transport authorization works. GitHub CLI remains signed out; these are separate credentials.
- Vercel CLI authenticates as `daymeiion` for the existing `bltz` project. The live production alias resolves to READY deployment `dpl_ENerkCAjvM3KoLsbvu5gFpJkDJj9`, source revision `889df1ba2eb6eaecfb1376c6b0527a1b57789a2a`. Its application code matches the earlier `af0b707` baseline; the difference is a handoff document. Preview tracking checkpoint `03f9914` is not deployed: the new event route is absent online.
- The approved Tinybird development build now succeeds in workspace `BLTZ_Intelligence`, isolated branch `codex_preview_sprint_events_2026_10_05`: one datasource and two query endpoints only. No main-workspace promotion, athlete rows, media files or historical backfill were sent.
- Fixed ClickHouse aggregate-alias reuse by naming the logical watermark `logical_received_at`; published output retains `received_at`. Preview report windows use required `DateTime64` parameters, with caller offsets normalized to UTC SQL timestamps while preserving milliseconds and the half-open 90-day bound.
- Tinybird Forward requires resource-scoped token grants in deployment definitions. The development ingest token has APPEND only on the development event datasource. The query token has READ only on the batch reconciliation and preview count endpoints. Production definitions explicitly use different token names; no production resources or tokens were provisioned. Both development endpoints returned successful empty reports using the restricted query token.
- Runtime credentials are saved only in ignored `output/preview-sprint-events-2026-10-05/.env.tinybird-development.local`, with capture and production flags false. They are not committed, exposed to clients, or installed into the production application environment.
- Upstash OAuth metadata access works and the configured QStash token/current/next signing keys verify in `us-east-1`. No schedule or message was created. A hosted worker URL is still required.
- The single direct staging database connection attempt failed before returning identity/history. The installed CLI's documented Management API query path also failed with a transport error. Production database credentials are unavailable locally and browser automation could not initialize. Therefore no hosted history absence proof, database migration, authoritative type generation or application release was performed. No repeated connection loop or TLS bypass was attempted.

### Preserved release candidate and validation

`docs/preview-lockers/TRANSPORT-RELEASE-MANIFEST.json` records three CLI-generated transport-only SQL candidates, their original source hashes, and the release gates. Candidate SQL is held outside the authoritative active `supabase/migrations` directory until fresh staging/production identity and migration history prove the intended reconciliation is safe. Original migration sources remain unchanged. The read-only candidate `PREFLIGHT.sql` contains no athlete/contact rows and can be run in each project's SQL editor to obtain the missing evidence.

The prepared packet builder uses one bounded transaction, checks database identity and exact version history, inserts complete migration history bodies, verifies permission/capture postconditions, and fails on retry against changed history. Four focused local tests prove refusal, rollback, complete history preservation, disabled capture, no Intelligence engine schemas, event idempotency and permission exclusions. This is local evidence, not hosted proof.

Final report/delivery regression run: 55 tests passed across three focused files, including timezone-offset and fractional-boundary reporting. TypeScript, targeted lint and offline Tinybird generation passed. The Tinybird development resource build and restricted-token endpoint checks passed. No whole-repository suite or repeated import audit was run. The earlier source checkpoint's production compile passed; these continuation changes still require validation in the clean hosted release candidate before promotion.

Routes, schema and application permissions are unchanged by this continuation. The pending release still introduces the previously documented event route, inquiry RPC dependency and service-only transport/bridge migrations. No capture flag was enabled. No verified claim, athlete earning, Moment or Value Graph relationship is inferred from this work.

Remaining order: obtain fresh read-only staging/production preflight results; reconcile only demonstrably unapplied migration sources; assemble the scoped application candidate from verified live revision `889df1b`; configure the hosted worker with development-only credentials; complete one signed QStash-to-Tinybird exact-ID/replay canary; then separately satisfy the production activation gates. CSV ingestion, CRM UI, pitch files, historical backfill and unrelated Intelligence workflows remain excluded.
