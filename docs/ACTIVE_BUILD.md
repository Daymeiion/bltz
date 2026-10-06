# Active BLTZ build — October 5, 2026

The Product Doctrine v1.2 is authoritative; `BLTZ_BUILD_ORDER.md` controls phases.
The primary checkout now uses `codex/csv-matching-recovery-2026-10-05`, based on
the pushed reconciliation/source-protection checkpoint
`3c31bd99ab78c717430b6938df333e03c011c7a0`. It no longer runs from the old mixed
`codex/preview-locker-release` working copy. Source checkpoints do not change the
production alias or authorize a live import.

## Preserved and reconciled

Keep the latest released Locker/photo-room/film-room, Admin, structured stats,
Sportradar, school/team branding and Career Workspace UI. Bulk YouTube entry,
selection/removal, duplicate checks, uploaded banners, published invite access and
college/team suggestions remain. Awards/news enrichment is merged selectively,
without copying archived versions that removed those controls.

Admin preview building can preserve athlete-linked discovery, refresh saved
articles, retain prior usable results after provider failure, and display evidence
in an already-authorized private/published invite Locker. Public Player Locker
routes receive no private reports or raw provider payloads. Missing storage stops
before paid discovery and leaves the saved preview available.

Canonical player identity is unchanged. Award evidence stays unverified; no Moment,
rights-engine, Value Ledger, payment or Organization schema is introduced. The two
September 29 migration sources remain unchanged. Local SQL checks do not attest
hosted migration history; remote application is not part of this reconciliation.

Do not restore the original stash wholesale. It mixes useful additions and stale
removals. Do not merge deferred Organization/CRM branches to resolve ordinary app
differences. Source protections and campus-safe school matching were subsequently
approved for selective restoration. Follow
`reconciliation/source-protections-2026-10-05.md` for the follow-up checkpoint.
The older NFL importer remains a separate reviewed candidate, not active code.

## Unfinished contact import

Read-only recovery identified the original LinkedIn export and three uncommitted
preview jobs. The hosted directory already has 24,740 NFL reference records;
do not replace it with the older local NFL master or merge repeated names.
There are no existing GTM contacts in the audited project.

The guarded contact workflow can preserve 6,100 eligible contacts while explicitly
deferring 544 uncertain Player links. Another 278 excluded rows remain available
in the original file and complete diagnostics. Review choices can be downloaded
and restored against the same file, mapping and current candidate evidence.
The source checkpoint, validations and production gates are recorded in
`reconciliation/csv-matching-completion-2026-10-05.md`. No live import has run.

## Production remains gated

The live release is the authentication/security deployment recorded in
`intelligence/release-handoff-2026-10-05.md`. This reconciliation does not promote
a deployment, apply schema or alter cloud environment values.

All four analytics/workflow flags in `vercel.json` remain false. Production support
is implemented, not activated. Manual refresh/partial coverage is not complete
referral/playback/commerce measurement; only nine of 46 rules exist.

Next analytics gate: read-only migration-history reconciliation, isolated hosted
staging, scoped Tinybird resources/tokens, reachable signed QStash delivery,
acknowledgment/replay/lost-ack checks, monitoring and auditable recovery. Follow
`intelligence/production-release-plan-2026-10-05.md`.

Vercel's Git production branch remains `main`; security was promoted from exact
reviewed source. Do not redeploy stale `main` or assume a checkpoint push changes
the live alias.

## Design and cleanup

`design-reference/current-design-index.md` identifies current production source and
the retained latest Lab concept. Earlier graph/roster prototypes, intermediate
captures and standalone Locker/dashboard/photo-room mockups are retired from
active source. They remain recoverable rather than permanently destroyed.

Pitch-deck source, deliverables and outreach preparation stay uncommitted in place
for review. Nested dependencies are ignored; no deck content enters this checkpoint.

Original dirty source has a verified recovery snapshot under
`output/reconciliation-2026-10-05/original-files` and a named tracked-edit Git stash.
Do not commit/delete recovery data during unrelated cleanup.

Current security and production-support managed worktrees are clean and pushed.
Historical checkout ownership is unverified and some contain unique local work;
their separate catalogue requires review before retirement. Never force-remove
them or execute old backfill scripts as part of cleanup.
