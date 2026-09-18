# Sportradar name lookup — September 18, 2026

## Summary and scope
Replace mandatory manual provider GUID entry with a name lookup over Sportradar NFL team and seasonal statistics feeds. The saved canonical athlete/Player Master supplies career team and last season, including retired players. Admins can adjust name, team and year, review multiple results and fetch the selected provider profile. The existing reviewed stats import remains the publication gate. A provider match never automatically becomes an approved identity mapping.

## Files and routes
- `app/admin/preview-lockers/[id]/edit/SportradarPanel.tsx`: name lookup, optional team/year controls, provider candidates, fetch-on-selection, manual GUID under Advanced, useful error messages.
- `app/api/admin/sportradar/route.ts`: authorized and validated search_provider action.
- `lib/sportradar/client.ts`: restricted team/season endpoint constructors and authenticated provider transport.
- `lib/sportradar/search.ts`: canonical context, historical defaults, name matching, bounded provider calls, sanitized four-hour cache and request accounting.
- `supabase/migrations/20260918200430_sportradar_name_lookup.sql`: cache and discovery reservations.
- `types/database.generated.ts`: scoped declarations regenerated from isolated PostgreSQL.
- `tests/sportradar/{search,client,route}.test.ts` and `tests/preview-lockers/form.test.tsx`: regressions.
- `scripts/verify-sportradar-name-lookup.mjs`: SQL isolation/quota proof and scoped type generation.
- This report.

Existing `/admin/preview-lockers/[id]/edit` and `/api/admin/sportradar` are extended. No new route or environment variable.

## Database, migration and permissions
New provider cache stores only team/player lookup fields, not complete seasonal statistics. RLS is enabled; anon and authenticated roles have no direct access. Service-role access stays server-only. Discovery requests use NULL provider_player_id until a player is identified. The existing quota RPC retains the common budget, throttle, cooldown and pending-reservation behavior; NULL-ID discovery is deduplicated by endpoint. Migration does not modify career or media schemas. Applied to explicit production project drxtzxnwdtgxwueiqygf with migration history tracking and previous-version preflight.

## Validation
Targeted importer/builder tests, TypeScript, scoped lint and production build checked. Isolated PostgreSQL tests pass for cache isolation, NULL provider reservations, endpoint deduplication, quota and cooldown preservation. Live lookup successfully found Keith Rivers from the saved BUF/2014 context with two logged successful provider responses; no GUID was supplied. Authenticated browser rollout verification recorded below.

A temporary live-test configuration initially merged all unit tests into a Node environment, causing DOM test failures; that validation configuration was corrected to run the single live integration test. This was not an application change or a valid full-suite regression result. The separate default full suite retains its own result.

## Manual flow and limitations
Open the saved preview, expand Pull Sportradar stats only, click Find player on Sportradar, select Review [matching athlete], inspect provider identity/statistics, and explicitly approve import if correct. Reload after import.

The NFL API does not expose a documented global name-search endpoint: lookup searches a team’s regular-season player feed. The saved career team/year removes manual inputs for linked Player Master athletes. Alternate teams, years or name spellings can be entered when there is no result. Players absent from that season’s statistics may require another season/team. NCAA remains disabled. Provider access, historical coverage and quota depend on the configured subscription. Profile review continues to show DOB/school when provided; seasonal search results do not invent those fields.

## Product direction
Strengthens canonical athlete -> provider identity -> persistent season-stat relationships, useful after an athlete leaves the team. Supports former-athlete recovery without rebuilding a sports-data provider. Moment/Value Graph unchanged; no DAM or media-management expansion. Full-league crawling, fuzzy automatic identity approval and NCAA lookup remain excluded.

Validation totals: 67 targeted tests passed; full default release suite: 730 passed, 24 skipped, and the same 9 failures across four pre-existing auth/public-video/media-stats suites. TypeScript, scoped ESLint, and whitespace checks passed. The production build passed before the final error-message-only change; Vercel rebuilds the exact release commit before serving it.
