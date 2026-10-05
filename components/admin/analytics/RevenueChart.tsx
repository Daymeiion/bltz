"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface RevenueData {
  month: string;
  subscriptions: number;
  ads: number;
  partnerships: number;
}

export function RevenueChart() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const revenueData: RevenueData[] = [
    { month: "Jan", subscriptions: 12500, ads: 4200, partnerships: 8300 },
    { month: "Feb", subscriptions: 14200, ads: 4800, partnerships: 9100 },
    { month: "Mar", subscriptions: 16800, ads: 5400, partnerships: 10200 },
    { month: "Apr", subscriptions: 15600, ads: 5100, partnerships: 9800 },
    { month: "May", subscriptions: 18400, ads: 6200, partnerships: 11400 },
    { month: "Jun", subscriptions: 21200, ads: 7100, partnerships: 12800 },
  ];

  const maxValue = Math.max(
    ...revenueData.map((d) => d.subscriptions + d.ads + d.partnerships)
  );

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 md:p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">Revenue Breakdown</h3>
        <p className="text-sm text-neutral-500">Monthly revenue by source</p>
        <div className="flex flex-wrap items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#000CF5]"></div>
            <span className="text-xs text-neutral-400">Subscriptions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FFCA33]"></div>
            <span className="text-xs text-neutral-400">Ads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-neutral-400">Partnerships</span>
          </div>
        </div>
      </div>

      {/* Stacked Bar Chart */}
      <div className="relative h-64 md:h-72">
        <div className="flex items-end justify-between h-full gap-3 px-2">
          {revenueData.map((item, idx) => {
            const total = item.subscriptions + item.ads + item.partnerships;
            const subsHeight = (item.subscriptions / maxValue) * 100;
            const adsHeight = (item.ads / maxValue) * 100;
            const partHeight = (item.partnerships / maxValue) * 100;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="w-full flex flex-col h-full justify-end relative">
                  {/* Tooltip */}
                  {hoveredIndex === idx && (
                    <div className="absolute -top-32 left-1/2 -translate-x-1/2 bg-neutral-800 border border-neutral-700 rounded-lg p-3 shadow-xl z-10 whitespace-nowrap">
                      <p className="text-xs font-semibold text-white mb-2">{item.month}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#000CF5]"></div>
                          <span className="text-xs text-neutral-300">Subscriptions:</span>
                          <span className="text-xs font-semibold text-white">
                            ${item.subscriptions.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#FFCA33]"></div>
                          <span className="text-xs text-neutral-300">Ads:</span>
                          <span className="text-xs font-semibold text-white">
                            ${item.ads.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-xs text-neutral-300">Partnerships:</span>
                          <span className="text-xs font-semibold text-white">
                            ${item.partnerships.toLocaleString()}
                          </span>
                        </div>
                        <div className="pt-1 mt-1 border-t border-neutral-700">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-400">Total:</span>
                            <span className="text-xs font-bold text-white">
                              ${total.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subscriptions (bottom) */}
                  <div
                    className="w-full bg-[#000CF5] hover:opacity-90 transition-opacity cursor-pointer"
                    style={{ height: `${subsHeight}%` }}
                  />
                  {/* Ads (middle) */}
                  <div
                    className="w-full bg-[#FFCA33] hover:opacity-90 transition-opacity cursor-pointer"
                    style={{ height: `${adsHeight}%` }}
                  />
                  {/* Partnerships (top) */}
                  <div
                    className="w-full bg-emerald-500 rounded-t hover:opacity-90 transition-opacity cursor-pointer"
                    style={{ height: `${partHeight}%` }}
                  />
                </div>
                <span className="text-xs text-neutral-500 mt-2">{item.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-800">
        <div>
          <p className="text-xs text-neutral-500 mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-white">
            ${revenueData.reduce((sum, d) => sum + d.subscriptions + d.ads + d.partnerships, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Subscriptions</p>
          <p className="text-xl font-bold text-[#000CF5]">
            ${revenueData.reduce((sum, d) => sum + d.subscriptions, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Ads</p>
          <p className="text-xl font-bold text-[#FFCA33]">
            ${revenueData.reduce((sum, d) => sum + d.ads, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Partnerships</p>
          <p className="text-xl font-bold text-emerald-400">
            ${revenueData.reduce((sum, d) => sum + d.partnerships, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

