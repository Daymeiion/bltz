# Preview Locker one-click scraper audit

Implementation follow-up: the user selected automatic private draft saving after this audit. See preview-locker-build-all-completion-2026-10-26.md for the implemented scope and validation. The pending-preference statements below describe the earlier audit snapshot.

## Objective
Assess how one action can orchestrate the existing preview Locker scrapers, reduce waiting and repeated searches, and retain existing data and explicit review controls.

Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md. This is existing Locker career-recovery workflow optimization; it introduces no future-phase graph architecture.

Included: main career discovery, jersey discovery, awards mapping, news, merchandise, combine, save behavior, concurrency, review/persistence boundaries, cancellation, cost limits and tests.
Excluded: production searches/deployment, provider-account changes, relaxing source policies, automatic publication, manual CSV conversion/upload automation, new media or rights-engine schemas.

## Current behavior confirmed in code
| Task | What it does now | Save requirement | One-click treatment |
| --- | --- | --- | --- |
| Main builder | nflverse, cfbverse, Wikipedia, ESPN and YouTube, followed by synthesis; projects career details, school/team and jersey history, award mentions and media suggestions | Can run without a saved draft; merges into the editor without saving | Foundation stage; parallelize its source reads with bounded concurrency and preserve registry priority |
| Find jersey numbers | Calls the same full discovery endpoint again, then applies only school/team portions of its result | Does not require a saved draft | Reuse the main run's jersey evidence; avoid a duplicate full run and synthesis |
| Awards refresh | Maps saved award mentions against award_catalog; it is not a separate web award scanner | Saved, clean draft | Run after the main run adds award evidence; combine this persistence with news enrichment instead of racing their shared record |
| News | Affiliation-qualified Tavily queries and article metadata validation; append/deduplicate a saved review queue | Saved Locker and revision; client blocks dirty drafts | Run alongside merchandise and combine after the same career snapshot is saved; leave results for Media review |
| Merchandise | Affiliation-qualified general and eBay/Fanatics/COMC card and jersey searches, including product image extraction; append/deduplicate a saved review queue | Saved Locker and revision; client blocks dirty drafts | Parallel secondary task; preserve listings and uploaded replacements |
| Combine | Searches Wikipedia, PFR, NFL and Draft Scout; returns multi-source Combine suggestions without writing measurements | Saved Locker and revision; client blocks dirty drafts | Parallel secondary task; keep value/source review and fill-only-empty measurement merge |
| NFL/college CSV/XLS imports | User supplies and reviews the statistics file | User action, with existing draft save | Remain manual; orchestration must retain imported tables |
| Sportradar stats | Separate provider import; builder currently labels the subscription expired and directs operators to CSV | Saved preview plus existing identity/review prerequisites | Skip in the default run; do not spend time on a provider the current builder marks unavailable |

The school/team query context is deliberate: shared identitySearchTerms never permits name-only searches. Main discovery should establish the best available career context before the affiliation-dependent searches start. Main discovery already carries video/photo references and jersey evidence; these should not become redundant jobs. Local image/video uploads remain manual.

## Bottlenecks and failure risks
1. lib/pipeline/run.ts currently awaits each of five SCRAPERS in a for loop. The registry header says parallel, but the actual executor is sequential. Each source has a 12-second wrapper and synthesis a 45-second wrapper. Their arithmetic maximum is roughly 105 seconds, while the preview stream ends after 90 seconds. These are configured ceilings, not measured production timings.
2. PreviewLockerForm has one pending ref and a single busy value; each individual handler independently owns them. Calling existing handlers in Promise.all would cause later handlers to return immediately, or prematurely clear busy state. A single owner must orchestrate lower-level request functions and per-task status.
3. Saved-only checks are server requirements too, not just disabled UI. News, merchandise and combine load preview_lockers by ID and validate revision. Removing the UI disable does not make new unsaved Lockers searchable by these endpoints.
4. First create awaits awards/news enrichment before returning. PATCH also awaits enrichment, and it searches news if there is no prior matching identity even when refreshNews is false. A separate Run News step after either save can repeat that search and hit the cooldown.
5. Awards and news share save_preview_enrichment and preview_enrichments. Its started_at ordering rejects an older request that completes after a newer one; concurrent separate awards/news jobs can conflict or race their diagnostic snapshots. Use one combined awards/news call per saved snapshot, or explicitly serialize those writes.
6. Saved revision must remain stable during the secondary jobs. Another automatic Save in the middle can make all in-flight results stale. Never overwrite on a 409, silently accept another revision, or reload the editor and discard local edits.
7. Combine suggestions live only in CombineSearchReview component state. Approved measurements are saved, but unapproved suggestions are not a durable review queue. News and merchandise suggestions are durable already. Moving combine results to shared orchestration state is required so one-click can populate the Stats review UI.
8. Existing migration-defined admission is 50 successful/active attempts per Admin per UTC day and a 180-second per-identity/type cooldown. Base, news, merchandise and combine use separate admission hashes. A complete four-search run can consume four attempts: this is not a 50-athlete allowance. This describes repository policy, not a query of current hosted quota usage. Keep existing limits in the first implementation and report rate limits clearly.
9. Internal concurrency already varies: news uses up to three query calls per batch, merchandise four, combine up to eight searches at once. Running all three without a shared limiter could burst to roughly fifteen simultaneous search calls. Cap aggregate provider work, rather than considering only the number of top-level jobs.
10. Abort/cancel needs to propagate through every request and extraction. The present main route prevents output after cancellation, but executePipeline and its source signature do not receive the request signal. A timeout wrapper does not itself abort the underlying source work. News enrichment also currently creates its own timeout signal rather than taking the caller's signal.

## Recommended workflow
One click: **Build & search all**.

```text
Validate athlete name and available college/team context
    -> Main career discovery (source concurrency 3; retain registry order)
    -> Fill blanks and append unique evidence through mergeSuggestions
    -> Save one private draft snapshot, without automatic duplicate enrichment
    -> Run together against that same saved ID and revision:
         Awards mapping + News discovery (one shared enrichment operation)
         Merchandise discovery
         Combine discovery
    -> Show per-task results in existing tabs and retain all successful work
    -> Operator reviews articles, products and measurements, then adds and saves
```

The automatic private-save preference has been asked in chat and remains unanswered at audit completion. Do not implement automatic saves based on this document alone. For already-shared previews, a save may be visible through an existing invite/viewer; the UI must explain the behavior. Do not claim that saving a private draft cannot affect existing viewers.

If the operator instead chooses to keep all changes unsaved, the saved-only endpoint contract needs an explicit alternative: bounded read-only discovery against a validated draft snapshot, then deliberate persistence of news/merchandise queues on Save. Do not remove saved-revision guards or masquerade unsaved identity as the saved record. That alternative is a larger change than orchestrating one private snapshot save.

Source-result completion may arrive in any order, but synthesis input must remain in SCRAPERS registry order. pickFacts uses first-non-null precedence to prefer structured roster facts over prose. Use indexed results, not completion-order pushes.

Separate requests can reuse the existing 90-second main stream and bounded secondary endpoints. Avoid putting the entire chain into one long Vercel request or starting a detached background Promise after returning a response. Start with request-owned orchestration; durable resume across tab closure would be a separate scoped feature.

An MVP can reuse current data structures without a migration if unapproved Combine suggestions remain session-only, exactly as today. Durable Combine pending review and resumable task status would require separately designed, version-controlled persistence changes. Do not silently imply those features exist.

## Proposed controls and wireframe
Primary user: BLTZ operator rebuilding a private athlete Locker.
Primary action: start one coordinated run.
Secondary actions: cancel remaining work, retry one failed task, rerun individual existing tab actions.
Critical information: athlete, private-save behavior, current step, item counts, partial failures and retained data.
Mobile priority: one-column task list, wrapped messages and reachable cancel/retry controls.
Known exclusions: automatic publication, rights approval, CSV uploads, Pro Day, unavailable Sportradar import.

```text
[Build & search all]                     [Cancel remaining work]
Saves private draft progress before running career searches.

Career details       Running / Complete / Failed
Awards               Waiting / Complete: N mapped
News                 Waiting / Running / N awaiting review    [Review in Media]
Merchandise          Waiting / Running / N awaiting review    [Review in Media]
Combine              Waiting / Running / N source suggestions [Review in Stats]

Partial completion: successful results retained. [Retry failed tasks]
```

One task failing must not cancel successful independent tasks. Distinguish no matches, partial results, provider errors, rate limits, full review queue and save conflicts. Retry only failed work; do not rerun the main biography or reset existing queues. Existing standalone tab controls remain available.

## Candidate implementation files
- lib/pipeline/run.ts and lib/pipeline/scrapers/index.ts: bounded source execution, stable priority and signal plumbing; scope any changed shared behavior carefully because onboarding also uses this executor.
- app/api/preview-lockers/discovery/route.ts: pass cancellation and execution configuration through the existing stream.
- app/admin/preview-lockers/PreviewLockerForm.tsx plus a focused orchestrator helper: one run owner, validated merged snapshot, save sequencing, shared captured revision and per-task state.
- app/api/preview-lockers/route.ts and app/api/preview-lockers/[id]/route.ts: backwards-compatible explicit defer-enrichment mode for the new orchestrated save; leave old clients' defaults intact. Response must distinguish committed draft from enrichment failure.
- lib/preview-lockers/enrichment.ts and existing awards/news endpoints: one combined enrichment operation without a second implicit news search; preserve old manual refresh paths and started_at conflict protection.
- app/admin/preview-lockers/CombineSearchReview.tsx / CombineResultsForm.tsx: accept parent-controlled search outcomes while retaining source choices, conflict display and existing measurement protection.
- Shared typed task/result definitions and provider limiter as needed; reuse existing discovery, metadata extraction and validation functions rather than duplicating adapters.
- Existing review endpoints continue server-side Admin, same-origin, source-policy, queue-version and saved-revision checks.

## Acceptance criteria and implementation tests
- A new valid Locker can start the full flow with one click; save behavior follows the operator's chosen setting.
- Existing uploaded NFL and college tables, measurements, headshots, logos, image replacements, videos, news, products, visibility choices and life story survive repeat runs byte-for-byte except deliberate additive changes.
- Source jobs overlap without changing synthesis priority; main run executes once and jersey discovery is not duplicated.
- One save produces a stable revision and news runs once; no independent awards/news persistence race.
- Results populate the existing Media and Stats review controls without automatic Add or approval.
- Search matching still includes athlete name and college/team context.
- Limits are shared across concurrently running search workers; cooldown is shown and not bypassed.
- Cancellation stops remaining requests; no more work is admitted after cancellation. Successful saved queues remain.
- A provider failure permits other tasks to finish, failed-only retry preserves previous results, and stale responses cannot clobber another editor's save.
- Cover new/dirty/saved/shared previews, invalid drafts, slug conflicts, full queues, missing affiliations, missing provider credentials, unauthorized/cross-origin requests and mobile task-status wrapping.
- Measure per-stage durations before claiming a percentage or end-to-end speedup.

## Audit validation and completion report
1. Summary: feasible to orchestrate current scrapers with two stages. The primary blockers are serialized source execution, shared UI busy ownership, saved-revision dependencies and implicit save-time enrichment. No one-click functionality was implemented in this audit.
2. Files changed: this audit document only. Existing unrelated worktree changes, including upload error messages in PreviewLockerForm, were left untouched.
3. Routes changed: none. Audited existing builder, discovery, create/update, awards, news, merchandise and combine routes.
4. Database changes: none. Read migration definitions only; no hosted queries or writes.
5. Migrations: none added/applied. MVP can avoid a migration with current session-only Combine review; durable pending Combine review is a separate persistence decision.
6. Environment variables/dependencies: unchanged. Current installed Next.js 16.3.6 and React 19.1.1. Current search adapter depends on TAVILY_API_KEY; no secret values were read or printed.
7. Permission changes: none. Proposal retains Admin, same-origin, private-media ownership and review protections. No production scrape or publish was triggered.
8. Tests run: ten focused existing files / 100 tests passed. First batch: discovery-preservation, enrichment-api, enrichment-persistence, merchandise-api, combine-discovery-api and pipeline/scrapers (67). Second batch: discovery, combine-discovery-form, news-review-form and merchandise-form (33). No implementation changed, so a full lint/build run was not necessary for this read-only audit. Existing Vite configuration advisory remains.
9. Manual verification: traced actual route, state, merge, quota, source-priority and SQL persistence paths. No browser search or hosted benchmark was run; no claim of observed production speedup. Exact deployed commit and hosted quota/configuration were not checked for this audit.
10. Known limitations: save preference is pending; durable Combine review and recovery after tab closure are not present in current code. Architecture is a proposal, not a deployed feature.
11. Deferred work: implementation of the selected save workflow, concurrency/orchestration changes, end-to-end failure/retry tests, browser QA and production timing measurement. Deployment requires a subsequent authorized release.

## Product direction check
Improves efficient, accurate reconstruction of athlete-school/team, award, news and testing-result relationships and preserves prior career work. Remains useful after an athlete leaves an organization. No new Moment or Value Graph relationships are introduced. Existing integrations are reused; no mature DAM, editing, social publishing or generic storage workflow is duplicated, and no generalized media-management scope is added.
