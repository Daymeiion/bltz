"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ChartDataPoint {
  date: string;
  fanVisits: number;
  playerVisits: number;
}

interface VisitorsChartProps {
  data?: ChartDataPoint[];
}

export function VisitorsChart({ data }: VisitorsChartProps) {
  const [activeTab, setActiveTab] = useState<"3months" | "30days" | "7days">("7days");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Mock data for the chart (you'll replace this with real data)
  const mockData: ChartDataPoint[] =
    activeTab === "7days"
      ? [
          { date: "Mon", fanVisits: 720, playerVisits: 480 },
          { date: "Tue", fanVisits: 1140, playerVisits: 760 },
          { date: "Wed", fanVisits: 900, playerVisits: 600 },
          { date: "Thu", fanVisits: 1320, playerVisits: 880 },
          { date: "Fri", fanVisits: 1680, playerVisits: 1120 },
          { date: "Sat", fanVisits: 1920, playerVisits: 1280 },
          { date: "Sun", fanVisits: 1740, playerVisits: 1160 },
        ]
      : activeTab === "30days"
      ? [
          { date: "Week 1", fanVisits: 4800, playerVisits: 3200 },
          { date: "Week 2", fanVisits: 7200, playerVisits: 4800 },
          { date: "Week 3", fanVisits: 9000, playerVisits: 6000 },
          { date: "Week 4", fanVisits: 10800, playerVisits: 7200 },
        ]
      : [
          { date: "Jan", fanVisits: 27000, playerVisits: 18000 },
          { date: "Feb", fanVisits: 31200, playerVisits: 20800 },
          { date: "Mar", fanVisits: 36600, playerVisits: 24400 },
        ];

  const chartData = data || mockData;
  const maxValue = Math.max(...chartData.map((d) => d.fanVisits + d.playerVisits));
  const totalVisits = chartData.reduce((sum, d) => sum + d.fanVisits + d.playerVisits, 0);

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Total Visitors</h3>
          <p className="text-sm text-neutral-500">
            {totalVisits.toLocaleString()} total visits
          </p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#000CF5]"></div>
              <span className="text-xs text-neutral-400">Fan Visits</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FFCA33]"></div>
              <span className="text-xs text-neutral-400">Player Visits</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-neutral-800/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("7days")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === "7days"
                ? "bg-neutral-700 text-white"
                : "text-neutral-400 hover:text-white"
            )}
          >
            Last 7 days
          </button>
          <button
            onClick={() => setActiveTab("30days")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === "30days"
                ? "bg-neutral-700 text-white"
                : "text-neutral-400 hover:text-white"
            )}
          >
            Last 30 days
          </button>
          <button
            onClick={() => setActiveTab("3months")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === "3months"
                ? "bg-neutral-700 text-white"
                : "text-neutral-400 hover:text-white"
            )}
          >
            Last 3 months
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative h-72 md:h-80 pt-0 mt-4 pb-6">
        {/* SVG Chart */}
        <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="fanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#000CF5" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000A52" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="playerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFCA33" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFCA33" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Player Visits Area (bottom layer) */}
          <path
            d={generateStackedAreaPath(chartData, maxValue, "player")}
            fill="url(#playerGradient)"
            className="transition-all duration-300"
          />

          {/* Fan Visits Area (top layer) */}
          <path
            d={generateStackedAreaPath(chartData, maxValue, "fan")}
            fill="url(#fanGradient)"
            className="transition-all duration-300"
          />

          {/* Player Visits Line */}
          <path
            d={generateStackedLinePath(chartData, maxValue, "player")}
            fill="none"
            stroke="#FFCA33"
            strokeWidth="2"
            className="transition-all duration-300"
          />

          {/* Fan Visits Line */}
          <path
            d={generateStackedLinePath(chartData, maxValue, "fan")}
            fill="none"
            stroke="#000CF5"
            strokeWidth="2"
            className="transition-all duration-300"
          />

          {/* Interactive hover circles */}
          {chartData.map((d, i) => {
            const x = (i / (chartData.length - 1)) * 800;
            const totalY = 200 - ((d.fanVisits + d.playerVisits) / maxValue) * 200;
            const playerY = 200 - (d.playerVisits / maxValue) * 200;

            return (
              <g key={i}>
                {/* Fan visit point */}
                <circle
                  cx={x}
                  cy={totalY}
                  r={hoveredIndex === i ? 6 : 4}
                  fill="#000CF5"
                  stroke="white"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {/* Player visit point */}
                <circle
                  cx={x}
                  cy={playerY}
                  r={hoveredIndex === i ? 6 : 4}
                  fill="#FFCA33"
                  stroke="white"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {/* Invisible larger hit area */}
                <rect
                  x={x - 20}
                  y={0}
                  width={40}
                  height={200}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div
            className="absolute bg-neutral-800 border border-neutral-700 rounded-lg p-3 shadow-xl pointer-events-none z-10"
            style={{
              left: `${(hoveredIndex / (chartData.length - 1)) * 100}%`,
              top: "10%",
              transform: "translateX(-50%)",
            }}
          >
            <p className="text-xs font-semibold text-white mb-2">
              {chartData[hoveredIndex].date}
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#000CF5]"></div>
                <span className="text-xs text-neutral-300">Fan Visits:</span>
                <span className="text-xs font-semibold text-white">
                  {chartData[hoveredIndex].fanVisits.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#FFCA33]"></div>
                <span className="text-xs text-neutral-300">Player Visits:</span>
                <span className="text-xs font-semibold text-white">
                  {chartData[hoveredIndex].playerVisits.toLocaleString()}
                </span>
              </div>
              <div className="pt-1 mt-1 border-t border-neutral-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Total:</span>
                  <span className="text-xs font-bold text-white">
                    {(chartData[hoveredIndex].fanVisits + chartData[hoveredIndex].playerVisits).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* X-axis labels inside the chart container */}
        <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2">
          {chartData.map((item, idx) => (
            <span key={idx} className="text-xs text-neutral-500">
              {item.date}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to generate SVG path for stacked area
function generateStackedAreaPath(
  data: ChartDataPoint[],
  maxValue: number,
  type: "fan" | "player"
): string {
  const width = 800;
  const height = 200;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const yValue = type === "fan" 
      ? (d.fanVisits + d.playerVisits) / maxValue 
      : d.playerVisits / maxValue;
    const y = height - yValue * height;
    return `${x},${y}`;
  });

  const basePoints = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const yValue = type === "fan" ? d.playerVisits / maxValue : 0;
    const y = height - yValue * height;
    return `${x},${y}`;
  });

  const firstX = 0;
  const lastX = width;

  return `M ${points[0]} L ${points.slice(1).join(" L ")} L ${basePoints.reverse().join(" L ")} Z`;
}

// Helper function to generate SVG path for stacked line
function generateStackedLinePath(
  data: ChartDataPoint[],
  maxValue: number,
  type: "fan" | "player"
): string {
  const width = 800;
  const height = 200;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const yValue = type === "fan" 
      ? (d.fanVisits + d.playerVisits) / maxValue 
      : d.playerVisits / maxValue;
    const y = height - yValue * height;
    return `${x},${y}`;
  });

  return `M ${points.join(" L ")}`;
}
