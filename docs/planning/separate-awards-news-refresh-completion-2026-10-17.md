# Separate Awards and News refresh controls

## Objective and scope

Keep award enrichment inside Career → Awards and news refresh beside saved news articles in Media. The existing News articles disclosure already contains its own refresh and reload controls. Reuse those controls and the existing saved review queue, rather than adding another news control.

Product reference: BLTZ Product Doctrine, persistent athlete history and Locker enrichment. Scope excludes scraper search/ranking changes, merchandise changes, new graph schemas, public publication and rights verification. Acceptance: awards refresh never discovers news; news refresh never maps awards; both preserve the other content and retain Admin/revision protections.

## Summary / files changed

- `app/admin/preview-lockers/EnrichmentPanel.tsx`: Awards-only labels, report and refresh action.
- `app/admin/preview-lockers/PreviewLockerForm.tsx`: owns award refresh state and uses the existing shared pending guard, saved revision and unsaved-edit guard. Existing Media news refresh continues to load the saved queue after searching.
- `app/admin/preview-lockers/[id]/edit/page.tsx`: passes the initial report and source revision into the form.
- `app/api/preview-lockers/[id]/awards/route.ts`: authenticated, same-origin, revision-checked award-only action.
- `app/api/preview-lockers/[id]/news/route.ts`: explicitly runs news-only enrichment.
- `lib/preview-lockers/enrichment.ts`: explicit enrichment scopes and separately persisted award attempt diagnostics within the existing JSON report. Null award/article RPC inputs preserve the other content. Existing automatic create/save callers retain their behavior.
- `tests/preview-lockers/enrichment-api.test.ts`, `enrichment-persistence.test.ts`, `separate-refresh-form.test.tsx`: authorization, scope isolation, saved diagnostics, UI placement, overlapping operations, failure retention and unsaved-edit guards.

## Routes changed

Existing UI `/admin/preview-lockers/[id]/edit`; existing POST `/api/preview-lockers/[id]/news` now searches news only; new POST `/api/preview-lockers/[id]/awards` maps saved awards only. No public route changes.

## Database changes / migrations / environment variables

No schema changes, migrations, new environment variables or generated database type changes. Existing `save_preview_enrichment` already accepts null stage inputs and preserves the review queue. Award diagnostics use the existing JSON report column. No direct production SQL is required.

## Permissions

Existing server-side `previewAdmin()` checks authentication and internal Admin access. The new awards route uses the existing request-body origin validation, strict revision-only input, persisted preview lookup and revision conflict checks. Existing database authorization, queue merge/deduplication, audit behavior and publication permissions are unchanged.

## Tests run

- Full Vitest: 194 files passed, 2 skipped; 1,594 tests passed, 24 skipped (`output/separate-refresh-tests.log`).
- Final focused tests after the additional null-diagnostics regression: 3 files, 34 tests passed (`output/separate-refresh-focused-tests.log`).
- TypeScript noEmit/noincremental passed (`output/separate-refresh-types.log`).
- Lint passed: zero errors, 290 existing warnings (`output/separate-refresh-lint.log`).
- Production webpack build passed (`output/separate-refresh-build.log`).
- Git whitespace check with CR-at-EOL support passed.

The initial focused run could not start because of the Windows sandbox temporary-file rename restriction; the authorized external run succeeded after correcting one test mock. The full suite emits an existing disabled YouTube iframe diagnostic while passing.

Read the installed Next.js component composition and route handler guides. Reviewed React changes for shared pending state, event-based requests, no new effects, stable component identity and accessible labels/statuses. No new Supabase clients or dependencies were introduced.

## Manual verification / release

Commit `ba5699ec78c3c0f311b393dada16cadc36b666a1` was committed in the isolated release checkout on `codex/separate-awards-news-refresh-2026-10-17`, then fast-forwarded to production main. The checkout is clean and unrelated root-checkout work was preserved. Vercel deployment `dpl_ATXFM9ervLRr6cLYV6YKogsnUYQY` is READY and assigned to `bltz.me`, `www.bltz.me` and `bltz.vercel.app`.

Verified in a dedicated authenticated production browser tab using Antoine Cason:

- No combined Awards & news enrichment heading remains, and no award panel appears in Info or Media.
- Refresh awards is inside Career → Awards; Refresh scraped news is inside Media → News articles beside Reload saved articles and the saved review queue.
- Ran one awards-only refresh successfully: 2 of 5 mapped, last attempt `2026-10-17T18:55:16.748Z`. Its report persisted after reloading the page.
- Reloaded saved news after the award refresh: the full two-item pending review queue and last-search timestamp were identical before and after. Five Locker articles remained present. No news search, draft save, dismissal or publication was performed.
- Mobile 390 × 844: both panels fit without horizontal document overflow (client width and scroll width both 390); Awards toggles with Enter. Reset the viewport afterward.
- Browser warning/error logs were empty. The new production awards endpoint returned HTTP 401 with `unauthorized` to an anonymous request, before enrichment.

Evidence: `output/separate-refresh-deployment.json`, `output/separate-refresh-anonymous-proof.json`, `output/separate-refresh-ui-proof.json`, `output/separate-refresh-awards-desktop.png`, `output/separate-refresh-media-desktop.png`, and corresponding `*-mobile.png` screenshots. Vercel CLI emitted an npm update-check warning while deployment inspection succeeded.

## Known limitations / deferred work

Awards enrichment maps saved award evidence to the existing catalog and does not discover new awards on the web. Award and news refresh both require saving editor changes first. Existing lint warnings and skipped tests remain. The news-only search path was verified with mocked integration tests; no paid production news search was needed. No required work remains and no additional feature work is deferred.

## Product direction

Strengthens existing athlete → achievements and athlete → coverage workflows by giving each its own review context. No Moment or Value Graph changes. Persistent history remains useful after an athlete leaves an organization. No third-party workflow was unnecessarily duplicated and no generalized media-management scope was added.
