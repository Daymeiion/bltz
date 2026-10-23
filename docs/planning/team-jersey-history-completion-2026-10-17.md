# Team jersey history and Locker badges

## Summary / scope

Replaces the Info/Bio jersey-number text row with wrapping, team-colored number badges. Repeated numbers remain separate across teams. PFR's background and border colors are retained when available; existing team branding supplies the fallback. Accessible labels and tooltips identify each team and number. Legacy numbers without an associated team remain neutral.

Discovery now carries explicit team-number-source records from NFL/college roster caches and matched Wikipedia biographies. Historical NFL lookups use verified career teams/years and only extract the exact athlete's biography link from the relevant roster section. A dedicated, user-authorized PFR player-page jersey adapter reads only the matching uniform badges. Cross-source matches are marked corroborated; disjoint numbers are flagged for review and withheld from the Locker. When HTTP access to PFR is unavailable, the builder can import the visible PFR jersey badge HTML. The pasted HTML is discarded.

Product reference: BLTZ Product Doctrine, bounded career enrichment and existing Player Locker presentation. Scope excludes generic PFR scraping, statistics import changes, media copying, canonical roster backfills, and inferred numbers from an unassociated career-number list.

## Files changed

Release checkout: `output/preview-merchandise-search`, branch `codex/team-jersey-history-2026-10-17`. Unrelated root work is preserved. This report is outside the release commit.

- UI: `components/player/JerseyNumberRow.tsx`, `app/player/[slug]/LockerView.tsx`, `app/player/[slug]/page.tsx`, `app/admin/preview-lockers/PreviewLockerForm.tsx`, `app/admin/preview-lockers/PfrJerseyImport.tsx`.
- Data projection/review: `lib/player/jersey-history.ts`; `lib/preview-lockers/{discovery,mapper,merge-suggestions,school-branding,types,validation,jersey-review}.ts`.
- Source adapters: `lib/pipeline/{claude,types}.ts`; `lib/pipeline/scrapers/{nflverse,cfbverse,wikipedia,jersey-history,pfr-jerseys}.ts`; `lib/enrichment/safe-fetch.ts`; `lib/source-policy/policy.ts`.
- Tests: `tests/pipeline/jersey-history.test.tsx`, `tests/pipeline/antoine-cason-jersey-badges.html`, `tests/preview-lockers/form.test.tsx`.
- Release/verification: `scripts/{prepare-team-jersey-release,verify-preview-team-jerseys,verify-jersey-live}.mjs`; migration `20261018015519_preview_team_jersey_numbers.sql`; `docs/planning/jersey-history-source-decision-2026-10-17.md`.

## Routes changed

No new routes. Shared badges appear in `/player/[slug]` and `/preview-lockers/[slug]`. Preview team-number editing, lookup and PFR comparison are in Career & achievements on `/admin/preview-lockers/new` and `/admin/preview-lockers/[id]/edit`. Existing `/api/preview-lockers/discovery` and preview save routes carry the validated optional metadata. Canonical public Lockers use their known current roster number and team; canonical history is not backfilled by this task.

## Database changes / migrations

Migration `20261018015519_preview_team_jersey_numbers.sql` extends `private.preview_items_valid(text,jsonb)` in place to validate optional jersey-number arrays, source URLs, review status and hex colors on existing `schools` and `pro_teams` JSON. Existing key, count, byte-size and source constraints remain. No tables, columns, identifiers or exposed function signatures change; generated public database types remain JSON and do not change.

Applied as a committed, hashed, guarded transaction against BLTZ Production `drxtzxnwdtgxwueiqygf`. Guard checked the previous migration version and exact validator hash, locked the migration ledger, installed the validator and recorded the version atomically. Postflight returned migration `20261018015519`, jersey validation `true`, private-schema access `false`. No player rows were changed by the migration.

## Environment variables / permission changes

No environment variables, dependencies, auth/RLS or database grants changed. Existing Admin authorization, optimistic revision checks and explicit draft review/save remain. The source-policy version is `2026-10-17.1`; the narrowly scoped `EXTRACT_JERSEY_HISTORY` action was authorized by the user's request to use both PFR and roster methods. General PFR fact/stat extraction and asset copying remain blocked. Source decision details are in the committed source-decision document.

## Tests run

Full suite: 196 files passed, 2 skipped; 1,610 tests passed, 24 skipped. TypeScript noEmit/noincremental and production webpack build passed. Lint: zero errors and 290 existing warnings. Whitespace check passed. The final policy-version metadata update passed 10 targeted policy/jersey tests. Existing disabled-iframe and Vite configuration diagnostics remain non-failing.

Disposable PostgreSQL checks passed: legacy JSON, number/source/color/status persistence, malformed input, duplicate numbers, size/count limits, authenticated constraint execution without private-schema USAGE, and denied anonymous writes. No Docker or hosted test writes were needed. The migration changes no exposed type signatures.

Read the installed Next.js component guide and Supabase/Postgres/React skills. Reused the existing safe-fetch boundary, source-policy mechanism, discovery admission, team branding and review/save flow. No new effects, user-controlled fetch URLs outside the bounded policy, media downloads or authentication clients were added.

## Manual verification / release

Commit `31898176435a06b0752b04a6b19574d82e31c54e` contains the feature and migration. Deployment `dpl_Grik5oixq5cJ1mNURbuT4Vje6vqF` is production READY on `bltz.me`, `www.bltz.me` and `bltz.vercel.app`, with build duration 131 seconds. Deployment URL: https://bltz-5u1fud3jp-daymeiions-projects.vercel.app. Framework: Next.js 16.3.6.

Live source check recovered San Diego #20, Arizona #20 and Baltimore #23 from independent Wikipedia season rosters. The final Carolina roster omits the earlier-season Cason stint. The user's existing PFR browser page explicitly shows San Diego #20, Arizona #20, Carolina #20 and Baltimore #23; its actual uniform-link/SVG fragment is covered in the parser regression test. PFR HTTP access did not produce usable data in the local live run, so it was not falsely reported as corroborated.

Exercised the production Career → Pro team history lookup in a separate editor tab, preserving the user's existing editor. Production discovery supplied Baltimore #23 from the NFL cache/biography; the historical season lookups returned no usable number in that production run. Imported the actual visible PFR badge fragment through the new comparison control. Attached the independently verified 2012 San Diego and 2013 Arizona season-roster URLs and ran comparison again: Baltimore, San Diego and Arizona showed agreement. Confirmed Carolina #20 against the official August 22, 2014 Patriots/Panthers game-day roster at https://static.clubs.nfl.com/image/upload/v1578497900/patriots/d3ywmd2xojiclp0leyeg.pdf (page 1, numerical roster and starting LCB), retained that source beside the PFR citation, and marked it manually reviewed.

Saved through the normal revision-checked Save draft flow, which confirmed persistence without new enrollment or completion. Reloaded the public preview and verified all four badges and exact PFR background/border RGB values. Existing team-history order is preserved. The number strip is available in the Bio/Info card, with team names in tooltips and accessible labels. At desktop width 1223 it displays all four; the mobile override produced effective CSS page width/scroll width 325/325 and two wrapping rows with all four badges contained. Reset the viewport and left the Locker and saved editor open. Browser warning/error logs were empty for both pages, and deployment-scoped runtime error retrieval returned no entries. Drains/ongoing monitoring were not audited or changed.

Evidence/logs: `output/jersey-{tests,lint,types,build,migration,policy-tests}.log`, `output/jersey-live-proof.json`, `output/jersey-pfr-visible-proof.json`, `output/jersey-production-migration.sql`, `output/jersey-migration-applied.png`, `output/jersey-deployment.json`, `output/jersey-locker-proof.json`, desktop/mobile screenshots and `output/jersey-locker-mobile-proof.json`. The initial CLI migration attempt used no write command and could not connect; the authenticated dashboard applied the guarded migration to the production project verified against the application's configured hostname. The Vercel CLI npm update-check warning did not prevent deployment/log inspection.

## Known limitations / deferred work

PFR may refuse automated HTTP access; the importer and editable team fields provide an explicit fallback. Historical season rosters can omit players released before the final roster. Missing corroboration remains visible in review; no number is guessed. Discovery preserves existing manual numbers and removals. No canonical athlete-team-season history backfill is included.

## Product direction

Strengthens accurate athlete → team/season → jersey-number presentation and source attribution within existing career reconstruction. Preview facts remain reviewable and persistent. No Moment/Value Graph entities or relationships were introduced. The history stays useful after the athlete leaves an organization. No mature third-party workflow was duplicated and no generalized media-management scope was introduced.
