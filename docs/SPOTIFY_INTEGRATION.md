# Spotify "Now Playing" Integration

Each athlete can link their own Spotify account so their fan-facing locker hero
shows what they're currently listening to (track, art, and a link to open it in
Spotify). The badge collapses automatically when nothing is playing or the
account isn't linked.

## 1. Register a Spotify Developer app

1. Go to <https://developer.spotify.com/dashboard> and **Create app**.
2. App name / description: anything (e.g. "BLTZ Locker").
3. Under **Redirect URIs**, add the callback URL(s) — they must match exactly:
   - Local dev: `http://127.0.0.1:3000/api/spotify/callback`
   - Production: `https://<your-domain>/api/spotify/callback`
   > Spotify no longer allows `localhost`; use `127.0.0.1` for local dev.
4. Save, then copy the **Client ID** and **Client Secret**.

## 2. Set environment variables

Add to `.env.local` (and your production env / Vercel project settings):

```
SPOTIFY_CLIENT_ID=<client id>
SPOTIFY_CLIENT_SECRET=<client secret>
# Optional — pin the redirect URI. If unset it's derived from the request
# origin, which must still match a registered URI.
# SPOTIFY_REDIRECT_URI=https://<your-domain>/api/spotify/callback
```

## 3. Run the database migration

Apply `lib/supabase/migrations/20260708000000_player_spotify_tokens.sql`
(via the Supabase SQL editor or your migration process). It creates the
`player_spotify_tokens` table with owner-only RLS. Access/refresh tokens are
account credentials — they are only ever read/refreshed server-side through the
service role for the public locker path; there is no public read policy.

## 4. Athlete connect flow

From **Dashboard → Settings**, the athlete clicks **Connect Spotify**:

- `GET /api/spotify/connect` — starts the OAuth Authorization Code flow (CSRF
  state bound to the athlete in an httpOnly cookie), redirects to Spotify.
- `GET /api/spotify/callback` — verifies state + ownership, exchanges the code
  for access + refresh tokens, upserts them, and returns to Settings.
- `POST /api/spotify/disconnect` — removes the stored tokens.
- `GET /api/spotify/status` — reports connection state for the Settings card.

## 5. Live badge

`GET /api/spotify/now-playing?player=<slug>` (public) resolves the player,
refreshes the token if expired, calls Spotify's
`me/player/currently-playing`, and returns a small normalized payload. The
locker (`app/player/[slug]/LockerView.tsx`) polls it every 30s and renders the
hero badge only while a track is playing.

Scopes requested: `user-read-currently-playing`, `user-read-playback-state`
(read-only).
