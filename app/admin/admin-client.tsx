"use client";

import { useEffect, useState } from "react";
import { 
  CircleDollarSign, 
  TrendingUp, 
  Building2, 
  Users, 
  Video,
  School,
  Shield,
  Ban,
  Eye,
  Trash2,
  Search,
  Filter
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface RevenueData {
  platformTotal: number;
  summary: {
    totalPlatformRevenue: number;
    totalPublisherRevenue: number;
    totalPlayerRevenue: number;
    totalTeamPoolRevenue: number;
    totalVideosProcessed: number;
    byPublisher: { name: string; type: string; amount: number }[];
  };
  topPlayers: {
    playerId: string;
    playerName: string;
    school: string;
    totalEarnings: number;
    fromOwnVideos: number;
    fromTeamPool: number;
  }[];
  recentDistributions: any[];
}

interface Player {
  id: string;
  full_name: string;
  school: string;
  email: string;
  role: string;
  created_at: string;
  visibility: boolean;
  total_videos: number;
  total_views: number;
}

export function AdminDashboardClient() {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'player' | 'fan' | 'admin'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'players'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [revenueRes, playersRes] = await Promise.all([
        fetch('/api/admin/revenue'),
        fetch('/api/admin/players'),
      ]);

      if (revenueRes.ok) {
        const revData = await revenueRes.json();
        setRevenueData(revData);
      }

      if (playersRes.ok) {
        const playerData = await playersRes.json();
        setPlayers(playerData.players || []);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockPlayer = async (playerId: string) => {
    if (!confirm('Are you sure you want to block this player?')) return;

    try {
      const response = await fetch(`/api/admin/players/${playerId}/block`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Player blocked');
        loadData();
      } else {
        throw new Error('Failed to block player');
      }
    } catch (error) {
      toast.error('Failed to block player');
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Are you sure you want to DELETE this player? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/players/${playerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Player deleted');
        loadData();
      } else {
        throw new Error('Failed to delete player');
      }
    } catch (error) {
      toast.error('Failed to delete player');
    }
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = 
      player.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.school?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterRole === 'all' || player.role === filterRole;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  const totalRevenue = revenueData 
    ? revenueData.summary.totalPlatformRevenue + 
      revenueData.summary.totalPublisherRevenue +
      revenueData.summary.totalPlayerRevenue +
      revenueData.summary.totalTeamPoolRevenue
    : 0;

  return (
    <div className="min-h-screen p-6 md:p-10 scrollbar-hide">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-10 w-10 text-bltz-gold" />
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              BLTZ <span className="text-bltz-gold">Admin</span>
            </h1>
          </div>
          <p className="text-bltz-white/70 text-lg font-medium">
            Platform Administration & Revenue Management
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-md font-bold text-sm transition-all duration-300 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-bltz-gold text-black'
                : 'bg-gray-600/40 text-white hover:bg-gray-600/60 border-2 border-gray-600/50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`px-6 py-3 rounded-md font-bold text-sm transition-all duration-300 whitespace-nowrap ${
              activeTab === 'revenue'
                ? 'bg-bltz-gold text-black'
                : 'bg-gray-600/40 text-white hover:bg-gray-600/60 border-2 border-gray-600/50'
            }`}
          >
            Revenue Analytics
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`px-6 py-3 rounded-md font-bold text-sm transition-all duration-300 whitespace-nowrap ${
              activeTab === 'players'
                ? 'bg-bltz-gold text-black'
                : 'bg-gray-600/40 text-white hover:bg-gray-600/60 border-2 border-gray-600/50'
            }`}
          >
            Player Management
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Revenue Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Platform Revenue */}
              <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
                <div className="flex flex-col items-center mb-1">
                  <div className="mb-1">
                    <CircleDollarSign className="h-8 w-8 text-green-400" strokeWidth={2.5} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-bltz-white/70 uppercase tracking-wider mb-2 text-center">
                  BLTZ Revenue (10%)
                </h3>
                <div className="flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">$</span>
                  <span className="text-4xl font-black text-white">
                    {Math.round(revenueData?.summary.totalPlatformRevenue || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Publisher Revenue */}
              <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
                <div className="flex flex-col items-center mb-1">
                  <div className="mb-1">
                    <School className="h-8 w-8 text-bltz-blue-light" strokeWidth={2.5} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-bltz-white/70 uppercase tracking-wider mb-2 text-center">
                  Publishers (15%)
                </h3>
                <div className="flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">$</span>
                  <span className="text-4xl font-black text-white">
                    {Math.round(revenueData?.summary.totalPublisherRevenue || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Player Revenue */}
              <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
                <div className="flex flex-col items-center mb-1">
                  <div className="mb-1">
                    <Users className="h-8 w-8 text-bltz-gold" strokeWidth={2.5} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-bltz-white/70 uppercase tracking-wider mb-2 text-center">
                  Players (60%)
                </h3>
                <div className="flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">$</span>
                  <span className="text-4xl font-black text-white">
                    {Math.round(revenueData?.summary.totalPlayerRevenue || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
                <div className="flex flex-col items-center mb-1">
                  <div className="mb-1">
                    <TrendingUp className="h-8 w-8 text-bltz-gold" strokeWidth={2.5} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-bltz-white/70 uppercase tracking-wider mb-2 text-center">
                  Total Revenue
                </h3>
                <div className="flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">$</span>
                  <span className="text-4xl font-black text-white">
                    {Math.round(totalRevenue).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Publishers */}
            <div className="bg-black/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 p-8 mb-8 card-hover">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <span className="w-1 h-8 bg-bltz-gold rounded-full" />
                Top Revenue Publishers
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black/60">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Publisher
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Revenue (15%)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bltz-blue/20">
                    {revenueData?.summary.byPublisher.slice(0, 10).map((pub, idx) => (
                      <tr key={idx} className="hover:bg-bltz-blue/10 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-black text-white">{pub.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline" className="capitalize">
                            {pub.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-bltz-gold font-bold">
                          ${pub.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Earning Players */}
            <div className="bg-black/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 p-8 card-hover">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <span className="w-1 h-8 bg-bltz-blue rounded-full" />
                Top Earning Players
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {revenueData?.topPlayers.slice(0, 10).map((player, idx) => (
                  <div
                    key={player.playerId}
                    className="flex items-center gap-4 p-4 bg-black/40 rounded-md border border-gray-600/30 hover:border-bltz-gold/50 transition-all"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-bltz-gold text-black font-black">
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-white">{player.playerName}</div>
                      <div className="text-sm text-bltz-white/60">{player.school || 'Independent'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-bltz-gold">
                        ${player.totalEarnings.toFixed(0)}
                      </div>
                      <div className="text-xs text-bltz-white/50">
                        Own: ${player.fromOwnVideos.toFixed(0)} | Pool: ${player.fromTeamPool.toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Revenue Analytics Tab */}
        {activeTab === 'revenue' && (
          <>
            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Revenue Distribution Pie */}
              <div className="bg-black/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 p-8 card-hover">
                <h2 className="text-2xl font-black text-white mb-6">Revenue Split</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-bltz-gold rounded"></div>
                      <span className="text-white font-bold">Players (60%)</span>
                    </div>
                    <span className="text-bltz-gold font-black">
                      ${Math.round(revenueData?.summary.totalPlayerRevenue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-bltz-blue-light rounded"></div>
                      <span className="text-white font-bold">Team Pool (15%)</span>
                    </div>
                    <span className="text-bltz-blue-light font-black">
                      ${Math.round(revenueData?.summary.totalTeamPoolRevenue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-purple-400 rounded"></div>
                      <span className="text-white font-bold">Publishers (15%)</span>
                    </div>
                    <span className="text-purple-400 font-black">
                      ${Math.round(revenueData?.summary.totalPublisherRevenue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-green-400 rounded"></div>
                      <span className="text-white font-bold">BLTZ Platform (10%)</span>
                    </div>
                    <span className="text-green-400 font-black">
                      ${Math.round(revenueData?.summary.totalPlatformRevenue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-4 border-t border-gray-600/50 flex items-center justify-between">
                    <span className="text-white font-black text-lg">Total</span>
                    <span className="text-white font-black text-xl">
                      ${Math.round(totalRevenue).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Platform Stats */}
              <div className="bg-black/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 p-8 card-hover">
                <h2 className="text-2xl font-black text-white mb-6">Platform Metrics</h2>
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-bltz-white/70 font-bold mb-1">Total Videos Processed</div>
                    <div className="text-3xl font-black text-white">
                      {(revenueData?.summary.totalVideosProcessed || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-bltz-white/70 font-bold mb-1">Total Publishers</div>
                    <div className="text-3xl font-black text-white">
                      {revenueData?.summary.byPublisher.length || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-bltz-white/70 font-bold mb-1">Active Players</div>
                    <div className="text-3xl font-black text-white">
                      {players.filter(p => p.role === 'player').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* All Publishers Table */}
            <div className="bg-black/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 p-8 card-hover">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <span className="w-1 h-8 bg-purple-400 rounded-full" />
                All Publishers (Schools & Leagues)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black/60">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Publisher
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Revenue Share (15%)
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Est. Total Video Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bltz-blue/20">
                    {revenueData?.summary.byPublisher.map((pub, idx) => (
                      <tr key={idx} className="hover:bg-bltz-blue/10 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-black text-white">#{idx + 1}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-black text-white">{pub.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline" className="capitalize">
                            {pub.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-purple-400 font-bold">
                          ${pub.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-bltz-white/70 font-bold">
                          ${(pub.amount / 0.15).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Player Management Tab */}
        {activeTab === 'players' && (
          <>
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bltz-blue" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search players..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-bltz-blue/30 rounded-md bg-black/60 text-white placeholder:text-bltz-white/50 focus:ring-2 focus:ring-bltz-gold focus:border-bltz-gold transition-all font-medium"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="px-6 py-3 border-2 border-bltz-blue/30 rounded-md bg-black/60 text-white focus:ring-2 focus:ring-bltz-gold focus:border-bltz-gold transition-all font-bold"
              >
                <option value="all">All Roles</option>
                <option value="player">Players</option>
                <option value="fan">Fans</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            {/* Player Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
                <div className="text-sm text-bltz-white/70 font-bold mb-1">Total Users</div>
                <div className="text-3xl font-black text-white">{players.length}</div>
              </div>
              <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
                <div className="text-sm text-bltz-white/70 font-bold mb-1">Players</div>
                <div className="text-3xl font-black text-bltz-gold">
                  {players.filter(p => p.role === 'player').length}
                </div>
              </div>
              <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
                <div className="text-sm text-bltz-white/70 font-bold mb-1">Fans</div>
                <div className="text-3xl font-black text-bltz-blue-light">
                  {players.filter(p => p.role === 'fan').length}
                </div>
              </div>
              <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
                <div className="text-sm text-bltz-white/70 font-bold mb-1">Blocked</div>
                <div className="text-3xl font-black text-red-400">
                  {players.filter(p => !p.visibility).length}
                </div>
              </div>
            </div>

            {/* Players Table */}
            <div className="bg-black/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 p-8 card-hover">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <span className="w-1 h-8 bg-bltz-gold rounded-full" />
                Player Management ({filteredPlayers.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black/60">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        School
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Videos
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-bltz-white/70 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bltz-blue/20">
                    {filteredPlayers.map((player) => (
                      <tr key={player.id} className="hover:bg-bltz-blue/10 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-gradient-to-br from-bltz-blue to-bltz-gold text-white font-black">
                                {player.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-black text-white">{player.full_name || 'Unknown'}</div>
                              <div className="text-xs text-bltz-white/50">{player.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-bltz-white/70 font-bold">
                          {player.school || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant="outline"
                            className={
                              player.role === 'admin' ? 'border-bltz-gold text-bltz-gold' :
                              player.role === 'player' ? 'border-bltz-blue text-bltz-blue' :
                              'border-gray-500 text-gray-400'
                            }
                          >
                            {player.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-bltz-white/70 font-bold">
                          {player.total_videos || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {player.visibility ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                              Blocked
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="px-4 py-2 bg-gray-600/40 hover:bg-gray-600/60 rounded-md text-white font-bold transition-all">
                                Actions
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-black border-gray-600/50">
                              <DropdownMenuItem className="text-bltz-blue hover:text-bltz-blue-light hover:bg-bltz-blue/20 cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 cursor-pointer"
                                onClick={() => handleBlockPlayer(player.id)}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                {player.visibility ? 'Block Player' : 'Unblock Player'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20 cursor-pointer"
                                onClick={() => handleDeletePlayer(player.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Player
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

