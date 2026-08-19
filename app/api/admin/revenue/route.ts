import { NextResponse } from "next/server";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";
import { getAdminRevenueSummary, getPlatformTotalRevenue } from "@/lib/queries/revenue";
import { createClient } from "@/lib/supabase/server";

/**
 * GET - Admin revenue dashboard data
 * Shows BLTZ platform revenue, publisher revenue, and player distributions
 */
export async function GET(request: Request) {
  try {
    const profile = await getCurrentAuthorizationProfile();
    
    // Check if user is admin
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;

    // Get comprehensive revenue summary
    const summary = await getAdminRevenueSummary(startDate, endDate);
    
    // Get total platform revenue
    const platformTotal = await getPlatformTotalRevenue();

    // Get top earning players
    const supabase = await createClient();
    const { data: topPlayers } = await supabase
      .from('player_earnings')
      .select(`
        player_id,
        total_earnings,
        earnings_from_own_videos,
        earnings_from_team_pool,
        players!inner(full_name, school)
      `)
      .order('total_earnings', { ascending: false })
      .limit(10);

    // Get recent revenue distributions
    const { data: recentDistributions } = await supabase
      .from('revenue_distributions')
      .select(`
        *,
        videos!inner(title),
        source:players!source_player_id(full_name),
        recipient:players!recipient_player_id(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    // Get video statistics
    const { data: videoStats } = await supabase.rpc('get_video_revenue_stats');

    return NextResponse.json({
      summary,
      platformTotal,
      topPlayers: topPlayers?.map(p => ({
        playerId: p.player_id,
        playerName: (p.players as any)?.full_name,
        school: (p.players as any)?.school,
        totalEarnings: parseFloat(p.total_earnings),
        fromOwnVideos: parseFloat(p.earnings_from_own_videos),
        fromTeamPool: parseFloat(p.earnings_from_team_pool),
      })),
      recentDistributions: recentDistributions?.map(d => ({
        id: d.id,
        videoTitle: (d.videos as any)?.title,
        sourcePlayer: (d.source as any)?.full_name,
        recipientPlayer: (d.recipient as any)?.full_name,
        amount: parseFloat(d.amount),
        type: d.distribution_type,
        date: d.created_at,
      })),
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error('Error fetching admin revenue data:', error);
    return NextResponse.json(
      { error: "Failed to fetch admin revenue data" },
      { status: 500 }
    );
  }
}

/**
 * POST - Update daily revenue summary
 * Should be called after daily revenue calculations
 */
export async function POST(request: Request) {
  try {
    const profile = await getCurrentAuthorizationProfile();
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Get today's summary
    const summary = await getAdminRevenueSummary(today, today);

    // Upsert into admin_revenue_summary
    await supabase
      .from('admin_revenue_summary')
      .upsert({
        summary_date: today,
        total_platform_revenue: summary.totalPlatformRevenue.toFixed(2),
        total_publisher_revenue: summary.totalPublisherRevenue.toFixed(2),
        total_player_revenue: summary.totalPlayerRevenue.toFixed(2),
        total_team_pool_revenue: summary.totalTeamPoolRevenue.toFixed(2),
        total_videos_processed: summary.totalVideosProcessed,
        total_views_processed: 0, // Calculate separately if needed
        updated_at: new Date().toISOString(),
      })
      .eq('summary_date', today);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Error updating admin revenue summary:', error);
    return NextResponse.json(
      { error: "Failed to update summary" },
      { status: 500 }
    );
  }
}

