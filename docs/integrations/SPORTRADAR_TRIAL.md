# Sportradar trial integration — September 10, 2026

## Status

Implemented and **NFL live acceptance passed in staging on September 10, 2026 (September 11 UTC)**. NCAA live acceptance is blocked by provider access; Vercel Preview secret setup is blocked by missing CLI authentication. Production database and environment variables remain unchanged.

Blocking configuration:

- The local key is populated and successfully authenticated two NFL profile requests (initial fetch and explicit refresh).
- Updated staging credentials work with TLS verification. The existing Preview Locker prerequisite and both integration migrations were applied, with migration history recorded, only to staging `yevihzsgqagvuulymqum`.
- The NCAA profile request returned **403**. Enable NCAA Football v7 trial access for the key, or supply a separate NCAA key privately if the provider requires one. No retry was issued for the denied request.
- Vercel CLI's saved auth file is empty. Vercel Preview secrets have not been configured; sign in with `npx vercel login` to unblock this. Production remains subject to explicit approval.
- Database types were regenerated using the Supabase CLI from the actual staging public schema. The larger generated diff includes preexisting staging tables missing from the old generated file, not new feature schemas.

Live usage at this checkpoint: **3 non-cache requests: 2 successful NFL, 1 denied NCAA. One athlete imported.** Cached reads and Locker views do not increase these counts.

## Live validation results

- Cameron Jordan: canonical BLTZ ID `03570d21-b56b-43ec-aa85-f95883c65b6b`; provider ID `543e5e1e-50e5-482d-a6ad-498d7fab497e`. Candidate ID came from the nflverse 2025 roster's explicit GSIS/Sportradar mapping; actual provider name, birth date (1989-07-10), college (California) and position (DE) were checked before approval.
- Staging initially had no players. Copied only this athlete's public identity fields from the existing BLTZ record, retaining its canonical ID, without authentication identity or private fields.
- Preview ID `b9545514-4cd2-4ea6-a5d2-47d4466bc2ba`; slug `cameron-jordan-sportradar-trial`.
- Raw and normalized 2023 regular-season values match: sacks **2**, solo tackles **20**, combined tackles **43**.
- **32 season/phase rows** stored. Repeated imports, then a reviewed refresh and repeated import, preserved the same row count and one mapping. Audit entries recorded the test approvals. The controlled operator script called the same server ingestion/import service used by the admin panel; these script approvals have no authenticated user ID. Browser-admin approval was unit-tested, not exercised through a signed-in browser session.
- Browser verified imported NFL stats in the Preview Locker Career tab. Public Player Locker responds successfully with stored data. Mobile inspection confirmed horizontal scrolling stays inside the stats tables, without page overflow.
- Cached profile fetch used no provider call. Reopening Preview and Player Lockers left the request count unchanged.
- Anonymous reads of all three private tables and calls to the import RPC were denied against live staging. Anonymous HTTP requests to the admin API return 401. Neither public response HTML nor built browser assets contain the key or raw-profile data.
- Browser testing exposed the existing preview schema's default empty school object causing a renderer crash. A narrow mapper guard now treats it as missing school data, with a regression test.
- NCAA candidate: staging-only Patrick Mahomes / Texas Tech identity, using NCAA ID `531fa6d3-9c8e-437b-8eca-8ca79bf12cc0` from [Sportradar's explicit cross-league reference](https://developer.sportradar.com/sportradar-updates/changelog/football-apis-player-id-linking). Neither a production identity nor a verified mapping was created. The 403 was logged, no NCAA stats were imported, and its preview still responds successfully. Cameron Jordan's college career predates [documented NCAA coverage from 2013](https://developer.sportradar.com/football/docs/ncaafb-ig-historical-data).

## Audit and scope

Next.js 16.3.1 App Router, React 19, TypeScript, npm, Supabase SSR/session client and existing `server-only` service client. Authorization uses `is_internal_admin`, backed by platform assignments, not `profiles.role`. Reuse `isInternalAdmin` in the new route.

`players.id` remains the Athlete Career ID. Existing `players.gsis_id` connects the NFL directory; the directory has ESPN/PFR identifiers. No equivalent generic external-ID table was found in the repository schema. Runtime schema inventory was limited by management/database credentials.

`player_season_stats` already stores source, level, season, season type, team, JSONB statistics, last sync, and a unique `(player_id, source, season, season_type)` key. Live source samples include `nflverse` and `sports-reference`. Reuse it with `sportradar_nfl` / `sportradar_ncaafb` source values. These names preserve league separation even when years overlap. Group multiple team stints inside a single season/phase JSONB envelope, preserving the existing uniqueness constraint.

`athlete_season_stats` requires organization and roster-stint relationships. Do not force the trial through roster creation or add a duplicate stats table. There are no changes to that table.

Preview Lockers are standalone scraper-backed records, rendered through `toLockerData` and the same `LockerView` as public players. The additive, nullable `preview_lockers.player_id` is approved during import. Unlinked previews remain unchanged. The canonical association does not enable athlete actions on a preview (`athleteId` remains null).

The shared Career tab had empty structured stats on public pages. Both page loaders now use a database-only reader; provider data is preferred when present, and the existing view is preserved otherwise. The shared table separates NFL/NCAA and REG/PST/PRE, includes team stints, provenance and dates, and labels totals as available-season totals. Missing fields are not zero. Nonadditive ratings are never summed or averaged. Incomplete metrics have no total. This does not establish verified team/season graph relationships or overwrite athlete identity fields.

The Product Doctrine file referenced in AGENTS.md was missing. The supplied doctrine was followed: persistent identity enrichment, no media-management expansion, no Moment/Value schemas. Scraper, GTM, onboarding, claims, and media workflows are unchanged.

## Data flow

Admin selects existing BLTZ player → enters Sportradar profile GUID → server reserves/logs request → provider profile → validated normalization → immutable private review → admin approves identity and publication → atomic mapping / legacy season storage / preview link / audit → database-only Locker rendering.

No page view or search calls Sportradar. All name matches require explicit manual review; multiple BLTZ search results show canonical IDs. Provider profile identity is displayed for comparison. No automatic fuzzy matching or mapping reassignment is implemented. Approved mappings are reused; conflicting mappings return an error. Immutable review IDs bind approval to the exact server-stored result shown, rather than accepting normalized JSON from the browser.

## Files and routes

Added:

- `lib/sportradar/{client,errors,normalize,service,types}.ts`
- `lib/player/structured-stats.ts`, `lib/player/structured-stats-types.ts`
- `components/player/StructuredStats.tsx`
- `app/api/admin/sportradar/route.ts`
- `app/admin/preview-lockers/[id]/edit/SportradarPanel.tsx`
- `tests/sportradar/{client,normalize,route,service}.test.ts`, `tests/sportradar/render.test.tsx`
- `scripts/verify-sportradar-migration.mjs`
- `supabase/migrations/20260910224813_sportradar_player_stats.sql`
- `supabase/migrations/20260911011617_sportradar_preview_service_insert.sql`
- This runbook.

Changed narrowly within an already-dirty working tree:

- `app/admin/preview-lockers/[id]/edit/page.tsx`: add panel.
- `app/preview-lockers/[slug]/page.tsx`, `app/player/[slug]/page.tsx`: database-only stat loading.
- `app/player/[slug]/LockerView.tsx`: optional stored stats and shared Career display.
- `lib/preview-lockers/types.ts`: optional player link.
- `lib/preview-lockers/mapper.ts`: guard the existing empty school-object default.
- `types/database.generated.ts`: regenerated from staging after migrations.
- `tests/database/generated-types-contract.test.ts`: validate generated PostgREST version metadata without hardcoding the production server's version; staging currently reports 14.5.
- `.gitignore`: exclude `.env*` except a potential secret-free `.env.example`.
- Ignored `.env.local`: add missing configuration entries without replacing existing entries.

Routes: new admin API `/api/admin/sportradar`; existing preview edit `/admin/preview-lockers/[id]/edit`, preview `/preview-lockers/[slug]`, and public `/player/[slug]` extended. No new dashboard.

## Migration and permissions

The main additive migration creates:

- `player_external_ids`: provider-neutral verified identity links; provider IDs are text, not BLTZ primary keys.
- `player_stat_ingestions`: private immutable fetched profile/review snapshots and import metadata.
- `provider_request_logs`: durable request reservations, responses, cache hits, timing, safe error codes.
- `reserve_sportradar_request`: advisory-lock quota reservation, throttle, in-flight deduplication, 429 cooldown.
- `import_sportradar_stats`: atomic reviewed mapping, provider-only season replacement, preview association, audit.

New tables have RLS enabled and no `anon`/`authenticated` grants. RPCs are SECURITY INVOKER and callable only by the existing service role. Application handlers authenticate and authorize before privileged operations. Public season rows contain normalized sporting data only; private raw data, matching metadata and usage logs are not copied into them. Public season access uses the existing table's policy. Existing audit infrastructure is reused. Old provider snapshots remain available for review; import never deletes scraper rows.

The follow-up migration grants service-role INSERT on `preview_lockers`, required by its existing server creation endpoint. The prior prerequisite omitted that grant. It does not change ordinary-user access. This prerequisite and both integration migrations are recorded in staging migration history; none was applied to production.

## Configuration and quota

Set privately in local `.env.local` and Vercel **Preview**:

```dotenv
SPORTRADAR_API_KEY=
SPORTRADAR_ACCESS_LEVEL=trial
SPORTRADAR_REQUEST_BUDGET=20
```

The budget defaults to 20, may be increased deliberately up to 1,000, and counts all reserved non-cache requests in this BLTZ database, including incomplete reservations. It does not know about calls made in the Sportradar dashboard or other applications. Account-wide calls outside BLTZ must be accounted for when choosing the budget. Counts do not reset automatically.

Server-only header authentication, fixed host/path, no query-string credential, redirects blocked, 12-second timeout, safe errors and credential-echo redaction. `.env.local`, `.env.staging.local` and `.env.production` are confirmed ignored; no env files are tracked. Never paste the key into chat or source control.

Cached profiles remain available indefinitely until explicit refresh, appropriate for this manual historical-data trial. Refresh has a 60-second minimum interval. A transient 5xx permits one retry after two seconds with its own reservation/log. No automatic retries for 401/403/404/429, malformed data, or storage/logging failures. A 429 blocks new calls for an hour. An unfinished request blocks the same provider ID for 60 seconds and continues to count against quota. Locker views never refresh data. All existing published stats survive failed refreshes.

## First live test procedure

Initial proposal Josh Allen was rejected because he was absent from queried BLTZ records. Two Dante Hughes records were found, so neither was silently selected.

**Selected candidate:** Cameron Jordan, BLTZ `03570d21-b56b-43ec-aa85-f95883c65b6b`, `/player/cameron-jordan`. Existing NFL season rows and identity were confirmed read-only in the current BLTZ database and the single public identity was copied to staging. The NFL procedure below has passed; retain it for future cohort validation. Do not import the database roster.

1. Supply the local key and correct the staging DB password privately. Confirm Vercel Preview points to the intended staging database; configure the key there only.
2. Apply existing Preview Locker prerequisite migration if absent, then this migration to staging using repository migration history. Do not push unrelated pending migrations. Regenerate `types/database.generated.ts` from that database.
3. Enter Cameron Jordan's reviewed NFL provider GUID `543e5e1e-50e5-482d-a6ad-498d7fab497e` in the existing preview edit stats panel.
4. Fetch once. Compare provider name, position, college/team and birth date with BLTZ. Check three seasonal values, preferably sacks (including halves), solo tackles and combined tackles, directly against the displayed raw response. The fixture IDs in tests are synthetic test inputs and must not be used as Cameron Jordan's mapping.
5. Approve mapping and import. Check the mapping, `sportradar_nfl` rows, preview player link and audit event in Supabase.
6. Reopen the preview and public Career tabs; verify provider/last-sync labels and season values. Reopen again: request count must not increase.
7. Fetch again without refresh: cache hit, unchanged API-call count. Import the same review again: no duplicate season rows or mapping. Audit records may record repeated approvals.
8. After the minimum interval, deliberately refresh once; verify a new immutable review, then import it. Prior data remains visible until approval.
9. Exercise missing ID, invalid profile and provider failure with fixtures (already covered locally), avoiding quota-wasting live negative requests.
10. **Only after NFL passes**, select one NCAA Football athlete. Prefer an explicit NFL profile `references` NCAA ID when available, otherwise a reviewed NCAA roster. Repeat the same workflow. Do not infer cross-league identity solely from names.

## Validation evidence

- TypeScript: `tsc --noEmit` passed.
- New-code ESLint: passed without warnings/errors.
- Repository lint: passed, 208 existing warnings, zero errors.
- Integration tests: 29 passed across five files, including the empty-school-object regression.
- Latest full-suite run: 344 passed, 24 skipped, two failures. One was a hardcoded generated PostgREST version (14.15 versus staging's actual 14.5); corrected that contract and reran all 16 schema-contract tests plus 29 integration tests: all 45 passed. The remaining failure is the preexisting Film Room mock (`tests/player/public-video.test.ts`, expected HS/off-field categories).
- Production build: passed, 86 static pages; existing CSS parse warnings remain.
- Isolated PostgreSQL/PGlite: migration execution; repeat import; scraper preservation; conflicting preview rollback; audit; quota limit; deduplication; 429 cooldown; denied ordinary-user access all passed.
- Browser: staging production build served locally; Cameron Jordan Preview Locker Career tab shows imported NFL stats and mobile table scrolling works. Live Player Locker and failed-NCAA preview return 200.
- HTTP: unauthenticated new API returns `401` with no provider access.

For isolated SQL validation, install `@electric-sql/pglite` into `output/sportradar-validation` without changing app dependencies, then run `node scripts/verify-sportradar-migration.mjs`. Validation-only packages and logs are in that output directory; they are not application dependencies.

## Remaining acceptance and next step

Not yet complete: Vercel Preview secret setup and a successful NCAA retrieval/import/render test. The NCAA request was attempted once and denied by the provider. A signed-in browser run through the admin panel remains a useful final operator check; its authorization, request validation, and service path have automated coverage. NFL authentication, provider-ID verification, retrieval/import, staging migrations/RLS, generated types, imported Preview rendering/mobile behavior, cache behavior, refresh, and duplicate imports have passed.

Deferred: roster discovery UI, automatic matching, bulk ingestion, scheduled refresh, production activation. Manual ID entry meets the bounded trial interface; no roster endpoint or unrelated feed is called.

Product outcome: provider identities and season-stat history attach to persistent canonical athlete identity and a reviewed preview association. Useful after organizational departure. No Moment or Value Graph relationships introduced; no mature media workflow duplicated; no generalized media-management drift.

References: [NFL Player Profile](https://developer.sportradar.com/football/reference/nfl-player-profile), [NCAA Football Player Profile](https://developer.sportradar.com/football/reference/ncaafb-player-profile), [Sportradar season statistics](https://developer.sportradar.com/football/docs/nfl-ig-seasonal-stats), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Cohort scope update
The cohort is NFL-only. NCAA profile requests are rejected by the ingestion service before storage/quota reservation and by the provider client before network access. The admin NCAA option is disabled. Do not run NCAA live tests or retry its subscription error. NCAA normalization and stored-data rendering remain available for future explicitly authorized work.

