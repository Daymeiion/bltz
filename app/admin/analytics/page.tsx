import { StatCard } from "@/components/admin/StatCard";
import { EngagementChart } from "@/components/admin/analytics/EngagementChart";
import { LocationMap } from "@/components/admin/analytics/LocationMap";
import { InviteAnalytics } from "@/components/admin/analytics/InviteAnalytics";
import { RevenueChart } from "@/components/admin/analytics/RevenueChart";
import { TopContent } from "@/components/admin/analytics/TopContent";

export const metadata = {
  title: "Admin • Analytics | BLTZ",
  description: "Comprehensive analytics dashboard for BLTZ platform performance.",
};

export default function AdminAnalyticsPage() {
  return (
    <div className="p-3 md:p-8 space-y-4 md:space-y-6 max-w-[1600px] mx-auto">
      {/* Overview Stats */}
      <div>
        <div className="grid grid-flow-dense grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value="17,200"
            trend="+15%"
            trendDirection="up"
            subtitle="vs last month"
            description="Strong growth trajectory"
          />
          <StatCard
            title="Engagement Rate"
            value="68.4%"
            trend="+8%"
            trendDirection="up"
            subtitle="avg per session"
            description="Above industry avg"
          />
          <StatCard
            title="Video Views"
            value="2.4M"
            trend="+22%"
            trendDirection="up"
            subtitle="this month"
            description="Record high views"
          />
          <StatCard
            title="Avg Session"
            value="12m 34s"
            trend="-2%"
            trendDirection="down"
            subtitle="time on platform"
            description="Slight decrease"
          />
        </div>
      </div>

      {/* Content Engagement Chart */}
      <EngagementChart />

      {/* Revenue & Location Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <LocationMap />
      </div>

      {/* Invites & Top Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InviteAnalytics />
        <TopContent />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-neutral-400 mb-4">Device Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">Mobile</span>
              <span className="text-sm font-semibold text-white">62%</span>
            </div>
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#000CF5] rounded-full" style={{ width: "62%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">Desktop</span>
              <span className="text-sm font-semibold text-white">28%</span>
            </div>
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#FFCA33] rounded-full" style={{ width: "28%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">Tablet</span>
              <span className="text-sm font-semibold text-white">10%</span>
            </div>
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "10%" }} />
            </div>
          </div>
        </div>

        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-neutral-400 mb-4">Traffic Sources</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-300">Direct</span>
                <span className="text-sm font-semibold text-white">45%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#000CF5] rounded-full" style={{ width: "45%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-300">Social Media</span>
                <span className="text-sm font-semibold text-white">32%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#FFCA33] rounded-full" style={{ width: "32%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-300">Referral</span>
                <span className="text-sm font-semibold text-white">23%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "23%" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-neutral-400 mb-4">User Retention</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-300">Day 1</span>
                <span className="text-sm font-semibold text-white">85%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#000CF5] rounded-full" style={{ width: "85%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-300">Day 7</span>
                <span className="text-sm font-semibold text-white">62%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#FFCA33] rounded-full" style={{ width: "62%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-300">Day 30</span>
                <span className="text-sm font-semibold text-white">48%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "48%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

