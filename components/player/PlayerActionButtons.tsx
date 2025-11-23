"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import ShareModal from "./ShareModal";

type Props = {
  playerName?: string;
  playerImage?: string;
  playerBadge?: string;
};

export default function PlayerActionButtons({ 
  playerName = "DEMO PLAYER",
  playerImage = "/images/Headshot.png",
  playerBadge = "/images/SilverHero1.png"
}: Props) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [notificationSrc, setNotificationSrc] = useState("/images/icons/notification-default.png"); // Use static PNG by default
  const notificationGifRef = useRef<HTMLImageElement>(null);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleNotification = () => {
    setIsNotifying(!isNotifying);
    
    // Show gif animation when clicked
    const gifSrc = "/images/icons/Notification bell.gif";
    setNotificationSrc(gifSrc);
    
    // Reset to static PNG after animation completes
    setTimeout(() => {
      setNotificationSrc("/images/icons/notification-default.png"); // Reset to static PNG
    }, 1500); // Shorter animation duration
  };

  const handleShare = () => {
    setIsShared(!isShared);
    setShowShareModal(!showShareModal);
  };


  return (
    <>
      {/* Action Buttons Row */}
      <div className="absolute bottom-4 right-4 flex gap-0 z-10">
        {/* Follow Button */}
        <button
          onClick={handleFollow}
          className="inline-flex items-center bg-white/[0.03] rounded-md px-4 py-0 lg:py-0 text-sm lg:text-base font-medium text-white hover:bg-gray-700/70 transition-all duration-300 ease-in-out relative overflow-hidden group"
        >
          <span className="relative z-10">{isFollowing ? "Following" : "Follow"}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out"></div>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="p-0 transition-all duration-200"
        >
          <Image
            src="/images/icons/3dshare.png"
            alt="Share"
            width={32}
            height={32}
            className={`w-6 h-6 lg:w-12 lg:h-12 transition-all duration-200 drop-shadow-lg ${
              isShared 
                ? "opacity-80 hover:opacity-100" 
                : "opacity-70 hover:opacity-100"
            }`}
          />
        </button>

        {/* Notification Button */}
        <button
          onClick={handleNotification}
          className="p-1 lg:p-0 transition-all duration-200"
        >
          <Image
            ref={notificationGifRef}
            src={notificationSrc}
            alt="Notification"
            width={32}
            height={32}
            className={`w-8 h-8 transition-all duration-200 ${
              isNotifying 
                ? "opacity-80 hover:opacity-100" 
                : "opacity-70 hover:opacity-100"
            }`}
          />
        </button>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        playerName={playerName}
        playerImage={playerImage}
        playerBadge={playerBadge}
      />
    </>
  );
}
