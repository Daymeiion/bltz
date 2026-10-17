# Persistent merchandise review queue merges

## Objective and product reference

New searches append unique merchandise listings to the existing private preview review queue. Preserve unreviewed work, original saved metadata and dismissals. This increment follows `docs/product/BLTZ_PRODUCT_DOCTRINE.md`: persistent athlete identity and explicit review before Locker enrichment.

## Included and excluded

Included: atomic database merging, normalized URL and retailer listing-ID deduplication, canonical aliases, persistent dismissal keys, queue-size validation, existing-draft duplicate detection and review copy. Excluded: changes to search ranking, provider calls, public Locker rendering, news, stats, claims, rights, payments or future Media Graph tables.

## Routes and reusable implementation

- Existing `/admin/preview-lockers/[id]/edit` Media tab: render the accumulated saved queue, including more than twelve listings, with explicit review and Add to draft controls.
- Existing `POST /api/preview-lockers/[id]/merchandise`: bounded discovery followed by the existing save RPC, now merging under preview and queue row locks.
- Existing `PATCH` endpoint: dismiss through the existing version-checked RPC; listing aliases remain dismissed after future searches.
- Reuse existing Supabase SSR authentication, Admin checks, result validation, audit trigger, same-origin request checks and private/no-store responses.

## Data and migration

`20261017035825_preview_merchandise_queue_merge.sql` adds `dismissed_keys` to the existing private queue table, expands its JSON/dismissal constraints, adds a pure listing-key helper and replaces the two existing invoker RPC bodies. Existing saved result data is preserved by the migration. No new application table or index is needed: operations still access one primary-key row per preview.

URL keys ignore fragments, tracking, www and trailing slashes, while preserving meaningful query values. Amazon ASIN, eBay item ID, NFL Auction ID and seller product-ID paths provide additional keys scoped to the seller domain. Same-host canonical aliases connect equivalent listings; foreign canonical hosts do not. Merges retain the oldest saved metadata and persist alias unions, including transitive bridges. A changed saved athlete identity retains the existing queue-reset boundary so another athlete's results are never mixed in.

One search still yields at most twelve listings. The pending queue is bounded at 200 listings / 2 MB, with 64 aliases per listing and 2,000 dismissal keys / 2 MB. Overflow returns `merchandise_review_full` (HTTP 422) atomically; it never evicts old work. Dismissals free pending capacity on the next merge. No dependency or environment-variable changes.

## Permissions

Admin-only RLS and server-side authorization remain in force. The pure helper is executable only by authenticated users; it has no table access or external requests. Anonymous users cannot read the queue or execute its mutation functions. Queue writes remain audited through the existing trigger. Searching/dismissing never adds or removes curated Locker merchandise.

## Acceptance criteria and validation

- Searching again retains pending results absent from the latest search.
- Alternate/tracking URLs and matching retailer IDs consolidate into one review item without overwriting its saved details.
- Canonical bridges preserve all aliases; dismissed aliases never reappear under the same identity.
- Different sellers, product IDs and meaningful URL query variants remain separate.
- Empty successful searches preserve pending items; failed searches do not write the queue.
- Stale revisions, out-of-order searches and stale dismissal versions are rejected.
- Queues above twelve load correctly; overflow preserves the previous row, and dismissal frees capacity.
- Adding to the Locker still requires explicit per-listing review, Add to draft and Save draft.

Run the isolated SQL fixture suites, focused merchandise tests, full Vitest suite, TypeScript, ESLint and the production webpack build. Production verification: confirm existing Antoine Cason results survive a real search, unique saved listings remain after reopening, Locker merchandise remains untouched, non-Admins cannot read/write, audit/version changes occur, and the Media tab works at mobile width. Record release evidence separately.

## Product direction check

Strengthens persistent athlete-to-discovered-merchandise associations in the review workflow. It remains useful after an athlete changes or leaves an organization. No Moment Graph or Value Graph relationships are introduced. No mature commerce workflow or general media-management system is duplicated.
