"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GrowthData {
  month: string;
  userGrowth: number;
  playerGrowth: number;
}

export function GrowthRateChart() {
  const [data, setData] = useState<GrowthData[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration - replace with real API call
  useEffect(() => {
    const mockData: GrowthData[] = [
      { month: "Jan", userGrowth: 2.1, playerGrowth: 1.8 },
      { month: "Feb", userGrowth: 3.2, playerGrowth: 2.5 },
      { month: "Mar", userGrowth: 4.1, playerGrowth: 3.2 },
      { month: "Apr", userGrowth: 3.8, playerGrowth: 4.1 },
      { month: "May", userGrowth: 5.2, playerGrowth: 3.9 },
      { month: "Jun", userGrowth: 4.5, playerGrowth: 5.3 },
      { month: "Jul", userGrowth: 6.1, playerGrowth: 4.7 },
      { month: "Aug", userGrowth: 5.8, playerGrowth: 6.2 },
      { month: "Sep", userGrowth: 7.2, playerGrowth: 5.9 },
      { month: "Oct", userGrowth: 6.9, playerGrowth: 7.1 },
      { month: "Nov", userGrowth: 8.3, playerGrowth: 6.8 },
      { month: "Dec", userGrowth: 7.8, playerGrowth: 8.5 },
    ];

    // Simulate API loading
    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <Card className="bg-neutral-900/50 border border-neutral-800 rounded-xl">
        <CardHeader>
          <CardTitle className="text-white">Growth Rate Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-neutral-400">Loading growth data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxGrowth = Math.max(...data.map(d => Math.max(d.userGrowth, d.playerGrowth)));
  const minGrowth = Math.min(...data.map(d => Math.min(d.userGrowth, d.playerGrowth)));
  const range = maxGrowth - minGrowth;
  const padding = range * 0.1;

  return (
    <Card className="bg-neutral-900/50 border border-neutral-800 rounded-xl">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          Growth Rate Analysis
          <div className="flex items-center gap-4 text-sm text-neutral-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#000CF5] rounded-full"></div>
              <span>User Growth</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#FFCA33] rounded-full"></div>
              <span>Player Growth</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 relative">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 200"
            className="overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <line
                key={i}
                x1="60"
                y1={20 + (i * 16)}
                x2="740"
                y2={20 + (i * 16)}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-neutral-700"
              />
            ))}

            {/* Y-axis labels */}
            {[0, 2, 4, 6, 8, 10].map((value) => (
              <text
                key={value}
                x="50"
                y={20 + ((10 - value) * 16)}
                textAnchor="end"
                className="text-xs fill-neutral-500"
              >
                {value}%
              </text>
            ))}

            {/* X-axis labels */}
            {data.map((item, index) => (
              <text
                key={item.month}
                x={60 + (index * 60)}
                y="190"
                textAnchor="middle"
                className="text-xs fill-neutral-500"
              >
                {item.month}
              </text>
            ))}

            {/* User Growth Line */}
            <polyline
              fill="none"
              stroke="#000CF5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={data.map((item, index) => {
                const x = 60 + (index * 60);
                const y = 20 + ((maxGrowth + padding - item.userGrowth) / (maxGrowth - minGrowth + 2 * padding)) * 160;
                return `${x},${y}`;
              }).join(" ")}
            />

            {/* Player Growth Line */}
            <polyline
              fill="none"
              stroke="#FFCA33"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={data.map((item, index) => {
                const x = 60 + (index * 60);
                const y = 20 + ((maxGrowth + padding - item.playerGrowth) / (maxGrowth - minGrowth + 2 * padding)) * 160;
                return `${x},${y}`;
              }).join(" ")}
            />

            {/* Data points for User Growth */}
            {data.map((item, index) => {
              const x = 60 + (index * 60);
              const y = 20 + ((maxGrowth + padding - item.userGrowth) / (maxGrowth - minGrowth + 2 * padding)) * 160;
              return (
                <circle
                  key={`user-${index}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#000CF5"
                  className="hover:r-6 transition-all duration-200"
                />
              );
            })}

            {/* Data points for Player Growth */}
            {data.map((item, index) => {
              const x = 60 + (index * 60);
              const y = 20 + ((maxGrowth + padding - item.playerGrowth) / (maxGrowth - minGrowth + 2 * padding)) * 160;
              return (
                <circle
                  key={`player-${index}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#FFCA33"
                  className="hover:r-6 transition-all duration-200"
                />
              );
            })}
          </svg>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-neutral-800/50 rounded-lg p-4">
            <div className="text-sm text-neutral-400 mb-1">Average User Growth</div>
            <div className="text-2xl font-bold text-[#000CF5]">
              {(data.reduce((sum, item) => sum + item.userGrowth, 0) / data.length).toFixed(1)}%
            </div>
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-4">
            <div className="text-sm text-neutral-400 mb-1">Average Player Growth</div>
            <div className="text-2xl font-bold text-[#FFCA33]">
              {(data.reduce((sum, item) => sum + item.playerGrowth, 0) / data.length).toFixed(1)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
