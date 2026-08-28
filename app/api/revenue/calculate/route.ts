import { NextResponse } from "next/server";
import {
  getCurrentAuthorizationProfile,
  getCurrentUserProfile,
} from "@/lib/rbac";
import { calculateVideoRevenue } from "@/lib/queries/revenue";
import { createClient } from "@/lib/supabase/server";

/**
 * Calculate revenue distributions for videos
 * This should be called periodically (e.g., via cron job)
 */
export async function POST(request: Request) {
  try {
    const profile = await getCurrentAuthorizationProfile();
    
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const { videoId, playerId } = body;

    const supabase = await createClient();

    if (videoId) {
      // Calculate for specific video
      await calculateVideoRevenue(videoId);
      return NextResponse.json({ 
        success: true, 
        message: `Revenue calculated for video ${videoId}` 
      });
    } else if (playerId) {
      // Calculate for all videos of a player
      const { data: videos } = await supabase
        .from('videos')
        .select('id')
        .eq('player_id', playerId)
        .eq('visibility', 'public');

      if (!videos) {
        return NextResponse.json({ success: true, videosProcessed: 0 });
      }

      for (const video of videos) {
        await calculateVideoRevenue(video.id);
      }

      return NextResponse.json({ 
        success: true, 
        videosProcessed: videos.length,
        message: `Revenue calculated for ${videos.length} videos` 
      });
    } else {
      // Calculate for all public videos (use with caution - expensive operation)
      const { data: videos } = await supabase
        .from('videos')
        .select('id')
        .eq('visibility', 'public')
        .limit(100); // Limit to prevent timeout

      if (!videos) {
        return NextResponse.json({ success: true, videosProcessed: 0 });
      }

      for (const video of videos) {
        await calculateVideoRevenue(video.id);
      }

      return NextResponse.json({ 
        success: true, 
        videosProcessed: videos.length,
        message: `Revenue calculated for ${videos.length} videos` 
      });
    }
  } catch (error) {
    console.error('Error calculating revenue:', error);
    return NextResponse.json(
      { error: "Failed to calculate revenue" },
      { status: 500 }
    );
  }
}

/**
 * Get revenue breakdown for a player
 */
export async function GET(_request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Get player ID
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    const playerId = player?.id || profile.player_id;

    if (!playerId) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Get earnings
    const { data: earnings } = await supabase
      .from('player_earnings')
      .select('*')
      .eq('player_id', playerId)
      .single();

    // Get recent distributions
    const { data: distributions } = await supabase
      .from('revenue_distributions')
      .select('*')
      .eq('recipient_player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      earnings: earnings || {
        total_earnings: 0,
        earnings_from_own_videos: 0,
        earnings_from_team_pool: 0,
      },
      recentDistributions: distributions || [],
    });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { error: "Failed to fetch revenue data" },
      { status: 500 }
    );
  }
}

