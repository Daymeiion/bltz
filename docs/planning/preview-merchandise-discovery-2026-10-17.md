# Player merchandise discovery

## Objective and product scope

Extend the existing private Preview Locker Media workflow with identity-scoped online merchandise discovery, including trading cards and jerseys. Product authority is `docs/product/BLTZ_PRODUCT_DOCTRINE.md`, with bounded Locker enrichment under `docs/BLTZ_BUILD_ORDER.md`. This strengthens athlete → college/team → sourced product references across a persistent career. No Moment relationship, ownership, endorsement, authenticity, revenue entitlement or Value Ledger entry is inferred. Seller publishing/commerce workflows are integrated through links; no generalized media-management or commerce platform is rebuilt.

## Included behavior and permissions

An Admin opens a saved preview → Media → Merchandise → Search merchandise. The server searches the quoted full name plus saved college and team context, including full NFL names, with separate trading-card and jersey queries. It expands only established school aliases for matching. Metadata from the seller page must corroborate the name, football and a saved affiliation. Search snippets never establish identity. Search/category/profile/editorial pages, unsafe URLs, restricted sources and multi-product catalogs are excluded.

Results show title, category, seller/source URL, matching college/team, metadata description and seller-reported price/availability when present. Missing values remain unknown. Each listing requires an explicit review checkbox before Add to draft. Duplicates are disabled, suggestions can be dismissed, and existing products are retained. Results do not enter Locker merchandise until the operator adds them and uses the existing Save draft workflow. Changes to identity or a server revision conflict disable stale suggestions. Failed searches retain prior results and the draft.

The endpoint authenticates Admin first, requires same-origin JSON with only a saved revision, reads the RLS-protected row, uses the existing per-Admin admission/cooldown and finalization RPCs, and rechecks the revision after discovery. It cannot update Locker merchandise. It returns private/no-store responses and sanitized errors; credentials and raw seller HTML never reach the browser. Existing Save/PATCH validation, revision checks, RLS and editorial audit snapshots continue to govern added products.

## File and route changes

- `app/admin/preview-lockers/MerchandiseSection.tsx`, `MerchandiseResults.tsx`, `PreviewLockerForm.tsx`: search, separate result cards, review and explicit draft additions.
- `app/api/preview-lockers/[id]/merchandise/route.ts`: new POST endpoint for Admin discovery against saved identity and revision.
- `lib/enrichment/merchandise.ts`: bounded queries, metadata identity checks, deduplication and validated result contract.
- `lib/enrichment/product-metadata.ts`: single-product JSON-LD/OpenGraph metadata, categories, source prices, stock and safe canonical/image references.
- `lib/enrichment/article-metadata.ts`, `news.ts`, `safe-fetch.ts`: share parsing/query context and the established pinned-DNS metadata boundary; article behavior remains covered by regression tests.
- `lib/preview-lockers/enrichment.ts`: reuse school-directory aliases; `lib/search/errors.ts`: safe merchandise diagnostics.
- `tests/player/merchandise-discovery.test.ts`, `tests/preview-lockers/merchandise-api.test.ts`, `merchandise-form.test.tsx`: metadata/discovery, permissions/revisions and review-to-save tests.
- `docs/design-reference/preview-merchandise-search.md`: interaction hierarchy and file plan.

Existing Admin new/edit routes gain controls; the public/private Locker renderer continues to consume only saved, visible merchandise. No new dependencies, database changes, migrations, generated-type changes, environment variables, roles, RLS policies or access-window changes. `TAVILY_API_KEY` stays server-only. Search admission records/audits use the existing database functions; saving products uses existing editorial audit snapshots.

## Acceptance and validation

Coverage includes name/college/team queries for both product kinds, rejecting namesakes and wrong sports, source-policy/SSRF boundaries, source-only prices and availability, canonical hints, malformed/multi-product pages, deduplication, partial/empty failures, anonymous/non-Admin/cross-origin denial, strict request shape, no caller identity overrides, pre/post-search revision conflicts, admission finalization, no automatic publication, explicit review, multiple additions, preserving existing products, save payloads, stale suggestions and invalid responses.

A real Tavily/safe-metadata probe for Antoine Cason using Arizona and San Diego Chargers found both a signed football trading-card listing and an NFL Chargers game-issued jersey listing. Some seller pages blocked metadata access, producing an explicit partial result. An unresolved seller image template was rejected after this probe. No product was saved to an athlete by that test. The temporary network test was removed from the permanent suite; sanitized evidence remains under local `output/merchandise-live-*`.

Final full regression run: **1,523 passed, 24 skipped, zero failures**, across 187 passed/two skipped files. Type checking and the final production build passed. Full lint passed with zero errors and 290 warnings (289 inherited plus the deliberate direct seller-image element, which avoids proxying/rehosting seller assets). Final focused lint also had zero errors. Source whitespace check passed. Commands: `vitest run --maxWorkers=4`, `tsc --noEmit --incremental false`, repository `eslint`, and `next build --webpack`. Workspace-local TEMP and the existing trusted system CA bundle were used for Windows test workers and the live probe; certificate verification stayed enabled.

Live-release evidence is recorded in the production completion report. The work is implemented in the isolated `output/preview-merchandise-search` checkout based on deployed commit `884754b`; unrelated dirty root changes are preserved.

## Limitations and deferred work

Suggestions remain in the current editor session until reload; only selected products persist in the normal saved draft. Discovery is on demand, with at most 12 queries across six interleaved affiliations, 16 metadata fetches and 12 review results per request, under a 45-second deadline and existing 180-second identity cooldown/daily admission budget. This avoids searches on public Locker views. Seller bot controls, stale listings and absent metadata limit coverage. Source prices/stock are unverified labels; users must inspect the seller before acting. No images are downloaded or rehosted. Product authenticity, endorsements, licensing, seller trust, live inventory, checkout, purchase automation and product-candidate persistence are deferred. Existing news and statistics functionality remains in place.
