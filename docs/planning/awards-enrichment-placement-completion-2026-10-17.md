# Awards enrichment placement

## Summary / scope

Moved the existing Awards & news enrichment refresh panel into the preview builder's existing Career → Awards disclosure and removed its wrapper above the editor tabs. The refresh component, saved report, stale-state input and API behavior are reused. No new top-level tab or new enrichment workflow was introduced.

Implemented as `e336a976410b1306b837bfd36d1e8164e3413cf2` on `codex/awards-enrichment-placement-2026-10-17` in `C:/Users/Administrator/bltz/output/preview-merchandise-search`, then fast-forwarded to remote main. The isolated working tree is clean; unrelated root-checkout work was preserved. Vercel deployment `dpl_6T4YU7dbb4Wj7A9cf1u66fHPF9Tp` is READY and assigned to `bltz.me`, `www.bltz.me` and `bltz.vercel.app`.

## Files changed

- `app/admin/preview-lockers/[id]/edit/page.tsx`: passes the existing EnrichmentPanel element as a ReactNode slot to the form instead of rendering it above the form.
- `app/admin/preview-lockers/PreviewLockerForm.tsx`: forwards that optional slot to AwardsSection.
- `app/admin/preview-lockers/AwardsSection.tsx`: renders the slot inside the existing Awards disclosure before the award editor cards.

## Routes changed

UI layout only on `/admin/preview-lockers/[id]/edit`. No API or public routes changed. New-preview behavior is preserved; enrichment controls remain associated with saved previews.

## Database changes / migrations / environment variables / permissions

None. No queries, persistence schemas, generated database types, environment variables, credentials, permissions, publication logic or audit behavior changed. Existing server-side Admin authorization remains in place. The existing refresh action retains its own state and API implementation.

## Tests run

- Existing full Vitest: 193 files passed, 2 skipped; 1,587 tests passed, 24 skipped (`output/awards-enrichment-placement-tests.log`).
- TypeScript noEmit/noincremental: passed (`output/awards-enrichment-placement-types.log`).
- Lint: zero errors, 290 existing warnings (`output/awards-enrichment-placement-lint.log`).
- Production webpack build: passed (`output/awards-enrichment-placement-build.log`).
- Git whitespace check with CR-at-EOL support: passed.

Read the installed Next.js server/client composition guide before passing the existing component through a ReactNode slot. Reviewed the React changes for component reuse, state preservation, accessibility and absence of new fetches/effects. No new tests were added for this reversible placement-only change.

## Manual verification

Verified the production Antoine Cason editor in a dedicated authenticated browser tab. The enrichment heading exists once, inside the Awards disclosure and `locker-panel-career`; no global panel appears above the tabs. It is hidden in Info and Media and visible after opening Career → Awards. The saved report and enabled Refresh News control are present. Enter collapses and expands the Awards disclosure correctly.

At 390 × 844, document client width and scroll width both equal 390, with no horizontal overflow. The viewport override was reset afterward. Browser warning/error logs were empty. No refresh, save, publication or data-changing controls were invoked during layout QA. Authorization and persistence implementations were unchanged; no new permission or persistence path was introduced.

Evidence: `output/awards-enrichment-placement-desktop.png`, `output/awards-enrichment-placement-mobile.png`, `output/awards-enrichment-placement-ui-proof.json`, and `output/awards-enrichment-placement-deployment.json`. The production runtime error query returned no entries; the Vercel CLI also emitted an npm update-check warning, so browser verification and READY deployment metadata are the primary release evidence.

## Known limitations / deferred work

The existing builder places Awards under Career; this change follows that structure. Existing skipped tests and lint warnings remain. Enrichment was not rerun during layout QA. No required work remains and no additional feature work was deferred.

## Product direction

Keeps award and coverage enrichment next to career achievements, improving discoverability of existing player → awards/news relationships. No new Career, Moment or Value Graph entities were introduced. Existing persistent athlete history remains useful after organization changes; no third-party workflow was duplicated or generalized media-management scope added.
