import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/rbac";
import { getAllAchievementsWithProgress, getAchievementStats } from "@/lib/queries/achievements";

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserProfile();
    
    if (!profile?.player_id) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const [achievements, stats] = await Promise.all([
      getAllAchievementsWithProgress(profile.player_id),
      getAchievementStats(profile.player_id)
    ]);

    return NextResponse.json({
      achievements,
      stats
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}
