<!-- /autoplan restore point: ~/.gstack/projects/Daymeiion-bltz/main-autoplan-restore-20260530-120953.md -->
# Onboarding pipeline backend hardening (TRIMMED via /autoplan)

**Status:** Reviewed — trimmed to launch-critical scope
**Branch:** main
**Date:** 2026-05-30
**Review:** /autoplan — CEO premise gate + independent Eng review.
Mode: SELECTIVE EXPANSION. CEO voice: independent Claude reviewer (Codex
unavailable — CLI version too old for its current default model). Eng voice:
independent Claude reviewer.

## What the review changed

The original draft had 7 workstreams (parallelize scrapers, atomic event
writes, durable execution, typed errors, run reaper, test suite, metrics). The
CEO premise challenge — confirmed by the founder — found most of it premature
for a pre-launch app with zero users and an unbuilt landing page. Parallelizing
scrapers that already return in 1-3s optimizes a number nobody experiences. The
reaper, full test matrix, and metrics defend against failures that only real
traffic produces.

**Trimmed to the one genuinely-broken thing plus its coupled dependency.**

## The actual bug (launch-critical)

`lib/pipeline/run.ts` `startRun()` inserts a run row then fires
`void executePipeline(...)` as a background promise and returns. On Vercel, the
serverless function can freeze once the HTTP response is sent, killing that
promise mid-run. The athlete's loading screen then polls a row that never
reaches a terminal state and times out after 90s. Result: a hung "Career sweep"
with no locker and no error. Same fire-and-forget pattern in
`lib/onboarding/test-auth.ts` (invisible locally because the dev process stays
alive).

## In scope

1. **Durable execution — APPROVED: SSE-driven.** Drive `executePipeline` from
   the SSE route (the long-lived connection the client already holds open),
   claimed exactly once via a compare-and-set on run status
   (`pending` → `scraping`) so a reconnect can't double-run. `start` only
   inserts the `pending` row; it no longer kicks the pipeline. This collapses
   the producer (pipeline) and consumer (event stream) into one invocation whose
   lifetime the client controls, eliminating the cross-process desync and the
   90s-stream-vs-141s-pipeline timeout mismatch in one move.
   - Tab-close behavior (founder-confirmed): if the athlete closes the loading
     screen mid-sweep the run stops; the next connection re-claims via CAS and
     restarts cleanly. Acceptable for a ~30s watched loader.
   - Rejected alternative: Next.js `after()` + raise SSE `MAX_RUNTIME_MS` +
     `maxDuration` on SSE route + client reconnect. Keeps the run alive on tab
     close but leaves producer/consumer in separate invocations and needs the
     timeout patch anyway.

2. **Atomic event append (coupled — required by #1).** Replace the
   read-modify-write in `supabaseSink.emit` (SELECT events → append → UPDATE)
   with an atomic `jsonb` concat append. Under the new execution model rapid
   emits overlap reads; read-modify-write would drop progress events
   (last-writer-wins). Not optional — shipping #1 without this ships a known
   race.

3. **Typed, loud failure (cheap, high-value).** Give each scraper a typed reason
   instead of the coarse current set: branch on HTTP status —
   `5xx`/`429`/network-throw → `unreachable`/`blocked`; `200` with empty result
   → `no_match`. Log only `unreachable`/`blocked`/`timeout` with context; keep
   `no_match` a quiet expected miss. **Plus the infra guard:** if every
   DB-backed scraper returns `unreachable` (the paused-Supabase signature), set
   run status `error` (retryable) — do NOT proceed to synthesis and mark the run
   `manual`, which tells the athlete to hand-edit when the real problem is your
   database is down.

## Deferred to TODOS.md (revisit when real traffic exists)

- Parallelize the 5 scrapers (`Promise.allSettled`). Premature — they finish in
  1-3s today.
- Run reaper for stuck runs (the durability fix removes most stuck-run cases).
- Full unit/integration test suite for scrapers + synthesis gate + Wikipedia
  parsers. Worth doing, not launch-blocking. (Highest-value deferred item — the
  Wikipedia regexes are the real silent-failure risk long-term.)
- Pipeline metrics / funnel instrumentation.

## Out of scope

- Re-adding LLM bio polish (Wikipedia lede is the bio, deliberately).
- Any job queue (QStash/Inngest). The SSE-driven approach is durable enough for
  pre-launch volume; a queue is the post-traction answer.
- Onboarding UI changes (Steps 1-4 are done).
- The public landing page — the bigger launch priority, but its own plan.

## Open decision for the founder

- **Tab-close behavior** (drives approach #1): SSE-driven means if the athlete
  closes the loading screen mid-sweep, the sweep stops (and re-runs cleanly on
  reopen). `after()` means it finishes server-side regardless. For a
  watch-the-loader screen, SSE-driven is the cleaner fit; surfaced at the gate.

## Risks

- SSE-driven execution couples run lifetime to the open connection. Acceptable
  for a 10-60s sweep the user is actively watching; on disconnect the CAS-claim
  lets the next connection restart cleanly.
- The atomic-append change touches the hot event-write path; needs a quick
  real-run check that events still stream in order.

## Decision Audit Trail

| # | Phase | Decision | Class | Principle | Rationale |
|---|-------|----------|-------|-----------|-----------|
| 1 | CEO | Mode = SELECTIVE EXPANSION | Mechanical | default for iterating on existing system | Enhancement of a built pipeline, not greenfield |
| 2 | CEO | Trim 7 workstreams → 3 | User Challenge (founder confirmed) | P3 pragmatic / premise challenge | Pre-launch, 0 users, boilerplate landing page; most items premature |
| 3 | CEO | Defer parallelize/reaper/tests/metrics | Auto | P3 / boil-lake-not-ocean | Optimize failures only real traffic produces |
| 4 | Eng | Durability = SSE-driven CAS (not after()) | Taste (founder confirmed) | P5 explicit / P1 complete | Eliminates timeout-desync bug class; client-controlled lifetime |
| 5 | Eng | Pull atomic event append back into scope | Auto | P2 boil lake (in blast radius) | Coupled to #4; shipping without it ships a known race |
| 6 | Eng | Infra-down guard: all-DB-unreachable → error not manual | Auto | P1 complete | Paused-DB must not tell athlete to hand-edit |

## GSTACK REVIEW REPORT

| Review | Runs | Status | Key finding |
|--------|------|--------|-------------|
| CEO (Claude voice) | 1 | issues_open→resolved | Premature for pre-launch; trim to durability + loud failure |
| CEO (Codex voice) | 0 | unavailable | CLI v0.121.0 too old for current default model (gpt-5.5) |
| Eng (Claude voice) | 1 | issues_open→resolved | after() insufficient (90s/141s timeout mismatch); SSE-driven + atomic append + infra guard |
| Eng (Codex voice) | 0 | unavailable | same CLI version issue |

Verdict: APPROVED (trimmed). 3 coupled items, SSE-driven durability.
Cross-phase theme: both phases independently flagged that this pipeline serves
no real traffic yet — scope discipline is the dominant signal.
