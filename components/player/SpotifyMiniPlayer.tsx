"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Track = {
  id: string;
  title: string;
  artist: string;
  playlist?: string;
  durationMs: number;
  artworkUrl: string;
};

type Props = {
  className?: string;
  track?: Track; // current track
  progressMs?: number;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onRestart?: () => void;
  isPlaying?: boolean;
};

export default function SpotifyMiniPlayer({
  className,
  track,
  progressMs = 42_000,
  onPlayPause,
  onNext,
  onPrev,
  onRestart,
  isPlaying = true,
}: Props) {
  // Fallback demo content until Spotify data is wired
  const demo = useMemo<Track>(() => ({
    id: "demo",
    title: "Song Name",
    artist: "Artist Name",
    playlist: "Playlist Name",
    durationMs: 225_000, // 3:45
    artworkUrl: "/images/media-5.jpg",
  }), []);

  const t = track ?? demo;
  const [hover, setHover] = useState(false);

  const duration = t.durationMs;
  const clamped = Math.min(Math.max(progressMs, 0), duration);
  const pct = duration > 0 ? (clamped / duration) * 100 : 0;

  const format = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60).toString();
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      className={cn(
        "relative w-[360px] max-w-[92vw] rounded-md bg-black text-white shadow-lg border border-white/10",
        className
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Open player state */}
      <div className="grid grid-cols-[88px_1fr_56px] items-center">
        {/* Artwork */}
        <div className="relative h-[88px] w-[88px] overflow-hidden rounded-l-md">
          <Image src={t.artworkUrl} alt={t.title} fill className="object-cover" />
        </div>

        {/* Meta */}
        <div className="px-4 py-3">
          <div className="text-base leading-5">{t.title}</div>
          <div className="text-2xl font-extrabold text-[#1ED760] leading-7">{t.artist}</div>
          <div className="text-sm text-white/60">{t.playlist ?? ""}</div>
        </div>

        {/* Time / Spotify glyph slot */}
        <div className="pr-3 text-right">
          <div className="text-lg tabular-nums">{format(duration)}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-neutral-900/90 rounded-b-md overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-[#1ED760]"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Hover overlay controls */}
      {hover && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-between px-6">
          <button
            aria-label="Previous"
            className="text-white/60 hover:text-white transition-colors"
            onClick={onPrev}
          >
            {/* Pause icon stand-in as shown on mock left */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </button>
          <button
            aria-label={isPlaying ? "Pause" : "Play"}
            className="text-white hover:text-[#1ED760] transition-colors"
            onClick={onPlayPause}
          >
            {isPlaying ? (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="4" width="4" height="16"/><rect x="13" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button
            aria-label="Next"
            className="text-white/60 hover:text-white transition-colors"
            onClick={onNext}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6v12l8.5-6L7 6z"/><rect x="18" y="6" width="2" height="12"/></svg>
          </button>
          <button
            aria-label="Restart"
            className="text-white/40 hover:text-white transition-colors"
            onClick={onRestart}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6V3L8 7l4 4V8c2.8 0 5 2.2 5 5s-2.2 5-5 5-5-2.2-5-5H6c0 3.3 2.7 6 6 6s6-2.7 6-6-2.7-6-6-6z"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}


