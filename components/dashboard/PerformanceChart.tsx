"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ChartData {
  date: string;
  views: number;
  watchTime: number;
}

export function PerformanceChart({ 
  data, 
  onPeriodChange 
}: { 
  data: ChartData[];
  onPeriodChange?: (period: 'week' | 'month' | 'year') => void;
}) {
  const [activePeriod, setActivePeriod] = useState<'week' | 'month' | 'year'>('week');

  const handlePeriodChange = (period: 'week' | 'month' | 'year') => {
    setActivePeriod(period);
    onPeriodChange?.(period);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (activePeriod === 'year') {
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Period Toggles */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-neutral-800 dark:text-white">Performance Overview</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handlePeriodChange('week')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activePeriod === 'week'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => handlePeriodChange('month')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activePeriod === 'month'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => handlePeriodChange('year')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activePeriod === 'year'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-black dark:bg-black rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-neutral-400 dark:text-neutral-400">No data available for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-600 dark:stroke-neutral-600" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-xs text-neutral-300 dark:text-neutral-300"
              />
              <YAxis 
                yAxisId="left"
                className="text-xs text-neutral-300 dark:text-neutral-300"
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                className="text-xs text-neutral-300 dark:text-neutral-300"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                labelFormatter={(label) => formatDate(label as string)}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="views" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Views"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="watchTime" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', r: 4 }}
                activeDot={{ r: 6 }}
                name="Watch Time (min)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

