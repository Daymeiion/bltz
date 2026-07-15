import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  SPOTIFY_TOKEN_URL,
  basicAuthHeader,
  resolveRedirectUri,
} from "@/lib/spotify/config";

export const runtime = "nodejs";

const STATE_COOKIE = "spotify_oauth_state";
const SETTINGS = "/dashboard/settings";

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
};

type SpotifyProfile = { id?: string; display_name?: string | null };

function fail(reqUrl: string, reason: string) {
  return NextResponse.redirect(
    new URL(`${SETTINGS}?spotify=error&reason=${reason}`, reqUrl),
  );
}

/**
 * GET /api/spotify/callback
 * Finishes the Authorization Code flow: verifies the CSRF state cookie,
 * exchanges the code for tokens, fetches the Spotify profile, and upserts the
 * athlete's token row. Redirects back to settings either way.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return fail(req.url, oauthError);
  if (!code || !state) return fail(req.url, "missing_code");

  // --- CSRF + player binding ---
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);

  if (!cookieState || cookieState !== state) {
    return fail(req.url, "state_mismatch");
  }

  const playerId = state.split(".")[1];
  if (!playerId) return fail(req.url, "bad_state");

  // The signed-in athlete must still own this player row.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login", req.url));

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!player) return fail(req.url, "not_owner");

  // --- Exchange the authorization code for tokens ---
  const redirectUri = resolveRedirectUri(url.origin);
  let tokenRes: Response;
  try {
    tokenRes = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });
  } catch {
    return fail(req.url, "token_network");
  }

  if (!tokenRes.ok) return fail(req.url, "token_exchange");
  const tokens = (await tokenRes.json()) as SpotifyTokenResponse;

  // --- Fetch the linked Spotify profile (best-effort, for display) ---
  let profile: SpotifyProfile = {};
  try {
    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });
    if (meRes.ok) profile = (await meRes.json()) as SpotifyProfile;
  } catch {
    // non-fatal
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Upsert via service role so we don't depend on cookie-scoped RLS during the
  // redirect round-trip. Ownership was already verified above.
  const sb = createServiceClient();
  const { error: upsertErr } = await sb
    .from("player_spotify_tokens")
    .upsert(
      {
        player_id: playerId,
        spotify_user_id: profile.id ?? null,
        display_name: profile.display_name ?? null,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expires_at: expiresAt,
      },
      { onConflict: "player_id" },
    );

  if (upsertErr) return fail(req.url, "persist_failed");

  const res = NextResponse.redirect(
    new URL(`${SETTINGS}?spotify=connected`, req.url),
  );
  res.cookies.delete(STATE_COOKIE);
  return res;
}
