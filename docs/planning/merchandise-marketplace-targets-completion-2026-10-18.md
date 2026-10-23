# Merchandise marketplace targets — 2026-10-18

## Summary
Add explicit eBay, Fanatics and COMC searches to the existing merchandise discovery workflow. Each store receives college and pro-team context when both are available, always with the quoted full player name and football context. eBay/Fanatics cover cards and jerseys; COMC searches cards. These six targeted searches run before the existing bounded general web searches. No more than 18 searches, four in parallel, within the existing 30-second search / 45-second overall discovery budget. Duplicate targeted requests are removed when only one affiliation is available.

Use Tavily include_domains per request, not a site operator embedded in a query. Post-filter targeted results to the exact domain family to reject unrelated/lookalike hosts. Existing source policy, product URL, identity/affiliation and seller metadata gates apply. Broader searches remain unrestricted as before. See [Tavily search domain filtering](https://docs.tavily.com/documentation/api-reference/endpoint/search).

## Files changed
- lib/enrichment/merchandise.ts — bounded marketplace plan with college/team contexts and existing broad queries.
- lib/enrichment/news.ts — optional per-search domain scope on the shared provider interface; existing news callers remain unrestricted.
- lib/enrichment/search-provider.ts — forward include_domains to Tavily and enforce domain family matches on targeted responses.
- app/admin/preview-lockers/MerchandiseSection.tsx — explain named marketplace targets in the Media tab.
- tests/player/merchandise-discovery.test.ts — marketplace/context coverage, budgets, multi-store discovery/deduplication, actual Tavily request payloads and lookalike rejection.

## Routes changed
Existing /api/preview-lockers/[id]/merchandise discovery behavior and /admin/preview-lockers/[id]/edit (also new builder) Media copy. No new endpoint or route.

## Database changes
None. Search results continue through the existing saved merchandise review queue RPC, independent of Locker merchandise. Existing pending listings are merged rather than replaced; duplicate and dismissed listings remain protected. Results are never auto-added or published to the Locker.

## Migrations
None.

## Environment variables
No new variables; uses existing server-side TAVILY_API_KEY. No marketplace API credentials needed.

## Permissions
No permission changes. Existing Admin authorization, preview revision checks, discovery admission/rate limit, source policy, safe-fetch boundaries, server-only credentials and saved review permissions retained. No change to rights or publication eligibility.

## Tests run
Focused marketplace/discovery/API/merge/workflow run: 73 tests passed in four files. Type checking passed. Lint passed: 0 errors / 297 existing warnings. Full suite passed: 210 files / 1,680 tests; 2 files / 24 tests skipped. Production build and diff whitespace check passed. Commit 4df70efc3ca009548ab95fbbffeed23925c9f745 pushed to main from isolated branch codex/merchandise-marketplace-targets-2026-10-18. Production deployment dpl_2Eynr4wBrXLqy87Xj1NerZyYsNJm is READY and assigned to bltz.vercel.app, bltz.me and www.bltz.me. Unrelated root-workspace changes excluded.

## Manual verification and deployment
Verified the READY production deployment in a fresh Antoine Cason editor. Media > Merchandise displays the eBay, Fanatics and COMC targets. Ran Search merchandise: all five existing review URLs were retained, with no duplicates or new accepted listings in this run; Locker merchandise remained at five items. The response reported that some seller pages could not be checked. Reloaded the editor and reopened Media > Merchandise: the five saved listings and updated search timestamp persisted. Did not add, dismiss or publish any listings. Production runtime error log check returned zero entries after the search. Screenshot: output/merchandise-marketplace-targets-production-2026-10-18.png. No separate mobile browser check was run for this copy-only interface change; the existing responsive controls/layout were preserved.

## Known limitations
Search index coverage, seller blocking and current inventory determine available results. A store can return no matching listing; partial searches retain available candidates for review. Existing per-run results limit 12, metadata fetch limit 16, timeouts and cumulative queue capacity remain unchanged. Historical affiliations are bounded as before. Search titles are only a fallback suggestion when seller metadata is blocked/unavailable and must pass the existing name/sport/affiliation/product checks; they do not override readable conflicting seller metadata. Human review remains required.

## Deferred work
No required work deferred. Direct marketplace APIs, stock guarantees, transactions and store-specific inventory crawling are outside scope.

## Product direction
Strengthens persistent athlete-to-merchandise discovery/curation in the existing Player Locker workflow. No canonical Career Graph schema changes; no Moment Graph or Value Graph changes. Remains useful for former athletes across college and professional history. Uses Tavily and existing marketplace listings rather than rebuilding commerce or inventory management. No generalized media-management expansion or Product Doctrine conflict.
