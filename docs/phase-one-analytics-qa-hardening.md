# Phase One analytics QA hardening

## Deployment order

Apply `20260816000000_beta_intelligence_foundation.sql` before `20260817000000_beta_analytics_qa_hardening.sql`. The hardening migration backfills historical null `client_event_id` values from the row UUID before making the column non-null. It then adds service-only rate-limit and Beta Dashboard RPC contracts.

## Agent 2 ingestion contract

- Browser requests require `eventId`, `eventName`, `occurredAt`, `page`, and bounded `properties`. Anonymous requests also require `sessionId`; public athlete events require `athleteId` or `athleteSlug`.
- Do not send `source`, `userId`, or another privileged identity field. Strict request validation rejects extra fields.
- Reuse the same `eventId` and `occurredAt` for retries of one intended event. A duplicate UUID returns HTTP 202 with `duplicate: true` and does not add another row.
- Public routes can emit only the public athlete event allowlist. Dashboard, onboarding, and beta-feedback contexts require an authenticated user; the server resolves that user's athlete.
- `social_link_clicked` is reserved for the future verified social-link trigger and is already included in the aggregate contract. Do not emit placeholder events.

## Agent 3 aggregate contract

Call `get_beta_intelligence_dashboard` from a server-only, admin-authorized boundary using the service client. Its arguments are nullable `p_since`, `p_cohort`, `p_status`, and `p_athlete_id`. The response contains `summary`, `athletes`, and `recentFeedback`; it is not necessary or approved to load raw analytics into the browser.

All action-percentage numerators count filtered participant athletes with at least one matching action. Every action-percentage denominator is the filtered `beta_participants` count. Funnel stage-to-stage percentages use the immediately preceding funnel stage as their denominator in the UI.

## Live RLS verification

The opt-in harness is `tests/database/beta-rls-live.test.ts`. Set `RUN_LIVE_RLS_TESTS=1` and provide:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RLS_TEST_ATHLETE_A_JWT`
- `RLS_TEST_ATHLETE_B_JWT`
- `RLS_TEST_NON_ADMIN_JWT`
- `RLS_TEST_PLATFORM_ADMIN_JWT`

The harness performs read-only role checks plus one anonymous insert that must be denied. Use a non-production QA project or disposable test identities. Local execution on 2026-08-17 was blocked before authentication by the configured Supabase endpoint's untrusted local TLS certificate chain, so live results are not claimed.

## Type generation status

`types/database.ts` was reconciled manually against both Phase One migrations, including the required analytics UUID, rate-limit table, and two RPC signatures. Authoritative `supabase gen types` output remains blocked until authenticated CLI/project access and a trusted TLS chain are available. Regenerate after migration deployment and review the generated diff rather than overwriting application-specific aliases blindly.
