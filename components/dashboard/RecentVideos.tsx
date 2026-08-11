import Image from "next/image";
import Link from "next/link";
import type { VideoWithStats } from "@/lib/queries/dashboard";

export function RecentVideos({ videos }: { videos: VideoWithStats[] }) {
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

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500 dark:text-neutral-400">No videos uploaded yet</p>
        <Link 
          href="/dashboard/videos" 
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2 inline-block"
        >
          Upload your first video
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {videos.map((video) => (
        <Link
          key={video.id}
          href={video.href ?? `/watch/${video.id}`}
          className="flex gap-4 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
        >
          {/* Thumbnail */}
          <div className="relative w-32 h-20 bg-neutral-200 dark:bg-neutral-700 rounded overflow-hidden flex-shrink-0">
            {video.thumbnail_url ? (
              <Image
                src={video.thumbnail_url}
                alt={video.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
              </div>
            )}
            {video.duration_seconds && (
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                {formatDuration(video.duration_seconds)}
              </div>
            )}
          </div>

          {/* Video Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
              {video.title}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-1">
              {video.description || "No description"}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-500">
              <span>{video.views} {video.views === 1 ? 'view' : 'views'}</span>
              <span>•</span>
              <span>{formatTimeAgo(video.created_at)}</span>
              {video.watch_time > 0 && (
                <>
                  <span>•</span>
                  <span>{Math.round(video.watch_time / 60)}m watch time</span>
                </>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

