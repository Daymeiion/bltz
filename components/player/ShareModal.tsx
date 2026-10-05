"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, QrCode } from "lucide-react";

type ShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  playerName?: string;
  playerImage?: string;
  playerBadge?: string;
};

export default function ShareModal({
  isOpen,
  onClose,
  playerName = "PLAYER NAME",
  playerImage = "/images/Headshot.png",
  playerBadge = "/images/SilverHero1.png",
}: ShareModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleSocialShare = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this great player's locker!`);
    
    let shareUrl = "";
    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case "instagram":
        // Instagram doesn't support direct URL sharing, so we'll copy the link
        handleCopyLink();
        return;
      default:
        return;
    }
    
    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  const handleQRCode = () => {
    // For now, we'll just copy the link. In a real implementation, 
    // you might want to generate a QR code or open a QR code modal
    handleCopyLink();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-start justify-center z-[99999] p-4 pt-20" 
      style={{top: 0, left: 0, right: 0, bottom: 0}}
      onClick={onClose}
    >
       <div 
         className="rounded-2xl w-full max-w-xs relative overflow-hidden" 
         style={{
           backgroundImage: 'url(/images/abstract-textured-backgound.jpg)',
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           backgroundRepeat: 'no-repeat'
         }}
         onClick={(e) => e.stopPropagation()}
       >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Player Image Section */}
        <div className="relative p-6 pb-0">
          <div className="flex justify-center">
            <div className="relative">
              {/* Player Image Container */}
              <div className="relative w-48 h-48 overflow-hidden">
                {/* Background Badge */}
                <div className="absolute inset-0">
                  <Image
                    src="/images/SilverHero1.png"
                    alt="Background Badge"
                    fill
                    className="object-cover opacity-100"
                  />
                </div>
                {/* Player Image */}
                <div className="absolute inset-0">
                  <Image
                    src={playerImage}
                    alt={playerName}
                    fill
                    className="object-contain object-bottom"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Player Name Section */}
        <div className="relative px-4 pb-4">
          <div className="relative">
            {/* Accent gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFBB00] to-transparent rounded-lg blur-sm"></div>
            <div className="relative bg-gradient-to-r from-transparent via-[#FFBB00]/80 to-transparent rounded-lg px-4 py-0">
               <h2 className="text-2xl font-bold text-white text-center uppercase" style={{textShadow: '0 0 8px rgba(0, 0, 0, 0.2), 0 0 10px rgba(0, 0, 0, 0.2), 0 0 10px rgba(0, 0, 0, 0.2)'}}>
                {playerName}
              </h2>
            </div>
          </div>
        </div>

         {/* Share Section */}
         <div className="px-0 pb-0">

          {/* Utility Actions Row */}
          <div className="flex justify-center gap-8 mb-2">
            {/* Copy Link */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleCopyLink}
                className="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors mb-2"
              >
                <Copy className="w-6 h-6 text-white" />
              </button>
              <span className="text-white text-sm">Copy</span>
              {isCopied && (
                <span className="text-green-400 text-xs mt-1">Copied!</span>
              )}
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleQRCode}
                className="w-12 h-12 bg-blue-700 hover:bg-blue-800 rounded-full flex items-center justify-center transition-colors mb-2"
              >
                <QrCode className="w-6 h-6 text-white" />
              </button>
              <span className="text-white text-sm">QR Code</span>
            </div>
          </div>

          {/* Social Media Row */}
          <div className="flex justify-center pb-4 gap-2">
            {/* Facebook */}
            <button
              onClick={() => handleSocialShare("facebook")}
              className="p-2 hover:scale-110 transition-transform"
            >
              <Image
                src="/images/icons/facebook.png"
                alt="Facebook"
                width={48}
                height={48}
                className="w-12 h-12"
              />
            </button>

            {/* X (Twitter) */}
            <button
              onClick={() => handleSocialShare("twitter")}
              className="p-2 hover:scale-110 transition-transform"
            >
              <Image
                src="/images/icons/twitter-X.png"
                alt="X (Twitter)"
                width={48}
                height={48}
                className="w-12 h-12"
              />
            </button>

            {/* LinkedIn */}
            <button
              onClick={() => handleSocialShare("linkedin")}
              className="p-2 hover:scale-110 transition-transform"
            >
              <Image
                src="/images/icons/LinkedIn.png"
                alt="LinkedIn"
                width={48}
                height={48}
                className="w-12 h-12"
              />
            </button>

            {/* Instagram */}
            <button
              onClick={() => handleSocialShare("instagram")}
              className="p-2 hover:scale-110 transition-transform"
            >
              <Image
                src="/images/icons/instagram.png"
                alt="Instagram"
                width={48}
                height={48}
                className="w-12 h-12"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
