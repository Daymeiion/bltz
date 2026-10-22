# NFL statistics file upload fix

## Summary / root cause

The reported file is `sportsref_download (2).xls`, exactly 27,063 bytes. It is the Sports Reference HTML-table Excel export, not CSV. The existing NFL uploader combined filename-extension and byte-limit rejection into one message, “Choose a .csv file of 100 KB or smaller.” Its 100,000-byte limit was correct; the extension check caused this rejection. The error was also confirmed in the user's existing browser tab without changing that tab or its draft.

The uploader now converts this specific Excel export locally into CSV and sends it through the existing column-mapping, statistics review, explicit confirmation and draft-save workflow. A normal 27 KB CSV remains accepted. Size errors and unsupported-file errors now have distinct actionable messages. No limit increase is needed.

## Objective / included / excluded

Product reference: BLTZ Product Doctrine and bounded Player Locker career enrichment. Include the existing NFL stats importer, safe local conversion of Sports Reference HTML `.xls` exports, clear error messages, and regression coverage. Exclude generic binary XLS/XLSX import, college source-policy changes, schema changes, automatic ingestion, unrelated stats mappings and public publication. The existing athlete identity, source URL and review requirements remain authoritative.

## Files changed

- `app/admin/preview-lockers/StatsCsvImport.tsx`: NFL picker accepts CSV and Sports Reference XLS exports, shows accepted formats and actual loaded filename/size, uses bounded conversion, and retains the same review/save controls.
- `lib/preview-lockers/stats-file.ts`: separates extension and size checks; converts a single bounded HTML table using the existing, lazily imported SheetJS dependency. Does not render uploaded HTML, execute formulas, fetch sources or interpret arbitrary binary workbooks. Existing CSV byte/row/column limits remain enforced after conversion.
- `tests/preview-lockers/pfr-form.test.tsx`: the actual 27 KB export reaches review with eight season/team rows and career totals; normal CSV and size rejection continue to work.
- `tests/preview-lockers/stats-file.test.ts`: conversion, exact public career values, normal 27 KB CSV, format/size diagnostics, excessive spans/ranges/rows, multiple tables, binary workbook rejection, and the college CSV-only boundary.
- `tests/preview-lockers/antoine-cason-defense.xls`: regression fixture copied from the reported public-career statistics export.

## Routes changed

Existing `/admin/preview-lockers/[id]/edit` and new-preview builder UI only. No API or public route changes. The uploaded file stays local; only reviewed statistics can enter the existing draft-save payload.

## Database changes / migrations / environment variables / permissions

None. No new schema, migration, generated database types, environment variables, dependencies, clients, authorization rules, storage or audit paths. Existing server-side Admin/draft-save permission checks and explicit review remain unchanged. Existing college import source-policy restrictions remain in place.

## Tests run

Before the fix, the exact 27,063-byte XLS fixture reproduced the failure: 1 failed, 3 passed (`output/nfl-upload-before-fix.log`). After conversion, focused integration/helper tests passed: 8 tests in 2 files (`output/nfl-upload-focused.log`).

Full Vitest passed: 195 files passed, 2 skipped; 1,600 tests passed, 24 skipped. Lint passed with zero errors and 290 existing warnings. TypeScript noEmit/noincremental and the production webpack build passed. Logs: `output/nfl-upload-tests.log`, `output/nfl-upload-lint.log`, `output/nfl-upload-types.log`, `output/nfl-upload-build.log`. Whitespace check passed. The full suite emits the existing disabled YouTube iframe diagnostic while passing.

Read the installed Next.js client component guidance and verified the installed SheetJS string parser/conversion behavior against its [parse options](https://docs.sheetjs.com/docs/api/parse-options/) and [CSV utility documentation](https://docs.sheetjs.com/docs/api/utilities/csv/). Raw text values are preserved. No new package is installed.

## Manual verification / deployment

Commit `d8c527624db26c693a1ddb79319b6597378e659f` was committed on `codex/fix-nfl-csv-upload-2026-10-17` in the isolated release checkout and fast-forwarded to production main. The release checkout is clean; unrelated root-checkout work was preserved. Deployment `dpl_EtvGder1u8Ai51KL7zupF3PFvpX2` is READY on `bltz.me`, `www.bltz.me` and `bltz.vercel.app`.

Verified the new production picker accept list includes `.xls` and the accepted-format guidance is visible. Attempted actual file selection in a dedicated browser tab, but Chrome extension automation requires local-file URL access, which is disabled. No extension permissions were changed. The actual File-selection/conversion path passed in the component integration test with the exact reported file; its pre-fix failure is recorded above.

For live downstream verification, converted the same reported export using the same installed library/options and pasted its CSV into the separate QA editor. Read columns and Review NFL statistics succeeded: eight season/team rows across seven seasons, reported career totals retained, and explicit review still required before adding. At 390 × 844, client and scroll widths both equal 390 with no horizontal document overflow. Reset the viewport afterward. Browser warning/error logs were empty. No Add, Save, publication, source fetch or provider quota operation was invoked. The user's existing editor was not edited or reloaded, and the separate prepared review tab remains available.

Evidence: `output/nfl-upload-deployment.json`, `output/nfl-upload-ui-proof.json`, `output/nfl-upload-review-desktop.png`, `output/nfl-upload-review-mobile.png`, `output/nfl-upload-converted.csv`, and the validation logs. The Vercel CLI's npm update-check warning did not prevent successful deployment inspection.

## Known limitations / deferred work

Only Sports Reference HTML-table `.xls` downloads are automatically converted. Other Excel workbooks require exporting to CSV first. Imports retain the existing 100 KB, 100-column and 1,000-row limits, and existing season/career validation. Generic Excel workbooks are outside this fix. Automated live file selection was limited by the existing browser extension permission; exact-file conversion/integration and live CSV review were verified separately. No required implementation or deployment work remains.

## Product direction

Improves recovery of existing athlete → season/team → statistics relationships and source attribution in the Locker workflow. These records remain useful after organization changes. No Moment or Value Graph schema changes, generalized file management, or duplicated spreadsheet-editing workflow. Reuses the existing spreadsheet library and reviewed stats path.
