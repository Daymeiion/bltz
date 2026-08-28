import { NextResponse } from "next/server";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE - Delete a player (admin only)
 */
export async function DELETE(
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

    // Get player_id if exists
    const { data: playerProfile } = await supabase
      .from('profiles')
      .select('player_id')
      .eq('id', userId)
      .single();

    // Delete player data if exists
    if (playerProfile?.player_id) {
      // Videos will cascade delete due to FK constraints
      await supabase
        .from('players')
        .delete()
        .eq('id', playerProfile.player_id);
    }

    // Note: Cannot delete auth.users via Supabase client
    // You would need to use admin API or mark as deleted
    // For now, we'll just delete the profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting player:', error);
    return NextResponse.json(
      { error: "Failed to delete player" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update player (admin only)
 */
export async function PATCH(
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
    const body = await request.json();
    const supabase = await createClient();

    // Update profile
    if (body.role) {
      await supabase
        .from('profiles')
        .update({ role: body.role })
        .eq('id', userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json(
      { error: "Failed to update player" },
      { status: 500 }
    );
  }
}

