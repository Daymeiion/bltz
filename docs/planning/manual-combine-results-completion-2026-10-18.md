# Manual Combine & Pro Day results - October 18, 2026

## Summary
Implemented and deployed the manual Stats-tab form, saved per-event source links and measurements, Locker Measurables display, and preservation across future scraper refreshes. User explicitly authorized migration 20261018230222 and commit 50a010d41de517ac766416dce12e851f03f5fe60. Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md. No doctrine conflict identified.

## Scope and workflow
Add up to ten separate Combine or Pro Day events, optional year, timing label and event source. Record 40-yard dash, 10-yard split, 20-yard shuttle, 3-cone, vertical jump, broad jump and bench repetitions, plus optional event height/weight, arm length and hand size. Broad jump accepts feet/inches and stores total inches. Individual sources override the event source. Each recorded measurement requires a source. Unknown fields stay blank; zero bench repetitions are preserved. Save draft persists results; Locker Bio > Measurables shows separate events and their sources. Explicit event removal remains available. Empty events do not render misleading result cards.

Scraper discovery cannot populate, replace or clear this manual collection, including when the collection is empty. Existing omitted-field PATCH preservation protects older editors. Automatic Combine discovery is excluded.

## Files changed
- app/admin/preview-lockers/CombineResultsForm.tsx: manual event form.
- app/admin/preview-lockers/PreviewLockerForm.tsx: Stats integration.
- components/player/CombineResults.tsx: separate event display, units and source links.
- app/player/[slug]/LockerView.tsx: Measurables and Bio summary projection.
- lib/player/combine.ts: shared definitions, types and formatting.
- lib/preview-lockers/validation.ts: strict bounded validation and legacy defaults.
- lib/preview-lockers/mapper.ts, server.ts, types.ts: saved field and projection.
- lib/preview-lockers/merge-suggestions.ts: manual collection preservation.
- types/preview-lockers.generated.ts: scoped database type regenerated from disposable PostgreSQL information_schema.
- supabase/migrations/20261018230222_preview_combine_results.sql: additive schema, validation, audit and enrollment.
- scripts/verify-preview-combine.mjs: real PostgreSQL verification, following existing isolated PGlite pattern.
- tests/database/preview-combine.test.ts.
- tests/preview-lockers/combine.test.ts, combine-form.test.tsx, api.test.ts, renderer.test.tsx.

## Routes changed
Existing /admin/preview-lockers/new, /admin/preview-lockers/[id]/edit, POST /api/preview-lockers, PATCH /api/preview-lockers/[id], and /preview-lockers/[slug]. No new production routes. Shared LockerView accepts optional results; canonical player ingestion/storage is outside this scope.

## Database changes and migration
Applied 20261018230222 to production project drxtzxnwdtgxwueiqygf. Adds public.preview_lockers.combine_results JSONB NOT NULL DEFAULT '[]', max ten events/32 KB, with strict nested keys, numeric bounds, unique event IDs/metrics and HTTPS source checks. Extends existing atomic preview_conversion_create and audit_preview_change. No new table, canonical player column, index or extension dependency. Existing rows retain all stats and media; six previews defaulted to empty results.

The authenticated SQL editor applied the exact committed migration and migration-history insert atomically, guarded by latest-version and audit/enrollment function hashes. Postflight verified version, defaults, validator, six rows and updated functions. Root CLI linked to staging was not used for production changes.

## Environment variables and dependencies
None added or changed. Existing Next.js 16.3.6, React 19, TypeScript, Zod and Supabase stack retained. PGlite verification remains isolated from production bundles.

## Permissions
Existing server Admin checks, RLS, assigned read-only access, revision compare-and-set and audit triggers retained. New column grants extend existing authenticated select/insert/update and service-role select. Anonymous direct table access remains denied. Validator is security invoker; no private-schema USAGE, new policy, role or security-definer grant added.

## Tests run
- Full suite: 216 files / 1,739 tests passed; 2 files / 24 tests skipped.
- TypeScript and production build passed.
- Lint: zero errors / 297 existing warnings; whitespace check passed.
- PostgreSQL: persistence, legacy defaults, audit before/after, stale revisions, anonymous/unassigned denial, assigned read-only access, invalid and duplicate input rejection, atomic enrollment/retry/conflicts and regenerated column type.
- Form/API/renderer: separate events, source overrides, broad jump conversion, zero reps, save/reload, explicit removal, invalid inputs and scraper preservation.
- Existing nonfatal HappyDOM iframe warning unchanged. An initial renderer assertion needed the existing Measurables filter selected; final full suite includes that correction.

## Manual verification
Local browser harness used actual production form, schema, merge and result components with labeled sample data and no production connection. Two events retained all 36 inputs/selects and displayed values after simulated scrape and reload. A real 390px iframe had clientWidth = scrollWidth = 390 for form and results. Local server stopped after verification. Artifacts: output/combine-form-desktop.png, combine-form-mobile.png, combine-browser-proof.json.

Production deployment dpl_CL9QkHX4xQ34nxPCorvWqiibJtF1 reached READY for exact commit 50a010d and is assigned to bltz.vercel.app, bltz.me and www.bltz.me. Git main advanced from 5858f03 without force or unrelated changes. Fresh Antoine builder showed the new Stats disclosure and retained college/NFL import counts of one each. Opened and removed one unsaved blank event to inspect all controls; no athlete measurements were saved. The live Locker Measurables displayed existing height/weight and seven pending drills. Save/reload and scraper protection were verified locally and in PostgreSQL, without writing sample stats to production athletes. Vercel runtime query returned zero error entries. Browser console had one asynchronous extension message-channel warning and no observed feature exception. Production proof: output/combine-production-form.png and combine-production-migration.png.

## Known limitations and deferred work
Historical measurements remain blank until an editor enters sourced results. No results guessed or backfilled. Automated multi-source discovery/conflict review remains deferred. Timing labels reflect the entered source. This release serves private preview builders rather than introducing a canonical career-record subsystem.

## Product direction
Strengthens persistent athlete-to-testing-event, measurement and source relationships in the Locker workflow, with accuracy preserved during enrichment. Remains useful across team changes and retirement. No Moment or Value Graph relationships changed, future-phase schema introduced, ownership/payment inferred, mature third-party workflow duplicated, or generalized media-management scope added.
