"use client";

import Link from "next/link";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentVideos } from "@/components/dashboard/RecentVideos";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import type { DashboardStats, VideoWithStats, Activity } from "@/lib/queries/dashboard";
import { useRouter } from "next/navigation";

interface DashboardClientProps {
  firstName: string;
  initialStats: DashboardStats;
  initialVideos: VideoWithStats[];
  initialActivities: Activity[];
  initialPerformanceData: { date: string; views: number; watchTime: number }[];
  dailyQuote: string;
  quoteAuthor: string;
}

export default function DashboardClient({
  firstName,
  initialStats,
  initialVideos,
  initialActivities,
  initialPerformanceData,
  dailyQuote,
  quoteAuthor,
}: DashboardClientProps) {
  const router = useRouter();

  return (
    <Dashboard
      firstName={firstName}
      stats={initialStats}
      videos={initialVideos}
      activities={initialActivities}
      performanceData={initialPerformanceData}
      dailyQuote={dailyQuote}
      quoteAuthor={quoteAuthor}
      router={router}
    />
  );
}

// Main dashboard content area
const Dashboard = ({
  firstName,
  stats,
  videos,
  activities,
  performanceData,
  dailyQuote,
  quoteAuthor,
  router,
}: {
  firstName: string;
  stats: DashboardStats;
  videos: VideoWithStats[];
  activities: Activity[];
  performanceData: { date: string; views: number; watchTime: number }[];
  dailyQuote: string;
  quoteAuthor: string;
  router: any;
}) => {
  const handlePeriodChange = (period: 'week' | 'month' | 'year') => {
    // Refresh data with new period
    router.refresh();
  };

  return (
    <div className="flex flex-1 w-full">
      <div className="p-6 md:p-10 bg-gradient-to-br from-[hsl(var(--bltz-navy))] via-[#000000] to-[#000000] flex flex-col gap-8 flex-1 w-full h-full overflow-auto scrollbar-hide">
        
        {/* Welcome Header - Top of Dashboard */}
        <div className="relative">
          {/* Decorative background element */}
          <div className="absolute -top-4 -left-4 w-72 h-72 bg-bltz-blue/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-4 -right-4 w-96 h-96 bg-bltz-blue/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-8 rounded-md bg-gray-600/40 backdrop-blur-sm border border-gray-600/50">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Welcome back, <span className="text-white">{firstName}.</span>
              </h1>
              <div className="flex items-start gap-4 bg-transparent p-4 rounded-md ">
                <div className="w-1 h-full bg-transparent rounded-full" />
                <div className="flex flex-col gap-2">
                  <p className="text-base md:text-xl text-bltz-white/90 italic font-semibold leading-relaxed">
                    "{dailyQuote}"
                  </p>
                  <p className="text-sm text-bltz-gold font-bold uppercase tracking-wider">
                    — {quoteAuthor}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link 
                href="/dashboard/videos"
                className="group relative overflow-hidden px-6 py-3 rounded-md border-2 border-gray-600/50 bg-transparent text-white font-bold text-xs transition-all duration-300 hover:border-bltz-gold hover:shadow-lg hover:shadow-bltz-gold/20 hover:scale-105"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-bltz-gold/0 via-bltz-gold/10 to-bltz-gold/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                <span className="relative flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="group-hover:text-bltz-gold transition-colors duration-300">Upload Video</span>
                </span>
              </Link>
              <Link
                href="/dashboard/settings"
                className="px-4 py-2 border-2 border-gray-600/50 hover:border-gray-600/50 hover:bg-gray-600/50 text-bltz-gold rounded-md font-bold transition-all duration-300 text-center text-sm"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards - Real Data */}
        <StatsCards stats={stats} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          {/* Recent Videos - Real Data */}
          <div className="lg:col-span-2 bg-black/40 backdrop-blur-md rounded-md border border-gray-600/50 p-8 card-hover">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <span className="w-1 h-8 bg-bltz-gold rounded-full" />
                Recent Videos
              </h2>
              <Link href="/dashboard/videos" className="px-4 py-2 bg-bltz-gold/20 hover:bg-bltz-gold/30 text-bltz-gold rounded-lg font-bold transition-all">
                View All →
              </Link>
            </div>
            <RecentVideos videos={videos} />
          </div>

          {/* Activity Feed - Real Data */}
          <div className="bg-black/40 backdrop-blur-md rounded-md border border-gray-600/50 p-8 card-hover">
            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
              <span className="w-1 h-8 bg-bltz-blue rounded-full" />
              Recent Activity
            </h2>
            <ActivityFeed activities={activities} />
          </div>
        </div>

        {/* Performance Chart - Real Data */}
        <div className="bg-black/40 backdrop-blur-md rounded-md border border-gray-600/50 p-8 card-hover">
          <PerformanceChart 
            data={performanceData}
            onPeriodChange={handlePeriodChange}
          />
        </div>
      </div>
    </div>
  );
};

