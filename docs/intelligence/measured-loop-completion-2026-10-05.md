# Measured Intelligence loop: local completion and remaining gates

**Follow-up status:** The eight failures below were subsequently resolved and local QStash runtime credentials configured. Current results are **1,438 passed, zero failures**; see [Authentication fixes and QStash setup](auth-qstash-setup-2026-10-05.md). This report preserves the initial milestone's history and 89-file recovery snapshot. Hosted delivery and production deployment remain unverified.

October 5, 2026, America/Los_Angeles. This is a local implementation and validation report, not a production deployment, an applied cloud migration, or a claim that the complete intelligence engine is operating.

## 1. Summary

The authorized slice repairs the existing event-target serialization, adds a bounded development analytics delivery path, implements versioned athlete/Moment/asset feature projections and explainable deterministic candidates, prepares durable internal review and activation-draft workflows, establishes a reviewed legacy Moment-to-asset boundary, and fits supported read models into the existing Lab. Six isolated synthetic scenarios exercise actual pure code where available and clearly identify arithmetic simulations and unexecuted integration expectations.

The complete desired loop remains **partially implemented**. In particular, trusted distribution, new exposure/playback and use-intent instrumentation, complete observation coverage, Moment/asset refresh adapters, production/organization serving, executable publication, authenticated partner outcomes, agreements, allocations and payouts are not operating end to end. No commercial claim or financial entitlement follows from a browser event, a proposed brand, a reviewed media association or an editorial approval.

### Authority and source baseline

- Product authority: `docs/product/BLTZ_PRODUCT_DOCTRINE.md`, verified v1.2, SHA-256 `0E84F897B943AD2E0B95DDE3DA02DF209DB31B316E8089D2B1BB7AD4769987DA`. The authoritative path is restored and matches the verified production copy.
- Applicable sequence: `docs/BLTZ_BUILD_ORDER.md` and `docs/media/MEDIA-GRAPH-ROADMAP.md`, interpreted through the explicit bounded Intelligence assignment. This slice does not introduce the future full Media Graph, rights engine or Value Ledger.
- Latest verified published source checkpoint: `bc12fadb2c7de49d15b440c80abe4e2c8f7cf2cc`, branch `codex/intelligence-production-2026-10-05`, production handoff deployment `dpl_95pdtfr5Ka2BR9qZHuiS9EGhJ9Hr`. This supersedes the older baseline cited in the October 4 reconciliation.
- Active checkout: `C:/Users/Administrator/bltz`, branch `codex/preview-locker-release`, HEAD `6b74fb662aa0783abbfbd272222adb7a6a192add`. This HEAD is not the published source checkpoint.
- Extensive pre-existing dirty work was preserved. No whole-tree staging, reset, overwrite, commit, push or dirty-tree deployment occurred. Any release must overlay only classified files on the verified published baseline.
- Supporting specifications: `docs/intelligence/fixtures/BLTZ-Intelligence-Signal-Catalog-2026-10-04.csv` and `docs/intelligence/fixtures/BLTZ-Intelligence-Workflow-Fixtures-2026-10-04.json`. These supplied files are specifications, not proof that their integrations exist.

## 2. Files changed

The explicit local source inventory and SHA-256 hashes are recorded in `docs/intelligence/measured-loop-source-manifest-2026-10-05.json`. The recoverable snapshot at `output/measured-loop-2026-10-05/source-overlay.zip` contains **89 source files plus its manifest**; each archived source hash and the embedded manifest were verified. The separate `overlay-verification.json` records the archive hash. No runtime environment file, secret, provider record, Git metadata, dependency cache or `node_modules` is included.

This is a recovery snapshot, **not an approved release overlay or a Git checkpoint**. Selected complete files may retain pre-existing related work. The manifest compares their exact bytes with the verified published source; it does not attribute every changed line to this assignment. Unchanged authority files, historical graph/source-review migrations and supporting dependency/test files are included intentionally. Historical migration source is not permission to reapply it remotely. The package/lock snapshot also retains inherited changes, including `entities`; those deltas must be classified before promotion. The snapshot has not been built on top of the published checkpoint. Review mixed diffs and migration history before copying anything into a release checkout.

| File group | Purpose |
| --- | --- |
| Existing analytics client, collector, onboarding claim producer and writer | Serialize one canonical target; retain identity, visibility, route and legacy validation; stable retry IDs; atomic export acceptance when enabled |
| `lib/analytics/bltz-event.ts` | Bounded versioned compatibility envelope with server-owned context, eligibility and safe exported properties |
| `lib/analytics/delivery/{authentication,config,contracts,http,pipeline,store,tinybird,tinybird-definitions}.ts` | Development queue publisher/receiver, bounded bodies and batches, durable leases/state, Tinybird ingestion, exact reconciliation and deduplicated read definitions |
| `lib/intelligence/features/{contracts,project,signals,parse,index,examples}.ts` | Pure projections, deterministic measured candidates, strict serving parsers, freshness/fence helpers and isolated synthetic fixtures |
| `lib/intelligence/{measured-server,measured-validation,measured-integrity}.ts` | Admin-authorized development serving, explicit manual athlete refresh, preserved typed inputs, deterministic JSON hashing and reproducibility checks |
| `lib/intelligence/workflows/{contracts,permissions,server}.ts` and related review contracts | Durable opportunity review, draft activation commands, optimistic revisions, history and a centralized compatibility permission boundary |
| Existing `app/admin/intelligence` workspace/readers and `MeasuredIntelligence.tsx`, `WorkflowReviewPanel.tsx` | Use current folders and rail hierarchy; separate measured activity from sports performance and rights; preserve unavailable states |
| `app/admin/intelligence/examples/{page.tsx,SyntheticExamples.tsx,examples.module.css}` | Admin-authorized development-only selector for six fictional scenarios; actual shared measurement/signal components; no live fetch or persistence |
| New/updated focused tests, two active migrations and generated database types | Regression, authorization, delivery/reconciliation, feature integrity, review revisions, permission and SQL validation |
| `package.json` and lockfile | Pinned QStash 2.12.0 runtime dependency and locally validated Next.js 16.3.6 security patch; inherited dependency deltas remain subject to release classification |
| `.env.example`, Tinybird config/wrapper and CLI checks | Nonsecret default-off development examples and supporting tooling; runtime secrets were not written |
| Intelligence implementation/report/fixture documents | Scope, authority, completeness and explicit external gates |

Synthetic examples are intentionally imported directly from `features/examples.ts`, rather than exported through the live feature index. The fixture pack is not loaded by the normal analytics worker.

## 3. Routes changed

| Route | Local behavior and boundary |
| --- | --- |
| `/api/analytics/events` | Existing collector retained; component targeting repaired; server-validates canonical subject and public route context; compatibility export uses atomic acceptance when the development pipeline is enabled |
| `/api/onboarding/claim` | Existing claim authorization and mutation flow retained; server-owned analytics IDs preserve original event occurrence/session on retries |
| `/api/internal/analytics/dispatch` | Development-only bounded dispatch; bearer dispatch secret; durable batch messages contain no raw event payload |
| `/api/internal/analytics/deliver` | Exact raw-body QStash signature verification against configured worker URL and both signing keys; durable acquisition, deduplication and settlement |
| `/api/internal/analytics/reconcile` | Development-only secret-protected exact event-ID/content reconciliation of ambiguous batches |
| `/api/admin/intelligence/features` | Internal-admin GET serving and same-origin POST manual athlete refresh; no-store responses; no implicit production analytics enablement |
| `/api/admin/intelligence/workflows` | Internal-admin typed reads/commands; bounded bodies, cross-site mutation rejection, optimistic revisions and safe error responses |
| `/admin/intelligence` | Existing identity/watchlist/folders/Signals/Opportunities/Activations layout reused; supported measured and review data are added without fictitious real-athlete metrics |
| `/admin/intelligence/examples` | `NODE_ENV=production` or `VERCEL_ENV=production` returns not-found before authorization or fixture construction; otherwise requires internal-admin authorization |

No organization dashboard/CRM route, enterprise API, publishing endpoint, partner commerce webhook or payment route was added by this slice.

## 4. Database changes

Local migration source prepares the following development-only tables. They have **not been applied to a remote Supabase project**.

| Tables | Purpose |
| --- | --- |
| `analytics_delivery_outbox`, `analytics_delivery_batches` | Atomic legacy-event acceptance plus immutable export/outbox, separate publisher/worker leases, bounded retries, quarantine/dead-letter visibility and reconciliation |
| `intelligence_engine_runs`, `intelligence_feature_snapshots` | Preserved typed input snapshots, rule/feature lineage and current serving pointers fenced by subject/scope/environment/version, as-of time, watermark and input revision |
| `intelligence_review_opportunities` | Stable candidate identity, canonical subject, signal/evidence/run lineage, assignment, acceptance/dismissal/expiration states, blockers and revision |
| `intelligence_moment_asset_links` | Explicit reviewed legacy media/video-to-athlete/Moment association with evidence and revision; never inferred contribution, ownership or clearance |
| `intelligence_activation_drafts`, `intelligence_activation_assets` | Proposed brands, intended use, release date, linked reviewed assets, draft/review/paused/cancelled states and revision-bound editorial approval |
| `intelligence_workflow_history` | Command identity, actor, reason, before/after records and idempotent auditable review/draft changes |

Supabase remains the canonical product, permission and transactional system of record. Tinybird is a development analytics projection. No second athlete identity table, inferred roster membership, rights grant, agreement, transaction, allocation or payout table is created here. Draft metrics remain null and publishing is blocked without the separately authorized adapters and approvals.

Serving replacement rejects an older watermark **or** older as-of time. At equal watermark and as-of time, only a higher input revision may replace the pointer; a later computation clock alone is insufficient. The store applies that fence atomically. Exact retries do not create a new run state, and conflicting logical identities fail closed. Replay claims are limited to the preserved inputs of these new runs, not historical database states that were never captured.

## 5. Migrations

Prepared only in the authoritative active directory:

1. `supabase/migrations/20261005183837_intelligence_measured_delivery.sql`
2. `supabase/migrations/20261005184406_intelligence_review_workflows.sql`

Local PostgreSQL-compatible tests exercise schema functions, role privileges, idempotency, revisions, foreign-key context, leases and stale fences. Generated database types are included in the coordinator's reviewed manifest. No migration was added to the legacy `lib/supabase/migrations` directory. No production history, remote table, remote permission or live record was manually changed.

Applying these migrations still requires a reviewed remote preflight and the concrete environment-specific rollout. A passing local SQL test is not evidence that production has the tables or permissions.

## 6. Environment variables

No runtime secrets or environment values were written, exposed or committed. Thirteen nonsecret template entries were added to `.env.example`, with blank secrets and default-off development gates. Existing account connections and workspace-admin credentials are not application runtime authorization.

| Variable | Purpose |
| --- | --- |
| `BLTZ_ANALYTICS_PIPELINE_ENABLED` | Explicit enablement; disabled by default |
| `BLTZ_ANALYTICS_ENVIRONMENT` | Must be `development` for this slice |
| `BLTZ_ANALYTICS_WORKER_URL` | Fixed reachable HTTPS callback ending `/api/internal/analytics/deliver`; signature audience bound to this URL |
| `BLTZ_ANALYTICS_DISPATCH_SECRET` | Server-only dispatch/reconciliation bearer secret |
| `QSTASH_TOKEN` | Application QStash publisher token, separate from account-management OAuth/API access |
| `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | Server-only receiver keys, including rotation support |
| `QSTASH_URL` | Optional allowlisted QStash endpoint |
| `TINYBIRD_ANALYTICS_URL` | Allowlisted runtime Tinybird API URL |
| `TINYBIRD_ANALYTICS_INGEST_TOKEN` | Narrow server-only datasource ingest token; no workspace-admin token fallback |
| `TINYBIRD_ANALYTICS_QUERY_TOKEN` | Separate narrow server-only query token |
| `BLTZ_INTELLIGENCE_WORKFLOWS_ENABLED` | Explicit development review/draft feature gate |
| `BLTZ_INTELLIGENCE_WORKFLOWS_ENVIRONMENT` | Must be `development` for this slice |

Both runtime gates refuse Vercel production. Existing Supabase server authentication/service configuration is reused, with no new client-side service credentials. The user explicitly chose **“Not yet—continue local implementation and tests”** for QStash runtime configuration. Presence-only verification confirms the new pipeline flags, URL and secrets remain absent; **only local validation is complete**.

Tinybird source defines **one datasource and four pipes**: `bltz_events_development_v1`, `bltz_events_deduplicated_v1`, `bltz_events_batch_reconciliation_v1`, `bltz_events_subject_counts_v1` and `bltz_events_feature_events_v1`. None was created remotely in this implementation turn.

QStash **2.12.0** supplies the official `Receiver`. Publication uses the documented REST boundary with an explicit 15-second request timeout, bounded response/body handling and bounded queue retry/destination timeout headers. Transport deduplication is only an optimization; **there is no claim of a durable 90-day queue deduplication window**. Supabase logical event/batch identity, reconciliation and deduplication before every aggregate provide application-level replay protection, including crash-after-insert/before-ack ambiguity.

## 7. Permission changes

Prepared schema enables RLS and revokes public, anonymous and authenticated direct access to internal delivery, serving and workflow tables/RPCs. Required service privileges are narrowly granted; functions use invoker security rather than introducing a permission-bypass shortcut. Application readers and commands verify the current authenticated internal-admin grant before service-client construction and protected reads/mutations. Browser visibility is not authorization.

The collector retains existing server-side public visibility and canonical route/identity checks. New Moment and qualified legacy asset context must be validated against reviewed server-owned relationships. Internal, preview, synthetic and operational activity cannot become eligible commercial audience activity. Exported properties exclude raw user/account IDs, arbitrary provider payloads, sensitive URLs and private contact data.

Use eligibility is resolved from current reviewed association and current compatibility permission state, not a stale analytics snapshot. Revoked/restricted use is withheld immediately on read. This legacy boundary is not the future rights engine and does not confer license, print, social publication or commercial-campaign rights. Organization-scoped serving remains deferred until membership/tenant checks and approved scoped projections exist. No production role grants were changed.

## 8. Tests run

The following are coordinator-reported repository verification results for the local candidate. They are **not deployed-environment tests**.

| Check | Recorded result | Interpretation |
| --- | --- | --- |
| Focused analytics/Intelligence/SQL/UI scope | **468 passed, 5 skipped across 40 files** | Final post-patch run; `output/intelligence-final-focused-tests.log` |
| Full repository test suite | **1,364 passed, 8 failed, 24 skipped** | Seven inherited failures concern unchanged published auth/recovery source; one is an inherited local-only preview assertion mismatch. The repository-wide suite is not fully green; `output/intelligence-patched-tests.log` |
| Full ESLint | **0 errors, 213 warnings** | Existing warning debt remains; no clean-warning claim |
| TypeScript | **Passed after the security patch** | `npx tsc --noEmit`; `output/intelligence-final-typecheck.log` |
| Production compilation with Next.js **16.3.6** | **Passed**, including TypeScript and 97 static pages | `output/intelligence-patched-build.log`; compilation is not a production deployment or live credentials test |
| Dependency/security audit | **23 findings: 0 critical, 16 high, 6 moderate, 1 low** | Post-patch audit; `output/intelligence-security-audit-after.json`; the dependency tree is not clean |
| Additive generated migration types | **Both reproducibility checks passed** | Measured and workflow generators run with `--check`; existing general generated types not overwritten |
| Tinybird offline source check | **Passed: 1 datasource, 4 pipes, 0 connections** | Generator check disables network access; no resources provisioned |
| Whitespace diff check | Scoped source passed; whole dirty checkout has 5 inherited failures | Unrelated trailing blank lines in preview page, EditorialCard and preview school-branding/server/validation files were preserved |
| Feature/examples plus measured-server subset | **100 passed across 7 files** | Includes actual projection/detector fixture execution, strict persisted JSON validation, auth gates and no synthetic network/storage effects |

**Inherited test gates:** Six failures in `tests/auth/admin-session-rejection.test.ts` expect local sign-out/cookie clearing on rejected admin reauthentication. One in `tests/auth/recovery-form.test.tsx` expects the recovery callback's next target. The corresponding routes/forms and tests match the verified published source; these security/authentication behaviors need a separate reviewed fix or disposition before release. `tests/preview-lockers/media-stats.regression-1.test.tsx` contains an inherited local-only exact object assertion that omits the school `name` property now returned by the unchanged published mapper. Do not call that assertion a proven production regression. No unrelated authentication or preview files were silently changed in this assignment.

**Security patch:** Local dependency source and installed Next.js are pinned to **16.3.6**, and build/type/lint/tests above were rerun against it. The verified published checkpoint still declares **16.3.1**; this local patch does not remediate production. Existing running development processes must be restarted by their owner to load the patched runtime; no unrelated process was stopped. Official advisories identify a [Windows command-injection fix](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), an [AVIF image-optimizer fix](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), and a [Node ImageResponse SVG fix](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j), included by the verified [16.3.6 release](https://github.com/vercel/next.js/releases/tag/v16.3.6). No exploit probe was run, and production-specific exploitability was not established. The install also reified the lockfile; residual audit findings and inherited package deltas need release review.

Meaningful coverage includes real component serialization through the collector/writer boundary, stable retries, invalid public targets, tenant/admin denial, signature/raw-body mismatches, bounded batches, duplicate/late/ambiguous delivery, exact reconciliation, stale feature writes, partial or changed coverage, zero denominators, untrusted distribution, meaningful qualified-session requirements, versioned asset IDs, verified playback/exposure episodes, idempotent review commands, optimistic revisions, revoked display and approval invalidation.

## 9. Manual verification

The coordinator checked the **actual** `SyntheticExamples`, `MeasuredIntelligence` and `MeasuredSignalCard` components in a loopback-only Vite harness on port 3139, without environment values, admin credentials, database access or provider requests.

- All six selector cases rendered correctly with the persistent fictional/development banner.
- Executed fixture checks displayed zero failures. Five rights/workflow and two reconciliation/allocation checks remained visibly **unexecuted contract expectations**, rather than false passes.
- Desktop and **390 × 844** mobile views were checked. No horizontal page overflow occurred; the intentionally wide checks table scrolled inside its own container. Measured scrollbar dimensions were kept separate from the viewport width.
- Screenshots: `output/measured-intelligence-browser-qa/desktop.png` and `output/measured-intelligence-browser-qa/mobile.png`. The temporary viewport was reset afterward.
- Automated DOM interaction tests verify local scenario switching with no fetch, local/session storage write, submission button, live watchlist, ranking or financial persistence.

The real authenticated admin route, remote SQL and QStash → reachable worker → Tinybird delivery were **not browser/live verified**. Authorization/API unit tests and local PostgreSQL-compatible tests cover those code boundaries, but cannot substitute for the future environment-specific canary. No live collector smoke event or financial record was emitted by the synthetic harness.

## 10. Known limitations

1. Runtime migrations, isolated Tinybird definitions and application credentials are not installed remotely. A configured account is not a delivered event pipeline.
2. The current manual refresh prepares **development, public-audience, athlete-level** serving. Supported Moment/asset pure features do not yet have the corresponding refresh adapter, reviewed input sidecars or production/organization serving.
3. Successful event queries never imply complete coverage. Current refresh uses explicit partial/unknown coverage, caps preserved input at 5,000 with a 5,001-row truncation sentinel, and withholds comparable growth signals. Operational coverage failures are distinct from commercial opportunities.
4. Raw eligible tab sessions are not people or returning audiences. Trusted raw arrival sessions remain separate from qualified distributed sessions. Share/copy intent is not a confirmed external post, and legacy opens are not exposure or playback.
5. Trusted link ownership/issuer registry, downstream signed-touch capture, verified visibility/player callbacks, new qualified use-intent instrumentation and expected delivery cadence are not server-connected yet. Their absence suppresses the affected rules.
6. Internal review/draft persistence is prepared, but it does not execute campaigns, establish approved brands, license assets or grant payout entitlements. Publishing remains explicitly blocked. Substantive edits invalidate affected editorial approval.
7. The synthetic revocation scenario executes current-use denial, but does not execute a licensed scheduler, external notice ingestion, automatic publishing pause or production governance event. The duplicate scenario executes local deduplication/fencing, not a live Tinybird crash/reconciliation or financial allocation.
8. No authenticated provider-order confirmation, settlement, refund ledger, agreement engine, athlete allocation, claimable balance or payment integration exists in this slice. Synthetic 15%/40% arithmetic uses supplied planning assumptions only.
9. The full repository has eight inherited test failures, existing lint warnings and 23 residual dependency audit findings. Next.js 16.3.6 passed local validation, but the verified production checkpoint remains unpatched. Neither the broad dirty checkout nor the recovery archive is approved for release.
10. Batch reconciliation is read-only. Held or expired-processing quarantine is not automatically released; an explicit operator recovery procedure and real crash/ack canary are required before approving a replay.

## 11. Deferred work

Before live development operation, review the remote preflight, configure narrow server-side runtime credentials, create the isolated development datasource/pipes, apply the approved migrations, verify raw signatures on a reachable callback, and run a bounded real acceptance/delivery/reconciliation/serving canary. Do not reuse workspace/account-admin credentials for runtime requests or enable production by changing a menu label.

The next supported measurement work is a trustworthy coverage/instrumentation and expected-cadence registry; reviewed Moment/asset refresh adapters; signed distributor-versus-subject link/touch records; verified exposure/playback/use-intent collection; and read models returning useful scoped outputs to athletes and authorized organizations. Delivery scheduling/monitoring and production/tenant rollout require a concrete reviewed scope.

Publishing requires approved intended-use permissions, participant preferences, actual brand agreements, provider/scheduler adapters, revision-bound required approvals and current revocation handling. Commerce requires authenticated partner outcomes, versioned attribution policy, explicit agreement-specific terms, auditable transaction/order-line identity, settlement/reversal/reconciliation and approved payment infrastructure. External purchases, outreach, contractual commitments, pooling and payout execution remain outside this local slice. Do not call the engine complete until those dependencies and the full measured outcome loop are actually verified.

### Requirement completeness matrix

“Implemented locally” means code and focused verification exist; it does not mean remote resources or production behavior exist.

| Supplied requirement | Classification | Evidence or remaining gate |
| --- | --- | --- |
| Read doctrine/build order/roadmap; reconcile published baseline; preserve dirty work | Implemented locally | Verified doctrine hash and source checkpoint above; 89-file hashed recovery snapshot, not an approved production overlay |
| Existing normal component target mismatch | Implemented locally | Canonical ID preferred, slug fallback; collector visibility and route-context checks retained; actual serializer/collector regression tests |
| Stable IDs across retries and compatibility event semantics | Implemented locally | Legacy-v1 adapter; opens/intents remain distinct; export aliases excluded from audience aggregates |
| Bounded BLTZEvent, privacy and server-derived context | Implemented locally | Strict envelope, safe properties and reviewed association validation; unsupported context does not acquire meaning |
| Durable acceptance/outbox and batch/lease/retry state | Implemented locally | Transactional migration/RPC code and local SQL tests; remote migration not applied |
| Raw-body signatures, queue publisher and Tinybird acknowledgment | Partially implemented | Official Receiver/bounded REST/ingest code and tests; runtime credentials/callback/resources and real canary absent |
| Crash-after-insert ambiguity, logical dedupe and exact reconciliation | Partially implemented | Durable quarantine and ID/content reconciliation code; local tests; no live crash/replay canary |
| Delayed snapshot rejection and preserved run inputs | Implemented locally | Atomic fence, positive input revision, immutable typed snapshot/hash and reproduced output checks |
| Athlete/Moment/asset feature contracts and equal windows | Implemented locally | Pure versioned canonical subjects, half-open adjacent seven-day windows and explicit scope |
| Zero/unknown/unavailable/partial/stale/insufficient-sample separation | Implemented locally | Strict DTOs, real denominator/rate matching and growth suppression; no coverage inferred from rows |
| Top Moments/assets/channels and intent/playback/exposure features | Partially implemented | Pure projectors ready; server-trusted inputs/instrumentation and graph-sidecar refresh integration missing |
| Trusted distribution actor/subject separation | Partially implemented | Pure authenticated-sidecar contract and qualified session detector; issuer/touch registry and capture deferred |
| Expected delivery cadence and health monitoring | Partially implemented | Pure external-cadence contract; runtime schedule/attestation/alerting registry deferred |
| First useful deterministic rules and explanations | Implemented locally | Six first-wave rules plus print; existing two career rules retained; server prerequisites suppress unsupported signals |
| Full 46-signal catalog | Explicitly deferred in part | 9 pure rules implemented, 37 deferred; per-rule matrix below |
| Evidence confidence versus editorial priority versus readiness | Implemented locally | Measured evidence confidence remains null; fixed versioned editorial priority; research-needed/not-applicable readiness |
| Admin serving in current Lab folders/cards | Partially implemented | Current hierarchy preserved and read components connected; live route/environment canary outstanding |
| Durable opportunity assignment/acceptance/dismissal/expiration/history | Implemented locally | Typed commands, stable keys, optimistic revisions, idempotent history and local SQL tests; no scheduler or remote apply |
| Draft activations, proposed brands, release dates and lineage | Implemented locally | Null metrics, explicit proposals, reviewed asset links and editorial approval invalidation; not published campaigns |
| Fully approved/published activation and confirmed scoped outcomes | Blocked by external dependency | Rights/preferences/brand agreements/publishing provider and outcome adapters absent |
| Reviewed Moment-to-legacy-media associations | Partially implemented | Evidence-backed FK adapter and typed read boundary prepared; remote records/migration not applied; measurement refresh sidecars deferred |
| Centralized intended-use permission resolution and current revocation denial | Partially implemented | Compatibility boundary blocks unsupported/revoked use now; full rights/clearance engine and external revocation workflow not implemented |
| Synthetic fixtures use actual existing components and remain isolated | Implemented locally | Six selector cases; live parsers reject synthetic DTOs; no network/storage/finance; production not-found and admin gate |
| AI explanation after deterministic computation | Explicitly deferred | Deterministic output/provenance prepared; no AI metric/right/earnings generation added |
| Organization-scoped graph/Intelligence serving | Explicitly deferred | Requires current server-verified membership, tenant projections and production phase gate; no CRM/dashboard expansion |
| Authenticated conversion/settlement/refund/reversal outcomes | Blocked by external dependency | No negotiated/connected provider confirmation or settlement contract; no browser-authorized conversion |
| Versioned agreements and auditable transaction-linked participation | Blocked by external dependency | Signed agreement terms/provider lineage absent; supplied prices and rates remain planning assumptions |
| Allocated/held/claimable/paid earnings and payout integration | Explicitly deferred | Value/transaction/payment scope and agreements required; no financial engine or payment execution |
| Production deployment/commit/push and complete end-to-end engine | Explicitly deferred | No remote mutation; classified release, inherited test/security disposition and concrete rollout approval remain gates |

### 46-rule catalog status

The supplied catalog contains **46 unique rules**: 2 marked implemented, 6 first-wave, 25 next-wave, 8 later and 5 commercial-wave. Current pure rule coverage is **9/46**: the 2 existing career rules, all 6 first-wave rules and 1 next-wave print rule. **37 remain deferred**: 24 next-wave, 8 later and 5 commercial-wave. A pure rule implementation is not a claim of live data, complete coverage, usable rights, a confirmed partnership or an operating commerce engine.

| # | Rule | Current rule status | Server/data prerequisite or reason for deferral |
| --- | --- | --- | --- |
| 1 | `historical_anniversary` | Existing pure rule | Reviewed exact-day occurrence/association/source; existing protected graph reader; no asset rights inferred |
| 2 | `career_milestone` | Existing pure rule | Explicit reviewed statistic threshold and exact occurrence; no inferred first crossing/record |
| 3 | `locker_discovery_spike` | New pure rule | Actual Locker entry sessions; comparable complete windows and coverage; current server refresh partial, so suppressed |
| 4 | `moment_rediscovery` | New pure rule | Reviewed Moment context and qualifying opens/sessions; Moment refresh/sidecar adapter and coverage deferred |
| 5 | `asset_engagement_spike` | New pure rule | Qualified asset model/ID and reviewed binding; asset refresh/sidecar adapter and comparable coverage deferred |
| 6 | `athlete_distribution_growth` | New pure rule | Server-trusted issuer distinct from subject; **qualified** distributed sessions; registry, capture and coverage deferred |
| 7 | `licensing_intent_cluster` | New pure rule | Compatible qualified asset/use and distinct sessions; server-qualified intent collection/bindings/coverage deferred |
| 8 | `measurement_coverage_failure` | New pure rule | Operational only; current partial refresh exposes failure honestly; external expected-cadence attestation/monitoring deferred |
| 9 | `print_intent_cluster` | New pure rule | Asset subject and compatible explicit print use; asset refresh, verified intent and coverage deferred |
| 10 | `media_high_open_rate` | Deferred | Matched exposure episodes, volume denominator, stable instrumentation and complete coverage |
| 11 | `video_completion_strength` | Deferred | Verified player callbacks, playback IDs/autoplay cohorts, matched starts and sample threshold |
| 12 | `share_intent_strength` | Deferred | Reviewed Moment context, denominator and stable share-intent instrumentation; never confirmed posting |
| 13 | `returning_audience_growth` | Deferred | Consent-permitted persistent audience identity; tab sessions cannot establish returning people |
| 14 | `attention_decline` | Deferred | Comparable complete windows and attribution of silence versus missing measurement |
| 15 | `professional_intent_density` | Deferred | Verified/consented professional classification and permitted scope; browser assertions are insufficient |
| 16 | `related_athlete_traversal` | Deferred | Explicit graph traversal instrumentation and canonical destination/source context |
| 17 | `moment_path_concentration` | Deferred | Reviewed paths and qualified Moment sessions with stable denominators |
| 18 | `channel_shift` | Deferred | Trustworthy normalized channel assignment, comparable coverage and versioned baseline |
| 19 | `organization_distribution_growth` | Deferred | Trusted organization issuer/membership/touches and qualified eligible sessions |
| 20 | `cross_athlete_discovery` | Deferred | Reviewed Moment participant roles and permitted cross-athlete traversal data |
| 21 | `graph_search_demand` | Deferred | Authorized query observations, canonical result mapping and coverage/privacy contract |
| 22 | `external_search_visibility` | Deferred | Licensed/authorized external source adapter and stable observation coverage |
| 23 | `verified_news_coverage` | Deferred | Reviewed source observations, publication/occurrence/fetch distinction and deterministic rule contract |
| 24 | `external_social_activity` | Deferred | Authorized external platform adapter, permitted retention and verified subject identity |
| 25 | `upcoming_rivalry_match` | Deferred | Reviewed upcoming schedule/opponent/rivalry relationship and exact dates |
| 26 | `career_transition` | Deferred | Sourced reviewed career status/date precision and transition policy |
| 27 | `award_or_honor` | Deferred | Reviewed award occurrence and athlete association with rule definition |
| 28 | `performance_deviation` | Deferred | Comparable sourced sports statistics, cohort/context normalization and meaningful sample |
| 29 | `reviewed_record_attainment` | Deferred | Explicit sourced verified record attainment; no record inferred from a numeric threshold |
| 30 | `archive_supply_gap` | Deferred | Reviewed Moment supply and explicit archive/search coverage; absent rows are insufficient |
| 31 | `new_reviewed_asset_link` | Deferred | Authoritative new reviewed association/revision events and replay-aware rule |
| 32 | `rights_use_ready` | Deferred | Intended-use-specific rights and required approvals; legacy display eligibility is insufficient |
| 33 | `rights_expiring` | Deferred | Reviewed term/territory/use records and expiry scheduling in authorized rights phase |
| 34 | `rights_revoked` | Deferred | Current compatibility denial exists; rights-notice ingestion, durable rule, publisher pause/audit integration absent |
| 35 | `source_attribution_gap` | Deferred | Reviewed creator/source/credit requirements by asset/use; missing field is not inferred ownership |
| 36 | `identity_mapping_conflict` | Deferred | Reviewed candidate identity collisions and governance rule; no automatic identity merge |
| 37 | `occurrence_date_conflict` | Deferred | Conflicting reviewed occurrence evidence/revisions and explicit resolution rule |
| 38 | `career_completeness_gap` | Deferred | Versioned coverage expectations for canonical career relationships; no free-text membership inference |
| 39 | `confirmed_partner_conversion` | Deferred | Authenticated provider order-line confirmation, trusted touch and agreement/policy lineage |
| 40 | `commission_settlement` | Deferred | Confirmed actual receipt/settlement, currency and versioned agreement; not estimated opportunity value |
| 41 | `refund_or_chargeback` | Deferred | Authenticated reversal identity, original transaction linkage and audited reconciliation |
| 42 | `merchandise_demand` | Deferred | Qualified product intent/context and vendor adapter; clicks do not establish sales |
| 43 | `trading_card_demand` | Deferred | Qualified product/use intent, reviewed asset context and supported vendor data |
| 44 | `speaking_or_camp_media_need` | Deferred | Reviewed career/application use and explicit permitted request data |
| 45 | `activation_performance_change` | Deferred | Actual approved activation, trusted measured outcomes and comparable baseline |
| 46 | `activation_ready` | Deferred | Current permissions/preferences, signed brand/participant agreements, revision-bound approvals and publication adapter |

### Product Graph impact

- **Career Graph:** Canonical `players.id` remains the account-independent Athlete Career ID. Measurements, reviewed candidates and durable draft/review lineage attach to that identity rather than a temporary team, subscription or browser identity. This remains useful after an athlete leaves an organization.
- **Moment Contribution Graph:** Explicit reviewed athlete/Moment and qualified legacy asset associations strengthen accurate context and future discovery. Appearance, participant/contributor role, credit, ownership and economic participation remain separate. No invented Moment is attached to athlete-level conditions.
- **Value Graph:** This slice strengthens the boundary and provenance needed for future transaction-linked attribution. It does **not** create earnings, agreements, transactions, financial allocations or payouts; no Value Ledger completion is claimed.
- **Integration-first:** Existing Locker/event/Lab architecture is reused, with QStash and Tinybird as supporting delivery/analytics infrastructure. No DAM, social publishing suite, general storage system, organization CRM or editing product is rebuilt.
- **Scope drift:** No generalized media-management expansion. The legacy Moment-to-asset adapter supports identity/history and reviewed use; it is not an early replacement for the authorized Media Graph or rights-engine phases.

