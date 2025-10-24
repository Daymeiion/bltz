# BLTZ Awards & Achievements Kit

**Goal:** Let Cursor do the heavy lifting. Drop this kit into your Next.js repo, set a few env vars, and prompt Cursor with the included scripts to wire the AI awards extractor end‑to‑end.

## What’s inside

```
/types/awards.ts                # Zod schema + TS types
/lib/assistantTools.ts          # Tool specs for OpenAI tool calls
/lib/search/tavily.ts           # Web search wrapper (Tavily)
/lib/fetch/cleanFetch.ts        # Readability-based HTML cleaner
/pages/api/awards/scrape.ts     # API route to run the agent + tools
/components/AwardCard.tsx       # UI card for dashboard
/supabase/migrations/...sql     # Supabase table migration
/prompts/cursor/*.md            # Copy/paste prompts for Cursor
/docs/SETUP.md                  # This guide
```

## Quick setup (5–10 min)

1) **Install deps**
```bash
npm i openai zod jsdom @mozilla/readability
# if using next < 14, also: npm i -D @types/node
```

2) **Env vars** (add to `.env.local`)
```
OPENAI_API_KEY=sk-...            # Your OpenAI key
OPENAI_MODEL=gpt-4.1-mini        # Or your preferred model
TAVILY_API_KEY=tvly-...          # Or replace with Bing/SerpAPI
EXTRACTOR_VERSION=blitzy-2@2025-10-23
```

3) **Copy files** in this zip to your repo root, preserving paths.

4) **Wire route**
- Next.js (pages router) route is ready at `/api/awards/scrape`.
- If using App Router, move it into `app/api/awards/scrape/route.ts` (Cursor prompt provided).

5) **Test locally**
```bash
npm run dev
# Then POST:
curl -s -X POST http://localhost:3000/api/awards/scrape -H 'Content-Type: application/json' -d '{"playerId":"nfl_123","playerName":"Daymeion Hughes","teamOrSchool":"California"}' | jq .
```

6) **Save to Supabase** (with MCP)
- Use the migration at `supabase/migrations/20251023_create_awards.sql` via your MCP Supabase tool.
- Then have Cursor implement an API route `/api/awards/save` that bulk‑upserts into `awards` (Cursor prompt provided).

7) **UI**
- Use `<AwardCard />` in your dashboard list view.
- Optional: add a “Refresh Awards” button that calls `/api/awards/scrape`, shows results, then calls `/api/awards/save`.

## Notes
- The extractor intentionally keeps **years** as text to allow ranges (e.g., `2004–2005`). Normalize in SQL as needed.
- Source bias is set via `include_domains` in `lib/search/tavily.ts`—extend as you grow.
- For HS/College/Pro detection, the model infers; you can post‑process if you know the player’s current level.

## Next steps
- Add a Vercel cron to refresh premium players weekly, free monthly.
- Add a manual moderation queue for low‑confidence (<0.6) entries.
