import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import {
  SPOTIFY_AUTHORIZE_URL,
  SPOTIFY_SCOPES,
  getSpotifyClientCredentials,
  resolveRedirectUri,
  isSpotifyConfigured,
} from "@/lib/spotify/config";

export const runtime = "nodejs";

// Short-lived cookie that ties the OAuth `state` back to the athlete who
// started the flow (CSRF protection + player binding). Verified in /callback.
const STATE_COOKIE = "spotify_oauth_state";

/**
 * GET /api/spotify/connect
 * Begins the per-athlete Spotify Authorization Code flow. Requires an
 * authenticated athlete who owns a player row, then redirects to Spotify's
 * consent screen. The callback finishes the exchange.
 */
export async function GET(req: Request) {
  if (!isSpotifyConfigured()) {
    return NextResponse.json(
      { error: "spotify_not_configured" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!player) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?spotify=no_player", req.url),
    );
  }

  const { clientId } = getSpotifyClientCredentials();
  const origin = new URL(req.url).origin;
  const redirectUri = resolveRedirectUri(origin);

  const nonce = randomUUID();
  // Pack the player id into the state so the callback knows who this is for,
  // and pair it with a random nonce we also stash in an httpOnly cookie.
  const state = `${nonce}.${player.id}`;

  const authorizeUrl = new URL(SPOTIFY_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", SPOTIFY_SCOPES);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  // Force the consent screen so switching accounts is possible.
  authorizeUrl.searchParams.set("show_dialog", "true");

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes to complete consent
  });
  return res;
}
