import { createClient } from "@/lib/supabase/server";
import { getPlayerEarnings } from "./revenue";

export interface DashboardStats {
  videoCount: number;
  videoGrowth: number;
  viewCount: number;
  viewGrowth: number;
  followerCount: number;
  followerGrowth: number;
  achievementCount: number;
  recentAchievements: number;
  revenue: number;
  revenueGrowth: number;
}

export interface VideoWithStats {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  playback_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  views: number;
  watch_time: number;
}

export interface Activity {
  id: string;
  type: 'video_upload' | 'profile_view' | 'follower' | 'achievement' | 'video_view';
  description: string;
  timestamp: string;
  metadata?: any;
}


/**
 * Get comprehensive dashboard statistics for a player
 */
export async function getDashboardStats(playerId: string): Promise<DashboardStats> {
  const supabase = await createClient();
  
  // Get current video count
  const { count: videoCount } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('visibility', 'public');

  // Get videos from last week for growth
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const { count: recentVideos } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .gte('created_at', lastWeek.toISOString());

  // Get total views (from views table)
  const { count: viewCount } = await supabase
    .from('views')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId);

  // Get views from last month for growth calculation
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const { count: lastMonthViews } = await supabase
    .from('views')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .gte('created_at', lastMonth.toISOString());

  const { count: currentMonthViews } = await supabase
    .from('views')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .gte('created_at', lastMonth.toISOString());

  // Calculate view growth percentage
  const viewGrowth = lastMonthViews && lastMonthViews > 0 
    ? Math.round(((currentMonthViews || 0) / lastMonthViews - 1) * 100)
    : 0;

  // For followers, we'll use profile views as a proxy since we don't have a followers table yet
  const { data: playerData } = await supabase
    .from('players')
    .select('id')
    .eq('id', playerId)
    .single();

  // Get unique viewers as follower count
  const { data: uniqueViewers } = await supabase
    .from('views')
    .select('user_id')
    .eq('player_id', playerId)
    .not('user_id', 'is', null);

  const followerCount = uniqueViewers 
    ? new Set(uniqueViewers.map(v => v.user_id)).size 
    : 0;

  // Get followers from last week
  const { data: recentViewers } = await supabase
    .from('views')
    .select('user_id')
    .eq('player_id', playerId)
    .gte('created_at', lastWeek.toISOString())
    .not('user_id', 'is', null);

  const followerGrowth = recentViewers 
    ? new Set(recentViewers.map(v => v.user_id)).size 
    : 0;

  // Get player's total earnings from all sources
  const earnings = await getPlayerEarnings(playerId);
  const totalRevenue = earnings.total;
  
  // Calculate revenue growth based on last month
  // For growth, we'll compare current total to estimated last month total
  // This is a simplified calculation - you may want to track historical earnings
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const { count: lastMonthViewCount } = await supabase
    .from('views')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .lt('created_at', lastMonthDate.toISOString());
  
  const estimatedLastMonthRevenue = (lastMonthViewCount || 0) * 0.05;
  const revenueGrowth = estimatedLastMonthRevenue > 0 
    ? Math.round(((totalRevenue - estimatedLastMonthRevenue) / estimatedLastMonthRevenue) * 100)
    : totalRevenue > 0 ? 100 : 0;

  return {
    videoCount: videoCount || 0,
    videoGrowth: recentVideos || 0,
    viewCount: viewCount || 0,
    viewGrowth,
    followerCount,
    followerGrowth,
    achievementCount: 8, // Placeholder - implement achievements system
    recentAchievements: 2, // Placeholder
    revenue: Math.round(totalRevenue),
    revenueGrowth,
  };
}

/**
 * Get recent videos for a player
 */
export async function getRecentVideos(
  playerId: string, 
  limit: number = 3
): Promise<VideoWithStats[]> {
  const supabase = await createClient();
  
  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !videos) {
    return [];
  }

  // Get view counts for each video
  const videosWithStats = await Promise.all(
    videos.map(async (video) => {
      const { count: views } = await supabase
        .from('views')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', video.id);

      const { data: watchTimeData } = await supabase
        .from('views')
        .select('seconds_watched')
        .eq('video_id', video.id);

      const watch_time = watchTimeData?.reduce((sum, v) => sum + (v.seconds_watched || 0), 0) || 0;

      return {
        ...video,
        views: views || 0,
        watch_time,
      };
    })
  );

  return videosWithStats;
}

/**
 * Get recent activity for a player
 */
export async function getRecentActivity(
  playerId: string,
  userId: string,
  limit: number = 5
): Promise<Activity[]> {
  const supabase = await createClient();
  const activities: Activity[] = [];

  // Get recent video uploads
  const { data: recentVideos } = await supabase
    .from('videos')
    .select('id, title, created_at')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(2);

  if (recentVideos) {
    recentVideos.forEach(video => {
      activities.push({
        id: `video-${video.id}`,
        type: 'video_upload',
        description: `Uploaded "${video.title}"`,
        timestamp: video.created_at,
      });
    });
  }

  // Get recent views
  const { data: recentViews } = await supabase
    .from('views')
    .select('id, created_at, video_id')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (recentViews) {
    recentViews.forEach(view => {
      activities.push({
        id: `view-${view.id}`,
        type: 'video_view',
        description: 'Your video received a new view',
        timestamp: view.created_at,
      });
    });
  }

  // Sort by timestamp and limit
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Get performance stats for chart
 */
export async function getPerformanceStats(
  playerId: string,
  period: 'week' | 'month' | 'year' = 'week'
): Promise<{ date: string; views: number; watchTime: number }[]> {
  const supabase = await createClient();
  
  const now = new Date();
  let startDate = new Date();
  let grouping = 'day';

  switch (period) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      grouping = 'day';
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      grouping = 'day';
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      grouping = 'month';
      break;
  }

  const { data: views } = await supabase
    .from('views')
    .select('created_at, seconds_watched')
    .eq('player_id', playerId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (!views || views.length === 0) {
    // Return empty data with dates
    return generateEmptyStats(period);
  }

  // Group by date
  const grouped: { [key: string]: { views: number; watchTime: number } } = {};
  
  views.forEach(view => {
    const date = new Date(view.created_at);
    const key = grouping === 'day'
      ? date.toISOString().split('T')[0]
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped[key]) {
      grouped[key] = { views: 0, watchTime: 0 };
    }
    grouped[key].views += 1;
    grouped[key].watchTime += view.seconds_watched || 0;
  });

  return Object.entries(grouped).map(([date, stats]) => ({
    date,
    views: stats.views,
    watchTime: Math.round(stats.watchTime / 60), // Convert to minutes
  }));
}

/**
 * Generate empty stats for periods with no data
 */
function generateEmptyStats(period: 'week' | 'month' | 'year') {
  const stats: { date: string; views: number; watchTime: number }[] = [];
  const now = new Date();
  
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    stats.push({
      date: date.toISOString().split('T')[0],
      views: 0,
      watchTime: 0,
    });
  }
  
  return stats;
}


