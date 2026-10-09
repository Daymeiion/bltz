# Private claim session correction

The held `transport-release-candidate/20261009022458_preview_claim_browser_session.sql` was generated with the installed Supabase CLI. It is not in the active migration directory and has not been applied remotely.

The current private claim function changes accepted interest, claim submission and optional dashboard-interest session IDs to the preview UUID. The candidate preserves the browser's submitted session for those facts so they can join prior preview activity. It makes only three changes to the latest historical function. Staff milestones and referral attribution retain their existing identifiers. Existing response idempotency, viewer authorization, expiry, consent checks, rate limits, owner and grants are preserved. No tables, function signatures, rights claims or verified ownership are added.

The full replacement includes source provenance and checks the normalized existing function-body hash before changing anything. A different hosted function must stop the release; obtain its definition and review it before regenerating a candidate. Do not edit or mark the historical migration partially applied, run a full migration push, or backfill old sessions from guessed data.

Release still requires fresh database identity and migration-history checks, inclusion of this complete forward version in the scoped transactional release packet, and staging private-form persistence plus signed delivery verification. The existing transport/bridge candidates remain prerequisites for export. Capture flags stay disabled until the hosted canary passes.

The focused PGlite regression loads the authoritative conversion function and transport candidates. It verifies persisted accepted/submitted/dashboard events share the original browser session, retries retain original identities and hashes, unauthorized/staff/test submissions create no conversion events, exported fields exclude private form details, and the original function permissions survive replacement. This is local evidence, not live QStash or Tinybird delivery proof.
