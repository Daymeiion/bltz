# Preview Locker NFL CSV import

## Objective and product reference

The October 11, 2026 user request authorizes manually importing Pro Football Reference CSV tables into preview Lockers for the 90-day sprint after the Sportradar subscription expired. This is a bounded exception to the existing reference-only source policy for this specific manual preview workflow. Automated fetch/scrape permissions and college CSV retention policy remain unchanged.

Authority: `docs/product/BLTZ_PRODUCT_DOCTRINE.md` and the user-authorized scope override under `docs/BLTZ_BUILD_ORDER.md`. This recovers athlete-to-season-to-team history in preview presentation data without creating canonical athletes or future-phase schemas.

## Included, excluded and acceptance criteria

- Included: local CSV upload/paste; player-page provenance; supported stat mapping; explicit operator review; add/replace/remove one table per category; draft save/reload; NFL season and available-season totals in the preview Locker.
- Categories: passing, rushing, receiving, defense, returns, kicking, punting. Grouped tables may map statistics across categories.
- Excluded/deferred: automated collection, provider activation, game logs, postseason and per-game imports, arbitrary new stat definitions, canonical stat writes and production rollout.
- Acceptance: CSV remains local until the reviewed parsed data is saved through the existing Admin API; source and nested data are validated server-side; NFL imports take precedence over stored NFL provider data; removal restores provider fallback; absent values stay unknown; aggregate season rows cannot double count team stints; all existing authorization, revision and audit boundaries remain in force.

## Implementation and file changes

The stack remains Next.js 16.3.6 App Router, React 19, TypeScript, npm, existing Supabase SSR/browser/service clients, PostgreSQL, and Vercel. Relevant installed Next.js server/client and route-handler guides were read. Existing `previewAdmin`, `readBody`, `previewContent`, generated preview database extract, revision/audit triggers, `BuilderSection`, inputs/buttons and `StructuredStats` are reused. No new Supabase client, dependency or backend.

New files:

- `app/admin/preview-lockers/StatsCsvImport.tsx`: shared college/NFL mapping and review editor.
- `lib/preview-lockers/pfr-csv.ts`: strict player-page source schema, PFR summary/marker/stint handling, category validation and NFL mapping.
- `scripts/verify-preview-pfr-csv.mjs`: disposable PostgreSQL persistence/RLS/audit/enrollment proof and scoped type generation.
- `supabase/migrations/20261011170240_preview_pfr_csv.sql`.
- `tests/preview-lockers/pfr-csv.test.ts`, `tests/preview-lockers/pfr-form.test.tsx`, `tests/database/preview-pfr-csv.test.ts`.
- This report.

Updated files:

- `app/admin/preview-lockers/CfbCsvImport.tsx`: wrapper around the shared editor; preserves existing college behavior.
- `app/admin/preview-lockers/PreviewLockerForm.tsx`: NFL import section, draft integration and subscription-expiry guidance. Pre-existing folder/workspace edits were preserved.
- `app/preview-lockers/[slug]/page.tsx`: league-specific imported/provider precedence.
- `lib/preview-lockers/cfb-csv.ts`: reusable bounded reader/season merger and additional PFR-compatible aliases.
- `lib/preview-lockers/validation.ts`, `server.ts`, `mapper.ts`: validated preview field, selected columns and NFL rendering.
- `lib/source-policy/preview-stats.ts`: clarifies the scoped exception; college policy behavior is unchanged.
- `lib/player/structured-stats-types.ts`, `components/player/StructuredStats.tsx`: source links and manual-import labeling.
- `types/preview-lockers.generated.ts`: preview table extract regenerated from isolated PostgreSQL information_schema; other declarations preserved.
- `tests/preview-lockers/cfb-page.test.tsx`, `tests/source-policy/preview-api.test.ts`: precedence/removal, authorized CRUD/enrollment and unauthorized/source rejection tests.

## Routes, data, migrations and permissions

Existing `/admin/preview-lockers/new`, `/admin/preview-lockers/[id]/edit`, `/preview-lockers/[slug]`, and POST/PATCH `/api/preview-lockers` routes are extended through their shared components/schema. No new endpoint. Canonical `/player/[slug]` does not consume `pfr_stats`.

The additive migration creates `preview_lockers.pfr_stats` JSONB, default `[]`, with array/count/100 KB bounds, and extends the atomic create/enroll RPC's insert and retry comparisons. Existing fields (including social and uploaded banner paths) remain in the RPC. Maximum seven categories and 120 season/team rows per table are validated by the app, including same-player provenance and overlap conflicts. Raw files are not retained or uploaded to storage.

Existing Admin-only writes, assigned-viewer reads, deliberate preview invite-link access, origin/body checks, revisions and audit insertion remain. The column gets the same authenticated column grants as college stats; no anonymous grant or new role/access policy. Source URLs are validated HTTPS player-page references, never fetched by the importer. Source pages are linked in the rendered NFL table.

Environment variables: none added or changed.

**Rollout remains pending:** apply `20261011170240_preview_pfr_csv.sql` to the intended Supabase project before deploying application code that selects `pfr_stats`. The migration has only been applied to a disposable local PostgreSQL instance. Verify hosted migration history and regenerate against the target schema during rollout. No hosted data or real athlete records were modified.

## Validation results

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed, zero errors; 286 repository warnings.
- `npm run build`: passed; existing `@custom-variant` / `@theme` CSS warnings.
- `npm test -- --reporter=dot`: 1,766 passed, 24 skipped, one failure in `tests/analytics/contracts.test.ts` (event-context coverage omits six preview event names). A committed HEAD archive and the same event-name scan confirmed the identical 17 emitted names, proving that mismatch predates this change.
- Focused CSV/parser/editor/page/source-policy runs: all passed. Tests cover quoted CSV, bounded files, grouped mappings, legacy headers, summary rows, half sacks, formulas, duplicate/conflicting values, missing values, multiple source identities, split-team totals, confirmation invalidation, add/save/reload/replace/remove, source validation, auth denial and enrollment payloads.
- `node scripts/verify-preview-pfr-csv.mjs --generate-types`: passed. Actual preview migrations prove persistence, audit creation, revision-conflict protection, anonymous/unassigned denial, assigned read-only access, JSON bounds and atomic create/retry. Auth and enrollment internals use synthetic fixtures; the enrollment wrapper is real.

## Browser and manual verification

Inspected the currently open Pro Football Reference player page's regular-season defense table: current Season/Team/grouped headers plus career, 17 Game Avg and team-career summary rows match the tested format. [Official CSV export guidance](https://faq.sports-reference.com/portal/en/kb/articles/how-to-download-data) confirms using the table's export menu to obtain CSV.

A disposable local browser harness rendered the actual shared importer and production-built CSS with synthetic data. Checked desktop mapping, review, source attribution, season/available-season totals, disabled confirmation action, approval and add-to-draft. Responsive testing requested 390px; this browser clamped its viewport to 520px. At the effective 520px width, mapping stacked, document width stayed 520px, and the 689px season table scrolled inside its 380px container. The fixed test harness produced no further errors; its first launch required a local environment stub that does not affect application code. Hosted editor and 390px physical-device verification remain rollout checks.

Manual rollout steps:

1. Sign in as Admin, open a new or existing preview, select Stats and expand Import NFL statistics.
2. On the player's PFR page, choose Regular Season and season totals, then Share & Export / Export Data → Get table as CSV. Paste the complete table or save it as a `.csv` file of 100 KB or less.
3. Enter the player-page URL, select category, read columns, resolve ambiguous mappings and review the rendered seasons/skipped rows. Confirm athlete/source/regular-season totals and add to draft.
4. Save draft, reload the builder and open the preview. Verify source, season rows and available-season totals; then reimport or remove a category and save again.
5. Verify ordinary users cannot write, unassigned users cannot read, existing invite-link access works only under its existing rules, and preview audit/revision updates persist.

## Limitations and product completion

This is a manual regular-season bridge; the operator must confirm the exported table is not postseason/per-game. Missing or unsupported columns are shown as skipped, never fabricated. Partial coverage produces available-season totals, not a claim of complete career coverage. Separate manual career-summary fields remain separate. College CSV is still retention-only. General source-policy grants remain unchanged.

Career relationships strengthened: preview athlete identity → historical season → team → sourced statistics. Useful after organizational departure and retirement. Moment Graph and Value Graph relationships are unchanged. No mature media workflow is duplicated and there is no generalized media-management scope drift. Long-term provider replacement, canonical ingestion and live rollout are deferred.
