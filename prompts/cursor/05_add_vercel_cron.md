# Cursor Prompt — Weekly refresh cron

Add a Vercel Cron job that hits a new endpoint `/api/awards/refresh` weekly for premium users.
- `/api/awards/refresh` should list premium players from Supabase (table: users or players) and iterate calling `/api/awards/scrape` then `/api/awards/save`.
- Concurrency: 3 at a time, with simple rate limiting (100ms gaps).
- Log success/fail counts to console.
- Provide env var flag `AWARDS_REFRESH_ENABLED` to quickly disable.
