# Agent 2 — live staging analytics ingestion completion report

Date: 2026-08-17

Branch: `codex/stabilization-agent2-live-ingestion`

Starting integration commit: `08107308ec9a0e6fb940352924467b91293dc42b`

## 1. Summary

Added a staging-only live proof for the stabilized analytics ingestion boundary. The harness invokes the real `POST /api/analytics/events` route handler with anonymous authentication, real staging persistence, and the real rate-limit RPC. It explicitly scrubs inherited Supabase/Postgres variables, loads only the approved variables from `.env.staging.local`, validates project ref `yevihzsgqagvuulymqum`, validates current `sb_publishable_` / `sb_secret_` formats, and never prints keys.

The proof creates one uniquely named disposable public athlete only after exact ID/slug/event preflight checks. It verifies first delivery, durable duplicate delivery, preserved UUID/timestamp, source-spoof rejection, athlete-route mismatch rejection, permanent-4xx client suppression, session throttling, network-profile throttling, and network-wide throttling. It then deletes only the recorded QA athlete, event UUID, and derived HMAC bucket keys and verifies zero matching rows remain.

## 2. Files changed

- `scripts/verify-staging-analytics-ingestion.mjs` — Node 22 staging launcher, environment isolation, target/key validation, system-CA propagation, Vitest execution, and sanitized evidence output.
- `tests/analytics/ingestion-live.test.ts` — gated live route/database proof with exact disposable-row cleanup.
- `docs/stabilization/agent-2-live-ingestion-completion.md` — this report.

Pre-existing dirty `package.json`, `package-lock.json`, `skills-lock.json`, and `.agents/skills/**` files were preserved and are not owned or staged by Agent 2.

## 3. Routes changed

No application route code changed.

The existing `POST /api/analytics/events` handler was invoked in-process. Only the session adapter was mocked to an anonymous `getUser()` result; request parsing, source derivation, athlete lookup, rate-limit consumption, persistence, duplicate resolution, and response construction used production code and the live staging database.

## 4. Database changes

No schema or persistent product-data change was made.

Final proof identifiers:

- Run: `1dab8efa-f61c-4247-8714-e7eb488c78e6`
- Disposable athlete: `066388f7-a550-4365-ae63-a88888317413`
- Disposable slug: `qa-analytics-1dab8efaf61c42478714e7eb488c78e6`
- Client event UUID: `a6a4f558-6fc6-4c81-ba55-203faff61615`

Cleanup evidence after the final proof:

- Matching athlete rows: `0`
- Matching analytics event rows: `0`
- Matching tracked rate-limit bucket rows: `0`

Earlier exploratory live attempts also executed registered cleanup. Each reported zero remaining tracked rows before exit.

## 5. Migrations

No migration was added, edited, applied, repaired, reset, or pushed. The proof consumed the already-promoted staging `analytics_events` uniqueness constraint and `consume_analytics_rate_limit` RPC.

## 6. Environment variables

No environment file was created or changed. The ignored `.env.staging.local` file was read explicitly.

The launcher requires:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` with an `sb_publishable_` value
- `SUPABASE_SERVICE_ROLE_KEY` with an `sb_secret_` value

It removes inherited variables containing `SUPABASE` or `POSTGRES`, copies only these three staging values into the child environment, validates the approved project ref, and does not log values. `.env.local` values cannot override the three already-populated process variables used by the route and client.

## 7. Permission changes

None.

The protected server key remained server-side. The live file is opt-in through `RUN_LIVE_ANALYTICS_TESTS=1`, which is set only by the staging launcher after target validation. Normal `npm test` skips all live mutations.

## 8. Tests run

- Node 20 client construction probe — BLOCKED as expected before any request: `@supabase/realtime-js` throws `Node.js detected but native WebSocket not found`; current `@supabase/supabase-js@2.112.3` requires Node 22 or an explicit transport.
- Cursor-bundled Node `v22.22.1` client construction against staging — PASS.
- Node 22 native staging fetch with `--use-system-ca` — PASS, HTTP `200`.
- `node scripts/verify-staging-analytics-ingestion.mjs` under Node 22 — PASS, 1 file / 5 live tests in 114.78 seconds.
- `npm test -- tests/analytics/contracts.test.ts tests/analytics/client.test.ts tests/analytics/server.test.ts tests/analytics/events-route.test.ts tests/analytics/ingestion-live.test.ts` — PASS, 4 files passed / 1 live file skipped; 33 tests passed / 5 skipped.
- `npx tsc --noEmit` — PASS.
- `npx eslint tests/analytics/ingestion-live.test.ts scripts/verify-staging-analytics-ingestion.mjs --no-error-on-unmatched-pattern` — PASS, zero output.
- `npm run build` — PASS; all 79 pages generated. Existing Node 20 deprecation and Tailwind 4-style CSS at-rule warnings remain non-blocking and outside this harness scope.

Final sanitized staging evidence:

```json
{
  "projectRef": "yevihzsgqagvuulymqum",
  "firstStatus": 202,
  "duplicateStatus": 202,
  "duplicate": true,
  "storedRows": 1,
  "timestampPreserved": true,
  "sourceSpoofStatus": 400,
  "athleteMismatchStatus": 400,
  "permanentTransportCalls": 1,
  "sessionLimitStatus": 429,
  "otherSessionStatus": 400,
  "networkProfileLimitStatus": 429,
  "networkLimitStatus": 429,
  "otherNetworkStatus": 400,
  "cleanup": {
    "athleteRows": 0,
    "eventRows": 0,
    "bucketRows": 0
  }
}
```

## 9. Manual verification

- Inspected and preserved Agent 1's production-readiness report, promotion procedure, isolated validator, service-client boundary, and live RLS test.
- Confirmed the branch starts at the requested integration SHA.
- Confirmed the staging URL resolves to the approved project ref and both key formats are current before mutation.
- Confirmed the random athlete ID/slug and stable event UUID were absent before creation.
- Confirmed first delivery returned `202` with `duplicate:false`.
- Confirmed the identical retry envelope returned `202` with `duplicate:true` and exactly one row retained the original client UUID, timestamp, and athlete association.
- Confirmed source spoof and athlete mismatch returned `400` without an event insert.
- Confirmed the client sent only one request after a permanent `400` response.
- Confirmed session `30`, network-profile `120`, and network-wide `300` fixed-window boundaries returned `429`; alternate session/network identities remained unthrottled.
- Confirmed final deletion and read-back found zero tracked athlete, event, or bucket rows.

## 10. Known limitations

- The host's default Node `v20.19.3` cannot construct the current Supabase client because native WebSocket is unavailable. The harness therefore requires Node 22+ and stops before staging access on older runtimes. Dependency and runtime alignment remains owned by the pre-existing package-change stream.
- The local TLS interception chain required Node 22's `--use-system-ca`; certificate verification was not disabled.
- The proof calls the route handler in-process because no deployed staging application URL was supplied. It validates route logic and live persistence but does not validate Vercel proxy-header trust, deployment configuration, or middleware behavior over an external HTTP boundary.
- Fixed-window limits must be exercised within one window. The harness aligns bursts to a fresh UTC minute and uses bounded concurrency; this can intentionally add up to roughly two minutes to a live run.
- This proof uses one anonymous identity and does not replace Agent 1's deferred multi-role JWT/RLS suite.

## 11. Deferred work

1. Standardize the project and CI runtime on Node 22+ in the separately owned dependency/runtime stream; do not mix that change into analytics stabilization.
2. Run the same harness against a deployed staging application URL if one becomes available, preserving explicit target verification and cleanup.
3. Provision dedicated staging JWT identities and execute the Agent 1 live RLS role suite.
4. Run Agent 4 QA against the immutable integration commit after this focused harness commit is merged.
5. Keep production actions, new features, Dashboard work, Digital Presence, CRM, university workflows, and Locker expansion out of this task.
