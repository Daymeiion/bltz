# Tinybird and QStash build readiness

**Superseded October 5:** Local delivery/feature/review code now exists, all eight inherited failures are fixed, and US QStash runtime credentials are configured and read-verified. No hosted delivery or production rollout is claimed. Read the [current auth/QStash handoff](auth-qstash-setup-2026-10-05.md) and [Measured Intelligence report](measured-loop-completion-2026-10-05.md); the October 4 assessment below is historical.

October 4, 2026. Coordinator review only; no application implementation or production changes authorized by this review.

**Connections are ready for controlled development. Application integration and production readiness remain separate gates.**

| Item | Verified state |
| --- | --- |
| Tinybird | Fresh read-only status verified `BLTZ_Intelligence` and the expected `codex_preview_locker_release` Cloud Branch. Focused privacy tests passed 3/3. Prior branch-only build succeeded. |
| Tinybird application integration | Pinned SDK and server-only client scaffold exist locally. Zero Data Sources, Pipes, or Connections are defined; application routes do not consume this scaffold. Event contracts, ingestion, and query endpoints remain to be designed and built. |
| Upstash/QStash account access | Developer API MCP connection is saved and verified: 59 discovered tools and successful read-only `qstash_list_users`, with two instances. AVG inspection stays enabled. See `upstash-connection-status.md`. |
| QStash application integration | No `@upstash/qstash` application dependency or QStash worker/publisher integration was found in the inspected application code. Presence-only local dotenv inspection found `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY` unset. No credential values were printed. Account Developer API authentication does not replace these runtime credentials. |
| Version-control gate | Branch `codex/preview-locker-release`, HEAD `6b74fb6`. Current UI, enrichment, intelligence, Tinybird setup, and other work remains uncommitted. This review identifies the gate; it is not an audit/classification of the entire dirty tree. Preserve existing work and coordinate a reviewed stable checkpoint before new application implementation. |
| QA/release gate | Tinybird setup records successful type checking, lint, and production compilation, with seven preexisting authentication test failures in the full-suite baseline. This review reran only the three focused Tinybird tests; it does not certify a clean full suite or a production release. Vercel runtime credentials and an end-to-end hosted job were not verified here. |

Recommended sequence:

1. Coordinate and approve a stable checkpoint of existing work; do not blindly commit the dirty tree or overwrite another implementation agent.
2. Review the Tinybird event/data contract and one bounded QStash workflow: canonical athlete IDs, privacy, versioning, duplicate handling, bounded retries, and failure visibility. This is the next design milestone, not permission to create future-phase graph schemas.
3. Configure server-only QStash runtime credentials for the chosen existing region; implement and verify one signature-protected development job and its Tinybird delivery/query path after scope approval.
4. Run application QA and obtain the required deployment approval before production configuration or publishing.

The account connection is sufficient to start the design/configuration milestone. It does not establish that QStash is already publishing jobs or Tinybird is already receiving product events.

References: [Tinybird setup and prior validation](tinybird-infrastructure.md), [Upstash connection verification](upstash-connection-status.md), and [official QStash Next.js runtime and signature requirements](https://upstash.com/docs/qstash/quickstarts/vercel-nextjs).

Completion record: only this coordinator status document was added. No routes, database tables, migrations, application environment variables, permissions, schedules, resource data, or production deployments changed. Current full-suite failures and uncommitted work remain open gates. No Career, Moment, or Value Graph relationships were introduced; existing external services will support approved workflows rather than duplicating them.
