"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface SpotifyMiniPlayerProps {
  className?: string;
}

interface SpotifyTrack {
  title: string;
  artist: string;
  playlist: string;
  image: string;
  uri: string;
  duration: number;
}

export default function SpotifyMiniPlayer({ className = "" }: SpotifyMiniPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(225); // Default 3:45 in seconds
  const [isHovered, setIsHovered] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const playerRef = useRef<Spotify.Player | null>(null);

  // Current track data
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack>({
    title: "Song Name",
    artist: "Artist Name",
    playlist: "Playlist Name",
    image: "/images/spotify-album-cover.png",
    uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp", // Default track URI
    duration: 225
  });

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    // Load Spotify Web Playback SDK
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    // Get access token from API
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/auth/spotify/token');
        if (response.ok) {
          const data = await response.json();
          setAccessToken(data.access_token);
          localStorage.setItem('spotify_access_token', data.access_token);
          return data.access_token;
        }
      } catch (error) {
        console.error('Error fetching token:', error);
      }
      return null;
    };

    fetchToken().then(token => {
      if (!token) return;

      // Define callback for when SDK is ready
      window.onSpotifyWebPlaybackSDKReady = () => {
        const player = new window.Spotify.Player({
          name: 'BLTZ Player',
          getOAuthToken: (cb: (token: string) => void) => {
            // Fetch fresh token on each call
            fetch('/api/auth/spotify/token')
              .then(res => res.json())
              .then(data => cb(data.access_token))
              .catch(err => console.error('Error getting token:', err));
          },
          volume: 0.5
        });

      // Error handling
      player.addListener('initialization_error', ({ message }) => {
        console.error('Failed to initialize', message);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Failed to authenticate', message);
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Failed to validate Spotify account', message);
      });

      // Playback status updates
      player.addListener('player_state_changed', (state) => {
        if (!state) return;

        setIsPlaying(!state.paused);
        setCurrentTime(state.position / 1000); // Convert to seconds
        setDuration(state.duration / 1000);

        const track = state.track_window.current_track;
        setCurrentTrack({
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          playlist: track.album.name,
          image: track.album.images[0]?.url || "/images/spotify-album-cover.png",
          uri: track.uri,
          duration: state.duration / 1000
        });
      });

      // Ready
      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
      });

        // Connect to the player
        player.connect();
        playerRef.current = player;
      };
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, []);

  // Update current time while playing
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            return duration;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, duration]);

  const togglePlay = async () => {
    if (!playerRef.current) {
      console.error('Player not initialized');
      return;
    }

    try {
      await playerRef.current.togglePlay();
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const skipToNext = async () => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.nextTrack();
    } catch (error) {
      console.error('Error skipping track:', error);
    }
  };

  const repeatTrack = async () => {
    if (!accessToken || !deviceId) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/repeat?state=track&device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error setting repeat:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (currentTime / duration) * 100;

  return (
    <div 
      className={`bg-black rounded-md overflow-hidden relative shadow-xl ${className}`}
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
                <button 
                  onClick={skipToNext}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4l10 8-10 8V4zm12 0v16h-2V4h2z"/>
                  </svg>
                </button>
                
                {/* Repeat Icon */}
                <button 
                  onClick={repeatTrack}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* Duration - Always visible (counting down) */}
          <div className="text-white text-sm font-medium ml-4">
            {formatTime(duration - currentTime)}
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
