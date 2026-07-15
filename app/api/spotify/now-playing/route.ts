import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getFreshAccessToken } from "@/lib/spotify/tokens";
import { SPOTIFY_CURRENTLY_PLAYING_URL } from "@/lib/spotify/config";

export const runtime = "nodejs";
// Live data — never cache at the framework layer.
export const dynamic = "force-dynamic";

// Shape returned to the locker badge. Kept intentionally small.
type NowPlaying =
  | { connected: false }
  | { connected: true; isPlaying: false }
  | {
      connected: true;
      isPlaying: true;
      title: string;
      artists: string;
      album: string;
      albumArt: string | null;
      url: string | null;
      durationMs: number | null;
      progressMs: number | null;
    };

function json(body: NowPlaying, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * GET /api/spotify/now-playing?player=<slug>
 * Public. Returns the athlete's currently-playing Spotify track, refreshing
 * their token if expired. Collapses gracefully to {connected:false} when the
 * account isn't linked and {isPlaying:false} when nothing is playing.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("player");
  if (!slug) return json({ connected: false });

  // Resolve slug -> player id via service role (public page, no session).
  const sb = createServiceClient();
  const { data: player } = await sb
    .from("players")
    .select("id")
    .eq("slug", slug)
    .eq("visibility", true)
    .maybeSingle();
  if (!player) return json({ connected: false });

  const accessToken = await getFreshAccessToken(player.id);
  if (!accessToken) return json({ connected: false });

  let res: Response;
  try {
    res = await fetch(SPOTIFY_CURRENTLY_PLAYING_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return json({ connected: true, isPlaying: false });
  }

  // 204 = nothing currently playing; 202 also indicates no active content.
  if (res.status === 204 || res.status === 202) {
    return json({ connected: true, isPlaying: false });
  }
  if (!res.ok) {
    // 401/403 after a failed refresh, or a transient Spotify error — treat as
    // "not playing" so the badge simply hides.
    return json({ connected: true, isPlaying: false });
  }

  const body = await res.json().catch(() => null);
  const item = body?.item;
  // No track object (e.g. a podcast episode with is_playing false, or ads).
  if (!body || !item || body.is_playing === false) {
    return json({ connected: true, isPlaying: false });
  }

  const albumImages = item.album?.images ?? [];
  const albumArt =
    albumImages.length > 0 ? albumImages[albumImages.length - 1].url : null;
  const artists = Array.isArray(item.artists)
    ? item.artists.map((a: { name: string }) => a.name).join(", ")
    : "";

  return json({
    connected: true,
    isPlaying: true,
    title: item.name ?? "",
    artists,
    album: item.album?.name ?? "",
    // Prefer a medium image for the badge if there are several.
    albumArt: albumImages.length > 1 ? albumImages[1].url : albumArt,
    url: item.external_urls?.spotify ?? null,
    durationMs: item.duration_ms ?? null,
    progressMs: body.progress_ms ?? null,
  });
}
