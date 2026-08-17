"use client";

import { useEffect, useState } from "react";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { Video, TrendingUp, CircleDollarSign, Award, Film } from "lucide-react";
import Link from "next/link";
import { VideoCard, VideoCardSkeleton } from "@/components/dashboard/VideoCard";
import { VideoModal, type VideoFormData } from "@/components/dashboard/VideoModal";
import type { VideoWithStats } from "@/lib/queries/videos";
import { trackProductEvent } from "@/lib/analytics/client";

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoWithStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'unlisted' | 'private'>('all');
  const [playerId, setPlayerId] = useState('');
  const [userId, setUserId] = useState('');
  const [teamVideosCount, setTeamVideosCount] = useState(0);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/dashboard/videos');
      const data = await response.json();
      setVideos(data.videos || []);
      setPlayerId(data.playerId);
      setUserId(data.userId);
      
      // Calculate team videos count
      // This counts videos from teammates tagged in videos or from same school/period
      const teamCount = data.teamVideosCount || 0;
      setTeamVideosCount(teamCount);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveVideo = async (formData: VideoFormData) => {
    try {
      const url = editingVideo 
        ? `/api/dashboard/videos/${editingVideo.id}`
        : '/api/dashboard/videos';
      
      const method = editingVideo ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          player_id: playerId,
          owner_user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save video');
      }

      if (!editingVideo) {
        const payload = (await response.json().catch(() => ({}))) as { video?: { id?: string } };
        void trackProductEvent({
          eventName: "media_uploaded",
          source: "athlete_dashboard",
          properties: {
            media_id: payload.video?.id,
            media_type: "video",
            visibility: formData.visibility,
          },
        });
      }

      await loadVideos();
      setEditingVideo(null);
    } catch (error) {
      console.error('Error saving video:', error);
      throw error;
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const response = await fetch(`/api/dashboard/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }

      await loadVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  };

  const handleEditVideo = (video: VideoWithStats) => {
    setEditingVideo(video);
    setIsModalOpen(true);
  };

  const handleNewVideo = () => {
    setEditingVideo(null);
    setIsModalOpen(true);
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterVisibility === 'all' || video.visibility === filterVisibility;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--bltz-navy))] via-[#000000] to-[#000000] p-6 md:p-10 scrollbar-hide">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative mb-10">
          <div className="absolute -top-2 -left-2 w-64 h-64 bg-bltz-blue/10 rounded-full blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
                My Videos
              </h1>
              <p className="text-bltz-white/70 text-lg font-medium">
                Manage your highlight reels and showcase moments
              </p>
            </div>
            <button
              onClick={handleNewVideo}
              className="group relative overflow-hidden px-6 py-3 rounded-md border-2 border-gray-600/50 bg-transparent text-white font-bold text-xs transition-all duration-300 hover:border-bltz-gold hover:shadow-lg hover:shadow-bltz-gold/20 hover:scale-105"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-bltz-gold/0 via-bltz-gold/10 to-bltz-gold/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
              <span className="relative flex items-center justify-center gap-2">
                <IconPlus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
                <span className="group-hover:text-bltz-gold transition-colors duration-300">Upload Video</span>
              </span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1 relative">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bltz-blue" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your highlights..."
              className="w-full pl-12 pr-4 py-3 border-2 border-bltz-blue/30 rounded-md bg-black/60 text-white placeholder:text-bltz-white/50 focus:ring-2 focus:ring-bltz-gold focus:border-bltz-gold transition-all font-medium"
            />
          </div>

          {/* Visibility Filter */}
          <select
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value as any)}
            className="px-6 py-3 border-2 border-bltz-blue/30 rounded-md bg-black/60 text-white focus:ring-2 focus:ring-bltz-gold focus:border-bltz-gold transition-all font-bold"
          >
            <option value="all">All Videos</option>
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="relative group">
            <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
              <div className="flex flex-col items-center mb-1">
                <div className="mb-1">
                  <Video className="h-8 w-8 text-red-500" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-lg font-bold text-bltz-white/70 uppercase tracking-wider mb-2 text-center">Total Videos</h3>
              <p className="text-4xl font-black text-white text-center">{videos.length}</p>
            </div>
          </div>
          <div className="relative group">
            <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
              <div className="flex flex-col items-center mb-1">
                <div className="mb-1">
                  <Film className="h-8 w-8 text-bltz-blue-light" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-lg font-bold text-bltz-white/70 uppercase tracking-wider mb-2 text-center">Team Videos</h3>
              <p className="text-4xl font-black text-white text-center">
                {teamVideosCount}
              </p>
            </div>
          </div>
          <div className="relative group">
            <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
              <div className="flex flex-col items-center mb-1">
                <div className="mb-1">
                  <CircleDollarSign className="h-8 w-8 text-green-400" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-lg font-bold text-bltz-white/70 uppercase tracking-wider mb-2 text-center">Total Views</h3>
              <p className="text-4xl font-black text-white text-center">
                {videos.reduce((sum, v) => sum + v.views, 0)}
              </p>
            </div>
          </div>
          <div className="relative group">
            <div className="relative p-4 bg-gray-600/40 backdrop-blur-md rounded-md border-2 border-gray-600/50 card-hover">
              <div className="flex flex-col items-center mb-1">
                <div className="mb-1">
                  <Award className="h-8 w-8 text-bltz-gold" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-lg font-bold text-bltz-white/70 uppercase tracking-wider mb-2 text-center">Watch Time</h3>
              <p className="text-4xl font-black text-white text-center">
                {Math.round(videos.reduce((sum, v) => sum + v.watch_time, 0) / 3600)}h
              </p>
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-md rounded-md border-2 border-bltz-blue/30 p-16 text-center">
            <svg className="w-24 h-24 mx-auto mb-6 text-bltz-blue/50" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
            </svg>
            <h3 className="text-2xl font-black text-white mb-3">
              {searchQuery || filterVisibility !== 'all' ? 'No videos found' : 'No videos yet'}
            </h3>
            <p className="text-bltz-white/70 mb-8 text-lg">
              {searchQuery || filterVisibility !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Upload your first highlight reel to get started'}
            </p>
            {!searchQuery && filterVisibility === 'all' && (
              <button
                onClick={handleNewVideo}
                className="group relative overflow-hidden px-6 py-3 rounded-md border-2 border-gray-600/50 bg-transparent text-white font-bold text-xs transition-all duration-300 hover:border-bltz-gold hover:shadow-lg hover:shadow-bltz-gold/20 hover:scale-105"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-bltz-gold/0 via-bltz-gold/10 to-bltz-gold/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                <span className="relative flex items-center justify-center gap-2">
                  <IconPlus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
                  <span className="group-hover:text-bltz-gold transition-colors duration-300">Upload Video</span>
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onEdit={handleEditVideo}
                onDelete={handleDeleteVideo}
              />
            ))}
          </div>
        )}
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingVideo(null);
        }}
        onSave={handleSaveVideo}
        video={editingVideo}
        playerId={playerId}
        userId={userId}
      />
    </div>
  );
}

