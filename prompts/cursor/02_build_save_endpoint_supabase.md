# Cursor Prompt — Build /api/awards/save (Supabase upsert)

Create a POST endpoint at `app/api/awards/save/route.ts` (or pages router equivalent).
Requirements:
- Accept JSON `{ awards: PlayerAward[] }`.
- For each award, upsert into `awards` table defined in `supabase/migrations/20251023_create_awards.sql`.
- Use Supabase JS client (MCP is available). If MCP-supabase function exists, call that. Otherwise, instantiate Supabase client with service role key from env.
- Map fields: player_id, player_name, award_name, award_short_desc, year, level, team_or_school, league, source_site=source.site, source_url=source.url, accessed_at, evidence_quote, extractor_confidence, extractor_version.
- Return `{ ok: true, inserted: n }`.
- Add basic validation using the Zod `PlayerAwardSchema`.
