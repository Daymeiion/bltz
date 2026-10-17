# Preview builder Media tab — October 16, 2026

## Objective

Replace the builder Social tab with Media, expose scraped-article curation and manual article creation, and let staff add merchandise that appears in the preview Locker Merchandise tab.

## PRD reference

The October 16 user request authorizes this bounded preview presentation change. Follow `docs/product/BLTZ_PRODUCT_DOCTRINE.md` and the existing Locker scope in `docs/BLTZ_BUILD_ORDER.md`. Hierarchy/wireframe: `docs/design-reference/preview-builder-media.md`. No future Media Graph, rights, inventory, campaign or payment schema is introduced.

## Included

- Media tab with News articles, Merchandise, and the existing Social controls.
- Current saved, identity-matched scraped articles loaded in the saved editor. Read-only reload and explicit search refresh controls; pending draft changes must be saved first.
- Scraped headlines, publishers, links, image references, short summaries, dates and visibility can be edited. Reset restores scraped details. Hidden choices and retained edits survive news refreshes.
- Manual article cards use the same Locker renderer and real publisher destinations. Admin input does not receive inferred scraper confidence or verification.
- Merchandise supports trading cards, jerseys, apparel, memorabilia and other products; title, category, seller link, optional image, retailer, price label and visibility. Products open the seller website. Empty catalogs display an empty state; sample merchandise is no longer inserted.
- Existing draft save, review, conflict, enrollment, viewer-access, revision and audit behavior remains in use.

## Excluded

Automated merchandise discovery, checkout, inventory, price synchronization, fulfillment, inferred endorsement/licensing, commissions, payouts, article-body copying, new canonical identities and deployment. Staff curate product references they have found.

## Required routes

- `/admin/preview-lockers/new` and `/admin/preview-lockers/[id]/edit`: shared form Media tab; saved edit page supplies scraped article metadata after admin authorization.
- `/api/preview-lockers/[id]/news`: add an admin-only GET for the saved source article list and revision. Existing POST refresh remains quota protected.
- Existing preview POST/PATCH endpoints save the validated presentation settings.
- `/preview-lockers/[slug]`: merges article curation and visible merchandise into existing Locker cards.
- Shared `LockerView` also removes its sample merchandise fallback. No URL is added and canonical public-player merchandise is not populated from private previews.

## Required data / database changes

Migration `supabase/migrations/20261017010958_preview_media_curation.sql` adds two bounded JSONB presentation fields to `preview_lockers`:

- `article_edits`: manual cards and overrides keyed to original scraped URLs; source discovery evidence remains in `player_articles`.
- `merchandise`: curated external product reference cards.

Both default to empty arrays for existing previews. PostgreSQL validates object shape, text/URL limits, dates, visibility booleans, categories, unique IDs and bounded list/byte sizes. The migration extends atomic enrollment creation/retry comparisons and preserves before/after article and merchandise settings in the existing preview audit trigger. Existing revision triggers and row policies remain intact. No index is needed for fields read by the existing preview primary key.

`types/preview-lockers.generated.ts` was regenerated from isolated PostgreSQL `information_schema` using `node scripts/verify-preview-media.mjs --generate-types`. The script applies the predecessor migrations and this migration; remaining type declarations retain their existing provenance.

Environment variables: none added or changed. Existing server-only Tavily configuration still supports explicit news refresh.

## Required permissions

Admin authorization precedes saved source-list reads and refreshes. Preview writes retain same-origin validation, server validation, admin RLS, revision checks and existing discovery budgets. New authenticated column grants inherit the existing preview row policies: assigned viewers read their authorized preview and cannot edit it; unassigned users cannot read it; anonymous direct table access remains denied. Public share links retain their existing access check and server projection. Hidden article/product cards are omitted from the Locker payload; no private-preview record is copied into the canonical public-player cache. No new role or membership permission is introduced.

## Files changed

- Builder: `app/admin/preview-lockers/PreviewLockerForm.tsx`, new `ArticlesSection.tsx`, new `MerchandiseSection.tsx`, `[id]/edit/page.tsx`.
- Route: `app/api/preview-lockers/[id]/news/route.ts`.
- Presentation: `app/player/[slug]/LockerView.tsx`, `app/preview-lockers/[slug]/page.tsx`.
- Shared preview code: `lib/preview-lockers/validation.ts`, `server.ts`, `mapper.ts`, `types.ts`, new `media.ts`.
- Database: migration above, `types/preview-lockers.generated.ts`, new `scripts/verify-preview-media.mjs`.
- Tests: new `tests/preview-lockers/media-curation.test.ts`, `media-form.test.tsx`, `tests/database/preview-media.test.ts`; updated `tests/preview-lockers/enrichment-api.test.ts`, `renderer.test.tsx`.
- Wireframe and this report. Unrelated pre-existing working-tree changes were preserved.

## Acceptance criteria and verification

- Builder tab is Media, with articles/merchandise/social sections: mounted-form test passed.
- Add/edit/hide/reset articles; add/edit/remove/hide merchandise; save and reload: mounted-form and mapper tests passed.
- Scraper refresh preserves manual additions, overrides and hidden choices; refuses unsaved or mismatched-revision reloads: tests passed.
- Visible products appear under Locker MERCH with the configured seller link, retailer and price; hidden products are absent; no sample fallback: renderer tests passed.
- Persistence, pre-existing row defaults, admin writes, assigned read-only access, unassigned/anonymous denial, revision conflicts, audit snapshots, bounded inputs and enrollment/retry: real isolated PostgreSQL checks passed.
- News GET denies anonymous/non-admin callers before database reads, scopes reads to the saved preview, returns private/no-store headers and never invokes discovery: API tests passed.
- Unsafe URLs, profile/homepage article links, malformed dates, duplicated overrides and excessive list sizes: validation tests passed.

Validation commands/results:

- `node scripts/verify-preview-media.mjs --generate-types`: passed; subsequently rerun without generation after adding the pre-existing-row/default check, passed.
- Focused final run: five permanent files, 38 tests passed; one temporary visual-fixture harness also passed and was removed afterward.
- `npm test -- --maxWorkers=4`: 208 files passed, two skipped, one failed; 1,837 tests passed, 24 skipped, one failed. The unchanged `tests/analytics/contracts.test.ts` literal-event inventory includes private-preview event names while expecting only public-event contracts; this was already failing before this change.
- `npx tsc --noEmit`: passed; production build also passed TypeScript validation.
- `npm run lint`: zero errors; existing warnings remain. Two new apostrophe warnings were fixed, and targeted ESLint passed without warnings.
- `npm run build`: passed; pre-existing global CSS `@custom-variant` / `@theme` warnings remain.
- A workspace-local TEMP/TMP directory under ignored `output/` avoids Windows sandbox temp-file rename failures. No test configuration was changed.

## Manual verification

Inspected the actual article and merchandise section components in a local static fixture with synthetic data and compiled application CSS. Expanded disclosures expose clear labels and controls. Screenshot: ignored `output/media-verification/media-controls.png`. This proves layout only; save/refresh behavior was separately exercised in mounted React tests and persistence in real isolated PostgreSQL. The temporary fixture-test source and local server were removed/stopped after review. No real product, article or preview was published or modified during testing.

Release verification: apply the migration before deploying code that selects the new columns. As an admin, open a saved preview, select Media, load/refresh sources, edit/hide an article, add a manual article and a product, save, reload, then open the authorized Locker's ARTICLES/MERCH tabs. Confirm exact destinations and repeat on a narrow device. Verify a non-admin cannot GET/POST the news management endpoint.

## Known limitations / deferred work

The migration is prepared and tested, not applied to the hosted database; code is not deployed. Full authenticated hosted-browser and mobile-device QA remain release checks. Source-list reads are identity-filtered; rejected discovery candidates can be added manually only after staff review. Merchandise is manually curated and prices are labels, not live availability. Forty article edits and forty products are allowed; existing overall request-size limits still apply. Public canonical-player merchandising, automated product search and checkout are outside this request. The unrelated analytics-contract failure remains deferred.

## Product-direction completion check

Strengthens athlete-to-coverage relationships and publisher attribution by giving staff durable correction and visibility controls. Curated product references stay associated with the preview across team changes. These references remain useful after an athlete leaves an organization. No Moment relationship, rights ownership, economic entitlement or Value Ledger entry is inferred. External publishers and sellers retain their workflows; no mature DAM, publishing or commerce workflow was rebuilt. No generalized media-management scope drift was introduced.
