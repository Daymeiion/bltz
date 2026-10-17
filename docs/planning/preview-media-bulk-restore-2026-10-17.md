# Bulk restore dismissed Media

## Objective / PRD reference
Extend existing private preview Media review with selection and atomic restoration of multiple dismissed articles/listings. Follows the Product Doctrine's persistent player → reviewed coverage/products → Locker enrichment loop.

## Included / file-change plan
Add per-card checkboxes and a page-scoped Select all on page / Clear selection / Restore selected toolbar to DismissedReviewList. Preserve individual restore. Reset selection on page, identity or queue changes and successful restoration; retain selection after failures. Wire existing sections/form callbacks to one PATCH request with action=restore and unique 1–200 URLs.

Add bulk restore security-invoker RPCs and delegate existing single functions to them. Validate whole batches and capacity before mutation, enforce preview revision, review version and saved identity, increment version once and reuse audit triggers. Preserve aliases and private/public separation. Update scoped schema types and add form/API/SQL regression coverage.

## Excluded
Cross-page selection, new searches, public routes, Locker publication, new tables/columns, rights or future Media Graph work, unrelated root-checkout edits.

## Routes / data / permissions
Existing Admin preview editor and news/merchandise PATCH endpoints. Same private review stores, Admin authorization, RLS, same-origin JSON and private/no-store responses. New functions authenticated-only with internal-Admin guard; no table/policy changes.

## Acceptance criteria
Both dismissed queues support individual/page selection, visible count, clearing and one-request batch restoration. Whole batches restore once without duplicates or Locker writes; wrong preview/identity, stale revision/version, invalid/duplicate/empty/oversized URLs and capacity overflow leave all items unchanged. Existing single and bulk review actions remain compatible. Loading/empty/error, keyboard and mobile states remain usable.

## Validation commands
Run focused form/API tests, isolated PGlite SQL lifecycle/atomicity/boundary/security/audit checks, full Vitest, TypeScript, lint and production webpack build. Version migration, regenerate official types after authorized application, then verify production health and saved-queue preservation.
