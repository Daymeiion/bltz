"use client";

import { cn } from "@/lib/utils";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down";
  subtitle: string;
  description: string;
}

export function StatCard({
  title,
  value,
  trend,
  trendDirection,
  subtitle,
  description,
}: StatCardProps) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-[#000CF5]/50 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-400">{title}</h3>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded",
            trendDirection === "up"
              ? "text-[#FFCA33] bg-[#FFCA33]/10"
              : "text-red-400 bg-red-500/10"
          )}
        >
          {trendDirection === "up" ? (
            <IconTrendingUp className="h-3 w-3" />
          ) : (
            <IconTrendingDown className="h-3 w-3" />
          )}
          {trend}
        </div>
      </div>

      {/* Value */}
      <div className="mb-3">
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>

      {/* Subtitle & Description */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-neutral-300 flex items-center gap-1">
          {subtitle}
          {trendDirection === "up" ? (
            <IconTrendingUp className="h-3 w-3 text-[#FFCA33]" />
          ) : (
            <IconTrendingDown className="h-3 w-3 text-red-400" />
          )}
        </p>
        <p className="text-xs text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

