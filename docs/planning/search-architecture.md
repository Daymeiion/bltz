# BLTZ Player Search — Architecture & Production Plan

The mockup ships a **production-shaped** search layer over a static in-memory
dataset. When the real product lands, only the network call changes; the
debounce, cache, abort, and race-guard layers stay identical.

This doc is the production reference: what to do, what to avoid, and the
exact swap-in points.

---

## What the mockup already does

| Concern | Implementation | Why it matters in prod |
|---|---|---|
| Debounce | `setTimeout` 180ms after last keystroke | A user typing "Marcus" fires 1 query, not 6 |
| Abort | `AbortController` cancels the previous in-flight request when a new keystroke arrives | Prevents wasted CPU + race conditions |
| LRU cache | `Map` bounded to 50 entries, evict-oldest-on-insert | Re-typing the same query = 0 network calls |
| Race-condition guard | `if (q !== inputEl.value) return` before rendering | Slow result for "Mar" can't overwrite a fresh result for "Marcu" |
| Min-char gate | Configurable `MIN_CHARS` (currently 0 to allow "Suggested" on empty) | Production should bump to 2 to avoid index scans on single-letter queries |

All of this lives in `mockups/locker-page.html` inside `makeSearchRunner` and
`fetchPlayers`. The same shape works against any backend.

---

## Production swap (one function changes)

In the mockup:

```js
async function fetchPlayers(q, abortSignal) {
  await Promise.resolve();
  if (abortSignal?.aborted) throw new DOMException('Aborted', 'AbortError');
  // ... in-memory filter against PLAYERS array
}
```

In production this becomes:

```ts
async function fetchPlayers(q: string, abortSignal: AbortSignal): Promise<Player[]> {
  const r = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`, {
    signal: abortSignal,
  });
  if (!r.ok) throw new Error(`Search failed: ${r.statusText}`);
  return r.json();
}
```

The debounce, cache, abort, and race-guard layers above it require **zero changes**.

---

## Backend: the `/api/players/search` route

Lives in `app/api/players/search/route.ts` (Next.js App Router). Shape:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ratelimit } from '@/lib/ratelimit';

export const runtime = 'edge';   // sub-50ms cold start, geo-distributed

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 64);
  if (q.length < 2) {
    return NextResponse.json([], { headers: cacheHeaders(60) });
  }

  // Rate limit per IP — 30 searches per minute
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { success } = await ratelimit.limit(`search:${ip}`);
  if (!success) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('players')
    .select('id, slug, name, school, position, jersey, level, avatar_url')
    .or(`name.ilike.%${q}%,school.ilike.%${q}%`)   // see DB index notes below
    .order('search_rank', { ascending: false })     // popularity / recency rank
    .limit(8);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? [], {
    headers: cacheHeaders(60),  // 60s edge cache, see below
  });
}

function cacheHeaders(seconds: number) {
  return {
    'Cache-Control': `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 5}`,
  };
}
```

---

## Database: indexes that matter

Without these, every search becomes a full table scan. With ~10k athletes
that's already slow. With ~100k+ it's broken.

```sql
-- Trigram fuzzy search (handles partial matches + typos)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX players_name_trgm_idx
  ON players USING gin (name gin_trgm_ops);
CREATE INDEX players_school_trgm_idx
  ON players USING gin (school gin_trgm_ops);

-- For exact lookups (jersey number, position filter)
CREATE INDEX players_position_idx ON players (position);
CREATE INDEX players_jersey_idx   ON players (jersey);

-- For ordering results by popularity / verified status
CREATE INDEX players_search_rank_idx
  ON players (search_rank DESC NULLS LAST);
```

Switch the route's `.or(...)` to use trigram similarity for better matches:

```sql
-- In the route, prefer this over ilike:
.select('*')
.gt('similarity(name, :q)', 0.2)
.order('similarity(name, :q)', { ascending: false })
```

---

## Caching: three layers

1. **Client (browser)** — the LRU `Map` already in the mockup. Persists per
   tab session. Free, instant.
2. **Edge (Vercel)** — `Cache-Control: s-maxage=60` lets Vercel's edge
   network cache the JSON response for 60s. Most popular queries
   (`Marcus`, `Brady`, `RB`) get served from edge with ~5ms latency. No DB hit.
3. **DB (Supabase)** — Postgres caches hot index pages in shared_buffers.
   With proper indexes (above), even cold queries are <50ms.

Don't add Redis until edge cache is insufficient. Premature optimization.

---

## Rate limiting

Use `@upstash/ratelimit` with sliding-window algorithm:

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, '1 m'),  // 30 req per min per IP
  analytics: true,
});
```

Free tier of Upstash covers tens of thousands of requests/day. Upgrade
when you actually have traffic.

---

## What the mockup deliberately does NOT solve

These need server-side handling and don't exist yet:

- **Authorization on private profiles** — "draft" lockers shouldn't appear
  in search until claimed/published. Filter `.eq('published', true)`.
- **Soft-deleted athletes** — `.is('deleted_at', null)`.
- **Search analytics** — log queries to learn what fans look for. Don't ship
  blind. Use Supabase function or a `search_logs` table with RLS.
- **Synonyms / nicknames** — "Beast Mode" should find Marshawn Lynch.
  Maintain a `player_nicknames` table or use Postgres FTS dictionaries.
- **Misspelling tolerance** — trigram + similarity threshold helps. For more
  aggressive fuzzy matching, consider Algolia or Meilisearch as a Phase 2
  upgrade if Postgres fuzzy search isn't good enough.

---

## When to upgrade beyond Postgres

Stay on Postgres + trigram until you hit ANY of these:

- p95 search latency > 200ms after edge cache
- Search relevance complaints from athletes ("why doesn't 'Beast' find me?")
- Need typo correction beyond what trigram handles (e.g., `Brdy` → `Brady`)
- Need real-time updates ranking (trending players)

Then move to **Meilisearch** (self-hosted, free) or **Algolia** (managed,
paid). Both are drop-in replacements for the route's body — the client
layers (debounce / cache / abort) still work unchanged.

---

## Summary: what's safe right now

The mockup's search will scale to **production volume** the moment we
swap `fetchPlayers` for a real fetch. The risk areas in production are:

1. ✅ **Per-keystroke flood** — solved by debounce
2. ✅ **Race conditions** — solved by abort + render guard
3. ✅ **Repeat queries** — solved by LRU cache
4. ⚠ **DB scans** — needs indexes (sql above)
5. ⚠ **Edge cache** — needs `Cache-Control` headers (route example above)
6. ⚠ **Abuse / scraping** — needs rate limiting (Upstash example above)

Items 4-6 are server-side and don't exist in the mockup. They're a single
day of work each when the real route ships.
