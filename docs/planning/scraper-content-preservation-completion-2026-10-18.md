# Additive preview scraper and safe saves — October 18, 2026

## Objective / scope
Preserve existing private preview Locker data during scraper refreshes and subsequent saves. Add unique discoveries without replacing reviewed stats, videos, news edits, images, merchandise or other populated biography fields. Product reference: docs/product/BLTZ_PRODUCT_DOCTRINE.md. Existing manual edit/removal controls remain intentional edits. No public/canonical player ingestion changes or new graph schemas.

## Investigation / root cause
The main discovery handler already calls mergeSuggestions rather than replacing the draft, and populated NFL/college imports are retained by that handler. However, the PATCH route validated missing optional fields into defaults and wrote those defaults to the database; only dob/high_school were protected against omitted fields. An older or partial editor could consequently write empty stats/media arrays over saved data. A failing API regression reproduced this destructive omitted-field write. A second failing regression reproduced non-additive collection behavior and replacement of a saved placeholder team color during discovery.

Keith Rivers was inspected in a fresh production builder: one college import remains, zero NFL imports and zero manual career totals. The user confirmed NFL stats disappeared. The exact historical request that removed the NFL import has not been recovered, so the omitted-field failure is a confirmed overwrite vulnerability, not proof of the particular historical request. No production stats were fabricated or replaced during investigation.

## Files changed
- lib/preview-lockers/merge-suggestions.ts: append distinct items to populated collections; identify YouTube URL variants, normalized article URLs and marketplace product IDs; retain existing item order, IDs, uploads and visibility; reassign colliding generated IDs only on new items; keep existing statistics by key/category, and validate additions against collection bounds without evicting saved entries. Preserve saved team colors. Validate collections independently so incomplete unsaved identity fields do not prevent initial discovery.
- app/api/preview-lockers/[id]/route.ts: write only fields actually submitted; return the actual saved snapshot internally for enrichment and keep the existing small response projection, Admin checks, media checks and revision conflict protection.
- tests/preview-lockers/discovery-preservation.test.ts: preservation, duplicate variants, ID collisions, full collections, empty results and initially blank editors.
- tests/preview-lockers/form.test.tsx: populated NFL/college imports, uploaded headshot, replacement article/product images and a reviewed video survive two scraper runs, save, remount/reload and another save; a unique new video is appended once.
- tests/preview-lockers/api.test.ts: omitted fields never become database writes.

## Routes
Existing Admin preview builder, POST /api/preview-lockers/discovery client merge, and PATCH /api/preview-lockers/[id]. No routes added. Dedicated saved news and merchandise review queues retain their existing additive persistence and dismissal/restore workflow.

## Database / migrations
No schema changes or migrations. No manual production table edits. Saved data remains in existing columns; the PATCH SQL update now excludes omitted fields. Existing database audit triggers still record saves. Generated database types unchanged.

## Environment / permissions
No environment variables, dependencies or permission changes. Server-side Admin authorization, assigned-viewer rules, upload checks, source policy and revision compare-and-set remain intact. Unauthorized and stale revision tests run with the suite. Full saved rows remain server-side; the API response contains only id, slug, revision and existing completion indicators.

## Validation
Before fix: 2 regressions failed, 11 tests passed. Final full suite: 213 files / 1,721 tests passed; 2 files / 24 tests skipped. Final focused run: 46 tests passed, including the initially blank editor regression. Lint: zero errors, 297 existing warnings. TypeScript, final production build and diff whitespace checks passed. Existing nonfatal HappyDOM external iframe warning unchanged. Logs: output/scraper-preservation-before.log, scraper-preservation-tests.log, scraper-preservation-final-focused.log, scraper-preservation-lint.log, scraper-preservation-types.log and scraper-preservation-build.log.

## Manual verification / deployment
Fresh Keith Rivers production builder confirmed college import count 1 and NFL import count 0. Before screenshot: output/scraper-preservation-keith-before.png. Tested commit: 5858f034408207520a2faa71cc94103bd4ae6325 on codex/preserve-scraped-locker-content-2026-10-18. Isolated release worktree clean; unrelated primary-workspace edits excluded.

Automatic approval review initially required explicit production authorization. The user subsequently approved deploying commit 5858f03. The approved commit was pushed to main and Vercel deployment dpl_Dab8aEkPfRA4Q1NW3tSdQjtQy3dC reached READY, assigned to bltz.vercel.app, bltz.me and www.bltz.me. Deployment URL: https://bltz-rbsuiabhd-daymeiions-projects.vercel.app. Production error-level runtime logs returned zero entries after verification.

On the new production build, a fresh Keith Rivers scraper run completed successfully. Before/after DOM comparison covered 384 existing editor fields: no populated values were overwritten. Only blank birthdate and high-school fields filled (1986-05-05 and Lake Mary High School). Existing stats section content was unchanged, including the retained four-season college defense import. Six videos, two photos and two awards appended to the QA draft; existing news, merchandise, uploads, headshot and hero selections remained intact. The QA suggestions were then discarded using this agent-created editor's explicit reload action. A fresh saved-state comparison matched all 384 original fields and the original stats section exactly. No player draft was saved or NFL table fabricated during QA. NFL imports remain zero pending a verified original file.

Evidence: output/scraper-preservation-live-proof.json and output/scraper-preservation-production.png (successful scrape and retained college import). Original user editor tabs were not changed. Status: DONE — approved deployment and live preservation check complete; historical NFL import recovery remains a separate limitation.

## Known limitations / recovery
This prevents future overwrites; it cannot reconstruct an already missing NFL import without a verified original. Local Sports Reference exports have generic filenames and did not identify Keith in plain-text metadata, so no ambiguous export was restored. Existing imports of the same category always win during automatic discovery; replacing or deleting such tables remains an explicit operator action. At collection or metadata limits, new suggestions are skipped rather than evicting existing data. Scraped content still requires review.

## Deferred work
Restore Keith's already missing NFL table only from his verified original import. No unrelated CSV importer, provider subscription or media rights workflow changes included.

## Product direction
Strengthens persistence and accuracy of athlete-to-career-statistics and athlete-to-connected-media information exposed through the Locker. Useful after organizational changes and retirement. No new Career, Moment or Value Graph tables; no inferred attribution, rights or economic relationships. No mature third-party workflow duplicated and no expansion toward generalized media management. No Product Doctrine conflict.
