"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface SpotifyMiniPlayerProps {
  className?: string;
}

export default function SpotifyMiniPlayer({ className = "" }: SpotifyMiniPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(225); // 3:45 in seconds
  const [isHovered, setIsHovered] = useState(false);

  // Mock current track data
  const currentTrack = {
    title: "Song Name",
    artist: "Artist Name",
    playlist: "Playlist Name",
    image: "/images/spotify-album-cover.png"
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Simulate progress
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, duration]);

  const progressPercentage = (currentTime / duration) * 100;

  return (
    <div 
      className={`bg-black rounded-lg overflow-hidden relative shadow-xl ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Spotify Logo - Top Right Corner */}
      <div className="absolute top-1 right-1 z-10">
        <div className="relative w-4 h-4">
          <Image 
            src="/images/spotify-logo.png" 
            alt="Spotify" 
            fill 
            className="object-contain" 
          />
        </div>
      </div>

      <div className="flex items-center h-14 px-3 relative">
        {/* Album Art */}
        <div className="relative w-10 h-10 flex-shrink-0">
          <img
            src={currentTrack.image}
            alt={currentTrack.playlist}
            className="w-full h-full object-cover rounded"
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-between px-3">
          {!isHovered ? (
            // Open Player State - Show track info
            <>
              <div className="flex-1 min-w-0 pr-6">
                <div className="text-white text-xs font-normal truncate mb-0.5">
                  {currentTrack.title}
                </div>
                <div className="text-[#1DB954] text-xs font-medium truncate mb-0.5">
                  {currentTrack.artist}
                </div>
                <div className="text-gray-400 text-[10px] truncate">
                  {currentTrack.playlist}
                </div>
              </div>
            </>
          ) : (
            // Hover State - Show controls
            <>
              <div className="flex items-center gap-4 flex-1">
                {/* Pause/Play Icon */}
                <button
                  onClick={togglePlay}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {isPlaying ? (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
                
                {/* Skip Forward Icon */}
                <button className="text-gray-400 hover:text-white transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4l10 8-10 8V4zm12 0v16h-2V4h2z"/>
                  </svg>
                </button>
                
                {/* Repeat Icon */}
                <button className="text-gray-400 hover:text-white transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* Duration - Always visible */}
          <div className="text-white text-sm font-medium ml-4">
            {formatTime(duration)}
          </div>
        </div>
      </div>

      {/* Gradient Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
        <div
          className="h-full transition-all duration-300"
          style={{ 
            width: `${progressPercentage}%`,
            background: `linear-gradient(to right, transparent 0%, #84cc16 100%)`
          }}
        />
      </div>
    </div>
  );
}
