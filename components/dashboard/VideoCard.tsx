"use client";

import Image from "next/image";
import Link from "next/link";
import { IconEdit, IconTrash, IconEye, IconClock, IconDotsVertical } from "@tabler/icons-react";
import { useState } from "react";
import type { VideoWithStats } from "@/lib/queries/videos";

export function VideoCard({ 
  video, 
  onEdit, 
  onDelete 
}: { 
  video: VideoWithStats;
  onEdit: (video: VideoWithStats) => void;
  onDelete: (videoId: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${video.title}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete(video.id);
      } catch (error) {
        console.error('Error deleting video:', error);
        alert('Failed to delete video');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const visibilityColors = {
    public: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    unlisted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    private: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className={`bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-lg transition-shadow ${isDeleting ? 'opacity-50' : ''}`}>
      {/* Thumbnail */}
      <Link href={`/watch/${video.id}`} className="block relative aspect-video bg-neutral-200 dark:bg-neutral-700 group">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
            </svg>
          </div>
        )}
        {video.duration_seconds && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration_seconds)}
          </div>
        )}
        <div className={`absolute top-2 left-2 text-xs px-2 py-1 rounded ${visibilityColors[video.visibility]}`}>
          {video.visibility}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/watch/${video.id}`} className="flex-1">
            <h3 className="font-semibold text-neutral-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2">
              {video.title}
            </h3>
          </Link>
          
          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
              disabled={isDeleting}
            >
              <IconDotsVertical className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 z-20 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 min-w-[150px]">
                  <button
                    onClick={() => {
                      onEdit(video);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                  >
                    <IconEdit className="w-4 h-4" />
                    Edit
                  </button>
                  <Link
                    href={`/watch/${video.id}`}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                    onClick={() => setShowMenu(false)}
                  >
                    <IconEye className="w-4 h-4" />
                    View
                  </Link>
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
                  >
                    <IconTrash className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {video.description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-3">
            {video.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-500">
          <div className="flex items-center gap-1">
            <IconEye className="w-4 h-4" />
            <span>{video.views} views</span>
          </div>
          {video.watch_time > 0 && (
            <div className="flex items-center gap-1">
              <IconClock className="w-4 h-4" />
              <span>{Math.round(video.watch_time / 60)}m</span>
            </div>
          )}
          <span>•</span>
          <span>{formatTimeAgo(video.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// Skeleton loader for video cards
export function VideoCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      <div className="aspect-video bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 animate-pulse" />
        <div className="flex gap-4">
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-20 animate-pulse" />
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

