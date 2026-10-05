"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Maximize, BookmarkPlus, Bookmark, Share, PictureInPicture, List, Film } from "lucide-react";
import Image from "next/image";

interface VideoPlayerProps {
  src: string;
  title: string;
  poster?: string;
  onTheaterModeToggle?: (isTheaterMode: boolean) => void;
  isTheaterMode?: boolean;
}

export default function VideoPlayer({ src, title, poster, onTheaterModeToggle, isTheaterMode = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const updateDuration = () => {
      setDuration(video.duration);
    };

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
    };
  }, []);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      await video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const toggleTheaterMode = () => {
    const newTheaterMode = !isTheaterMode;
    onTheaterModeToggle?.(newTheaterMode);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(duration, video.currentTime + 10);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    video.currentTime = newTime;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden group">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full aspect-video object-cover"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Top-Right Icons */}
      <div className="absolute top-4 right-4 flex gap-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={toggleBookmark}
          className={`p-2 rounded-full transition-colors ${
            isBookmarked 
              ? 'text-yellow-500' 
              : 'text-white hover:bg-white/10 hover:text-yellow-500'
          }`}
        >
          {isBookmarked ? <Bookmark size={20} fill="currentColor" /> : <BookmarkPlus size={20} />}
        </button>
        <button
          onClick={handleShare}
          className="p-1 rounded-full hover:bg-white/10 hover:text-white transition-colors"
        >
          <Image 
            src="/images/icons/share-icon.png" 
            alt="Share" 
            width={30} 
            height={30}
            className="filter brightness-0 invert"
          />
        </button>
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {/* Control Buttons */}
        <div className="flex items-center">
          {/* Left Controls */}
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-yellow-500 transition-colors"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-yellow-500 transition-colors"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right,rgb(255, 255, 255) 0%,rgb(255, 255, 255) ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.3) ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.3) 100%)`
                }}
              />
            </div>
          </div>

          {/* Center Progress Bar */}
          <div className={`flex items-center gap-3 flex-1 ${isTheaterMode ? 'justify-center' : 'justify-center'}`}>
            <div 
              className={`h-1 bg-white/30 rounded-full cursor-pointer ${isTheaterMode ? 'w-96' : 'w-80'}`}
              onClick={handleProgressClick}
            >
              <div 
                className="h-full bg-yellow-500 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => videoRef.current?.requestPictureInPicture()}
              className="text-white hover:text-yellow-500 transition-colors"
            >
              <PictureInPicture size={20} />
            </button>
            <button 
              onClick={toggleTheaterMode}
              className={`text-white hover:text-yellow-500 transition-colors ${
                isTheaterMode ? 'text-yellow-500' : ''
              }`}
            >
              <Film size={20} />
            </button>
            <button
              onClick={() => videoRef.current?.requestFullscreen()}
              className="text-white hover:text-yellow-500 transition-colors"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
