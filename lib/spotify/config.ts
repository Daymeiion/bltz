// ---------------------------------------------------------------------------
// Spotify OAuth configuration.
//
// Reads the developer-app credentials from the environment and centralizes the
// scopes, endpoints, and redirect-URI resolution shared by the connect,
// callback, and now-playing routes.
//
// Required env (see .env.local / README):
//   SPOTIFY_CLIENT_ID       — Spotify Developer app client id
//   SPOTIFY_CLIENT_SECRET   — Spotify Developer app client secret
//   SPOTIFY_REDIRECT_URI    — optional; the exact redirect URI registered in
//                             the Spotify dashboard. When unset we derive
//                             `${requestOrigin}/api/spotify/callback`, which is
//                             convenient in dev but MUST match a URI you have
//                             registered with Spotify.
// ---------------------------------------------------------------------------

export const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
export const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
export const SPOTIFY_CURRENTLY_PLAYING_URL =
  "https://api.spotify.com/v1/me/player/currently-playing";

// Read-only playback scopes. `user-read-currently-playing` is the minimum for
// the now-playing badge; `user-read-playback-state` lets us also detect an
// active-but-paused session so the badge can collapse cleanly.
export const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
].join(" ");

export const SPOTIFY_CALLBACK_PATH = "/api/spotify/callback";

export function getSpotifyClientCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Spotify is not configured: set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
    );
  }
  return { clientId, clientSecret };
}

export function isSpotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

/**
 * Resolve the redirect URI. Prefers the explicitly-registered env value and
 * falls back to the current request origin so local dev works without extra
 * config. The returned value must exactly match a Redirect URI registered in
 * the Spotify Developer dashboard.
 */
export function resolveRedirectUri(requestOrigin: string): string {
  const explicit = process.env.SPOTIFY_REDIRECT_URI;
  if (explicit) return explicit;
  return `${requestOrigin}${SPOTIFY_CALLBACK_PATH}`;
}

/** HTTP Basic auth header value for the token endpoint. */
export function basicAuthHeader(): string {
  const { clientId, clientSecret } = getSpotifyClientCredentials();
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}
