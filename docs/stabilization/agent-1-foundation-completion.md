# Agent 1 — Database/Foundation completion report

Date: 2026-08-17  
Branch: `codex/stabilization-agent1-foundation`  
Authoritative defects: `.gstack/qa-reports/qa-report-localhost-2026-08-16.md`

## 1. Summary

Validated and completed the stabilization foundation for product analytics. The preserved baseline already contained the hardening migration, server-only writer, trusted-source derivation, database-backed rate limiting, durable client event UUIDs, retry behavior, aggregate dashboard RPC, migration assertions, and matching checked-in database contracts. This agent made the browser input type consume the shared client-safe analytics contract, reused the shared source type in server persistence, and added explicit contract coverage for every event currently emitted by product code.

No new BLTZ product feature was added.

## 2. Files changed

- `lib/analytics/events.ts` — canonical client-safe event input, request schema, taxonomy, and source derivation contract.
- `lib/analytics/client.ts` — consumes `ProductEventInput` instead of maintaining a duplicate client event shape.
- `lib/analytics/server.ts` — consumes the shared `AnalyticsSource` type while remaining behind `server-only`.
- `tests/analytics/contracts.test.ts` — covers all 11 currently implemented events and rejects browser-supplied source attribution.
- `tests/analytics/client.test.ts` — verifies a public event may use either supported athlete target form without weakening the missing-target guard.
- `docs/stabilization/agent-1-foundation-completion.md` — this report.

Foundation files inspected and validated from the preserved baseline:

- `app/api/analytics/events/route.ts`
- `lib/supabase/migrations/20260816000000_beta_intelligence_foundation.sql`
- `lib/supabase/migrations/20260817000000_beta_analytics_qa_hardening.sql`
- `types/database.ts`
- `tests/analytics/client.test.ts`
- `tests/analytics/events-route.test.ts`
- `tests/analytics/server.test.ts`
- `tests/database/beta-foundation-migration.test.ts`
- `tests/database/beta-rls-live.test.ts`
- `tests/beta-intelligence/query.test.ts`

## 3. Routes changed

No route implementation changed in this agent commit. The existing `POST /api/analytics/events` boundary was inspected and tested. It accepts the shared strict request envelope, derives source on the server, verifies athlete association, applies durable rate limits, and writes through the server-only persistence module.

## 4. Database changes

No additional schema change was necessary after baseline inspection. The preserved hardening migration already provides:

- required, unique `analytics_events.client_event_id` for durable idempotency;
- `analytics_rate_limit_buckets` for atomic cross-instance throttling;
- `consume_analytics_rate_limit(...)` for service-only fixed-window consumption;
- `get_beta_intelligence_dashboard(...)` for authorized live aggregates with unique-athlete numerators and a filtered-participant denominator.

`types/database.ts` contains compatible table and RPC contracts for these migration objects.

## 5. Migrations

Validated:

- `20260816000000_beta_intelligence_foundation.sql`
- `20260817000000_beta_analytics_qa_hardening.sql`

The migration-test targets use the repository's actual `lib/supabase/migrations` location and pass. No new migration was created because the required hardening migration already exists and changing it again would add redundant schema churn.

## 6. Environment variables

No new environment variable was added. Runtime hashing and service-only database access continue to require the existing `SUPABASE_SERVICE_ROLE_KEY`. Live RLS verification optionally requires the variables documented in `tests/database/beta-rls-live.test.ts` and `RUN_LIVE_RLS_TESTS=1`.

## 7. Permission changes

No new permission change was needed. Static migration validation confirms:

- RLS is enabled for analytics and beta tables, including rate-limit buckets;
- browser roles have no direct analytics insert policy;
- raw analytics select is limited to the internal-admin predicate;
- rate-limit and dashboard aggregate functions are revoked from `public`, `anon`, and `authenticated`, then granted to `service_role` only.

## 8. Tests run

- `npm test -- tests/analytics/contracts.test.ts tests/analytics/client.test.ts tests/analytics/server.test.ts tests/analytics/events-route.test.ts tests/database/beta-foundation-migration.test.ts tests/beta-intelligence/query.test.ts` — PASS, 6 files and 35 tests.
- `npm test -- tests/database/beta-foundation-migration.test.ts` — PASS, 1 file and 9 tests.
- `npx tsc --noEmit` — PASS, zero diagnostics.
- `npx eslint lib/analytics/events.ts lib/analytics/client.ts lib/analytics/server.ts tests/analytics/contracts.test.ts --no-error-on-unmatched-pattern` — PASS, zero errors and zero warnings in the focused files.
- `git diff --check` — PASS.

The contract suite explicitly covers `locker_viewed`, `film_room_opened`, `photo_gallery_opened`, `media_viewed`, `share_link_copied`, `locker_shared`, `claim_link_validated`, `claim_completed`, `profile_edit_started`, `profile_edit_completed`, and `media_uploaded`.

## 9. Manual verification

Performed static reconciliation between the client request body, strict Zod request schema, route source derivation, server writer fields, migration columns/functions, database types, and event taxonomy. Confirmed the browser body does not transmit `source` or `userId`, and the strict schema rejects an injected source field.

No live Supabase mutation was performed from this branch.

## 10. Known limitations

- Live multi-role RLS execution was not run because provisioned test JWTs and an explicit `RUN_LIVE_RLS_TESTS=1` invocation were not part of this agent environment.
- The checked-in database contracts are migration-verified application types, not a fresh `supabase gen types` snapshot from a deployed authenticated project. Regenerate after deployment and compare before replacing them.
- Anonymous network throttling depends on the deployment platform supplying a trustworthy forwarding header. Without one, anonymous limiting intentionally falls back to the session bucket.
- Expired rate-limit rows are removed on reuse of the same key; broad scheduled retention cleanup remains operational work.

## 11. Deferred work

- Agent 2 should validate every owning UI/server trigger against the canonical input without expanding the event taxonomy.
- Agent 3 should consume the service-only live aggregate boundary in `/admin/beta` and validate filters, empty/error states, and reconciliation.
- Integration QA should apply migrations in the target environment, regenerate database types, run live role/RLS checks, test duplicate delivery and transient retries end-to-end, and execute the full lint/test/typecheck/build gates against the immutable integration commit.
