# Locker news accuracy — October 16, 2026

## Objective

Remove default article titles and links and discover actual football coverage using the player's name, colleges and team history. The user explicitly requested this bounded Locker improvement. Product authority: `docs/product/BLTZ_PRODUCT_DOCTRINE.md`, Locker/discovery/history recovery sections; existing Phase 1 Locker scope in `docs/BLTZ_BUILD_ORDER.md`.

## Root cause and scope

Public `LockerView` always selected four hard-coded headlines and publisher homepages instead of its `articles` data. Preview news already used Tavily, but searched only the first college/team and accepted saved college evidence without requiring sport context. Generic profile pages could pass URL classification.

Included: existing public and preview Locker news, contextual queries, publisher metadata matching, cached public discovery, current saved-result filtering and regression tests. Excluded: generalized crawling, article-body retention, media downloads, new databases, rights/financial schemas, bulk preview backfills and deployment.

## Behavior and files changed

- `lib/enrichment/news.ts`: quote the full player name; alternate saved college and team searches, normalize NFL codes, deduplicate school aliases, cap at eight queries, run at most three searches concurrently, distribute the twelve metadata-fetch slots across queries and prior URLs. Require full-name/explicit-name-alias, saved affiliation and football evidence in publisher metadata. NFL nicknames support historical city changes without requiring current team membership. Search snippets are never identity evidence.
- `lib/enrichment/news-classification.ts`: exclude publisher roots/indexes, player profiles, notable-alumni directories and known On3 profile URLs, in addition to existing statistics/social/encyclopedia exclusions.
- `lib/player/school-identity.ts`: recognize the existing saved `Cal Berkeley` label as Cal; preserve campus-specific matching protections.
- `lib/player/news.ts` (new): reuse the sanctioned search and safe metadata adapters behind an hourly Next data cache keyed by canonical player ID and public identity context. Bound discovery to 45 seconds and expose only article results/status. No preview data or privileged client enters this cache.
- `app/player/[slug]/page.tsx`: first authorize/load a visible public player through the existing Supabase client. Supply public school/team history, including saved season-stat teams, to server discovery. Pass its promise to the existing Locker so the rest of the page can render immediately.
- `app/player/[slug]/LockerView.tsx`: remove all four sample headlines, descriptions and destinations. Render actual metadata or loading/empty/unavailable text. Article buttons select the actual publisher story. Consume the server promise without remounting the Locker or resetting the current tab. Keep existing preview card dimensions and responsive presentation.
- `lib/preview-lockers/enrichment.ts`: keep saved school names separate from expanded matching aliases. Recheck previously saved news against current name, affiliation, sport and URL gates without running search on a preview read. Existing revision/identity persistence, admission budget and audit flow remain in place.
- `lib/search/errors.ts`: explain missing name/affiliation context in the existing admin diagnostics.
- Tests: new `tests/player/news-discovery.test.ts`, `news-cache.test.ts`, `news-page.test.tsx`, `news-renderer.test.tsx`; updated `tests/preview-lockers/enrichment.test.ts`, `enrichment-persistence.test.ts`, `tavily-workflow.test.ts`.
- This completion report. Pre-existing unrelated working-tree changes were preserved.

## Routes, data and permissions

Existing `/player/[slug]`, `/preview-lockers/[slug]` and preview save/refresh behavior change; no route is added. The existing admin `POST /api/preview-lockers/[id]/news` remains the explicit saved-preview refresh control.

Database changes: none. Migrations: none. Generated database types: unchanged. Environment variables: reuse server-only `TAVILY_API_KEY`; no new variable or secret change. Public discovery uses only the identity of a visible canonical player; missing/invisible players never trigger search. Public visitors cannot submit arbitrary search terms or inspect private preview articles. Preview refresh still requires server-side admin authorization, same-origin validation, saved identity/revision checks and existing quotas. No RLS or membership permission changes.

## Validation and manual verification

- `npm run lint`: passed with 289 existing warnings, zero errors. Targeted ESLint also passed.
- `npx tsc --noEmit`: passed. Production builds also ran TypeScript validation successfully.
- `npm run build`: passed; existing global CSS warnings for `@custom-variant` and `@theme` remain.
- Full suite, `npm test -- --maxWorkers=4`: 205 files passed, two skipped, one failed; 1,811 tests passed, 24 skipped, one failed. The unrelated `tests/analytics/contracts.test.ts` literal-event inventory includes private-preview events but expects only public-event contracts. `stats_view` is already present in the HEAD Locker source. No analytics events were changed by this work.
- Final broader player/source-policy/enrichment run: 26 files and 246 tests passed, including the Cal Berkeley regression and tab-preserving promise resolution.
- Tests use a workspace-local `TEMP`/`TMP` directory under ignored `output/` to avoid Windows sandbox temp-file rename failures. No test-runner configuration changed.
- Real Tavily plus safe publisher-metadata verification: 23 candidates produced four actual Antoine Cason stories from Tucson.com, ESPN, Arizona Sports and NBC Sports. Namesake/profile exclusions applied; some publishers could not provide metadata, so the run truthfully reports partial availability. Public evidence is in ignored `output/news-verification/antoine-cason.json`; the temporary live-test harness was removed.
- Built app browser verification: `/player/chidi-ahanotu` rendered while discovery was pending. Selecting MEDIA showed the loading state, then the provider/metadata-unavailable state while keeping MEDIA selected. This check exposed the saved `Cal Berkeley` alias gap, addressed above. After rebuilding with that alias and a fresh cache version, the real public Locker displayed the honest zero-match state with no sample headlines or destinations. The 643px-wide browser screenshot is in ignored `output/news-verification/locker-news-empty.png`. The tab remained selected; current metadata was insufficient to accept an article for this identity.
- Automated coverage verifies invisible-player rejection before search, anonymous/non-admin/cross-origin refresh denial, actual article rendering on both Locker surfaces, empty/loading/error states, duplicate handling, wrong-sport/same-name rejection, later-team candidate coverage, prior result revalidation, failure persistence and tab preservation.

Manual release checks: with a configured server key, open a visible Locker and its MEDIA tab, confirm real stories and exact destinations, and repeat on a narrow viewport. For an existing saved preview, save accurate colleges/teams, then use Refresh News as an admin and review accepted/rejected diagnostics. A hosted release and signed-in admin refresh were not performed by this code task.

## Product-direction completion check

Strengthens Athlete Career Graph accuracy by connecting news references to a canonical player using persistent college/team history. Historical coverage remains useful after an athlete leaves an organization. No Moment or Value Graph relationships, rights ownership or payment entitlement are inferred. Reuses Tavily and existing metadata/source-policy adapters; no mature publishing, DAM or media-orchestration workflow was duplicated. No generalized media-management scope drift.

## Known limitations and deferred work

Publisher metadata may be missing, blocked, paywalled or ambiguous. Deterministic matching is conservative, not a guarantee that two football players with identical names and affiliations can always be separated. A player without a saved college/team is not searched by name alone. Eight query and twelve metadata-fetch limits bound cost and latency; unusually long careers may need an admin to prioritize saved affiliations. Public results/status refresh hourly and depend on configured provider access. Saved previews use the existing admin refresh workflow; no bulk backfill was run. Full device/accessibility-matrix QA and hosted deployment remain release work. The unrelated analytics-contract failure remains deferred.
