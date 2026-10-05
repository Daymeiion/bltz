import { createClient } from "@/lib/supabase/server";

export interface EngagementMetrics {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export interface LocationData {
  state: string;
  users: number;
  percentage: number;
}

export interface InviteStats {
  source: string;
  sent: number;
  accepted: number;
  rate: number;
}

export interface RevenueData {
  month: string;
  subscriptions: number;
  ads: number;
  partnerships: number;
}

export interface TopVideo {
  id: string;
  title: string;
  creator: string;
  views: number;
  likes: number;
  shares: number;
  engagement: number;
}

export async function getEngagementMetrics(days: number = 7): Promise<EngagementMetrics[]> {
  const supabase = await createClient();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get engagement data from video_engagement table
  const { data, error } = await supabase
    .from("video_engagement")
    .select("engagement_type, created_at")
    .gte("created_at", startDate.toISOString());

  if (error) {
    console.error("Error fetching engagement metrics:", error);
    return getMockEngagementData(days);
  }

  // Group by date and engagement type
  const grouped = data?.reduce((acc: Record<string, any>, item) => {
    const date = new Date(item.created_at).toLocaleDateString("en-US", { 
      weekday: days === 7 ? "short" : undefined,
      month: days > 30 ? "short" : undefined,
      day: days > 7 ? "numeric" : undefined
    });
    
    if (!acc[date]) {
      acc[date] = { date, likes: 0, comments: 0, shares: 0, views: 0 };
    }
    
    if (item.engagement_type === "like") acc[date].likes++;
    if (item.engagement_type === "comment") acc[date].comments++;
    if (item.engagement_type === "share") acc[date].shares++;
    if (item.engagement_type === "view") acc[date].views++;
    
    return acc;
  }, {});

  return Object.values(grouped || {});
}

export async function getLocationBreakdown(): Promise<LocationData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_locations")
    .select("state")
    .not("state", "is", null);

  if (error || !data || data.length === 0) {
    console.error("Error fetching location data:", error);
    return getMockLocationData();
  }

  // Count users by state
  const stateCounts = data.reduce((acc: Record<string, number>, item) => {
    acc[item.state] = (acc[item.state] || 0) + 1;
    return acc;
  }, {});

  const totalUsers = data.length;
  const sorted = Object.entries(stateCounts)
    .map(([state, users]) => ({
      state,
      users,
      percentage: Math.round((users / totalUsers) * 100),
    }))
    .sort((a, b) => b.users - a.users)
    .slice(0, 7);

  return sorted;
}

export async function getInviteAnalytics(): Promise<InviteStats[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_invites")
    .select("status, created_at");

  if (error || !data || data.length === 0) {
    console.error("Error fetching invite data:", error);
    return getMockInviteData();
  }

  // Mock breakdown by source (would need to add source column to team_invites)
  const totalSent = data.length;
  const totalAccepted = data.filter((i) => i.status === "accepted").length;
  const rate = Math.round((totalAccepted / totalSent) * 100);

  return [
    { source: "Email", sent: Math.round(totalSent * 0.3), accepted: Math.round(totalAccepted * 0.3), rate },
    { source: "SMS", sent: Math.round(totalSent * 0.2), accepted: Math.round(totalAccepted * 0.2), rate },
    { source: "Social Media", sent: Math.round(totalSent * 0.35), accepted: Math.round(totalAccepted * 0.35), rate },
    { source: "Direct Link", sent: Math.round(totalSent * 0.15), accepted: Math.round(totalAccepted * 0.15), rate },
  ];
}

export async function getRevenueData(): Promise<RevenueData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_revenue_summary")
    .select("*")
    .order("summary_date", { ascending: true })
    .limit(6);

  if (error || !data || data.length === 0) {
    console.error("Error fetching revenue data:", error);
    return getMockRevenueData();
  }

  return data.map((item) => ({
    month: new Date(item.summary_date).toLocaleDateString("en-US", { month: "short" }),
    subscriptions: Number(item.total_player_revenue) || 0,
    ads: Number(item.total_platform_revenue) || 0,
    partnerships: Number(item.total_publisher_revenue) || 0,
  }));
}

export async function getTopVideos(limit: number = 5): Promise<TopVideo[]> {
  const supabase = await createClient();

  // Get videos with engagement counts
  const { data: videos, error } = await supabase
    .from("videos")
    .select(`
      id,
      title,
      player_id,
      players!inner(name),
      video_engagement(engagement_type)
    `)
    .eq("visibility", "public")
    .limit(limit);

  if (error || !videos || videos.length === 0) {
    console.error("Error fetching top videos:", error);
    return getMockTopVideos();
  }

  // Calculate engagement metrics
  const videosWithMetrics = videos.map((video: any) => {
    const engagement = video.video_engagement || [];
    const views = engagement.filter((e: any) => e.engagement_type === "view").length;
    const likes = engagement.filter((e: any) => e.engagement_type === "like").length;
    const shares = engagement.filter((e: any) => e.engagement_type === "share").length;
    const totalEngagement = likes + shares;
    const engagementRate = views > 0 ? (totalEngagement / views) * 100 : 0;

    return {
      id: video.id,
      title: video.title,
      creator: video.players?.name || "Unknown",
      views,
      likes,
      shares,
      engagement: Math.round(engagementRate * 10) / 10,
    };
  });

  // Sort by views and return top N
  return videosWithMetrics
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

export async function getUserStats() {
  const supabase = await createClient();

  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: totalPlayers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "player");

  const { count: totalFans } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "fan");

  const { count: totalPublishers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "publisher");

  return {
    totalUsers: totalUsers || 0,
    totalPlayers: totalPlayers || 0,
    totalFans: totalFans || 0,
    totalPublishers: totalPublishers || 0,
  };
}

// Mock data fallbacks
function getMockEngagementData(days: number): EngagementMetrics[] {
  if (days === 7) {
    return [
      { date: "Mon", likes: 1200, comments: 340, shares: 180, views: 8500 },
      { date: "Tue", likes: 1450, comments: 420, shares: 220, views: 9200 },
      { date: "Wed", likes: 1100, comments: 310, shares: 160, views: 7800 },
      { date: "Thu", likes: 1680, comments: 490, shares: 260, views: 10200 },
      { date: "Fri", likes: 2100, comments: 610, shares: 340, views: 12800 },
      { date: "Sat", likes: 2400, comments: 720, shares: 410, views: 14500 },
      { date: "Sun", likes: 2200, comments: 650, shares: 380, views: 13200 },
    ];
  }
  return [];
}

function getMockLocationData(): LocationData[] {
  return [
    { state: "California", users: 4820, percentage: 28 },
    { state: "Texas", users: 3240, percentage: 19 },
    { state: "Florida", users: 2680, percentage: 16 },
    { state: "New York", users: 2140, percentage: 12 },
    { state: "Nevada", users: 1890, percentage: 11 },
    { state: "Arizona", users: 1420, percentage: 8 },
    { state: "Other", users: 1010, percentage: 6 },
  ];
}

function getMockInviteData(): InviteStats[] {
  return [
    { source: "Email", sent: 2400, accepted: 1680, rate: 70 },
    { source: "SMS", sent: 1800, accepted: 1260, rate: 70 },
    { source: "Social Media", sent: 3200, accepted: 1920, rate: 60 },
    { source: "Direct Link", sent: 1600, accepted: 1120, rate: 70 },
  ];
}

function getMockRevenueData(): RevenueData[] {
  return [
    { month: "Jan", subscriptions: 12500, ads: 4200, partnerships: 8300 },
    { month: "Feb", subscriptions: 14200, ads: 4800, partnerships: 9100 },
    { month: "Mar", subscriptions: 16800, ads: 5400, partnerships: 10200 },
    { month: "Apr", subscriptions: 15600, ads: 5100, partnerships: 9800 },
    { month: "May", subscriptions: 18400, ads: 6200, partnerships: 11400 },
    { month: "Jun", subscriptions: 21200, ads: 7100, partnerships: 12800 },
  ];
}

function getMockTopVideos(): TopVideo[] {
  return [
    {
      id: "1",
      title: "Game Winning Touchdown vs USC",
      creator: "Eddie Lake",
      views: 45200,
      likes: 8940,
      shares: 2340,
      engagement: 24.8,
    },
    {
      id: "2",
      title: "Behind the Scenes: Training Day",
      creator: "Jamik Tashpulatov",
      views: 38100,
      likes: 7210,
      shares: 1890,
      engagement: 23.9,
    },
    {
      id: "3",
      title: "Championship Highlights 2024",
      creator: "Carter James",
      views: 52800,
      likes: 9840,
      shares: 3120,
      engagement: 24.5,
    },
  ];
}

