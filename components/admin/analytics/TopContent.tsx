"use client";

import { IconTrendingUp, IconEye, IconHeart, IconShare } from "@tabler/icons-react";

interface ContentItem {
  id: string;
  title: string;
  creator: string;
  views: number;
  likes: number;
  shares: number;
  engagement: number;
}

export function TopContent() {
  const topVideos: ContentItem[] = [
    {
      id: "1",
      title: "Game Winning Touchdown vs USC",
      creator: "Eddie Lake",
      views: 45200,
      likes: 8940,
      shares: 2340,
      engagement: 24.8,
    },
    {
      id: "2",
      title: "Behind the Scenes: Training Day",
      creator: "Jamik Tashpulatov",
      views: 38100,
      likes: 7210,
      shares: 1890,
      engagement: 23.9,
    },
    {
      id: "3",
      title: "Championship Highlights 2024",
      creator: "Carter James",
      views: 52800,
      likes: 9840,
      shares: 3120,
      engagement: 24.5,
    },
    {
      id: "4",
      title: "Workout Routine: Off Season",
      creator: "Lena Ortiz",
      views: 29400,
      likes: 5620,
      shares: 1450,
      engagement: 24.1,
    },
    {
      id: "5",
      title: "Q&A with Fans",
      creator: "Eddie Lake",
      views: 21800,
      likes: 4320,
      shares: 980,
      engagement: 24.3,
    },
  ];

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 md:p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">Top Performing Content</h3>
        <p className="text-sm text-neutral-500">Most viewed videos this month</p>
      </div>

      <div className="space-y-3">
        {topVideos.map((video, idx) => (
          <div
            key={video.id}
            className="bg-neutral-800/30 rounded-lg p-4 hover:bg-neutral-800/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-[#000CF5] to-[#000A52] text-white font-bold text-sm flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">{video.title}</h4>
                  <p className="text-xs text-neutral-400 mt-1">by {video.creator}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <IconEye className="h-3.5 w-3.5" />
                      <span>{video.views.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <IconHeart className="h-3.5 w-3.5" />
                      <span>{video.likes.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <IconShare className="h-3.5 w-3.5" />
                      <span>{video.shares.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <div className="flex items-center gap-1 text-[#FFCA33]">
                  <IconTrendingUp className="h-4 w-4" />
                  <span className="text-sm font-semibold">{video.engagement}%</span>
                </div>
                <span className="text-xs text-neutral-500">engagement</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

