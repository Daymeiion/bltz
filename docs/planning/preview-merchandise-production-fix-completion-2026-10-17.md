# Merchandise discovery production fix — completion report

## Summary and root cause

The full saved Antoine Cason identity reproduced the production empty result locally. Arizona and four professional teams generated 60 search results. Generic reference pages and catalogs filled the 16 metadata-fetch slots before the real Amazon card and NFL auction jersey were selected. The earlier two-affiliation probe had not exercised this failure.

Individual product paths now receive the metadata slots first across all queries, within the same limits. A separate issue was observed on Amazon: it now returns a generic page without product metadata. Eligible product links whose search title explicitly names the player, football context and saved affiliation may therefore appear as **search result only / seller page unverified**, requiring manual seller review. Such suggestions have no inferred price, image, availability or description. They do not override readable contradictory seller metadata or bypass unsafe destinations, source-policy failures, cancellation or timeouts.

## Source and files

Commit `09013edf3b57731e4af53b43a7eaa1184c12e0a0`, branch `codex/fix-merchandise-review-2026-10-17`, isolated checkout `output/preview-merchandise-search`, based on prior production commit `9986330`. The root's unrelated uncommitted work remains preserved. Nine committed files:

- `app/admin/preview-lockers/MerchandiseResults.tsx`
- `app/api/preview-lockers/[id]/merchandise/route.ts`
- `lib/enrichment/merchandise.ts`
- `lib/enrichment/news.ts`
- `lib/enrichment/search-provider.ts`
- `lib/search/errors.ts`
- `tests/player/merchandise-discovery.test.ts`
- `tests/preview-lockers/merchandise-form.test.tsx`
- `docs/planning/preview-merchandise-production-fix-2026-10-17.md`

## Routes, database, environment and permissions

Existing Admin builder new/edit routes gain the evidence label; existing POST `/api/preview-lockers/[id]/merchandise` requests review titles. No new routes, database/schema changes, migrations, generated-type changes, environment variables or dependencies. Existing server-only `TAVILY_API_KEY` is reused.

No permission, role, RLS or public-access changes. Existing Admin authorization, same-origin JSON, saved-identity/revision checks, admission budget/cooldown and finalization remain. Search cannot write merchandise. Explicit per-listing review, Add to draft and Save draft remain required; saved changes retain existing validation and editorial audit snapshots. News remains URL-only at the provider boundary and requires publisher metadata. Statistics and athlete access are unchanged.

## Tests and manual verification

- The new full-career regression failed before the scheduler fix with an empty result instead of both product URLs, then passed after the fix while asserting the 16-fetch limit.
- Full regression suite: **1,538 passed, 24 skipped, zero failures**, 187 passed/two skipped files.
- TypeScript and production build passed. Repository lint: zero errors, 290 warnings, unchanged from the previous release. Source whitespace checks passed.
- New tests cover namesakes, wrong sports/affiliations, missing football context, non-product URLs, source-policy/unsafe-destination errors, timeouts, contradictory readable seller metadata, optional provider-title projection without snippets, unverified labels, review gating and no automatic write.
- A real local search using all saved affiliations returned the Arizona and San Diego Chargers Amazon trading cards plus the NFL Chargers game-issued jersey. Card evidence was `search_result`, jersey evidence `seller_metadata`; prices and availability remained unknown. No saved athlete record changed. Temporary diagnostic test source was removed before the full validation run.

Evidence: local `output/merchandise-production-trace-before.json`, `merchandise-production-trace.json`, `merchandise-ranking-before.log`, `merchandise-fix-tests.log`, `merchandise-fix-types.log`, `merchandise-fix-lint.log`, `merchandise-fix-build.log`.

## Deployment and hosted acceptance

The guarded normal fast-forward to `main` succeeded. Vercel production deployment `dpl_64voWMCMMvpmVoSTArAgaccjCfEq` is **READY** on exact commit `09013edf3b57731e4af53b43a7eaa1184c12e0a0`, URL `https://bltz-ewm0hoewd-daymeiions-projects.vercel.app`, with `bltz.me`, `www.bltz.me` and `bltz.vercel.app` assigned. The hosted build passed.

An authenticated search in the fresh production Antoine Cason editor returned **three real listings** in Media → Merchandise:

1. Arizona 2008 Press Pass rookie autograph card: `https://www.amazon.com/Antoine-autographed-Football-Arizona-PPS-AC2/dp/B07WSY679H`.
2. San Diego Chargers 2008 Upper Deck SP rookie autograph card: `https://www.amazon.com/Antoine-autographed-Football-Chargers-Rookie/dp/B01N26VW34`.
3. Chargers game-issued size-44 jersey: `https://nflauction.nfl.com/nfl---chargers-antoine-cason-game-issued-jersey-size/isynmv1/aucd/5491501`.

This production request could read seller metadata for all three, so they displayed matched affiliation metadata. Amazon's generic-page behavior in the local replay is intermittent; the unverified fallback remains separately labelled and covered by regression tests. Other seller failures produced an honest partial-search notice. Prices and availability remained unknown.

All three review checkboxes were false; all three Add to draft buttons were disabled. Existing saved merchandise remained zero and the five saved news articles remained present. No product was reviewed, added, saved or published on the user's behalf. The editor was left open with results ready for review. Suggestions survive in that editor session; another editor/reload requires a new search.

Post-deploy homepage HTTP 200; anonymous discovery POST HTTP 401 with private/no-store. Vercel's bounded error-log check returned no entries after the successful search. No browser errors were captured after the production reload; the browser log contained older extension message-channel errors from before this deployment. A 390px mobile viewport measured a 390px document width; temporary viewport sizing was restored. Screenshots: `output/merchandise-ui-proof/fix-production-results.png`, `fix-production-cards.png`, and `fix-production-mobile.png`.

## Known limitations and deferred work

Search ranking, seller access and listings change over time. Search-only suggestions are not seller-verified identity or proof of stock, price, authenticity, endorsement or rights; reviewers must inspect the seller. Suggestions remain in the current editor until reload; chosen products persist through Save draft. Persistent candidate queues, inventory, checkout and financial allocation are deferred. No merchandise is automatically published.

## Product direction

Strengthens athlete → college/team career context → sourced merchandise references, useful after an athlete leaves an organization. No Moment, rights ownership or Value Graph entitlement is inferred. External commerce is integrated through seller links; no mature commerce workflow or generalized media-management platform is duplicated.
