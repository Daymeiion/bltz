# Preview Media and news production release

## Scope and source

User authorization covers applying the migration and deploying news scraper accuracy, the Preview Locker Media tab and the existing statistics improvements. Product authority: `docs/product/BLTZ_PRODUCT_DOCTRINE.md`; this remains bounded Locker enrichment under `docs/BLTZ_BUILD_ORDER.md`.

Release source is the isolated checkout `output/preview-media-news-release`, branch `codex/preview-media-news-release-2026-10-17`, commit `884754b8c4ef63e786e7de5a3d80066b0698258c`. A guarded normal fast-forward published it to GitHub main from `8ab8e07ca29485056d20a6e4b0f2aa7d11e346f3`. The dirty root workspace and unrelated photo-room, outreach and presentation changes were preserved. Do not deploy the root checkout wholesale: its older stats files predate the released career-summary implementation.

The release preserves the existing college/team discovery improvements, expanded NFL CSV metrics, grouped compact statistics columns, explicit source-reported career totals, unknown season cells, provenance, split-team safeguards, access windows and private-media signing. Those stats changes already existed on production/main and were deliberately retained without overlaying stale root files.

## Files and routes

The source commit contains 54 reviewed files. The exact list is available with `git show --name-only 884754b` and in local `output/media-news-final-paths.json`.

- Builder: `ArticlesSection.tsx`, `MerchandiseSection.tsx`, `EnrichmentPanel.tsx`, `PreviewLockerForm.tsx`, and the saved-preview edit page.
- Discovery and persistence: `lib/enrichment/*`, `lib/search/{errors,tavily}.ts`, `lib/player/news.ts`, `lib/preview-lockers/{enrichment,media,mapper,server,validation,types,school-branding}.ts`, and `lib/player/school-identity.ts`.
- Rendering: public Locker page/view, private preview page and shared `EditorialCard.tsx`.
- Schema/types: new Media migration; two already-applied enrichment migrations reconciled into main's source history; scoped preview/enrichment types.
- Validation: media/enrichment PostgreSQL scripts; discovery/cache/rendering/form/API/identity regression tests; design reference and implementation reports.

Existing routes extended: `/admin/preview-lockers/new`, `/admin/preview-lockers/[id]/edit`, `/preview-lockers/[slug]`, `/player/[slug]`, POST `/api/preview-lockers`, PATCH `/api/preview-lockers/[id]`. Admin-only GET/POST `/api/preview-lockers/[id]/news` manages persisted article sources and refresh.

## Database and migration

Applied only `supabase/migrations/20261017010958_preview_media_curation.sql` to BLTZ main Production, project `drxtzxnwdtgxwueiqygf`. Normalized migration SHA-256: `41629f4938e5a7e76a81a6d02122925e4deab0812340263f9d72c1972cd82589`.

Adds bounded, validated JSONB `preview_lockers.article_edits` and `merchandise`, both NOT NULL with `[]` defaults. Extends the existing atomic enrollment RPC and retry comparison; extends existing audit snapshots to retain editorial before/after values. No future Media Graph, rights engine, inventory, checkout or financial schema.

The guarded transaction checked migration history, exact prior RPC/audit definitions, existing-record hashes, grants, policies and trigger definitions. Migration history increased from 82 to 83. All six preview rows retained their previous fields exactly (hash `f9ca81a6c1d1679a5e321f3ba70d0944`). Independent hosted postflight confirmed both columns/defaults/nullability, RLS enabled, anonymous read denied and editorial audit capture. Existing policies and trigger definitions were unchanged. The initial wrapper had a dollar-quote collision and failed before commit; the corrected wrapper passed all guards.

Supabase CLI could not reach production over its current IPv6 transport. The authenticated dashboard applied the reviewed migration packet and history entry atomically; no broad db push, migration repair or unrelated pending migration was applied. Scoped types were regenerated from real isolated PostgreSQL and compared with the hosted column definitions. Full hosted type generation remains unavailable through this CLI connection.

## Environment and permissions

No environment-variable changes. Production already has `TAVILY_API_KEY`; it remains server-only. No credentials, environment files, local evidence or dependency/build artifacts were committed. No role or RLS-policy change. Existing Admin authorization, assigned-viewer access, access-window admission, revision guards, audit creation and private/no-store API responses remain in force. New authenticated column grants operate under those existing boundaries.

Search uses quoted full name plus each saved college/team affiliation and football context. Publisher metadata must corroborate name, football and a known affiliation. Search snippets do not establish identity. Failed refreshes preserve the prior set; current reads filter old namesakes. Publisher homepage/profile defaults and sample merchandise are removed. Manual article edits/hides and product references survive search refreshes.

## Validation

- Final full isolated-release suite: **1,492 passed, 24 skipped; zero failures**, 184 passed/two skipped files.
- Focused news/Media suite: 122 passed.
- TypeScript: passed; final production build also passed type checking.
- Lint: zero errors, 289 existing warnings.
- Local production build: passed using the existing webpack build path; 98 static pages generated.
- Real isolated PostgreSQL: defaults on legacy rows, persistence, Admin writes, assigned read-only access, anonymous/unassigned denial, revision conflicts, bounded inputs, audit snapshots and atomic enrollment/retry passed.
- Existing CSV/parser/Cason/career-summary and access-window regression suites are included in the full passing run.
- Source whitespace check passed after removing an extra trailing blank line.

The initial Windows sandbox run failed temp-file renames; subsequent runs used a workspace-local TEMP directory. Full workers and network-dependent font builds ran with required filesystem/network access. The test environment emits an existing disabled-iframe diagnostic; it does not fail tests. The first combined run exposed a missing school-directory location projection; the existing location/matching fix was incorporated and the final complete suite/build rerun successfully.

## Deployment and manual verification

Vercel team/project: `daymeiions-projects/bltz`, `prj_4XjBiHku6plWves1zXdbT8bXj3y6`. Git-triggered production deployment: `dpl_9N56YHENdh4CQUtG5by42tL7CPnD`, `https://bltz-cwnf217mb-daymeiions-projects.vercel.app`. Final state **Ready / Production**, exact source commit `884754b8c4ef63e786e7de5a3d80066b0698258c`, build duration approximately 143 seconds. `bltz.me` and `bltz.vercel.app` independently resolve to this deployment; `www.bltz.me` is also assigned.

- Live home: HTTP 200. Anonymous Admin builder: 307 to Admin sign-in. Anonymous news-management API: 401 with private/no-store headers.
- Authenticated builder: Media replaces Social in the folder navigation; News articles, Merchandise and existing Social controls are present. Original user editor tabs were left untouched; verification used a separate tab.
- A real Admin news refresh for Antoine Cason persisted **five** matching articles. Sources include the Baltimore Ravens, Arizona Sports, NBC Sports, University of Arizona Athletics and Arizona Daily Star. The original Ravens destination is `https://www.baltimoreravens.com/news/ravens-sign-cornerback-antoine-cason-14536546`; edit/hide actions were visible. The five articles remained after a fresh reload and rendered in the actual private Locker Articles section. No fabricated sample article titles or publisher-homepage fallback appeared.
- Merchandise entry exposes trading-card, jersey, apparel, memorabilia and other categories plus title, seller URL, image, retailer, price label and visibility. An unsaved blank test product was removed. The actual Locker Merchandise section showed `No merchandise added yet.` without sample products. Manual product persistence/rendering/hide behavior is covered by the passing database and mounted-form/renderer tests; no test seller product was published to an athlete.
- Live NFL importer reviewed Antoine's original CSV: eight season/team rows, seven seasons, reported career summary included, ten skipped columns/summary rows. PFR career shows GP 110, GS 60, INT 16, return yards 362, PD 63, tackles 381 and AV 30. Separate Season sum leaves PD and tackle totals unknown because BAL season cells are absent. The review checkbox remained unchecked and the import was not added/saved.
- Desktop width: document and viewport 1,859px. Actual mobile viewport: document and viewport both 390px; the 769px stats table scrolled inside a 212px region. Media controls also stayed within 390px. The browser viewport override was reset afterward.
- After discarding unsaved verification input, the saved builder was reloaded and left open on Media with five saved articles and no test products. No athlete draft/CSV, enrollment/completion status, viewer assignment or share-link setting was changed.
- Independent hosted SQL confirmed five accepted articles, one new `preview.enrichment` audit for the live refresh, and unchanged empty manual article/merchandise settings. Receipt: `output/media-news-release-proof/news-audit.txt`.
- Two bounded production error-log checks, including one after live tests, returned no error entries. This describes available logs during verification, not future monitoring coverage.

Evidence: `output/media-news-release-proof/` contains migration, desktop/mobile Media and stats screenshots and an independent hosted postflight receipt. Build/test/lint/deployment/alias/error receipts are in `output/media-news-*`. This completion report is retained locally rather than triggering another documentation-only production build.

## Limitations and deferred work

Merchandise is manually curated; prices are display labels. Automated product discovery, checkout, inventory and canonical public-player product management remain excluded. News coverage depends on provider/publisher availability and saved career context; ambiguous or unsupported results can be added only after Admin review. Statistics retain existing reviewed CSV/source coverage; no automated PFR scraping or fabricated missing values was introduced. The existing Sportradar subscription is expired, as disclosed in the deployed Stats section; automated provider pulls still require a working subscription, while reviewed CSV imports remain usable. No athlete's saved draft or CSV was overwritten for a smoke test. Full authenticated live save/reload of a synthetic merchandise item was intentionally avoided; real isolated PostgreSQL and mounted-form tests cover that path.

## Product-direction check

Strengthens athlete → college/team context → external coverage, publisher attribution and durable curated product references. Existing athlete → season/team performance/source relationships remain intact. The feature remains useful after an athlete leaves an organization. No Moment, ownership, economic entitlement or Value Ledger relationship is inferred. Publishers and sellers keep their mature publishing/commerce workflows; no generalized media-management workflow was duplicated.
