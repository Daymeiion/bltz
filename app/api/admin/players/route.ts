import { NextResponse } from "next/server";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

/**
 * GET - Get all players/users for admin dashboard
 */
export async function GET() {
  try {
    const profile = await getCurrentAuthorizationProfile();
    
    // Check if user is admin
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const supabase = await createClient();

    // Get all profiles with player data
    const { data: profiles } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        display_name,
        role,
        avatar_url,
        created_at,
        player_id
      `)
      .order('created_at', { ascending: false });

    if (!profiles) {
      return NextResponse.json({ players: [] });
    }

    // Get player details and stats for each profile
    const playersWithStats = await Promise.all(
      profiles.map(async (profile) => {
        let playerData = null;
        let videoCount = 0;
        let viewCount = 0;

        if (profile.player_id) {
          // Get player data
          const { data: player } = await supabase
            .from('players')
            .select('id, full_name, school, visibility')
            .eq('id', profile.player_id)
            .single();

          if (player) {
            playerData = player;

            // Get video count
            const { count: vCount } = await supabase
              .from('videos')
              .select('*', { count: 'exact', head: true })
              .eq('player_id', player.id);

            videoCount = vCount || 0;

            // Get view count
            const { count: viewC } = await supabase
              .from('views')
              .select('*', { count: 'exact', head: true })
              .eq('player_id', player.id);

            viewCount = viewC || 0;
          }
        }

        return {
          id: profile.id,
          player_id: profile.player_id,
          full_name: playerData?.full_name || profile.display_name || profile.email || 'Unknown',
          email: profile.email,
          school: playerData?.school || null,
          role: profile.role,
          visibility: playerData?.visibility ?? true,
          total_videos: videoCount,
          total_views: viewCount,
          created_at: profile.created_at,
          avatar_url: profile.avatar_url,
        };
      })
    );

    return NextResponse.json({ players: playersWithStats });
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}

