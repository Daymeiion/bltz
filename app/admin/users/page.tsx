import { StatCard } from "@/components/admin/StatCard";
import { UserManagement } from "@/components/admin/UserManagement";
import { ModerationFeed } from "@/components/admin/ModerationFeed";

export const metadata = {
  title: "Admin • Users | BLTZ",
  description: "Manage users across roles and review recent activity.",
};

export default function AdminUsersPage() {
  return (
    <div className="p-3 md:p-8 space-y-4 md:space-y-6 max-w-[1600px] mx-auto">
      {/* Stat Cards: Recent activity snapshot */}
      <div className="grid grid-flow-dense grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
        <StatCard
          title="New Signups"
          value="342"
          trend="+18%"
          trendDirection="up"
          subtitle="vs last period"
          description="Spike from campaign"
        />
        <StatCard
          title="Active Users"
          value="12,480"
          trend="+3%"
          trendDirection="up"
          subtitle="7d average"
          description="Stable engagement"
        />
        <StatCard
          title="Messages Sent"
          value="4,102"
          trend="-5%"
          trendDirection="down"
          subtitle="week-over-week"
          description="Normal variance"
        />
        <StatCard
          title="Blocks"
          value="27"
          trend="+2%"
          trendDirection="up"
          subtitle="moderation actions"
          description="All reviewed"
        />
      </div>

      {/* Users Table (same design as dashboard) */}
      <UserManagement />

      {/* Moderation & Reports Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <ModerationFeed />
        </div>
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          <StatCard
            title="Open Moderations"
            value="9"
            trend="+2"
            trendDirection="up"
            subtitle="last 7 days"
            description="Awaiting review"
          />
          <StatCard
            title="Resolved"
            value="31"
            trend="+6"
            trendDirection="up"
            subtitle="this month"
            description="Average time 14h"
          />
        </div>
      </div>
    </div>
  );
}


