# Doctrine reconciliation checkpoint — October 5, 2026

## Summary and baseline

The primary checkout is now `codex/doctrine-reconciliation-2026-10-05`, based on
reviewed production-support checkpoint `9b5897cbf1fb2cede68ebc6cbb964bfcc9748322`.
Known useful preview enrichment was selectively reconciled with the latest UI,
canonical identity, access controls and released authentication/security fixes.
Obsolete standalone mockups and intermediate prototypes are retired recoverably.
The current production deployment is unchanged; this is a source checkpoint.

Do not continue from the old mixed `codex/preview-locker-release` checkout, restore
the old stash wholesale, merge stale `main`, or activate the new pipeline as part
of routine cleanup. [Active build](../ACTIVE_BUILD.md) defines continuation gates.

## Files changed

The adjacent `checkpoint-files-2026-10-05.json` enumerates selected paths, actions,
byte sizes and SHA-256 hashes. It excludes itself to avoid a circular hash.

- Preview editor, authorized private Locker, mapper/server/validation helpers:
  retain existing behavior and attach saved awards/news evidence safely.
- Enrichment, Tavily and bounded metadata-fetch helpers: preserve usable stored
  articles after failures, scope updates to preview revision/identity and stop
  before paid discovery when persistence is unavailable.
- Meaningful regression tests and an in-memory SQL/type verification script.
- Current Lab design references, provenance/license notes and a dated UI capture;
  these remain offline concepts, not production data or application routes.
- README, active-build/status/reconciliation documentation and ignore rules;
  deployment uploads exclude unreviewed pitch files, offline concepts and local
  checkout/provider metadata without ignoring their source review in Git.
- Sixteen obsolete tracked mockup/assets removed from active source, with hashes
  and recovery copies retained locally; prior Git history also preserves them.

Twenty-six critical UI, security, dependency and permission-related files were
verified unchanged after normalizing existing CRLF/LF differences. This includes
bulk media controls, uploaded banners, college/team hints, photo/film rooms,
structured stats, Admin shells, Career Workspace, published invite access and
authentication fixes. `types/preview-lockers.generated.ts` remains unchanged.

## Routes changed

Existing Admin edit, preview create/update and authorized preview read routes gain
optional enrichment. New `POST /api/preview-lockers/[id]/news` explicitly refreshes
news for an authorized Admin. New `GET /api/award-reference/all-american` redirects
to a static illustrative award image. Public Player Lockers receive no private
enrichment reports, identity hashes or raw provider payloads. No Organization/CRM
route or independent application is introduced.

## Database and migrations

Restored sources are byte-identical to the original snapshot:

- `20260929205021_preview_awards_news_enrichment.sql`
- `20260929214716_preview_enrichment_nonretryable_conflicts.sql`

They provide preview enrichment persistence and conflict handling, reference award
definitions and scoped evidence/authorization rules. Generated enrichment types
are included. No remote migration was applied, no hosted history was assumed,
and no Moment, Media Graph, rights engine, Value Ledger or payment schema was
introduced. In-memory PostgreSQL verification is not a hosted RLS attestation.

## Environment variables and production gates

No secret or cloud environment value changed. Existing server-only `TAVILY_API_KEY`
remains optional. The `.env.example` change repairs a documentation link only.
Existing QStash/Tinybird configuration and support are retained, not activated.
All four analytics/workflow flags in `vercel.json` remain `false`:
`BLTZ_ANALYTICS_PIPELINE_ENABLED`, `BLTZ_ANALYTICS_PRODUCTION_ENABLED`,
`BLTZ_INTELLIGENCE_WORKFLOWS_ENABLED` and
`BLTZ_INTELLIGENCE_WORKFLOWS_PRODUCTION_ENABLED`.

Live authentication/security remains the approved deployment
`dpl_ENerkCAjvM3KoLsbvu5gFpJkDJj9`; its rollback deployment and exact source receipt
are recorded in [release handoff](../intelligence/release-handoff-2026-10-05.md).
A checkpoint push does not promote this reconciliation to the live Vercel alias.

## Permissions

News refresh requires server-side Admin authorization, trusted origin, bounded
JSON input and current preview identity/revision. Preview reads reuse existing
viewer/invite authorization before selecting safe evidence. Public projection
omits sensitive enrichment fields. Fetches enforce public IPv4/DNS pinning,
redirect revalidation, size limits and deadlines; UI blocks unsafe image URLs.
Existing recovery/login, upload and private media permissions are preserved.

## Tests run

- Full suite: **1,539 passed, zero failed, 24 skipped**, 178 files reported.
- Full TypeScript check and production Next.js build: passed.
- ESLint: zero errors, 287 warnings, retained as known follow-up debt.
- Runtime dependency audit: zero findings. Seven existing high-severity build-tool
  `braces` findings remain; no forced unrelated Tailwind upgrade was attempted.
- Local enrichment SQL/types verifier: passed, including evidence, deduplication,
  idempotency, auditing, rollback, conflict/failure preservation and access cases.
- Independent focused review: 116 tests passed; 16 additional modeled SQL/RLS
  checks passed. No accepted source blocker was identified.
- Critical-source preservation, migration byte checks, code whitespace review and
  in-memory known-secret comparison: passed, zero known-secret findings. Two
  upstream OFL license lines retain their original trailing spaces; these vendor
  notices were preserved rather than rewritten.

Detailed test/build/lint reports remain under ignored
`output/reconciliation-2026-10-05/`; they are evidence, not release authorization.

## Manual verification

The saved October 4 production UI capture was visually inspected and retained as
dated reference only. No new authenticated hosted/browser onboarding, actual
provider discovery, password reset email or production migration was performed.
Component tests cover empty/error/loading, image safety, persistence and authorized
projection. Isolated hosted staging must verify mobile UI, provider entitlement,
real migration history and authorized/unauthorized behavior before release.

## Recovery and cleanup

The original 17,799 dirty paths included 17,050 nested deck dependency files.
All 749 nondependency dirty files were copied and SHA-256 verified before cleanup
(60,709,894 bytes). Original tracked edits are recoverable from Git stash object
`bbc1590814417569d791cd1c42cacaf063927096`, with a binary patch and path manifest
under ignored `output/reconciliation-2026-10-05/`.

Retired originals/mockups are there as well; do not delete recovery data in routine
cleanup. Nested `node_modules` and Supabase temporary state are now ignored.
Primary-only Git worktree line-ending configuration preserves reviewed file bytes
without changing global Git settings or other checkouts.

The 89 deck/deliverable/outreach review files remain uncommitted, unignored and in
place as requested. They are the intentional remaining primary-checkout dirt.
Two current managed checkpoints are clean and pushed. Forty-three historical
checkouts remain separately catalogued; other chats' files were not mutated.

## Known limitations and deferred decisions

[Held work](held-work-2026-10-05.md) describes source protections/school identity,
the NFL reference-directory CSV importer and historical checkout ownership.
Twenty-one unique historical source files are also preserved with verified hashes.
Do not discard them, execute backfills or port older integrations wholesale.
The source-policy package changes new restricted CSV persistence, so adoption
requires a product decision. The older NFL importer needs transport, permission,
schema/canonical mapping and duplicate review as a separate workflow.

Historical checkout retirement requires ownership and preservation checks: 23
clean checkouts have commits reachable from fetched refs, 14 clean have local
commits absent from those refs, and six are dirty. Remote-ref absence alone does
not prove current product functionality is missing. Pitch files there remain held.

Production analytics still needs the separate hosted staging/delivery/replay,
monitoring and resource/token gates in the approved release plan. Existing rule
coverage is partial, not complete referral/playback/commerce intelligence.

## Product-direction check

Career identity gains athlete-linked article/award evidence, source provenance and
durable preview enrichment across refresh/review failures. Canonical `players.id`
is unchanged. Evidence is not automatically promoted to verified achievements.
No Moment or Value Graph relationship, ownership or payment entitlement is inferred.
This historical evidence remains useful after an athlete leaves an organization.
Discovery uses provider adapters; no generalized DAM, organization CRM, rights
engine or mature media editing/publishing workflow was duplicated.
