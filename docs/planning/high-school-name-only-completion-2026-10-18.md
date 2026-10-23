# School-name-only biography fields — October 18, 2026

## Summary / objective
Show only the high-school name for every athlete, including Lavelle Hawkins's Edison High School. Normalize scraper suggestions and preview saves, and clean existing public/private Locker displays. Keep birthday and hometown on the existing scraper path; age remains calculated from birthdate. Per the user's correction, do not add GTM/CSV hometown prefills. Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md.

## Root cause
Wikipedia infobox school links often use a page title containing a disambiguating location, for example Edison High School (Stockton, California). The scraper returned that title and the saved-field schema and Locker renderer retained it unchanged. Six regression cases failed before cleanup was added. Existing Lavelle production display was confirmed to include the suffix.

## Files changed
- lib/player/locker-format.ts — pure highSchoolName formatter removes trailing parenthetical qualifiers and location suffixes separated after a school/academy name.
- lib/player/bio-fields.ts — highSchoolSchema applies the formatter after existing length/control-character validation and rejects an empty normalized name. Existing Wikipedia extraction and discovery adapters already use this schema, so they receive the same cleanup.
- app/player/[slug]/LockerView.tsx — normalize existing high-school values in shared Bio rendering, covering public and private Lockers without rewriting player records.
- tests/pipeline/bio-fields.test.ts — linked school titles, save/reload normalization, preserved full school names, invalid/empty cases and birthday/hometown discovery into a blank new preview.
- tests/preview-lockers/renderer.test.tsx — existing raw values render as school name only in both route modes.

## Routes changed
Existing /player/[slug], /preview-lockers/[slug], Admin preview builder and preview discovery/save validation. No new routes. No GTM creation, contact or enrollment changes.

## Database changes / migrations
None. No bulk record rewrite. Existing data is normalized when read/displayed, and future scraped/saved high-school values use the name-only schema. Preview fields remain editable; existing save, revision and audit behavior retained.

## Environment variables
None added or changed. No new dependencies.

## Permissions
No changes. Existing Admin, discovery admission, source policy, private-preview access and public rendering boundaries retained.

## Tests run
Focused initial run: 83 passed. Full suite: 212 files / 1,715 tests passed; 2 files / 24 tests skipped. TypeScript, production build and diff whitespace checks passed. Lint: zero errors / 297 existing warnings. The existing nonfatal external iframe warning remains unchanged.

## Manual verification / deployment
Completed. Before deployment, Lavelle's Locker and builder both retained Edison High School (Stockton, California). Tested commit dfb786815d21f58e04dd0bfdd37cfdfe30ee2547 was pushed to main from isolated branch codex/high-school-name-only-2026-10-18. The initial push hit a transient GitHub DNS failure; one retry succeeded. Vercel deployment dpl_GYTpis4pdYBQmbPcKDiLG88Cbakx is READY and assigned to bltz.vercel.app, bltz.me and www.bltz.me.

Fresh production checks confirmed Edison High School in both Lavelle's Locker and the preview builder. Birthday remains 1986-07-12, displayed as 07-12-1986 (40); hometown remains Stockton, California in the builder and Stockton, CA in the Locker. At a 390px mobile viewport, document width and scroll width were both 390px, with all three fields intact. The temporary viewport override was reset. The deployment's error-level runtime log query returned zero entries. No production draft was saved and no player records were rewritten or re-scraped during verification.

Evidence: output/high-school-name-lavelle-production.png, output/high-school-name-mobile.png and output/high-school-name-live-proof.json. The isolated release worktree is clean; unrelated changes in the primary workspace were excluded.

## Known limitations
Normalization removes trailing parenthetical qualifiers and standard school/academy location separators; it does not infer an unknown school from arbitrary biography prose. Existing scraper source availability and explicit review/edit behavior remain unchanged. Age is calculated from saved birthdate, not copied as a potentially stale age number. No GTM/CSV handoff was added.

## Deferred work
None required. Changes to source ranking, full career/school-history modeling or unrelated statistics import behavior are outside this request.

## Product direction
Improves school identity presentation and persistent athlete biography accuracy in the Locker workflow; useful after retirement or organizational changes. No Career Graph schema, Moment Graph or Value Graph changes. No third-party workflow duplication or generalized media-management expansion. No Product Doctrine conflict identified.
