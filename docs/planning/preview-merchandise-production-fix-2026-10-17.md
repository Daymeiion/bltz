# Merchandise discovery production correction

## Objective and authority

Make Antoine Cason's real card and jersey search results available in Preview Locker Media for explicit review. Product reference: `docs/product/BLTZ_PRODUCT_DOCTRINE.md`; bounded Locker enrichment under `docs/BLTZ_BUILD_ORDER.md`. This corrects the discovery workflow documented in `preview-merchandise-discovery-2026-10-17.md` and adds clearly labelled search-only suggestions; it does not treat search titles as verified seller identity.

## Investigation and root cause

Production searched Arizona plus all four saved professional teams. The earlier local probe used only Arizona and San Diego Chargers. Replaying the complete saved identity reproduced zero results locally: 60 search candidates, 16 fetched pages, no accepted products. The real Amazon card and NFL auction jersey URLs were present in the search response, but reference articles and catalogs consumed the metadata budget before either listing was fetched. This was candidate scheduling, rather than a production credential failure.

A second observed issue affects the Amazon card: the seller now returns a generic `Amazon.com` page with no product title or description. The page cannot corroborate the player. Increasing the fetch budget or pretending that this is verified metadata would not solve that issue accurately.

## Included behavior and file plan

- `lib/enrichment/merchandise.ts`: prioritize recognizable individual product paths across all affiliation/category queries within the existing 16-fetch budget. Retain metadata-first checks. If an eligible product page is blocked or returns no product metadata, a product title containing the full name, football context and saved college/team may qualify for a separate, unverified human-review suggestion. The URL shape only schedules candidates; it never verifies identity. Search snippets are never retained or used.
- `lib/enrichment/news.ts`, `search-provider.ts`: optional title projection for merchandise only. News still receives URL-only results and requires publisher metadata. Provider choice and secrets stay server-side.
- `app/api/preview-lockers/[id]/merchandise/route.ts`: request title projection after the existing Admin, same-origin, saved-revision and RLS checks.
- `app/admin/preview-lockers/MerchandiseResults.tsx`, `lib/search/errors.ts`: distinguish seller metadata from search-only suggestions. Unverified suggestions instruct the reviewer to open the seller and confirm player/team. No price, image, stock or seller-description values are inferred for these suggestions.
- Discovery and form regression tests cover scheduling, fallback evidence, namesakes, wrong sports/affiliations, blocked unsafe destinations, policy failures, readable contradictory seller metadata, review gating and no automatic writes.

The fix spans the provider projection, candidate scheduler and review label because an unverified search title must never be presented as corroborated seller metadata. Existing components and controls are reused; no new screen or backend is introduced.

## Routes, data, permissions and exclusions

Existing Admin new/edit routes and POST `/api/preview-lockers/[id]/merchandise` change behavior. No new routes, schema, migrations, generated types, environment variables, dependencies, roles, RLS policies or public access. Existing `TAVILY_API_KEY` is reused server-side. No database mutation is needed for the correction. Existing admission/finalization audit and Save draft editorial audits remain in force.

Suggestions remain in the current editor session. Existing per-listing review, Add to draft and Save draft remain required. Unsafe destinations, source-policy failures, timeouts and readable seller metadata for a different player do not become fallback suggestions. External sellers handle commerce. Automatic publication, checkout, inventory verification, authenticity, endorsement, rights and financial allocation are excluded. News, stats and athlete access remain unchanged.

## Acceptance and validation

The new full-career regression failed against the original scheduler: expected the card and jersey URLs, received an empty list. It passes after prioritization while asserting at most 16 metadata fetches.

A live local replay with the exact saved team history returned three suggestions: Arizona and San Diego Chargers Antoine Cason cards from Amazon, explicitly `search_result`, and the NFL Chargers game-issued jersey, `seller_metadata`. All prices and availability remained unknown. No saved record was changed. Sanitized before/after diagnostics are in local `output/merchandise-production-trace*.json`; temporary network test source was removed before the permanent validation suite.

Validation commands: full `vitest run --maxWorkers=4`, TypeScript `--noEmit --incremental false`, repository ESLint, `next build --webpack`, source whitespace checks. Production acceptance requires a live authenticated Media search, the original card and jersey links visible with correct evidence labels, unchecked review boxes and disabled Add buttons, no products saved, unauthorized HTTP 401, mobile width, and clean runtime logs. Final release results are recorded in the completion report.

Fresh validation: **1,538 passed, 24 skipped, zero failures** across 187 passed/two skipped test files. TypeScript and the production build passed. Repository lint passed with zero errors and the same 290 existing warnings as the previous release. Source whitespace checks passed. No temporary network-test source is included in the release.

## Product direction and limitations

Strengthens athlete → college/team career context → sourced merchandise references, useful across organizational changes and retirement. No Moment or Value Graph relationship or economic entitlement is inferred. Integrates seller links without duplicating a commerce or generalized media-management workflow.

Search results and seller access can change. Search-only candidates are not verified products; review is mandatory. Current stock, price and authenticity require seller inspection. Candidates do not persist across editor reloads; persistent candidate queues and commerce remain deferred.
