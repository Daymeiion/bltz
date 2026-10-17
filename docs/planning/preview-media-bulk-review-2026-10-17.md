# Bulk review of discovered news and merchandise

## Objective and product reference

Allow Admins to select several saved news articles or merchandise listings and add them to the Locker draft or dismiss them together. Follows `docs/product/BLTZ_PRODUCT_DOCTRINE.md` and the existing private review → explicit Locker enrichment workflow.

## Scope and file-change plan

Add a shared bulk-action control to the existing news and merchandise review sections, plus an independent selection checkbox on each result. Preserve individual review/Add/Dismiss controls. Selected additions require an explicit review confirmation, skip existing draft entries using current alias keys, append in one state update and respect the existing 40-item draft limits. Save draft remains required for Locker publication. Selection/review confirmation reset on queue refresh, identity changes and successful bulk actions; failed requests retain selection.

Extend the two existing PATCH endpoints to accept either one `url` or a unique bounded `urls` array. Add two security-invoker bulk RPCs in a migration and route existing single-item RPCs through the same core implementation. Validate the entire batch before mutation; lock the preview then its review state, enforce revisions/versions, update queue version once and preserve existing audit triggers. No new tables, columns, search behavior, publication shortcut or rights schema.

## Routes, data and permissions

Existing `/admin/preview-lockers/[id]/edit` Media tab and PATCH `/api/preview-lockers/[id]/news` / `merchandise`. Reuse existing private queues, generated types, RLS, Admin checks, same-origin JSON checks, aliases and private/no-store responses. Bulk dismissals never remove curated Locker content. New RPCs are authenticated-only with server-side Admin authorization; no new table privileges.

## Acceptance and validation

- Both queues support individual selection, Select all, Clear selection and visible selected/ready-to-add counts.
- Bulk Add requires review confirmation, appends all eligible selected entries once, avoids duplicates and refuses capacity overflow without silently truncating.
- Bulk Dismiss removes all selected suggestions together, persists existing dismissal aliases, audits changes and increments version once.
- Invalid URL, wrong preview, stale revision/version, duplicate/empty/oversized batch or unauthorized request cannot partially mutate the queue.
- Existing individual controls and curated content still work; loading, error, empty, keyboard and mobile states remain usable.

Run isolated SQL regressions for both existing queues plus atomic bulk cases; focused form/API tests; full Vitest, TypeScript, lint and production build. Apply a guarded data-preserving migration, regenerate official types, deploy and verify production bulk UI without altering the user's pending reviews or saved Locker content.

## Product direction

Improves the player → discovered coverage/products → reviewed Locker enrichment loop. No new Moment or Value Graph relationships, mature commerce/publishing workflow duplication or generalized media-management scope.
