"use client";

import { useState, useEffect } from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

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

  return (
    <div 
      className={`bg-black rounded-lg overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center h-16 px-3 relative">
        {/* Album Art */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <img
            src={currentTrack.image}
            alt={currentTrack.playlist}
            className="w-full h-full object-cover rounded"
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-between px-3">
          {!isHovered ? (
            // Open Player State - Show track info and Spotify logo
            <>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {currentTrack.title}
                </div>
                <div className="text-green-400 text-sm font-medium truncate">
                  {currentTrack.artist}
                </div>
                <div className="text-gray-400 text-xs truncate">
                  {currentTrack.playlist}
                </div>
              </div>
              
              {/* Spotify Logo */}
              <div className="flex items-center">
                <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-black rounded-full"></div>
                </div>
              </div>
            </>
          ) : (
            // Hover State - Show controls
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-green-400 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                
                <button className="text-white hover:text-green-400 transition-colors">
                  <SkipForward className="h-4 w-4" />
                </button>
                
                <button className="text-white hover:text-green-400 transition-colors">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* Duration - Always visible */}
          <div className="text-white text-sm font-medium ml-3">
            {formatTime(duration)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
        <div
          className="h-full bg-green-400 transition-all duration-300"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
      </div>
    </div>
  );
}
