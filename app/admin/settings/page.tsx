"use client";

import { useState } from "react";
import { StatCard } from "@/components/admin/StatCard";
import { SiteConfiguration } from "@/components/admin/settings/SiteConfiguration";
import { UserManagementSettings } from "@/components/admin/settings/UserManagementSettings";
import { ContentModerationSettings } from "@/components/admin/settings/ContentModerationSettings";
import { EmailNotificationSettings } from "@/components/admin/settings/EmailNotificationSettings";
import { SecuritySettings } from "@/components/admin/settings/SecuritySettings";
import { SystemSettings } from "@/components/admin/settings/SystemSettings";
import { IntegrationSettings } from "@/components/admin/settings/IntegrationSettings";
import { SetupRequired } from "@/components/admin/settings/SetupRequired";
import { Bell, Cable, Database, Fingerprint, SlidersHorizontal, Users, Waypoints } from "lucide-react";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("site");

  const tabs = [
    { id: "site", label: "Site Configuration", icon: SlidersHorizontal },
    { id: "users", label: "User Management", icon: Users },
    { id: "moderation", label: "Content Moderation", icon: Waypoints },
    { id: "notifications", label: "Email & Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Fingerprint },
    { id: "system", label: "System", icon: Database },
    { id: "integrations", label: "Integrations", icon: Cable },
  ];

  return (
    <div className="p-3 md:p-8 space-y-4 md:space-y-6 max-w-[1600px] mx-auto">
      {/* Settings Overview Stats */}
      <div className="grid grid-flow-dense grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
        <StatCard
          title="Active Users"
          value="12,480"
          trend="+3%"
          trendDirection="up"
          subtitle="Currently online"
          description="Real-time user count"
        />
        <StatCard
          title="System Health"
          value="99.9%"
          trend="+0.1%"
          trendDirection="up"
          subtitle="Uptime this month"
          description="Platform stability"
        />
        <StatCard
          title="Pending Changes"
          value="3"
          trend="0"
          trendDirection="up"
          subtitle="Awaiting approval"
          description="Configuration updates"
        />
        <StatCard
          title="Last Backup"
          value="2h ago"
          trend="On schedule"
          trendDirection="up"
          subtitle="Automated backup"
          description="Data protection active"
        />
      </div>

      {/* Settings Navigation */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 md:p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[#171717] text-[#fafafa] dark:bg-[#fafafa] dark:text-[#171717]"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )})}
        </div>

        {/* Settings Content */}
        <div className="min-h-[400px]">
          <SetupRequired />
          {activeTab === "site" && <SiteConfiguration />}
          {activeTab === "users" && <UserManagementSettings />}
          {activeTab === "moderation" && <ContentModerationSettings />}
          {activeTab === "notifications" && <EmailNotificationSettings />}
          {activeTab === "security" && <SecuritySettings />}
          {activeTab === "system" && <SystemSettings />}
          {activeTab === "integrations" && <IntegrationSettings />}
        </div>
      </div>
    </div>
  );
}
