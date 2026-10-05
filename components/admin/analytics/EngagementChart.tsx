"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface EngagementData {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export function EngagementChart() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const mockData: EngagementData[] =
    timeRange === "7d"
      ? [
          { date: "Mon", likes: 1200, comments: 340, shares: 180, views: 8500 },
          { date: "Tue", likes: 1450, comments: 420, shares: 220, views: 9200 },
          { date: "Wed", likes: 1100, comments: 310, shares: 160, views: 7800 },
          { date: "Thu", likes: 1680, comments: 490, shares: 260, views: 10200 },
          { date: "Fri", likes: 2100, comments: 610, shares: 340, views: 12800 },
          { date: "Sat", likes: 2400, comments: 720, shares: 410, views: 14500 },
          { date: "Sun", likes: 2200, comments: 650, shares: 380, views: 13200 },
        ]
      : timeRange === "30d"
      ? [
          { date: "W1", likes: 6200, comments: 1800, shares: 980, views: 42000 },
          { date: "W2", likes: 7100, comments: 2100, shares: 1150, views: 48500 },
          { date: "W3", likes: 6800, comments: 1950, shares: 1080, views: 45200 },
          { date: "W4", likes: 8400, comments: 2450, shares: 1380, views: 54800 },
        ]
      : [
          { date: "Jan", likes: 24500, comments: 7200, shares: 4100, views: 168000 },
          { date: "Feb", likes: 28200, comments: 8400, shares: 4800, views: 195000 },
          { date: "Mar", likes: 31800, comments: 9600, shares: 5500, views: 218000 },
        ];

  const maxValue = Math.max(...mockData.map((d) => d.views));

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Content Engagement</h3>
          <p className="text-sm text-neutral-500">Track likes, comments, shares & views</p>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#000CF5]"></div>
              <span className="text-xs text-neutral-400">Views</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FFCA33]"></div>
              <span className="text-xs text-neutral-400">Likes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-neutral-400">Comments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-xs text-neutral-400">Shares</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-neutral-800/50 rounded-lg p-1">
          <button
            onClick={() => setTimeRange("7d")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              timeRange === "7d" ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"
            )}
          >
            7 days
          </button>
          <button
            onClick={() => setTimeRange("30d")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              timeRange === "30d" ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"
            )}
          >
            30 days
          </button>
          <button
            onClick={() => setTimeRange("90d")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              timeRange === "90d" ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"
            )}
          >
            90 days
          </button>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="relative h-64 md:h-72 mt-4">
        <div className="flex items-end justify-between h-full gap-2 px-2">
          {mockData.map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="w-full flex flex-col items-center gap-0.5 h-full justify-end">
                {/* Views bar */}
                <div
                  className="w-full bg-[#000CF5] rounded-t hover:opacity-80 transition-opacity cursor-pointer relative group"
                  style={{ height: `${(item.views / maxValue) * 100}%` }}
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {item.views.toLocaleString()}
                  </span>
                </div>
              </div>
              <span className="text-xs text-neutral-500 mt-2">{item.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-800">
        <div>
          <p className="text-xs text-neutral-500 mb-1">Total Views</p>
          <p className="text-xl font-bold text-white">
            {mockData.reduce((sum, d) => sum + d.views, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Total Likes</p>
          <p className="text-xl font-bold text-[#FFCA33]">
            {mockData.reduce((sum, d) => sum + d.likes, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Total Comments</p>
          <p className="text-xl font-bold text-emerald-400">
            {mockData.reduce((sum, d) => sum + d.comments, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Total Shares</p>
          <p className="text-xl font-bold text-purple-400">
            {mockData.reduce((sum, d) => sum + d.shares, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

