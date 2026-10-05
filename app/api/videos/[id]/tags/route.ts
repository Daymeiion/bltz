import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/rbac";
import { tagPlayersInVideo, getTaggedPlayers } from "@/lib/queries/revenue";
import { createClient } from "@/lib/supabase/server";

/**
 * GET - Get players tagged in a video
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const videoId = resolvedParams.id;
    
    const taggedPlayerIds = await getTaggedPlayers(videoId);
    
    // Get player details
    const supabase = await createClient();
    const { data: players } = await supabase
      .from('players')
      .select('id, full_name, name, profile_image, school')
      .in('id', taggedPlayerIds);

    return NextResponse.json({ 
      taggedPlayers: players || [],
      count: taggedPlayerIds.length 
    });
  } catch (error) {
    console.error('Error fetching video tags:', error);
    return NextResponse.json(
      { error: "Failed to fetch video tags" },
      { status: 500 }
    );
  }
}

/**
 * POST - Tag players in a video
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    const resolvedParams = await params;
    
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videoId = resolvedParams.id;
    const body = await request.json();
    const { playerIds } = body;

    if (!Array.isArray(playerIds)) {
      return NextResponse.json(
        { error: "playerIds must be an array" },
        { status: 400 }
      );
    }

    // Verify user owns this video
    const supabase = await createClient();
    const { data: video } = await supabase
      .from('videos')
      .select('owner_user_id')
      .eq('id', videoId)
      .single();

    if (!video || video.owner_user_id !== profile.id) {
      return NextResponse.json(
        { error: "You can only tag players in your own videos" },
        { status: 403 }
      );
    }

    // Remove existing tags
    await supabase
      .from('video_tags')
      .delete()
      .eq('video_id', videoId);

    // Add new tags
    if (playerIds.length > 0) {
      await tagPlayersInVideo(videoId, playerIds);
    }

    return NextResponse.json({ 
      success: true,
      taggedCount: playerIds.length 
    });
  } catch (error) {
    console.error('Error tagging players:', error);
    return NextResponse.json(
      { error: "Failed to tag players" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove all tags from a video
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    const resolvedParams = await params;
    
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videoId = resolvedParams.id;

    // Verify user owns this video
    const supabase = await createClient();
    const { data: video } = await supabase
      .from('videos')
      .select('owner_user_id')
      .eq('id', videoId)
      .single();

    if (!video || video.owner_user_id !== profile.id) {
      return NextResponse.json(
        { error: "You can only modify tags on your own videos" },
        { status: 403 }
      );
    }

    // Remove all tags
    await supabase
      .from('video_tags')
      .delete()
      .eq('video_id', videoId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing tags:', error);
    return NextResponse.json(
      { error: "Failed to remove tags" },
      { status: 500 }
    );
  }
}

