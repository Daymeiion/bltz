import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSpotifyConfigured } from "@/lib/spotify/config";

export const runtime = "nodejs";

/**
 * GET /api/spotify/status
 * Reports whether the signed-in athlete has linked Spotify. Reads the token
 * row through the user session (owner RLS), so it only ever sees their own.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!player) {
    return NextResponse.json({ configured: isSpotifyConfigured(), hasPlayer: false, connected: false });
  }

  const { data: token } = await supabase
    .from("player_spotify_tokens")
    .select("display_name, updated_at")
    .eq("player_id", player.id)
    .maybeSingle();

  return NextResponse.json({
    configured: isSpotifyConfigured(),
    hasPlayer: true,
    connected: Boolean(token),
    displayName: token?.display_name ?? null,
  });
}
