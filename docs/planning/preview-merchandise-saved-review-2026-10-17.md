# Saved merchandise review queue

## Objective and product reference

Keep scraped merchandise results available in Preview Locker Media across visits, separately from merchandise curated into the Locker. Authority: `docs/product/BLTZ_PRODUCT_DOCTRINE.md` and bounded Locker enrichment under `docs/BLTZ_BUILD_ORDER.md`. This is private preview review state, not a future Media Graph, rights or commerce schema.

## Included and excluded

The latest usable search saves up to twelve listing suggestions with evidence labels, identity context and search time. Opening the Admin editor reads the saved queue without calling the search provider. A new usable search refreshes the saved snapshot; failed searches and partial searches with zero results preserve the prior snapshot. A complete zero-match search is a valid replacement. Dismissal is saved separately, guarded by queue version and current preview revision; matching dismissals carry forward when refreshing the same identity. Identity changes keep old results visible but prevent adding them until a new search. Review checkboxes reset on reopen and are never persisted as approvals.

Results and their search date appear above Locker merchandise. The existing per-listing review → Add to draft → Save draft workflow remains the only way to curate a product into the Locker. Already curated products show In draft. Dismissing a suggestion does not remove curated merchandise. No automatic publication, inventory, purchase, licensing or financial entitlement is introduced.

## Routes, data and permissions

- Existing Admin `/admin/preview-lockers/[id]/edit` loads a queue snapshot on the server; existing new/edit forms display saved-state and error information.
- Existing POST `/api/preview-lockers/[id]/merchandise` persists a usable search atomically against the saved revision and search start time. Older concurrent searches cannot overwrite newer results.
- New PATCH on that same endpoint accepts only revision, queue version and an existing listing URL. It persists dismissal without searching or changing Locker content.
- `public.preview_merchandise_searches`: one bounded snapshot per preview; FK/primary key `preview_id`, identity hash, source revision, result JSON, dismissed URLs, queue version, searched/created/updated times. RLS and grants restrict reads/inserts/updates to existing internal Admins; anonymous access and direct deletion are denied. No public Locker query selects this table.
- Security-invoker RPCs enforce Admin status, lock the preview before the queue, and reject stale versions/revisions. A private trigger records changes in existing `audit_logs`. No new service-role browser access, roles or organizational permissions.
- Migration: `supabase/migrations/20261017033348_preview_merchandise_review_queue.sql`. Active migration directory only. Generated types are scoped from official production Supabase type output to avoid unrelated schema churn.

## File plan and hierarchy

Reuse MerchandiseSection and MerchandiseResults. Add shared snapshot validation and a server-only reader under `lib/preview-lockers`. Update the existing endpoint and editor hydration. Add API/form regression coverage and isolated SQL verification in `supabase/tests/preview_merchandise_review.sql`.

Media → Merchandise hierarchy: Search merchandise; saved-search time; saved suggestions and per-listing review/dismiss controls; Locker merchandise editor. Mobile keeps the existing single-column cards. Loading, persistence errors, empty results and stale-identity warnings retain the current draft. No new complex screen is introduced.

## Acceptance and validation

- Search results survive editor reload and a new browser tab without another provider search; all per-listing review boxes remain unchecked.
- Suggestions remain outside `PreviewContent.merchandise`; Add to draft and normal Save draft are explicit.
- Dismissals persist, duplicates are prevented, and failures retain prior results and draft edits.
- Admin/anonymous/non-Admin access, stale versions/revisions, out-of-order searches, identity reset, RLS and audit creation are verified in SQL and API tests.
- Run full Vitest, TypeScript, ESLint, production build and whitespace checks. The isolated SQL harness exercises the actual migration in PostgreSQL-compatible PGlite using existing local tooling, with no dependency changes. The SQL test refuses to run without the isolated-fixture guard.
- Apply the migration with production identity/history checks and a transaction proving all existing preview rows remain unchanged. Verify production page reload, no automatic search, unchanged Locker product count, anonymous denial, audit entry and mobile width. Completion evidence is recorded in the release report.

Fresh checks: 1,543 Vitest tests passed, 24 skipped, zero failures. TypeScript and the production build passed; lint had zero errors and the existing 290 warnings. The SQL persistence/permission/audit suite passed. Production migration postflight recorded migration count 84, RLS enabled, zero initial queue rows and all existing preview rows unchanged. Types were generated from the applied production schema. No new dependency or environment variable is required.

## Product direction and limitations

Preserves athlete → saved college/team → sourced merchandise review references after organizational changes or retirement. No Moment or Value Graph entitlement is inferred. Existing external seller links integrate commerce without duplicating it. Search-time metadata can become stale, so current price, availability and identity still require seller review. The queue stores the latest usable search, not unlimited search history. No generalized media-management scope is added.
