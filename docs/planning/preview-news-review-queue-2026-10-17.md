# Saved news review queue

## Objective and product reference

Preserve scraped news for later review, append unique results from future searches, and require explicit review before adding new articles to a Locker. Follow `docs/product/BLTZ_PRODUCT_DOCTRINE.md` and the existing private preview enrichment boundary.

## Scope and file-change plan

Use existing `player_articles` records and their `review`/`rejected` statuses for pending/dismissed suggestions. Preserve existing `accepted` Locker articles. Add bounded alias keys and queue version/search time to existing enrichment state; replace only the article persistence portion of the existing enrichment RPC. Do not create a parallel article store or future Media Graph schema. Use a versioned migration and regenerate scoped database types.

Update the existing news API, server reader and edit page to return the private saved queue. Add version-checked dismissal to the same endpoint. Extend the existing Articles section and form with saved queue results, per-article review, Add to draft and persisted dismissals. Keep existing manual article edits, hide/reset controls, award mapping and merchandise intact.

## Routes and permissions

Existing `/admin/preview-lockers/[id]/edit` Media tab and GET/POST/PATCH `/api/preview-lockers/[id]/news`. Pending/rejected articles are Admin-only under RLS. Search and dismissal authorize Admin server-side, validate same-origin JSON and revisions, and return private/no-store responses. Existing Locker viewers must never see pending/dismissed articles. Every queue mutation is audited; publication requires explicit Add to draft and Save draft.

## Acceptance criteria

- New searches retain pending articles absent from the latest batch, including successful empty searches; failures do not erase saved work.
- URL tracking, www, fragment, trailing-slash, canonical aliases and same-publisher headline duplicates merge atomically, preserving original metadata and transitive aliases.
- Dismissed articles stay dismissed if rediscovered under equivalent URLs. Different publishers remain separate unless an explicit canonical URL links the articles.
- Search never automatically adds new articles to the Locker or changes existing editorial edits.
- Saved queue loads on reopening without searching; reviewing remains explicit and checkboxes reset.
- Stale revisions, out-of-order searches and stale dismissal versions are rejected.
- Pending queue caps at 200 with atomic errors; the existing per-search limit remains unchanged. Existing published articles remain available.

## Validation and exclusions

Run isolated migration/SQL regression fixtures, news API/form/unit tests, full Vitest, TypeScript, lint and production build. Verify real production search/reopen, preserved existing Locker articles, zero duplicate keys, private/public separation, anonymous/non-Admin behavior, audit/version changes and mobile controls. No changes to stats, provider search ranking, rights, payments or canonical athlete/Media Graph entities.

## Product direction

Strengthens athlete identity → discovered historical coverage → reviewed Locker enrichment and persistence after an athlete leaves a team. No Moment or Value Graph relationships are inferred; no mature publishing or media-management system is duplicated.
