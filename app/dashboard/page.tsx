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

  const [stats, videos, activities, performanceData] = await Promise.all([
    getDashboardStats(playerId),
    getRecentVideos(playerId, 3),
    getRecentActivity(playerId, profile.id),
    getPerformanceStats(playerId, "week"),
  ]);

  const firstName =
    (profile.full_name?.split(" ")[0] ??
      player?.full_name?.split(" ")[0] ??
      "Player");

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {welcome && player?.slug ? (
        <FirstSessionOverview
          firstName={firstName}
          slug={player.slug}
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
