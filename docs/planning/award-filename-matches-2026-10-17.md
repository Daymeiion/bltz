# Award filename suggestions and bulk review

## Objective and product reference
Improve persistent award-definition -> reference-image accuracy within the existing Award Image Library. Follow the Product Doctrine and existing Locker enrichment boundary; no Media Graph or generalized DAM schema.

## Included
Preserve original upload filenames; suggest catalog names/aliases using conservative normalization; show image, filename, award, reason, confidence and existing default; select individual or clear unmapped matches; atomically approve up to 100 mappings. Different definitions may share one image; one definition can receive only one selected image. Replacements require an explicit per-row selection. Pending images remain subject to separate display review. Existing Locker overrides retain priority.

## Excluded
Image OCR, external searches/downloads, inferred achievements/rights, automatic publication, bulk image-license approval, and unrelated Locker changes.

## Layout reference
Admin /admin/award-images, before the stored-image grid: Filename match suggestions; search + optional replacement suggestions; responsive review cards containing checkbox, proposed artwork/filename, award, reason and current default. Actions: Select clear matches, Clear selection, Approve selected matches. Loading, no candidates, stale batch and success states are explicit. Existing manual mapping remains available below.

## Data and permissions
Nullable original_filename on award_image_assets (immutable once recorded); existing catalog image pointer stores accepted mappings. Suggestions are reproducible from saved filenames/catalog, so no duplicate queue table. One SECURITY INVOKER bulk RPC preserves existing Admin RLS and per-row audit triggers, locks assets and definitions in stable order, checks current image revisions/catalog timestamps, and rolls back the entire batch on conflict. Existing internal Admin gate protects API and UI.

## Acceptance and validation
CamelCase, separators, extensions, image-export suffixes and years normalize; important qualifiers such as first/second team, consensus/unanimous, offense/defense and league remain distinct. Vague names produce no invented match. Review all suggestions before accepting. Original filenames and accepted mappings survive reload. Duplicate files stay deduplicated. No partial batch writes. Unit/API/UI/PostgreSQL checks; generated types; lint/types/full regression/build; production deployment and browser verification.

## File plan
New pure filename matcher, review component, bulk API and migration. Extend the existing upload path, library composition, scoped types and PostgreSQL proof; keep existing public rendering and permissions unchanged.
