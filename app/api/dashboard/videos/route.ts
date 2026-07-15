import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/rbac";
import { getPlayerVideos, createVideo } from "@/lib/queries/videos";
import { getTeamVideosCount } from "@/lib/queries/revenue";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch all videos for the player
export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get player ID
    const supabase = await createClient();
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    const playerId = player?.id || profile.player_id;

    if (!playerId) {
      return NextResponse.json({ 
        videos: [], 
        playerId: '', 
        userId: profile.id 
      });
    }

    const videos = await getPlayerVideos(playerId);

    // Get team videos count (videos from same school/years where player is tagged)
    const teamVideosCount = await getTeamVideosCount(playerId);

    return NextResponse.json({
      videos,
      playerId,
      userId: profile.id,
      teamVideosCount,
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

// POST - Create a new video
export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const supabase = await createClient();
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle();
    const playerId = player?.id || profile.player_id;

    if (!playerId) {
      return NextResponse.json({ error: "Player profile required" }, { status: 403 });
    }

    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const visibility = ['public', 'unlisted', 'private'].includes(body.visibility)
      ? body.visibility
      : 'private';
    
    const video = await createVideo({
      player_id: playerId,
      owner_user_id: profile.id,
      title: body.title.trim(),
      description: body.description,
      thumbnail_url: body.thumbnail_url,
      playback_url: body.playback_url,
      duration_seconds: body.duration_seconds,
      tags: body.tags,
      visibility,
    });

    return NextResponse.json({ video });
  } catch (error) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: "Failed to create video" },
      { status: 500 }
    );
  }
}

