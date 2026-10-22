# College statistics XLS conversion

## Summary / scope

The active college statistics importer had a separate CSV-only file handler and did not use the NFL converter. It now accepts Sports Reference HTML-table `.xls` exports and converts them locally into the existing CSV column-mapping and explicit-review workflow. Product reference: BLTZ Product Doctrine, bounded athlete career/Locker enrichment. Excludes generic binary XLS/XLSX workbooks, scraper changes, new source permissions and changes to save/publication behavior.

## Files changed

- `app/admin/preview-lockers/CfbCsvImport.tsx`: enables the XLS picker type, reuses `readStatsFile`, explains conversion, and shows the loaded filename/size. Existing college review and draft-save callbacks are preserved.
- `lib/preview-lockers/stats-file.ts`: renames the conversion opt-in parameter from PFR-specific to Sports Reference terminology. Converter behavior and bounds are unchanged.
- `tests/preview-lockers/form.test.tsx`: college XLS conversion through the active file input, preserved school names/statistics, review requirement, no network request, and format/size errors.
- `tests/preview-lockers/stats-file.test.ts`: clarifies the opt-in test name now that the active college importer opts into conversion.

## Routes changed

UI only on existing `/admin/preview-lockers/new` and `/admin/preview-lockers/[id]/edit` Stats → Import college statistics. No API or public route changes.

## Database changes / migrations / environment variables / permissions

None. No schema, migration, generated database types, dependencies, environment variables, auth/RLS, source-policy, audit or publication changes. Files are converted locally; existing source URL, review, Add and Save steps remain required.

## Tests run

Focused conversion/integration tests: 37 passed in 3 files (`output/college-xls-focused.log`). Existing normal college CSV and NFL XLS coverage passed. Full suite: 195 files passed, 2 skipped; 1,602 tests passed, 24 skipped. TypeScript noEmit/noincremental, production webpack build and whitespace check passed. Lint passed with zero errors and 290 existing warnings. Logs use `output/college-xls-{tests,lint,types,build}.log`. The suite emits the existing disabled YouTube iframe diagnostic while passing.

Read the installed Next.js client-component guide. Reused the existing converter and existing lazily loaded spreadsheet dependency; no new effects, fetches or clients.

## Manual verification / release

Commit `63481ca2638c3af36dc3dbfb1f248112ab4821d3` on `codex/college-xls-conversion-2026-10-17` was fast-forwarded to production main from the isolated release checkout, preserving unrelated root-checkout work. Deployment `dpl_8wnqJJzRVh7Wy2XEjQDBVxmBRXiy` is READY on `bltz.me`, `www.bltz.me` and `bltz.vercel.app`.

Verified the production Stats → Import college statistics section in a dedicated tab: the picker accepts `.csv,text/csv,.xls,application/vnd.ms-excel`, explains local conversion and the 100 KB limit, and keeps Read CSV columns disabled until content is loaded. Existing Chrome extension local-file access is disabled, so live file-chooser automation was not retried; the actual file-selection/conversion and college review handler are covered in integration tests. At 390 × 844, client width and scroll width both equal 390. Reset the viewport afterward. Browser warning/error logs were empty. No live statistics were added or saved; existing user editor tabs were preserved.

Evidence: `output/college-xls-deployment.json`, `output/college-xls-ui-proof.json`, `output/college-xls-uploader-desktop.png`, and the validation logs. Vercel's npm update-check warning did not prevent deployment inspection.

## Known limitations / deferred work

Supports Sports Reference HTML-table `.xls` exports, as the NFL importer does. Other Excel files require export to CSV first. Existing 100 KB, row/column, statistics and source-validation limits remain. Live automated file selection remains limited by the existing Chrome extension permission; conversion/review was verified in integration tests. No required work remains and no additional feature work is deferred.

## Product direction

Improves existing athlete → school/season → statistics enrichment. Source attribution and review remain intact. No new Moment/Value Graph entities. Persistent history stays useful after organization changes; no spreadsheet-editor or generalized file-management workflow was duplicated.
