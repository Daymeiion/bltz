# Award filename suggestions and bulk review completion

## Summary
Added filename-based catalog suggestions and a review queue in Admin > Award Image Library. Reviewers can select multiple proposed award-to-image relationships and approve up to 100 together. Existing player-specific image overrides retain precedence. The feature identifies award artwork; it does not verify an athlete's achievement or approve display permissions.

Core commit: 9e34706636b746f79901aa971f7d30bd8d2ae2b7. Final matching safeguard: 6dfee45bcd7bd235feb91db3995812a0c8fa4458. Final deployment/manual evidence is recorded below.

## Files and routes
New matcher, review component, bulk-approval API, migration and regression tests. Existing upload path records the original basename and fills it once on deduplicated older records. Existing library embeds the review queue before the image grid. Existing image review displays the original filename. Existing PostgreSQL proof and scoped generated types include the new contract.

Changed routes: /admin/award-images; /api/admin/award-images/uploads; new /api/admin/award-images/matches. Existing public Locker routes consume the same saved catalog mappings and overrides without additional public fields.

## Database changes and migration
Applied 20261018043104_award_image_filename_matches.sql to production project drxtzxnwdtgxwueiqygf. Source SHA256: f3ebf58ec7ac9ee49c95d0fba5479c9a29f4730e39c083401bda5fec36060367. A guarded transaction checked the preceding migration and image-audit function hash, applied the migration and atomically recorded history.

Added nullable original_filename to award_image_assets, with bounded basename validation and immutability once recorded. No speculative filename backfill. Older assets use their saved title as an explicitly labeled fallback. Added approve_award_image_matches(jsonb), which uses caller privileges, existing RLS, stable-order row locks, image revisions/catalog timestamps, a 100-target bound and per-row audit triggers. Duplicate targets are rejected. A failed batch rolls back all mappings and audit entries; an identical successful retry is a no-op.

No suggestion table is necessary: pending proposals are reproducible from persisted names and current catalog aliases. Accepted mappings persist in the existing award_catalog image reference.

## Environment variables
None added or changed. Existing clients and deployment settings are preserved; no new dependencies or credentials.

## Permissions
Existing server-side internal Admin authorization protects the new API and library. RPC is SECURITY INVOKER with explicit Admin checks. Production verification: security_definer=false; anonymous execute=false; authenticated execute=true with the internal Admin check; private-schema usage=false; award-library bucket public=false. Existing image/table RLS and display approval rules remain in force. Original filenames are not sent to public Locker cards.

## Matching/review behavior
Normalizes common filename separators, CamelCase, image extensions, export suffixes, dimensions, years and ordinal team names. Exact catalog names, slugs and aliases produce proposals. Meaningful qualifiers such as first/second team, consensus/unanimous, offense/defense, rookie and college/NFL stay distinct. Generic All-American graphics and ambiguous catalog aliases require explicit variant review. Vague filenames produce no invented association.

One image may illustrate several distinct definitions. Only one image can be selected per definition. Select clear matches applies only to visible, unambiguous filename proposals for currently unmapped awards; replacements require individual selection. Replacement rows identify the existing default. Pending images can be mapped, but remain withheld from Locker cards until their separate source/permission/credit review is complete.

## Tests run
- Full regression suite after the final safeguard: 206 test files passed, 2 skipped; 1,654 tests passed, 24 skipped.
- Final focused feature checks: 7 files, 29 tests passed before the additional alias assertion; full suite above includes that assertion.
- TypeScript passed. An initially broad Vitest mock type was corrected; no unresolved type failures remain.
- Lint: zero errors, 296 repository warnings; final matcher/test lint also zero errors.
- Local production build passed after the test fixture typing correction. The final production build/deployment result is recorded below.
- Disposable PostgreSQL proof: original filename validation/immutability; anonymous/non-Admin/service-role denial; batch approval, duplicate retry, shared images, invalid input, stale image/catalog rollback, no partial audit, pending-image display status unchanged, existing private schema boundaries, generated types.
- API/UI tests cover authorization, origin/body limits, reviewed versions, multi-selection, competing images, explicit replacements, stale snapshots, reload clearing and filename preservation on uploads/deduplication.

## Manual verification
See final production verification below. No proposed production matches will be approved automatically; review remains with the user.

## Known limitations
Matching is based on text, not OCR or visual recognition. It favors accuracy and may leave unclear filenames unmatched. Older images whose original filename was not recorded use their saved title. A duplicate preserves the first known original basename; manual mapping/aliases remain available for corrections. Checkbox selections are draft UI state; stored images and accepted mappings persist. Existing matching image/default pairs are excluded from the pending queue.

## Deferred work
No required feature is deferred. Automatic image rights approval, fuzzy visual matching, external asset discovery, generalized media management and unrelated Locker changes are outside scope.

## Product direction
Strengthens persistent athlete achievement -> award definition -> reviewed reference-artwork relationships and their provenance. Remains useful after an athlete leaves an organization. No Moment Graph or Value Graph schema/behavior changes. Uses existing Supabase infrastructure and the existing catalog; no mature DAM workflow was duplicated.

## Files changed
- app/admin/award-images/AwardImageLibrary.tsx
- app/admin/award-images/AwardImageMatches.tsx
- app/admin/award-images/BucketAwardImages.tsx
- app/api/admin/award-images/bucket-imports/route.ts
- app/api/admin/award-images/matches/route.ts
- app/api/admin/award-images/uploads/route.ts
- docs/planning/award-filename-matches-2026-10-17.md
- lib/award-images/matches.ts
- lib/award-images/model.ts
- lib/award-images/server.ts
- scripts/verify-award-images.mjs
- supabase/migrations/20261018043104_award_image_filename_matches.sql
- tests/award-images/api.test.ts
- tests/award-images/bucket-imports.test.ts
- tests/award-images/bucket-ui.test.tsx
- tests/award-images/matches-api.test.ts
- tests/award-images/matches-ui.test.tsx
- tests/award-images/matches.test.ts
- types/award-images.generated.ts

## Existing bucket upload discovery
Live inspection found 21 named PNG objects uploaded directly into award-library/images that had no corresponding library records. Added Admin-only discovery/import at /api/admin/award-images/bucket-imports and an Images already in Supabase control. It validates private source bytes and copies accepted artwork into immutable SHA paths, retaining the basename and leaving originals in place. New records remain pending display review; repeated imports are deduplicated. Verified duplicate bytes can restore a missing canonical copy without creating another image record. This uses the same migration and existing storage permissions; no additional schema or environment settings.

Follow-up commit: 2adc29aab9bdbca698f1608347a95fec6e4677d8. The final full suite includes named-bucket discovery, source validation, authorization, per-file failure continuation and canonical-copy recovery. Final production verification follows.


## Final production verification
Deployment dpl_DhxS4vwv4cLAx2JxYFwo3KSLb7xo is READY for commit 2adc29aab9bdbca698f1608347a95fec6e4677d8, including the final production build and type checks. Runtime error query returned no entries. Feature worktree is clean.

Imported all 21 named source files: 20 new image records, one existing duplicate reused, zero failures. All originals remain in the bucket. Database verification after import: 26 library images, 26 retained filenames, 20 images pending display review, zero missing canonical files, ten existing mapped definitions unchanged. Cason remains at revision 34 with his custom retired-jersey image override.

Live UI generated eight clear proposals for currently unmapped awards: Bednarik, Biletnikoff, Butkus, Doak Walker, Lombardi, Maxwell, Outland and Walter Camp. Select clear matches selected all eight and enabled the bulk-approval button. No approval request was submitted; selection was cleared afterward. Replacement view showed six generic All-American candidate/definition pairs marked for variant review. Reloading retained all images and proposals. Conference-specific artwork without a corresponding catalog definition remains available for manual mapping/definition review rather than being assigned to an unrelated generic award.

Mobile check on the populated queue: viewport/document width 390, scroll width 390. Saved evidence: output/award-filename-review.png, output/award-filename-mobile.png, output/award-filename-migration.png. The Admin library was left open with proposals unapproved for the user to review.
