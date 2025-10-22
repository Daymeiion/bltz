import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/rbac";

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    
    if (!profile?.player_id) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const supabase = await createClient();

    // Get player profile
    const { data: playerProfile, error: playerError } = await supabase
      .from('players')
      .select('id, full_name, profile_image, team, position')
      .eq('id', profile.player_id)
      .single();

    if (playerError) {
      console.error("Error fetching player profile:", playerError);
      return NextResponse.json({ error: "Failed to fetch player profile" }, { status: 500 });
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        email: profile.email,
        player_id: profile.player_id
      },
      playerProfile: playerProfile
    });

  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
