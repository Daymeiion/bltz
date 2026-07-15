import { createServiceClient } from "@/lib/supabase/service";
import { SPOTIFY_TOKEN_URL, basicAuthHeader } from "@/lib/spotify/config";

// ---------------------------------------------------------------------------
// Server-side Spotify token access.
//
// The public locker "now playing" endpoint is unauthenticated, so it reads the
// athlete's stored tokens through the service-role client (bypasses RLS) and
// refreshes them transparently when expired. NEVER import this from client
// code — it depends on the service role key.
// ---------------------------------------------------------------------------

export type SpotifyTokenRow = {
  player_id: string;
  access_token: string;
  refresh_token: string;
  scope: string | null;
  token_type: string;
  expires_at: string;
};

// Refresh a little early so an access token doesn't expire mid-request.
const EXPIRY_SKEW_MS = 60_000;

type SpotifyRefreshResponse = {
  access_token: string;
  token_type?: string;
  scope?: string;
  expires_in: number;
  // Spotify usually omits refresh_token on refresh; keep the old one if so.
  refresh_token?: string;
};

/**
 * Exchange a refresh token for a fresh access token and persist it.
 * Returns the new access token, or null if Spotify rejected the refresh
 * (e.g. the athlete revoked access) — in which case the row is left intact so
 * the athlete can re-connect.
 */
async function refreshAccessToken(row: SpotifyTokenRow): Promise<string | null> {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    }),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const json = (await res.json()) as SpotifyRefreshResponse;
  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  const sb = createServiceClient();
  await sb
    .from("player_spotify_tokens")
    .update({
      access_token: json.access_token,
      token_type: json.token_type ?? row.token_type,
      scope: json.scope ?? row.scope,
      refresh_token: json.refresh_token ?? row.refresh_token,
      expires_at: expiresAt,
    })
    .eq("player_id", row.player_id);

  return json.access_token;
}

/**
 * Return a valid (non-expired) Spotify access token for a player, refreshing
 * if needed. Returns null when the player has not linked Spotify or the refresh
 * failed.
 */
export async function getFreshAccessToken(playerId: string): Promise<string | null> {
  const sb = createServiceClient();
  const { data: row } = await sb
    .from("player_spotify_tokens")
    .select("player_id, access_token, refresh_token, scope, token_type, expires_at")
    .eq("player_id", playerId)
    .maybeSingle();

  if (!row) return null;

  const expired =
    new Date(row.expires_at).getTime() - EXPIRY_SKEW_MS <= Date.now();

  if (!expired) return row.access_token;

  return refreshAccessToken(row as SpotifyTokenRow);
}
