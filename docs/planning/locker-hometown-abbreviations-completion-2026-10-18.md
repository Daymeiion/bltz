# Locker hometown abbreviations — October 18, 2026

## Summary / objective
Display standard U.S. state abbreviations in both the hero hometown and Bio hometown row, consistently for all player Lockers. Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md. Scope: shared presentation formatting, existing preview/public Locker routes. Excluded: source scraping, player-data rewrites and biography prose edits.

## Root cause
The shared Locker renderer displayed the saved hometown verbatim. Antoine Cason's value is Long Beach, California; Lavelle Hawkins's is Stockton, California. Keith Rivers's saved Riverside, CA was already abbreviated. Live browser inspection confirmed the difference in both hero and Bio.

## Files changed
- lib/player/locker-format.ts — shared pure formatter for a comma-delimited U.S. state component; supports all 50 states, DC and named territories, including an explicit trailing U.S. country label. Preserves city text, already abbreviated values and unrecognized locations.
- app/player/[slug]/LockerView.tsx — both hometown displays use the same formatted value; existing missing-value presentation retained.
- tests/player/hometown-format.test.ts — complete names, multiword states, existing abbreviations, international values, city-only and empty values.
- tests/preview-lockers/renderer.test.tsx — hero and Bio regressions for full-state and already abbreviated inputs across preview and public route modes.

## Routes changed
Shared rendering on existing /player/[slug] and /preview-lockers/[slug]. No new routes or API behavior.

## Database changes / migrations
None. Saved hometown values and builder fields remain editable and unchanged. No migration required.

## Environment variables
None.

## Permissions
None. Existing route access and private/public rendering boundaries retained.

## Tests run
Focused formatter/Locker renderer tests: 42 passed. Full suite: 212 files / 1,707 tests passed; 2 files / 24 tests skipped. TypeScript, production build and diff whitespace checks passed. Lint: zero errors / 297 existing warnings. Full-suite nonfatal external iframe warning remains unchanged.

## Manual verification / deployment
Before deployment: confirmed Antoine Long Beach, California; Lavelle Stockton, California; Keith Riverside, CA in both sections. Saved preview links resolved through the Admin builder. Tested commit f2e24c6d862dc94ea72f6ddeae6adbaaa4cc9790 pushed to main from isolated branch codex/locker-hometown-abbreviations-2026-10-18. Production deployment dpl_S1j499VqMCvTXSRkHoPSbNNiU1w3 is READY and serves bltz.vercel.app, bltz.me and www.bltz.me.

Reloaded all three live Lockers. Both hero and Bio now show Antoine Long Beach, CA and Lavelle Stockton, CA; Keith remains Riverside, CA. At 390 x 844, Antoine's hero and Bio retain CA and document width equals scroll width (390), with no horizontal overflow. Restored temporary viewport. Production runtime error query returned zero entries. No player records, drafts or access settings edited. Release worktree clean; unrelated primary-workspace changes excluded.

Proof: output/hometown-abbreviations-live-proof.json; screenshots output/hometown-abbreviations-cason-hero.png, output/hometown-abbreviations-hawkins-bio.png and output/hometown-abbreviations-mobile.png. Status: DONE.

## Known limitations
Formats recognized comma-delimited U.S. state names only; does not infer geography from arbitrary city-only text or rewrite biography paragraphs. No layout or responsive-style changes.

## Deferred work
None required.

## Product direction
Improves consistency of existing athlete identity presentation across teams and retirement. No Career Graph schema, Moment Graph or Value Graph changes. No duplicated third-party workflow or expansion into generalized media management. No Product Doctrine conflict.
