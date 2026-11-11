# BLTZ preview news discovery setup

Private preview Locker news discovery uses the existing server-side Tavily adapter. It is optional: creating or editing a preview succeeds when news search is unconfigured or unavailable. Awards remain unverified evidence. No OpenAI key or additional package is required for this workflow.

## Local configuration

The repository's `.env.example` is a secret-free template. Add `TAVILY_API_KEY` to your ignored `.env.local` or `.env.development.local`, preserving your existing Supabase and application settings. Next.js loads these automatically; standalone scripts do not. Restart the local server after changing it.

```dotenv
# Server-only; keep the value out of source control, logs and screenshots.
TAVILY_API_KEY=
```

Never use a `NEXT_PUBLIC_` prefix, put the credential in `next.config.ts`'s `env` option, or send it in a browser request. Both the Tavily wrapper and configured search adapter use `server-only`. A blank or missing key disables search without making an upstream request. Server runtime reads the key at request time; article reads do not call Tavily.

## Vercel configuration

For the linked `bltz` project, open **Settings → Environment Variables** and add **TAVILY_API_KEY** as a sensitive server secret. Select **Preview** for the intended staging/branch deployment and **Development** for local development as appropriate. Configure **Production** only as an explicitly approved rollout. Keep each deployment's Supabase variables scoped to its corresponding environment.

The CLI alternative prompts for the value without placing it in command history:

```sh
vercel env add TAVILY_API_KEY preview
vercel env add TAVILY_API_KEY development
```

If a branch override is used, set the key for that same branch. Adding/changing a Vercel environment variable affects subsequent deployments. **Redeploy the intended Preview deployment after setting it**, then test an authorized admin refresh; do not redeploy Production as part of this setup. Remote environment changes and deployment are separate approval steps for the current local task. Do not overwrite `.env.local` with `vercel env pull` unless its existing settings have been accounted for.

See [Vercel environment variables](https://vercel.com/docs/environment-variables) for scope and deployment behavior.

## Request contract and failure behavior

The adapter uses `POST https://api.tavily.com/search` with `Authorization: Bearer …`, explicit `basic` search, `general` topic (including historical coverage), six results per query, and automatic parameter selection disabled. Answers, images and raw content are disabled. Requests have a five-second deadline; discovery retains its existing four-query, twelve-candidate and 35-second overall bounds. There are no automatic billable retries. See the [official Tavily Search contract](https://docs.tavily.com/documentation/api-reference/endpoint/search).

Only candidate URLs cross into news discovery. Provider scores, snippets, generated answers and raw bodies are not persisted. The existing DNS/IP-pinned HTTPS fetcher, redirect checks, bounded publisher metadata extraction, and athlete-name plus saved-affiliation gate remain in force. Relevance is a matching heuristic, not verified identity or award evidence.

Missing credentials, 401/403, 429, quota statuses 432/433, timeouts, interruption, malformed responses and transient errors produce safe admin status codes and explanatory messages. A failed query stops discovery and preserves the entire last successful article set, even if earlier queries succeeded. A successful empty result set remains an intentional replacement. Publisher-level metadata failures retain the existing partial-discovery behavior.

## Verification

Run mocked tests without provider charges:

```sh
npx vitest run tests/preview-lockers/tavily.test.ts tests/preview-lockers/tavily-workflow.test.ts tests/preview-lockers/enrichment-ui.test.tsx tests/preview-lockers/enrichment-fetch.test.ts
```

After an approved Preview deployment, use a synthetic preview and an authorized admin to refresh news. Check safe status feedback, persisted publisher links, unverified awards, and unchanged saved news when discovery fails. Reloading the Locker must not trigger another search. Never place real credentials or response bodies in test fixtures. The local integration validation is recorded in [the stabilization report](planning/preview-enrichment-stabilization.md#tavily-connection-validation--september-29-2026).

---

## Archived awards kit reference

The material below predates the current private-preview workflow. It is retained as historical reference, **not setup instructions**: do not create its old routes/tables, infer verified awards, or add its proposed cron as part of preview enrichment. Current migrations and the build-order documents control schema changes.

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
