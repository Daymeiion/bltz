# Private preview college CSV imports

## Objective
Let an internal admin paste a Sports Reference player-page URL and CSV, or select a local CSV file, review mapped season totals, and persist them only within a private preview.

## Product reference and boundaries
Follows the user-supplied Product Doctrine: recover persistent athlete history without requiring a provider API. The referenced `docs/product/BLTZ_PRODUCT_DOCTRINE.md` is absent in this checkout. No canonical athlete, Moment, rights, or Value Graph schema is created. Public release and automated collection are excluded.

## Workflow and wireframe
Primary user: internal admin. Primary action: import and review college season statistics. Mobile priority: stacked column mapping and horizontally scrolling statistics table.

Builder -> Import college statistics -> player source URL + table category -> upload or paste CSV -> Read CSV columns -> confirm mappings -> Review college statistics -> verify athlete/source/rows/skipped data -> Add reviewed statistics to draft -> Save draft.

The table category identifies the replaceable import batch. Reimporting a category replaces that batch after review. Separate categories combine by year and case-insensitive school name; conflicting overlapping values block review/save. Removing a table changes the draft until saved. Keep separate team stints. Career summaries are skipped; missing numbers remain unknown. Supported mapped statistics are listed in the UI. Unmapped columns are explicitly reported. No raw CSV is uploaded to object storage, retained in the database, or sent to a third-party parser. Source URLs are references and are never fetched by the importer.

## Data and permissions
`preview_lockers.cfb_stats` contains bounded, validated JSON batches with category, source URL, import timestamp, season/team rows, games, supported numeric statistics, and bowl-coverage notes. New column reuses existing preview RLS, admin-only writes, assigned-viewer reads, revisions, and audit triggers. No `anon` grant; no changes to canonical player tables or public stat storage. Existing create/enroll RPC is extended atomically. Server payload validation rejects conflicting tables even if browser review is bypassed. Public `/player/[slug]` does not read this field.

## Files and routes
- New: `app/admin/preview-lockers/CfbCsvImport.tsx`, `lib/preview-lockers/cfb-csv.ts`, two CSV/page test files, `scripts/verify-preview-cfb-csv.mjs`, migration below, this report.
- Updated: builder form and form tests; preview validation, selected columns and mapper; private preview page; shared stats renderer and display field metadata; scoped preview database types.
- `tsconfig.json` excludes generated `output/` artifacts because a copied baseline app there incorrectly participated in compilation and resolved imports against current source.
- Existing routes: `/admin/preview-lockers/new`, `/admin/preview-lockers/[id]/edit`, `/preview-lockers/[slug]`; existing POST/PATCH preview APIs reused. No new endpoint.

## Migration and rollout
`supabase/migrations/20260916193000_private_preview_cfb_csv.sql` must be applied to the intended preview database before deploying this app version. It is additive and includes the create/enroll RPC update. Do not deploy the new select list without its column. No environment variables added. Production migration applied on 2026-09-16 to drxtzxnwdtgxwueiqygf, recorded in the migration ledger. Post-migration checks confirmed RLS enabled, anonymous reads denied, and no imported athlete data. Application release follows through the existing GitHub-to-Vercel production integration.

Scoped table types were regenerated from the isolated PostgreSQL `information_schema` using `node scripts/verify-preview-cfb-csv.mjs --generate-types`; other declarations retain prior CLI provenance. Regenerate against the target schema during rollout as usual. Local Docker was unavailable; the isolated check uses the existing PGlite installation under ignored `output/sportradar-validation`, no new application dependency.

## Validation and limitations
- Focused parser, builder, upload, render and provider tests pass: 57 tests across 8 files on the release checkout. Paste/import/save/reload test asserts writes use only the private-preview PATCH endpoint.
- Isolated SQL proof passes persistence, revision conflict, audit, anonymous denial, unassigned denial, assigned read-only access, atomic create/retry, and JSON bounds using actual preview and viewer migrations. Auth and conversion enrollment dependencies are fixture stubs; the hosted migration also verified RLS and anonymous column access.
- Full suite: 705 passed, 24 skipped, 9 failures in the same four existing auth, Film Room, and preview-identity test files identified before this work. Later upload and page-boundary tests are covered in focused runs.
- Lint: zero errors, 209 existing warnings. TypeScript and production build pass; existing CSS at-rule warnings remain.
- Browser: inspected the live Sports Reference CSV export format (grouped defense headers, `Comb`, `Season*`, and career rows); imported no real athlete data into BLTZ. Synthetic importer UI was exercised in an isolated local browser harness at desktop and 390px mobile width: mapping, review, expanded statistics, bowl note, confirmation and add-to-draft passed. No browser console errors; horizontal table overflow stayed inside its container.
- Deferred: arbitrary stat support, direct per-cell editing, game-log CSV imports, public publishing and provider API activation. The existing career-totals form remains separate.

## Product completion
This enables private recovery/display of athlete-to-season-to-school sporting history without creating or claiming a canonical identity. It remains useful after organizational departure. No Moment or Value relationships changed, no commodity media workflow duplicated, and no media-management scope drift.
