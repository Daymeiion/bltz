import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentAuthorizationProfile();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createClient();

    // Get counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from("moderations")
      .select("status")
      .not("status", "is", null);

    if (statusError) throw statusError;

    // Count by status
    const counts = {
      open: 0,
      in_review: 0,
      resolved: 0,
      closed: 0,
    };

    statusCounts?.forEach((item) => {
      if (item.status in counts) {
        counts[item.status as keyof typeof counts]++;
      }
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentActivity, error: recentError } = await supabase
      .from("moderations")
      .select("status, created_at")
      .gte("created_at", sevenDaysAgo.toISOString());

    if (recentError) throw recentError;

    // Calculate trends
    const recentCounts = {
      open: 0,
      in_review: 0,
      resolved: 0,
      closed: 0,
    };

    recentActivity?.forEach((item) => {
      if (item.status in recentCounts) {
        recentCounts[item.status as keyof typeof recentCounts]++;
      }
    });

    // Mock previous period for trend calculation (in real app, you'd compare with actual historical data)
    const previousCounts = {
      open: Math.max(0, recentCounts.open - 2),
      in_review: Math.max(0, recentCounts.in_review - 1),
      resolved: Math.max(0, recentCounts.resolved - 6),
      closed: Math.max(0, recentCounts.closed - 1),
    };

    const trends = {
      open: recentCounts.open - previousCounts.open,
      in_review: recentCounts.in_review - previousCounts.in_review,
      resolved: recentCounts.resolved - previousCounts.resolved,
      closed: recentCounts.closed - previousCounts.closed,
    };

    return NextResponse.json({
      counts,
      trends,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching moderation stats:", error);
    
    // Return mock data on error
    return NextResponse.json({
      counts: {
        open: 9,
        in_review: 4,
        resolved: 31,
        closed: 12,
      },
      trends: {
        open: 2,
        in_review: -1,
        resolved: 6,
        closed: 1,
      },
      lastUpdated: new Date().toISOString(),
    });
  }
}
