# Measured Intelligence loop implementation

October 5, 2026, America/Los_Angeles. User-authorized implementation; not production deployment.

## Authority and baseline

The two attached implementation/reconciliation documents authorize bounded event, analytics, feature, signal, review, activation and media-boundary work. Doctrine v1.2 is already restored at `docs/product/BLTZ_PRODUCT_DOCTRINE.md`, SHA256 `0E84F897B943AD2E0B95DDE3DA02DF209DB31B316E8089D2B1BB7AD4769987DA`, matching the verified production copy. The reconciliation's older production baseline is superseded by the October 5 handoff: production `dpl_95pdtfr5Ka2BR9qZHuiS9EGhJ9Hr`; exact local checkpoint `bc12fadb2c7de49d15b440c80abe4e2c8f7cf2cc` on `codex/intelligence-production-2026-10-05`.

The active branch remains `codex/preview-locker-release`, HEAD `6b74fb6`, with extensive pre-existing Locker/enrichment/Intelligence/scaffold/docs changes. Preserve that checkout and index. No whole-tree commit, checkout reset or dirty-tree deployment. A release candidate must overlay only reviewed files on the latest verified production checkpoint. Its package/type/schema dependencies require explicit classification.

## Milestones and ownership

| Slice | Owner | Interface/dependencies | Acceptance |
| --- | --- | --- | --- |
| Authority/event repair | Coordinator; event agent owns client and focused tests | Existing strict collector and writer | Real components serialize one target; retry identity, visibility and route checks retained |
| Durable development delivery | Coordinator owns migration/envelope/writer; delivery agent owns queue/worker/Tinybird definitions | BLTZEvent v1; service-only acceptance/outbox/batch RPCs | Atomic acceptance, bounded leases/retries, raw signatures, ambiguity quarantine, logical dedup |
| Features/detectors | Features agent owns pure feature modules/tests | Versioned canonical subjects, explicit scope/coverage, deduplicated events | Equal windows; zero/missing/stale distinct; lineage and suppressed unsupported signals |
| Serving and Lab fit | Coordinator integrates protected reads and existing UI | Snapshots and engine runs; no layout redesign | Honest unavailable states; synthetic isolation; admin gate before reads |
| Review/activation/media | Assigned after the preceding contracts | Durable review/versioned approvals, qualified assets and centralized intended-use adapter | Persistent decisions; edit invalidation; synchronous revoked-use block |
| External outcomes | Coordinator records dependencies | Authenticated partner outcomes and explicit agreements | No browser-authorized purchase, allocation or earnings; no speculative partners |

## Shared contracts

`lib/analytics/bltz-event.ts` defines a bounded compatibility envelope. Existing event journal stays canonical. Export strips arbitrary legacy properties and raw account IDs; legacy media selection is an open, clipboard copy is intent, its duplicate alias is ineligible. Tab sessions never become people. New Moment/asset context is null until validated by a server-owned relationship boundary. Unknown referrer/channel stays unknown.

Runtime enablement is development-only and off by default. Existing analytics behavior remains unchanged when disabled. Acceptance RPC persists the legacy journal plus immutable export/outbox in one transaction; there is no unsafe external dual write. No historical backfill silently changes definitions. Upstash account credentials are never reused as application credentials. Runtime Tinybird ingest/query tokens are separate from the existing workspace-admin SDK token.

QStash messages carry a durable batch ID only. Publisher and worker leases are separate. A publisher acknowledgment must not resurrect an already acknowledged worker batch. Worker verifies the exact raw body against the fixed configured URL and both keys. Tinybird `wait=true` acknowledgment must reconcile expected row counts. Network/partial/422 ambiguity is quarantined for event-ID reconciliation. Raw repeats after crash are tolerated only because every analytics aggregate deduplicates event IDs first; no materialized increment counter.

Feature scopes are explicit, preserving organization isolation; this slice exposes internal-admin serving only. Coverage is supplied from trustworthy measurement/delivery metadata, not inferred from observing a few rows. Historical instrumentation cannot claim exposure, playback, trusted distribution or returning people. Newer snapshots compare window/watermark/version before replacement. Immutable input/run lineage is required for replay claims.

## Exclusions and external gates

No organization CRM/dashboard expansion, new competing athlete identity, inferred participation/media clearance, speculative Getty access, outreach, purchases, contractual commitments, automatic payouts or pooling. Production tenant foundation/canaries remain separate. Synthetic fixture identities and metrics never attach to a real athlete or feed live ranking, reports or finance. Live development delivery needs runtime credentials, isolated Tinybird resources and a reachable signed callback; production changes require a validated concrete release candidate.

## Validation and completeness

Track source/route/SQL/runtime tests, duplicate/late/ambiguous delivery, tenant and public-data protection, revocations/edit approvals, browser responsiveness and full repository checks. Each supplied requirement must be marked implemented, partial, externally blocked or explicitly deferred, with evidence. The accompanying catalog and six fixtures remain expected-result specifications, not claims that all detectors or commercial integrations work.

## Session handoff

The local milestone is implemented and tested; the full engine and production release are not complete. Read `docs/intelligence/measured-loop-completion-2026-10-05.md` for the requirement matrix, inherited release blockers and exact test results. `docs/intelligence/measured-loop-source-manifest-2026-10-05.json` inventories the 89-file SHA-256 recovery snapshot at `output/measured-loop-2026-10-05/source-overlay.zip`. It is not a release approval or a Git checkpoint.

The user initially chose local work without runtime secrets, then explicitly authorized fixing the eight failures and QStash setup. The follow-up [auth/QStash report](auth-qstash-setup-2026-10-05.md) now records zero test failures and configured, read-verified US QStash runtime credentials. Its current source inventory is `docs/intelligence/auth-qstash-source-manifest-2026-10-05.json`; the earlier 89-file archive remains preserved. Both development gates remain off; no cloud migration, resource provisioning, live canary, commit, push or deployment occurred. Preserve the active dirty checkout. Before any release, classify mixed pre-existing diffs against checkpoint `bc12fadb2c7de49d15b440c80abe4e2c8f7cf2cc`, address residual dependency gates and validate the isolated candidate. Do not treat absent live coverage or provider outcomes as zero activity or confirmed earnings.
