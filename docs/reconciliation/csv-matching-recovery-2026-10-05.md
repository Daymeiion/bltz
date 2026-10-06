# CSV import and Player matching recovery

**Review date:** October 5, 2026, Pacific time

**Authority:** Product Doctrine → current build order → approved preservation and matching work

**Status:** Original files recovered; read-only hosted inventory confirms an unfinished contact preview, not a completed contact import. Parser conflict protection is implemented locally. Production import, migration and deployment remain separate gates.

## What was unfinished

The recovered evidence distinguishes two workflows:

- **NFL reference directory:** `nfl_players`, keyed by GSIS ID. Repeated player names do not establish duplicate identities.
- **Private contact import:** LinkedIn connections into GTM, followed by conservative contact-to-Player matching. Distinct profile URLs must remain distinct contacts even when names repeat.

The hosted read-only inventory found **24,740 NFL directory records, 296 canonical Career IDs, zero contacts and three LinkedIn import jobs**. All three jobs remain `preview_ready`, with zero created/updated rows, and their file hashes match the recovered LinkedIn export. The most recent preview was created September 3, 2026; it recorded 6,378 rows, 278 invalid rows and 544 potential matches.

This supports resuming the contact workflow without reimporting an older NFL snapshot. It does not prove a complete current directory audit or recover previously selected radio-button decisions. Existing preview jobs preserve the file binding and summary, not the abandoned browser's manual match choices.

Hosted evidence was collected **October 5, 2026 at 6:38:58 PM Pacific** (`2026-10-06T01:38:58.999Z`) using SELECT/HEAD operations only. The aggregate receipt is retained locally at `output/csv-matching-recovery-2026-10-05/hosted-read-only-inventory.json`. No contact rows, secrets or original source data are included in this report.

## Preserved source inventory

| Input | Structural evidence | SHA-256 |
| --- | --- | --- |
| `C:/Users/Administrator/OneDrive/Desktop/bltz-player-master-2026-08-25.csv.csv` | 4,234,985 bytes; 20,753 rows; 20,751 unique nonblank GSIS IDs; two missing GSIS IDs; zero duplicate GSIS IDs | `7957c6f86544d8250704aa12b23277fc0f579c3cc1c14d00658d369184c3f931` |
| `C:/Users/Administrator/OneDrive/Desktop/linkedin-connections-2026-08-25.csv.csv` | 752,277 bytes; 6,378 parsed rows; 6,100 valid contacts; 278 invalid; zero duplicate contacts/profile URLs | `b3020ed186433bc21e3d175d5d812065eddd467f3889b81e5ccb3730416c5961` |

The LinkedIn export also survives as identical copies in `C:/Users/Administrator/OneDrive/` and `C:/Users/Administrator/Downloads/Complete_LinkedInDataExport_08-27-2026.zip/`. Their hashes match the original August 28 QA report. Original files and all copies remain untouched.

The NFL file contains **552 repeated normalized-name groups covering 1,237 rows**, with distinct GSIS IDs. The LinkedIn file contains **32 repeated normalized-name groups covering 64 rows**, with distinct profile URLs. Do not merge these records by name or delete the later occurrence.

The separate retained worksheet `public/Cal_NFL.xls.xlsx` is 34,095 bytes, with one sheet and 273 named rows. It has one repeated-name group and no GSIS, DOB or profile-URL identifier columns. It is not the recovered complete NFL master file. Its headers include position, player, achievement counts, physical measurements, years and draft information. No actual player rows were printed; no formulas, links or hidden sheets were found.

The original NFL CSV's exact data origin and public-ingestion entitlement are not established by its filename or header layout. Do not treat this inventory as source approval. The public-read NFL directory and private contact workflow retain different visibility boundaries.

## Why matching became tedious

The current pure parser and matcher were exercised in memory against the two recovered files. This file-only comparison produces **535 contact candidate reviews**:

- Two strong contextual suggestions.
- 469 possible matches with a single name candidate but insufficient corroboration.
- 64 ambiguous matches with multiple candidates.
- 5,565 contacts without an NFL name candidate.

These are counts against the **older 20,753-row local snapshot**, not current hosted matching results. They must not be substituted for the hosted preview's historical 544 potential matches.

The inspected original Imports UI required decisions for every non-strong match before committing any contacts. For this local comparison, that means **533 decisions**. Choices were held only in React state; leaving or reloading the page lost that state, and validating again reset it. A same-name candidate was therefore a review burden even when preserving the contact without a Player link was the safe next step.

## Safe continuation

1. Keep the existing NFL directory and canonical `players.id` records intact. Do not replace them with the older local snapshot or run a delete-and-reimport cleanup.
2. Keep valid contacts distinct using their profile/source identity. Importing a contact does not require asserting that it is a particular athlete.
3. Permit uncertain Player matching to remain pending and unlinked, rather than blocking the entire contact batch or treating an unresolved match as a rejection.
4. Reuse approved stable identifiers and prior reviewed links where applicable. Name-only similarity must not create a verified relationship. Unique team/college context is supporting evidence, not an identity guarantee.
5. Save resumable match decisions bound to the source file, mapping, contact identity and candidate fingerprint. Server preview jobs remain bound to the authorized actor; downloaded progress is unsigned metadata and does not prove the author's identity. Revalidate stale evidence. Do not store the raw CSV, private contact prose or source rows in browser storage or public logs.
6. Keep manual review for genuine conflicts; provide filtering, pagination and complete safe exception diagnostics so ordinary uploads do not require reviewing every unrelated contact.
7. Preserve all source exceptions and original files for later correction. Repeating a confirmed import must remain idempotent.

The approved 2 MB limit can accommodate a future bounded reference projection: an in-memory projection of 18 identity/reference fields from all 20,753 original NFL rows is **1,751,256 bytes**; an 11-field projection is **1,426,408 bytes**. No projected file was created. Omitting unused fields or headshot URLs from a future upload must not delete them from the original. The two missing-GSIS rows require a separate exception path. A new reference import is currently unnecessary because the hosted directory already exists; source approval and any future directory-import release remain separate.

Do not execute `scripts/import-players.ts` for this recovery. That legacy script writes canonical Players, schools and teams through name-derived slug upserts; it is incompatible with safe homonym handling and the reference-only boundary. The held historical master-import package likewise remains evidence, not an approved migration or operational recovery command.

## Local parser protection

The contact parser now resolves the complete connected group of shared profile, email and source identifiers **before keeping any row**. Identical normalized supported fields with the same explicit source identifier may be counted as harmless repeats. Different values or different source identifiers cause every connected row to be quarantined, including earlier rows and previously identical repeats. No first-row-wins selection or automatic field merge occurs.

Connections are transitive: if one row shares an email with a second, the second shares a profile with a third, and the third shares a source identifier with a fourth, a conflict holds all four. This prevents a later bridge row from hiding part of an identity conflict. Same names without shared stable identifiers stay distinct; textual leading-zero source IDs stay distinct.

Overlength source identifiers, emails and profile URLs are rejected instead of truncated. Two identifiers with the same long prefix cannot become an apparently identical import identity through truncation.

Each affected row receives an exception containing only a row number, generic explanation, conflict reason code, identifier categories, group size and the group's first row number. Raw names, emails, profile URLs, source identifiers and CSV rows are not included in those diagnostics. Every occurrence is counted as either an eligible row, harmless duplicate or exception. Existing validation exceptions remain compatible.

## Completion and validation

- **Files changed by this subtask:** `lib/gtm/import.ts`, `lib/gtm/import-contract.ts`, `tests/gtm/import.test.ts` and this report. The coordinator separately owns the resumable/deferred matching workflow and UI.
- **Routes, database schema, migrations, environment variables and permissions changed:** none in this subtask. Existing Admin boundaries and the 2 MB/10,000-row contact limits remain unchanged.
- **Focused QA:** 35 tests passed across contact parsing and Player matching. Scoped ESLint and whitespace checks passed with no findings. The older live-import contract assertion was updated for explicit deferral, then passed with the combined action/UI regressions. Final combined evidence is recorded in the coordinator's completion report.
- **Recovered-file verification:** current parsing is byte-for-byte equivalent as serialized normalized results to the prior checkpoint for the real LinkedIn file: 6,100 rows, 278 issues, zero duplicates. Both original file hashes were rechecked unchanged after implementation.
- **Manual/read-only verification:** structural file inspection, aggregate duplicate analysis, in-memory parser/matcher comparison and the coordinator's hosted count/job inventory. No authenticated browser import or production mutation occurred.
- **Limitations/deferred work:** see the coordinator's completion report for combined QA and the implemented bounded recovery UI. Authenticated browser verification, hosted persistence authorization checks, actual source approval and any production import/release remain separate gates. No abandoned browser match choices are claimed recovered.
- **Product direction:** stable identities and accurate contact-to-athlete attribution strengthen Career Graph accuracy without creating duplicate Career IDs. This remains useful after an athlete leaves a team. No Moment/Value Graph, media ownership, rights or payment entitlement is inferred; no generalized CRM, DAM or outreach workflow was added.
