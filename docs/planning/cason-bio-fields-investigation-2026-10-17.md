# Cason birthdate and high-school investigation

## Summary

Diagnosis complete. The active preview-builder data contract omits birthdate and high school. The production page therefore displays UNKNOWN for both even though public sources contain the information. This is a missing preview workflow, rather than an unavailable source or a cache problem.

## Root cause and evidence

- [Discovery projection](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/preview-lockers/discovery.ts:20) explicitly discards DOB. The general pipeline already supports DOB from Wikipedia, ESPN, and the NFL master dataset.
- [Active validation](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/preview-lockers/validation.ts:92) does not accept DOB or a distinct high-school field. An existing test explicitly expects DOB rejection.
- [Database read projection](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/preview-lockers/server.ts:12) does not select DOB. A legacy DOB database column exists, but is outside this active preview contract.
- [Active Locker mapping](C:/Users/Administrator/bltz/output/preview-merchandise-search/lib/preview-lockers/mapper.ts:69) always supplies an empty birthdate. The following line uses the general School value as high school only when career level is `hs`; former/pro players receive an empty high-school value.
- The builder's existing School input is the primary school/college affiliation. It has no birthdate or separate high-school editor. Its School history also does not supply the Bio card's high-school value.
- The production Bio tab displays Arizona as college context, while BIRTHDATE and HIGH SCHOOL both display UNKNOWN.
- [Arizona's official biography](https://arizonawildcats.com/sports/2007/4/17/207929644) identifies his birthdate as July 9, 1986, and high school as Los Alamitos High School, California.

## Files changed

This investigation report only. No application code changed.

## Routes changed

None. Inspected `/preview-lockers/antoine-cason` and its shared preview mapper.

## Database changes

None. No database records were queried directly or modified; the cause was established from the active read projection, schema, mapper, tests, and production page.

## Migrations

None applied or authored.

## Environment variables

None changed or exposed.

## Permission changes

None.

## Tests run

Existing preview validation and discovery suites: 2 files, 37 tests passed. This confirms the current strict validation behavior, including rejection of DOB. No fix or new regression test was introduced during this diagnostic request.

## Manual verification

Read the production Locker accessibility state: BIRTHDATE UNKNOWN and HIGH SCHOOL UNKNOWN, with Arizona present elsewhere as the college. Verified the missing facts in the university's official biography. No production deployment occurred.

## Known limitations

The fields remain missing on the Locker. Re-running the existing scraper cannot resolve the omission because the preview boundary and renderer discard or blank them.

## Deferred implementation

To repair the workflow, carry validated DOB and a separate high-school value through source extraction, builder review/editing, save validation, database read/write permissions, and Locker mapping. Preserve college affiliation separately and backfill Cason through the normal reviewed builder save path. Any required database change needs a version-controlled migration.

## Product direction

The identified repair would strengthen Athlete Identity and Athlete → School historical accuracy and remain useful after leaving an organization. This investigation creates no Career, Moment, or Value Graph relationships and duplicates no third-party workflow.
