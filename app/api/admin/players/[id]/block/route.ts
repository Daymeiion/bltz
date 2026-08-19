import { NextResponse } from "next/server";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

/**
 * POST - Block/Unblock a player (admin only)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentAuthorizationProfile();
    const resolvedParams = await params;
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const userId = resolvedParams.id;
    const supabase = await createClient();

    // Get player_id
    const { data: playerProfile } = await supabase
      .from('profiles')
      .select('player_id')
      .eq('id', userId)
      .single();

    if (!playerProfile?.player_id) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Toggle visibility
    const { data: currentPlayer } = await supabase
      .from('players')
      .select('visibility')
      .eq('id', playerProfile.player_id)
      .single();

    const newVisibility = !currentPlayer?.visibility;

    await supabase
      .from('players')
      .update({ visibility: newVisibility })
      .eq('id', playerProfile.player_id);

    return NextResponse.json({ 
      success: true,
      visibility: newVisibility,
      message: newVisibility ? 'Player unblocked' : 'Player blocked'
    });
  } catch (error) {
    console.error('Error blocking/unblocking player:', error);
    return NextResponse.json(
      { error: "Failed to update player status" },
      { status: 500 }
    );
  }
}

