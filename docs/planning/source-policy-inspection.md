# Source policy inspection (before implementation)

Scope: the prepared release worktree based on deployed `f6e8e85`, preserving its existing enrichment changes and the separate dirty main checkout. No deployment or remote database mutation is authorized by this task.

1. Main entry: `POST /api/preview-lockers/discovery` calls `executePipeline` in `lib/pipeline/run.ts`; onboarding uses the same runner. Five registered adapters execute before synthesis: nflverse, cfbverse, Wikipedia, ESPN, YouTube.
2. Preview discovery precedes a preview UUID. The builder submits the reviewed draft; create/update saves the base preview first, then `tryEnrichSavedPreview`. Refresh News enriches an existing preview. Failure does not roll back the base preview.
3. Tavily is search-only in `lib/search/tavily.ts`, called through the news SearchProvider after base save. There are no Tavily Extract/Crawl calls.
4. Direct HTTP exists: Wikipedia search/summary/HTML; ESPN search/profile JSON; YouTube results HTML. Roster adapters query the existing Supabase cache. `fetchHtml` and `fetchArticleHtml` currently return raw HTML without source-policy enforcement. No browser scraping in this build flow.
5. News discovers URLs, fetches bounded HTML with DNS pinning and redirect validation, extracts metadata, validates name + affiliation, deduplicates, persists accepted records. No article bodies are stored.
6. Awards come from Wikipedia HTML/prose or admin evidence. Normalization retains source URL/raw label and maps to the catalog without verifying ownership or achievement. Catalog images have a separate permission resolver.
7. NFL roster identity is cached nflverse; college roster identity is cached CFBD. Structured season stats are stored Sportradar records; its explicit admin ingestion is separate from initial discovery. Admin-entered career totals and imported college CSVs also exist. Locker reads stored stats only.
8. URL validation and SSRF controls exist, but no common domain permission registry. Tavily's old domain hints include PFR. Source trust in synthesis is not ingestion permission.
9. `preview_id` links player_articles, preview_award_links and preview_enrichments. Revision/identity checks prevent stale writes. Initial unsaved discovery has no preview_id; onboarding has pipeline run events.
10. SearchProvider abstracts search; scraper registry abstracts identity providers; Sportradar has a fixed-endpoint client/service. Extraction is currently a callback/raw helper rather than a mandatory policy boundary.
11. Awards/articles and pipeline draft source arrays preserve URLs. Photo discovery drops page provenance in the preview projection; this needs correction.
12. Discovered photos/news thumbnails are remote references, not automatic downloads. Uploaded assets are separate user uploads to private preview storage. Approved trophy assets are catalog-owned references.
13. Existing rules cover URL safety, relevance, catalog media eligibility, provider budgets, endpoint restrictions and authorization. None implements source ingestion permissions. Rate limits are separate from licensing.
14. PFR is a Tavily search hint and nflverse has a pfr_id crosswalk; no PFR extractor, crawler or primary stats importer was found in app/lib/scripts. Historical crosswalks/data will not be deleted.

Implementation plan: add a typed source registry and mandatory network/persistence gates; route the three direct external identity adapters through it; make news HTML private and expose only policy-checked metadata; evaluate Tavily results and news redirects/canonicals; retain provenance and remote asset decisions; attach small policy diagnostics to existing reports/events. Preserve roster caches, approved provider stats, stored previews, routes and RLS. No policy table is needed. Tests will lock down network boundaries, reference-only sources, conservative unknowns, provenance and existing render-only behavior.

Product doctrine file `docs/product/BLTZ_PRODUCT_DOCTRINE.md` is absent in this checkout. The supplied AGENTS doctrine governs: this change improves career source accuracy and persistent identity provenance, adds no Moment/Value schema and duplicates no media-management workflow.

## Inspection addendum: manual statistics ingestion

The wider storage-path audit found `lib/preview-lockers/cfb-csv.ts`, which accepts Sports Reference college player CSV tables and persists them on `preview_lockers.cfb_stats`. This is separate from the absence of automated PFR scraping. The correction therefore also gates CSV review and create/update persistence, preserves unchanged historical imports, retains the existing parser for configured provider sources, and updates source attribution in the rendered statistics. See the handoff for verification and rollout limitations.
