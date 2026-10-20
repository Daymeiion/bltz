# PFR player IDs containing periods

## Objective and scope
Fix rejection of J.J. Arrington's valid Pro Football Reference player page in the preview builder NFL statistics importer. Product reference: explicit user bug report and docs/product/BLTZ_PRODUCT_DOCTRINE.md. Preserve the existing CSV review, draft save, authorization and source boundaries.

Acceptance criteria: https://www.pro-football-reference.com/players/A/ArriJ.00.htm passes review and saved-content validation; HTTPS, exact host, credentials, port and player-page restrictions remain; no existing draft is modified during diagnosis.

## Completion report
1. Summary: the manual NFL import URL validator now accepts periods between alphanumeric parts of a PFR player ID. The previous letters-and-numbers-only expression rejected the period in ArriJ.00. The same shared schema validates the importer and preview save payload.
2. Files changed: lib/preview-lockers/pfr-csv.ts, tests/preview-lockers/pfr-csv.test.ts, tests/preview-lockers/pfr-form.test.tsx and this report. One application regex changed; no UI rewrite.
3. Routes changed: validation behavior in existing /admin/preview-lockers/new and /admin/preview-lockers/[id]/edit NFL importer, plus existing preview create/update payload validation. No new routes.
4. Database changes: none. Existing pfr_stats JSON bounds and preview persistence are unchanged. No hosted athlete, Locker or draft data edited.
5. Migrations: none required.
6. Environment variables and dependencies: unchanged.
7. Permission changes: none. Exact www/non-www PFR hosts, HTTPS, absent credentials/ports and anchored player-page paths still apply. Non-player paths, repeated dots and dot-only IDs are rejected. No automated scraping or source-policy exception added.
8. Tests run: reproduced both the shared-validator rejection and real form error before the fix. After correction, all 12 focused NFL CSV/form tests passed. Full final suite: 226 files / 1,816 tests passed, with 2 files / 24 existing skips. Lint zero errors / 296 existing warnings. Production build, TypeScript and route generation passed. git diff --check passed. Existing nonfatal HappyDOM iframe diagnostic remains. Regression tests cover the exact J.J. URL, both PFR host variants, invalid dotted paths, reviewed rushing data, saved-content schema and form save payload retaining the original URL; existing unsafe URL checks remain.
9. Manual verification: read the user's existing J.J. Stats tab without changing or reloading it. It contained the exact valid dotted URL and displayed the reported error. In an isolated local instance of the actual StatsCsvImport component, entered that URL and a 2005 rushing CSV row, mapped its columns and reached the review step with zero alerts and the approval-controlled Add reviewed statistics to draft button. Screenshot output/pfr-dotted-url-preview.png in the primary workspace was visually reviewed. No production requests or saves were made by the local fixture.
10. Known limitations: not deployed. Existing production tabs still use the old validator. This fix addresses the manual NFL import URL field; automatic jersey/combine source adapters retain their existing independent policy checks.
11. Deferred work: production deployment when requested; no requested implementation deferred.

## Debug report
Symptom: a valid HTTPS PFR player URL failed with a generic HTTPS player-page error.
Root cause: /players/A/ArriJ.00.htm did not match the alphanumeric-only player ID regex.
Fix: accept separated alphanumeric components joined by periods while retaining the original path and host boundaries.
Evidence: both focused regression cases failed before the fix and passed after; the actual importer reached review without alerts.
Status: local correction and validation complete.

## Product direction
Strengthens accurate attribution of imported career statistics to the existing athlete identity and source reference. Useful across affiliations and retirement. No new Career, Moment or Value Graph schemas or relationships, duplicated third-party workflow, or generalized media-management scope.
