"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, SkipBack, Volume2 } from "lucide-react";

interface SpotifyMiniPlayerProps {
  className?: string;
}

export default function SpotifyMiniPlayer({ className = "" }: SpotifyMiniPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(180); // 3 minutes in seconds
  const [volume, setVolume] = useState(50);

  // Mock current track data
  const currentTrack = {
    title: "Pump Up The Jam",
    artist: "Technotronic",
    album: "Pump Up The Jam",
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
    <Card className={`bg-black/90 border-white/20 ${className}`}>
      <div className="flex items-center gap-3 p-3">
        {/* Album Art */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <img
            src={currentTrack.image}
            alt={currentTrack.album}
            className="w-full h-full object-cover rounded"
          />
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium truncate">
            {currentTrack.title}
          </div>
          <div className="text-white/70 text-xs truncate">
            {currentTrack.artist}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
            onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
            onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))}
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 ml-2">
            <Volume2 className="h-3 w-3 text-white/70" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      </div>

      {/* Time Display */}
      <div className="flex justify-between text-xs text-white/70 px-3 pb-2">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </Card>
  );
}
