# Restore dismissed Media suggestions

## Objective / product reference
Allow Admins to inspect dismissed news and merchandise in the existing preview Media tab and restore mistakes to the saved review queue. Follows the Product Doctrine and existing private review workflow; no public publication, new Career ID, rights or future Media Graph schemas.

## Included / file-change plan
Reuse the existing review cards' source data in compact collapsed dismissed lists with individual Restore to review actions. News uses rejected discovery records, paginated in groups of 200. Merchandise keeps a bounded dismissed-items archive on the existing search row so later searches preserve details and aliases; archives display 200 listings per page. Pending queues stay capped at 200; merchandise archive bounds are 2,000 items, 2 MB and the existing 2,000 dismissal-key limit. Retain all existing bulk and individual review actions. Restore is immediate, revision/version guarded and audited; Locker content remains separate.

## Excluded
Bulk restore, automatic publication, search-provider changes, public routes, unrelated root-checkout edits.

## Routes / data / permissions
Existing `/admin/preview-lockers/[id]/edit` and news/merchandise APIs. PATCH supports explicit action=restore with a single URL; missing action keeps existing dismiss behavior. News GET supports dismissedOffset pagination. Add one merchandise JSON archive column, update merge/dismiss functions and add security-invoker restore RPCs with Admin checks, existing RLS and auth-only EXECUTE. News RLS allows rejected → review but never accepted publication.

## Acceptance criteria
Dismissed items stay visible after reload and new searches, restore once without duplicates, and return to review without adding to the Locker. Wrong preview, identity, revision/version, non-Admin, foreign URL and capacity overflow fail without partial changes. Existing accepted articles and curated merchandise stay unchanged. Loading/error/empty and mobile controls remain usable.

## Validation
Focused form/API and isolated SQL regressions for dismiss → search → restore → reload, aliases, audits, stale/unauthorized/capacity failures; full tests, lint, types and production build. Apply versioned migration and regenerate types before deployment; verify live UI and preserve user queues.

## Known historical boundary
Older merchandise searches may already have removed dismissed listing metadata while retaining keys. Those details cannot be reconstructed from keys alone; rediscovered matching listings will now be retained in the dismissed archive. No dismissal keys will be dropped by migration.
