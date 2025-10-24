"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import SpotifyMiniPlayer from "./SpotifyMiniPlayer";
import { Card } from "@/components/ui/card";
import ShareModal from "./ShareModal";

type Props = {
  fullName: string;
  city?: string;
  videoSrc?: string;        // looping reel (mp4 for now; swap to HLS later)
  videoPoster?: string;     // optional poster while video buffers
  badgeUrl: string;         // your gold card image
  avatarUrl: string;        // player headshot (transparent bg looks great)
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onShare?: () => void;
};

export default function PlayerHeader({
  fullName,
  city = "Hometown, USA",
  videoSrc,
  videoPoster,
  badgeUrl,
  avatarUrl,
  isFavorite = false,
  onToggleFavorite,
  onShare,
}: Props) {
  const [fav, setFav] = useState(isFavorite);
  const [showShareModal, setShowShareModal] = useState(false);
  const [likeSrc, setLikeSrc] = useState("/images/icons/like-default.png");
  const [showSpotify, setShowSpotify] = useState(false);
  const vidRef = useRef<HTMLVideoElement | null>(null);

  const toggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    setFav((v) => !v);
    onToggleFavorite?.();
    
    // Show gif animation when clicked
    const gifSrc = "/images/icons/like.gif";
    setLikeSrc(gifSrc);
    
    // Reset to appropriate static PNG after animation
    setTimeout(() => {
      setLikeSrc(fav ? "/images/icons/like-default.png" : "/images/icons/like-selected.png");
    }, 2000); // Adjust based on gif duration
  };

  return (
    <>
    <Card className="overflow-hidden rounded-b-2xl p-0 border-0">
      {/* ===== Stacked visual container ===== */}
      <div className="relative w-full overflow-hidden rounded-b-2xl h-[450px]"> 
        {/* Background video / poster */}
        {videoSrc ? (
          <video
            ref={vidRef}
            className="absolute inset-0 h-full w-full object-cover rounded-b-2xl"
            src={videoSrc}
            poster={videoPoster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="absolute inset-0  rounded-b-2xl" />
        )}

        {/* gradient for legibility */}
        <div className="pointer-events-none absolute inset-0 w-full h-full bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-b-2xl" />
		{/* bottom 100px gradient overlay */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[250px] w-full bg-gradient-to-t from-black/100 to-transparent rounded-b-2xl" />

        {/* Top-left Spotify glyph (toggle mini player) */}
        <button
          type="button"
          aria-label="Open Spotify player"
          onClick={() => setShowSpotify((v) => !v)}
          className="absolute left-2 top-3 z-30 drop-shadow-lg hover:scale-105 transition-transform"
        >
          <div className="relative w-14 h-14 lg:w-10 lg:h-10">
            <Image src="/images/spotify-logo.png" alt="Spotify" fill className="object-contain" />
          </div>
        </button>

        {/* Actions (fav only) */}
        <div className="absolute right-0 top-0 z-30 -mr-2">
          <button
            type="button"
            aria-label="Favorite"
            onClick={toggleFav}
            className="flex items-center justify-center transition-all duration-200"
          >
            <Image
              src={likeSrc}
              alt="Like"
              width={80}
              height={80}
              className={`w-18 h-18 lg:w-16 lg:h-16 transition-all duration-200 ${
                fav 
                  ? "opacity-100" 
                  : "opacity-70 hover:opacity-100"
              }`}
            />
          </button>
        </div>

        {/* Badge (card image) at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-0">
          <div className="relative w-full h-[240px]">
            <Image src={badgeUrl} alt="Badge" fill className="object-contain object-bottom" priority />
          </div>
        </div>

        {/* Headshot at bottom, full width */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-0">
          <div className="relative w-full h-40">
            <Image src={avatarUrl} alt={fullName} fill className="object-contain object-bottom" />
          </div>
        </div>
      </div>
    </Card>
    {showSpotify && (
      <div className="absolute left-2 top-16 z-40 w-72">
        <SpotifyMiniPlayer />
      </div>
    )}
    
    {/* ===== Text / meta - separate container below ===== */}
    <div className="px-0 pt-1 pb-0 text-center">
      <div className="w-full px-2 pt-1 pb-0 bg-gradient-to-r from-transparent via-[#FFBB00] to-transparent flex items-center justify-center">
        <h2 className="text-4xl lg:text-2xl font-bold tracking-wide" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          <span className="text-black">{fullName.split(" ").slice(0, -1).join(" ")}</span>{" "}
          <span className="text-black">{fullName.split(" ").slice(-1)}</span>
        </h2>
      </div>
      <p className="mt-0 mb-0 text-lg opacity-75" style={{ fontFamily: 'Oswald, sans-serif' }}>{city}</p>
    </div>

     {/* ===== Scrollable Images Section (duplicate below stats) ===== */}
     <div className="mt-4 p-0">
      <div className="flex gap-4 overflow-x-auto pb-0 pt-1" style={{ scrollbarWidth: 'none' }}>
        {/* Sample images - replace with your actual data */}
        {[
          { src: '/images/media-1.png', abbr: 'MED' },
          { src: '/images/media-2.png', abbr: 'VID' },
          { src: '/images/media-3.png', abbr: 'PIC' },
          { src: '/images/SilverHero1.png', abbr: 'CRD' },
          { src: '/images/Headshot.png', abbr: 'HST' },
          { src: '/images/video-thumb.png', abbr: 'THM' },
        ].map((item, index) => (
          <div key={index} className="flex flex-col items-center min-w-0 shrink-0">
            <div className="relative w-14 h-14 mb-2">
              <Image 
                src={item.src} 
                alt={item.abbr} 
                fill 
                className="object-cover rounded" 
              />
            </div>
          </div>
        ))}
      </div>
    </div>




    {/* ===== Stats / Info Row (3 columns) ===== */}
    <div className="mt-2 mb-4">
      <div className="w-full px-0
     pb-1 flex justify-center">
          <div className="grid grid-cols-3 gap-0 w-full max-w-lg mx-auto divide-x divide-white/20 items-stretch">
        {[{ title: "11.9k", subtitle: "fans" }, { title: "OLB", subtitle: "position" }, { title: "2026", subtitle: "class" }].map((item, idx) => (
           <div key={idx} className="w-full overflow-hidden h-full">
            <div className="w-full px-0
           py-1 h-full">
               <div className="text-white text-center flex flex-col items-center justify-center">
                  <div className="w-full text-2xl font-bold leading-tight drop-shadow-md text-center" style={{ fontFamily: 'Oswald, sans-serif' }}>{item.title}</div>
               <div className="w-full text-sm opacity-80 leading-tight text-white/70 drop-shadow-md text-center mx-auto" style={{ fontFamily: 'Oswald, sans-serif' }}>{item.subtitle}</div>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
    
    {/* ===== Scrollable Images Section (duplicate below stats) ===== */}
    <div className="mt-4 py-2">
      <div className="flex gap-4 overflow-x-auto pb-0" style={{ scrollbarWidth: 'none' }}>
        {/* Sample images - replace with your actual data */}
        {[
          { src: '/images/media-1.png', abbr: 'MED' },
          { src: '/images/media-2.png', abbr: 'VID' },
          { src: '/images/media-3.png', abbr: 'PIC' },
          { src: '/images/SilverHero1.png', abbr: 'CRD' },
          { src: '/images/Headshot.png', abbr: 'HST' },
          { src: '/images/video-thumb.png', abbr: 'THM' },
        ].map((item, index) => (
          <div key={index} className="flex flex-col items-center min-w-0 shrink-0">
            <div className="relative w-14 h-14 mb-2">
              <Image 
                src={item.src} 
                alt={item.abbr} 
                fill 
                className="object-cover rounded" 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
    
    {/* ===== Quote Box ===== */}
    <div className="hidden lg:block rounded-md border border-white/10 bg-white/5 py-2 px-2">
      <blockquote className="text-center">
        <p className="text-md italic mb-4 leading-relaxed" style={{ fontFamily: 'Oswald, sans-serif' }}>
          "Hard work beats talent when talent doesn't work hard. Every game is an opportunity to prove yourself."
        </p>
        <footer className="text-sm opacity-70" style={{ fontFamily: 'Oswald, sans-serif' }}>
          — DEMO PLAYER
        </footer>
      </blockquote>
    </div>
    
    {/* Share Modal */}
    <ShareModal
      isOpen={showShareModal}
      onClose={() => setShowShareModal(false)}
      playerName={fullName}
      playerImage={avatarUrl}
      playerBadge={badgeUrl}
    />
    </>
  );
}
