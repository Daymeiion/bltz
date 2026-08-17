import { Suspense } from "react";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";
import { FirstSessionOverview } from "@/components/dashboard/FirstSessionOverview";
import {
  getDashboardStats,
  getRecentVideos,
  getRecentActivity,
  getPerformanceStats,
} from "@/lib/queries/dashboard";
import { getCurrentUserProfile } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { Skeleton } from "@/components/ui/skeleton";
import { isTestUserId } from "@/lib/onboarding/test-auth";
import type { Activity, DashboardStats, VideoWithStats } from "@/lib/queries/dashboard";

export const metadata = {
  title: "Player Dashboard | BLTZ",
  description: "Your personal athlete dashboard",
};

const QUOTES = [
  { text: "The only way to prove that you're a good sport is to lose.", author: "Ernie Banks" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "The difference between the impossible and the possible lies in determination.", author: "Tommy Lasorda" },
];

const DEMO_STATS: DashboardStats = {
  videoCount: 12,
  videoGrowth: 2,
  viewCount: 842000,
  viewGrowth: 18,
  followerCount: 12840,
  followerGrowth: 324,
  achievementCount: 6,
  recentAchievements: 1,
  revenue: 2450,
  revenueGrowth: 12,
};

const DEMO_VIDEOS: VideoWithStats[] = [
  {
    id: "demo-video-1",
    title: "2025 Season Highlights",
    description: "Top plays from the 2025 season.",
    thumbnail_url: "/images/Awards/video-thumb.png",
    playback_url: "/videos/demo.mp4",
    duration_seconds: 167,
    created_at: "2026-08-08T12:00:00.000Z",
    views: 326400,
    watch_time: 214800,
    href: "/player/test-null-user-id/videos/cfb-2025",
  },
  {
    id: "demo-video-2",
    title: "High School Senior Film",
    description: "The film that started the journey.",
    thumbnail_url: "/images/Awards/video-thumb.png",
    playback_url: "/videos/demo.mp4",
    duration_seconds: 126,
    created_at: "2026-08-02T12:00:00.000Z",
    views: 214900,
    watch_time: 126300,
    href: "/player/test-null-user-id/videos/hs-2021",
  },
  {
    id: "demo-video-3",
    title: "Off the Field",
    description: "Training, preparation, and community work.",
    thumbnail_url: "/images/Awards/video-thumb.png",
    playback_url: "/videos/demo.mp4",
    duration_seconds: 98,
    created_at: "2026-07-28T12:00:00.000Z",
    views: 118700,
    watch_time: 68400,
    href: "/player/test-null-user-id/videos/off-field-2025",
  },
];

const DEMO_ACTIVITIES: Activity[] = [
  { id: "demo-activity-1", type: "video_view", description: "2025 Season Highlights passed 300K views", timestamp: "2026-08-11T16:00:00.000Z" },
  { id: "demo-activity-2", type: "follower", description: "324 new followers this week", timestamp: "2026-08-10T18:30:00.000Z" },
  { id: "demo-activity-3", type: "achievement", description: "A new verified award was added", timestamp: "2026-08-09T14:00:00.000Z" },
];

const DEMO_PERFORMANCE = Array.from({ length: 8 }, (_, index) => {
  const date = new Date("2026-08-04T12:00:00.000Z");
  date.setDate(date.getDate() + index);
  return {
    date: date.toISOString(),
    views: [6400, 8200, 7900, 12400, 10900, 14800, 13600, 17200][index],
    watchTime: [420, 510, 485, 730, 680, 860, 790, 940][index],
  };
});

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; slug?: string }>;
}) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  const { data: player } = await supabase
    .from("players")
    .select("id, slug, full_name, headshot_url, image_url")
    .eq("user_id", profile.id)
    .maybeSingle();

  const playerId = player?.id ?? profile.player_id;

  // Fans (or browsers without an athlete intent) see a fan dashboard, not the
  // player flow. Only push to onboarding when this user actually wants to be
  // an athlete on BLTZ.
  if (!playerId) {
    if (profile.role === "player") redirect("/onboarding");
    redirect("/");
  }

  const params = await searchParams;
  const welcome = params.welcome === "1";
  const todayQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  const [stats, videos, activities, performanceData] = isTestUserId(profile.id)
    ? [DEMO_STATS, DEMO_VIDEOS, DEMO_ACTIVITIES, DEMO_PERFORMANCE]
    : await Promise.all([
        getDashboardStats(playerId),
        getRecentVideos(playerId, 3),
        getRecentActivity(playerId, profile.id),
        getPerformanceStats(playerId, "week"),
      ]);

  const firstName =
    (profile.display_name?.split(" ")[0] ??
      player?.full_name?.split(" ")[0] ??
      "Player");

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {welcome && player?.slug ? (
        <FirstSessionOverview
          firstName={firstName}
          slug={player.slug}
          athleteId={playerId}
          headshotUrl={player.headshot_url ?? player.image_url ?? null}
        />
      ) : null}
      <DashboardClient
        firstName={firstName}
        initialStats={stats}
        initialVideos={videos}
        initialActivities={activities}
        initialPerformanceData={performanceData}
        dailyQuote={todayQuote.text}
        quoteAuthor={todayQuote.author}
      />
    </Suspense>
  );
}
