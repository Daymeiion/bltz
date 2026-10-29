# Batch Locker build from player names: completion

Admin can paste a list of player names and build a private preview Locker for each, then review them from a yellow-dot list. The operator chose a 200-a-day scraper limit, and chose to have the dot clear when a Locker is marked complete.

## What changed
- `/admin/preview-lockers/batch` (linked from Preview Lockers). Paste one name per line, optionally `Name, College`.
  1. **Match.** Each name is looked up in the Player Master list (`nfl_players`). Only a single exact match is chosen automatically. Several players with the same name, or close matches only, need a pick. Names that aren't found are listed.
  2. **Cohort and contacts.** Chosen players go through the existing `connect_gtm_player_cohort` action once. It adds them to the cohort and creates or links their GTM contacts.
  3. **Lockers.** For each player, `open_or_create_gtm_player_preview` creates or reopens the private Locker. Then `buildSavedPreview` runs the career search, merges blank-only suggestions, saves once (awards mapping and a news search run inside that save), and runs a merchandise search. Two players build at a time. The tab must stay open. Cancel stops players that haven't started.
- Combine is not searched in batch, because its suggestions exist only in an open editor. That makes three scraper admissions per player. Run Combine from the Stats tab during review.
- **Yellow dot** (`lib/preview-lockers/review-status.ts`): it shows in the Preview Lockers list and the builder sidebar for any cohort (GTM-linked) Locker whose current saved revision isn't marked complete. **Mark preview complete** clears it. A later save brings it back.
- Migration `20261029190000_raise_preview_discovery_daily_limit.sql` raises the per-Admin daily scraper allowance from 50 to 200. The cooldown and charging rules are unchanged.

## Deployment
The migration has to be applied to the hosted database before the 200 limit takes effect. Until then, batch builds still work but stop at the 50-a-day limit.

## Verification
- New tests: `batch-build.test.ts`, `batch-actions.test.ts`, `batch-builder-ui.test.tsx`. List and builder tests now cover the dot. The limit migration test and the SQL capacity script are updated.
- Full suite: 1,967 passed, 24 skipped. Type check and production build pass.
- Not run: the SQL capacity script (no local database here), and a live batch against real providers.
