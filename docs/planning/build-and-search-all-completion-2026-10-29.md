# Build & search all: completion

Implements the one-click workflow proposed in the Oct 26 preview Locker one-click scraper audit. The operator chose automatic private draft saves.

## What changed
- `lib/pipeline/run.ts`: career sources run three at a time instead of one after another. Results stay in registry order, so synthesis precedence is unchanged. A cancelled stream stops new sources from starting. Onboarding uses the same executor.
- `PATCH /api/preview-lockers/[id]`: accepts an optional `refreshNews: true`, which searches news inside the same save's awards/news enrichment and returns that report. Old clients are unchanged.
- Builder (`PreviewLockerForm`, `BuildAllPanel`, `lib/preview-lockers/build-all.ts`): the **Build & search all** button runs the career search, merges blank-only suggestions, saves one private draft, then runs news loading, merchandise and Combine together against that saved revision. Each task shows its own status. Cancel stops remaining work. **Retry failed searches** reruns only failed news, merchandise or Combine searches.
- `CombineSearchReview` exposes its search so the builder can run it. Its suggestions still stay only in the open editor.

## Unchanged boundaries
Nothing is added to the Locker or approved automatically. Saved-revision checks, rate limits, cooldowns and source policies are the same. No migration was added. A save request is never aborted mid-flight. A full run uses four daily scraper admissions (career, news, merchandise, Combine).

## Verification
- New tests: `tests/preview-lockers/build-all-form.test.tsx`, `build-all.test.ts`, `build-all-api.test.ts`, `tests/pipeline/parallel-sources.test.ts`.
- Full suite: 1,955 passed, 24 skipped. Type check and production build pass. Lint: 0 errors (pre-existing warnings only).
- Not done: a live browser run against real providers, and timing measurements. No speedup figure is claimed.
