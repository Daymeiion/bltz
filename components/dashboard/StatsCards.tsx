import { Video, TrendingUp, CircleDollarSign, Award } from "lucide-react";
import type { DashboardStats } from "@/lib/queries/dashboard";

export function StatsCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Videos */}
      <div className="relative group">
        <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
          <div className="absolute top-4 right-4">
            <div className="px-3 py-1 bg-bltz-blue/20 rounded-full">
              <p className="text-xs font-bold text-red-500">
                {stats.videoGrowth > 0 ? `+${stats.videoGrowth}` : stats.videoGrowth}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center mb-1">
            <div className="mb-1">
              <Video className="h-8 w-8 text-red-500" strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="text-lg font-bold text-bltz-white/70 uppercase tracking-wider mb-2 text-center">
            Total Videos
          </h3>
          <p className="text-4xl font-black text-white text-center">{stats.videoCount}</p>
        </div>
      </div>
      
      {/* Profile Views */}
      <div className="relative group">
        <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
          <div className="absolute top-4 right-4">
            <div className="px-3 py-1 bg-bltz-blue-light/20 rounded-full">
              <p className="text-xs font-bold text-bltz-blue-light">
                {stats.viewGrowth > 0 ? '+' : ''}{stats.viewGrowth}%
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center mb-1">
            <div className="mb-1">
              <TrendingUp className="h-8 w-8 text-bltz-blue-light" strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="text-lg font-bold text-bltz-white/70 uppercase tracking-wider mb-2 text-center">
            Total Views
          </h3>
          <p className="text-4xl font-black text-white text-center">
            {stats.viewCount.toLocaleString()}
          </p>
        </div>
      </div>
      
      {/* Revenue */}
      <div className="relative group">
        <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
          <div className="absolute top-4 right-4">
            <div className="px-3 py-1 bg-green-500/20 rounded-full">
              <p className="text-xs font-bold text-green-400">
                +{stats.revenueGrowth || 0}%
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center mb-1">
            <div className="mb-1">
              <CircleDollarSign className="h-8 w-8 text-green-400" strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="text-lg font-bold text-bltz-white/70 uppercase tracking-wider mb-2 text-center">
            Revenue
          </h3>
          <div className="flex items-center justify-center">
            <span className="text-2xl font-bold text-white">$</span>
            <span className="text-4xl font-black text-white">{(stats.revenue || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      {/* Achievements */}
      <div className="relative group">
        <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
          <div className="absolute top-4 right-4">
            <div className="px-3 py-1 bg-bltz-gold/20 rounded-full">
              <p className="text-xs font-bold text-bltz-gold">
                {stats.recentAchievements}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center mb-1">
            <div className="mb-1">
              <Award className="h-8 w-8 text-bltz-gold" strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="text-lg font-bold text-bltz-white/70 uppercase tracking-wider mb-2 text-center">
            Achievements
          </h3>
          <p className="text-4xl font-black text-white text-center">{stats.achievementCount}</p>
        </div>
      </div>
    </div>
  );
}

