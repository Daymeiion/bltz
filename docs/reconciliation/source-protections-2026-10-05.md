# Approved source-protection restoration — October 5, 2026

## Summary and authority

The user approved selective restoration of source protections and school matching
after checkpoint `1f987276a84fb3728fb83bdf562d5f12a1f43970`, plus a separate review
of the older NFL Player Master importer. Work continues on
`codex/doctrine-reconciliation-2026-10-05`. Product Doctrine and build-order phase
boundaries remain authoritative. This checkpoint does not deploy production.

The restored registry is an application policy, version `2026-09-29.1`; it is not
fresh legal verification of every provider or a statement that private viewing,
public access or an accepted reference URL establishes licensing permission.

## Files and routes

`source-protection-files-2026-10-05.json` lists exact selected paths and SHA-256
hashes, excluding its own circular hash. Main source groups:

- `lib/source-policy/`: source decisions, registered facts transport, vetted
  results/provenance and exact-entry CSV retention.
- `lib/enrichment/` and `lib/preview-lockers/enrichment.ts`: policy gates before
  metadata requests and persistence; bounded diagnostics and provenance.
- Pipeline fetch/orchestrator/types/synthesis and existing Wikipedia, ESPN,
  YouTube, NFL and college cache adapters; fixed Sportradar client checks.
- Shared school-identity and existing preview branding helpers.
- Existing preview create/update handlers and builder CSV help/error handling.
- Meaningful source, fetch, persistence, revision, school and UI regressions.
- Active-build/status/held-work documentation and the separate NFL importer review.

Existing `POST /api/preview-lockers` and `PATCH /api/preview-lockers/[id]` gain
source-boundary checks. Discovery and news refresh retain their current routes.
No new route, Organization/CRM interface or independent application is added.

## Behavior and permissions

Sports Reference family URLs remain discovery/reference links. Their titles and
snippets do not become extracted facts, publisher HTML, copied media or new CSV
tables. Metadata requests recheck initial, redirect and canonical destinations
before requests/persistence. The public metadata transport returns a projection,
not raw publisher HTML. DNS pinning, public-IP checks, deadlines and size bounds
remain intact. Registered facts adapters refuse redirects and preserve source
provenance; ESPN uses its existing fixed endpoint over HTTPS. Cache lookups keep
their original upstream provenance and server-only credentials.

Facts are vetted before synthesis and saving; presentation citations do not
authorize extraction. Policy rejection is distinguished from a provider outage.
Known-link refresh, source-kind filtering, saved identity hashes, selected award
images, configurable Tavily timeouts and exact signed thumbnail parameters remain.
Missing enrichment storage still stops before paid discovery.

School matching shares campus-safe Cal/California, UCLA, LSU and UCF aliases.
Multiple directory matches stay unresolved. Aliases expand discovery context,
not stored affiliations or the saved revision/identity hash. Unknown-school
display fallback, college/team-history fields and existing mapper remain.

New manual college CSV imports are paused: no manual CSV source capability has
been approved. Permissions for an automated adapter cannot be borrowed by an
arbitrary uploaded table. Existing saved entries may be retained unchanged,
reordered or removed; multiset comparison prevents duplicate expansion. Changed
or new entries are denied before mutation. Stale revisions conflict, identical
legacy create retries remain idempotent, and enrollment retries still use the
identity-bound RPC. Manual statistic fields and existing automated stat adapters
remain available. The UI explains these boundaries and retains unsaved drafts.

Server-side Admin/session, origin/body limits, media authorization and revision
checks remain. No role or public/private visibility grant changes. Private
reports/raw provider payloads remain excluded from public Locker projections.
Locker, photo/film rooms, Admin and Career Workspace layouts are unchanged; only
CSV policy guidance/error text and the necessary guard behavior change.

## Database, migrations and environment

No schema, migration or generated database type changes. The two restored
September 29 enrichment migrations remain unchanged and unapplied by this task.
Additional provenance/diagnostics use existing JSON fields. No new Moment,
Media Graph, rights engine, Value Ledger, campaign or payment schema is introduced.

No dependencies, secrets or cloud environment values change. All four
analytics/workflow flags remain false. Existing server-only Tavily/Sportradar
credentials remain optional and scoped as before; no live provider was called.

## Validation

- Full test suite: **1,608 passed, zero failed, 24 existing skips**.
  The runner reports 184 test files; nested suite counts are not file counts.
- Full TypeScript check and production Next.js build: passed.
- ESLint: zero errors, 286 warnings. Existing Vite configuration and disabled
  test iframe-loading messages do not represent live browser/provider failures.
- Runtime dependency audit: zero findings, using the installed system CA;
  TLS verification was never disabled. Existing build-tool audit debt remains.
- Local enrichment SQL/types verifier: passed, including actual modeled SQL,
  RLS/access, auditing, conflict/rollback, expiry and persistence cases.
- Independent focused security review: 152 tests across 14 files passed;
  no remaining candidate security blocker was identified.
- Separate NFL importer review: 23 current GTM/matching regressions passed;
  in-memory held-parser defect probes do not attest restored-feature readiness.

Detailed logs remain under ignored
`output/source-protection-restoration-2026-10-05/`; school and agent-focused
evidence also remains under `output/reconciliation-2026-10-05/`.

## Manual verification and limitations

No new authenticated browser/mobile session, real discovery request, hosted RLS
canary, schema application, production deployment, email, backfill or provider
activation occurred. Automated component tests cover draft/error behavior and
preservation. Local SQL models do not attest current hosted migration history.
Hosted staging must verify actual provider availability/entitlement, schema
history, authorized and unauthorized access, persistence and mobile UX before a
production release. Production analytics remains separately gated and disabled.

## Deferred work and recovery

The [NFL importer review](nfl-master-import-review-2026-10-05.md) recommends a
replacement workflow using the current Admin UI, not the old package. Its parser,
transport, row/file/actor bindings, replay ownership, overwrite/concurrency and
public-directory boundaries require a scoped implementation decision. An initial
2 MB limit and creates/fill-empty behavior are recommended. The actual dataset
and permission for public reference data must be identified before enabling it.
No old import RPC/migration or backfill was restored or executed.

Pitch/deck/deliverable/outreach files remain uncommitted in place. Historical
checkout ownership and unique local work still require separate retirement
review; no other checkout was changed. Original stash, verified snapshots,
retired mockups and held source copies remain recoverable. Current UI/security
checkpoints are preserved; do not restore stale integrations wholesale.

## Product-direction check

This strengthens Career Graph accuracy through school identity matching,
athlete-linked evidence and source provenance. It remains useful after an athlete
leaves a team. No identity is created or merged by an alias; `players.id` remains
canonical and separate from user accounts. No Moment/Value relationship, verified
achievement, ownership, payout or economic entitlement is inferred. No mature
DAM, media editing/publishing, social scheduling or Organization CRM workflow
was duplicated.
