# Combine and Pro Day discovery - October 18, 2026

## Summary and objective
Add multi-source testing-results search to the existing private preview Stats form. An Admin reviews individual values and source links before adding them to the draft and explicitly saving. Existing manual or previously saved measurements must never be overwritten by discovery. Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md; user-directed continuation of the manual Combine form. No Product Doctrine conflict.

## Scope and acceptance
Included: bounded searches using full name plus saved college/team context; Wikipedia, PFR, NFL and Draft Scout adapters; separate Combine/Pro Day events; explicit individual selection, source/conflict display, additive draft merge, existing save flow, loading/empty/partial/error states, identity/revision checks and tests. Excluded: automatic publication, inferred missing values, fastest-time selection, automatic replacement, new canonical graph schemas, bulk crawling and storing raw publisher HTML.

## Files changed
- app/admin/preview-lockers/CombineSearchReview.tsx: search, review, source links, conflicts, blank-only additions and failure retention.
- app/admin/preview-lockers/CombineResultsForm.tsx and PreviewLockerForm.tsx: Stats integration with existing busy/dirty/save guards.
- app/api/preview-lockers/[id]/combine/route.ts: authenticated Admin-only, same-origin, saved-revision search endpoint.
- lib/enrichment/combine.ts: bounded source-diverse query scheduling and player-profile candidates.
- lib/enrichment/combine-extraction.ts: deterministic single-player tables, Draft Scout event columns and explicitly scoped NFL reports, units/fractions and unknown handling.
- lib/enrichment/safe-fetch.ts: reuse pinned public IPv4 DNS, HTTPS validation, redirect checks, seven-second page timeout and 1.5 MB response cap.
- lib/player/combine-review.ts: response validation and additive reviewed-measurement merge.
- lib/source-policy/policy.ts: versioned testing-only adapter actions for bounded source paths, preserving other extraction restrictions.
- tests/preview-lockers/combine-discovery.test.ts, combine-discovery-api.test.ts, combine-discovery-form.test.tsx, combine-form.test.tsx, and three narrow factual HTML fixtures.

## Routes changed
Existing /admin/preview-lockers/new and /admin/preview-lockers/[id]/edit Stats section. New POST /api/preview-lockers/[id]/combine. Existing PATCH save and /preview-lockers/[slug] Measurables display are reused. New previews must be saved before searching. This is a dedicated Stats search; the general biography scraper continues to preserve manual Combine data.

## Database changes and migrations
None. Accepted measurements use existing preview_lockers.combine_results, its validation, revision checks and audit trigger from migration 20261018230222. Searches do not update Locker content. Existing admit_preview_discovery/finalize_preview_discovery rate controls are reused. Review suggestions stay in the open editor; only explicitly accepted and saved measurements persist between visits.

## Environment variables and dependencies
None added or changed. Uses existing TAVILY_API_KEY configuration and existing dependencies. Live local test workers needed NODE_OPTIONS=--use-system-ca to use the operating system trust store; certificate verification was not disabled. This is local test configuration, not a required production environment change.

## Permissions
Existing previewAdmin authorization, same-origin JSON checks, saved row access and revision checks apply. Caller cannot provide identity, source URL or measurement overrides to the search endpoint. No RLS, role or database grant changes. Source policy adds only EXTRACT_COMBINE/PERSIST_COMBINE for Wikipedia player pages, PFR player/year-combine pages, NFL news/prospect paths and strict Draft Scout player-profile URLs. General PFR facts/season-stat ingestion, crawl and asset copying remain blocked.

## Behavior and data preservation
Search requests are limited to eight provider queries and eight page fetches, with an overall 45-second deadline. Every page still requires primary identity plus known football affiliation, or an exact player row/explicitly named NFL school-report paragraph. Snippets are never measurement evidence. Unknowns, DNP, incompatible units and ambiguous mixed events are omitted. Combine and Pro Day remain separate, and source discrepancies are visible for human selection. Different source options for the same metric cannot both be selected. Existing values, source defaults, event IDs and timing labels win; even zero bench repetitions remain unchanged. The merge checks the current draft again when review is applied. Repeated searches append/deduplicate current-editor evidence, and failed searches retain it. Unknown-year entries remain separate until the editor confirms their year.

## Validation and manual verification
Full regression suite: 219 passed files / 1,755 passed tests; 2 files / 24 existing skips. Final focused tests: 18 passed across four files, including explicit review/save integration, prose identity isolation and unit mismatch rejection. Full lint: zero errors / 297 pre-existing warnings; final focused lint: zero warnings/errors. Type checking and the exact staged production build passed after the final safeguards. Whitespace validation passed with existing file line endings preserved. Existing nonfatal HappyDOM iframe warning remains unchanged.

Captured full live Wikipedia, Draft Scout and NFL documents for Antoine Cason were parsed without saving any athlete data. A live Tavily search returned one Combine event from Wikipedia, Combine and Pro Day from Draft Scout, and Pro Day from the NFL report. PFR returned an unavailable response, so the overall result correctly remained partial. No blocked response was bypassed or replaced with guessed numbers. Initial broad query ranking returned team-season pages; source-focused queries, bounded direct Wikipedia profile candidates and profile URL prioritization corrected that before release. Real-network diagnostics were local temporary tests and were removed from the repository.

Local browser QA used actual production components and extracted source fixtures with simulated manual 4.60-second and zero-bench values, explicitly labeled and disconnected from production. Reviewed four blank measurements, saved locally, simulated the general scraper merge, then reloaded: all 38 form fields/results were unchanged and Combine/Pro Day remained separate. The 390px iframe review view was visually checked; form labels and source links wrapped within the frame. Browser DOM proof compared all 38 fields across save/reload and scraper merge. The local harness server was stopped after QA. Artifacts: output/combine-discovery-review-desktop.png, combine-discovery-review-mobile.png, combine-discovery-browser-proof.json, combine-discovery-live-search.json. No real athlete measurement data was saved.

## Known limitations and deferred work
Sources may be blocked or lack recognizable/attributable result markup; unavailable sources are shown and missing measurements remain manual. Broad/proprietary JavaScript-only payloads and ambiguous paragraphs are intentionally not guessed. Review-only evidence is not a persisted archive in this release; save accepted results to keep them. Unknown-year/manual timing conflicts require explicit editor correction. No general scraper auto-application. No canonical player testing-event subsystem introduced.

## Product direction
Strengthens persistent athlete-to-testing-event, measurement and source relationships and the Locker enrichment/review loop. Remains useful after team changes or retirement. No new Moment Graph or Value Graph relationships, rights ownership or payment inference, mature third-party workflow duplication, or generalized media-management drift.

## Release verification
Implementation is committed as c8dee878fbf50ca278901f62f7edd87e763cb775 on codex/preview-combine-discovery-2026-10-18 in output/preview-merchandise-search, based on deployed commit 50a010d. Worktree is clean. No database migration is required. Automatic approval review rejected the production main push because explicit authorization for the previous manual form release did not cover this new scraper release. The user then explicitly approved deploying c8dee87. The exact commit was pushed successfully, fast-forwarding main from 50a010d. No migration was applied. Vercel deployment dpl_D6i3UKSvnZL6VQFM6JrtPvJB9uvf (bltz-1xlietiny-daymeiions-projects.vercel.app) reached READY and serves bltz.vercel.app, bltz.me and www.bltz.me.


### Live production verification
Fresh Antoine Cason Stats view displayed the new search controls. Production discovery returned Combine 2008 from Wikipedia, Pro Day 2008 from NFL, and separate Combine/Pro Day 2008 suggestions from Draft Scout. Partial status correctly disclosed unavailable sources. All 422 existing non-checkbox editor fields matched the pre-search baseline exactly. College and NFL import counts remained one each; Combine event count remained zero. Selecting a review checkbox enabled the add-to-draft button; the checkbox was then cleared without clicking Add or Save. No athlete measurements were added or saved. The live review tab was left open for the user. Production screenshot: output/combine-discovery-production.png. DOM proof: output/combine-discovery-production-proof.json. Vercel runtime error query succeeded with zero entries (CLI had an unrelated npm update-check notice). No required release work remains.
