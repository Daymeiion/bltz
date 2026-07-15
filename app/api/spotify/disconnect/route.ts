import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/spotify/disconnect
 * Removes the signed-in athlete's stored Spotify tokens. The owner RLS delete
 * policy scopes this to their own player row. Spotify keeps the app authorized
 * account-side until the user revokes it at spotify.com/account/apps.
 */
export async function POST() {
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
  if (!player) return NextResponse.json({ error: "no_player" }, { status: 404 });

  const { error } = await supabase
    .from("player_spotify_tokens")
    .delete()
    .eq("player_id", player.id);

  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
