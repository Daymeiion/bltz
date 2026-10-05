"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  useDisclosure,
} from "@heroui/react";
import { ChevronDown, User, Play } from "lucide-react";
import { useState, useEffect } from "react";

// Animated skeleton component for loading states
const VideoCardSkeleton = () => {
  return (
    <div className="bg-gray-800/50 rounded-md p-2 space-y-3 animate-pulse">
      {/* Video thumbnail skeleton */}
      <div className="w-full h-32 bg-gray-700 rounded-md"></div>
      
      {/* Title skeleton */}
      <div className="flex items-center justify-between gap-2">
        <div className="h-4 bg-gray-700 rounded w-3/4 flex-1"></div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#FFBB00]/20 rounded-full"></div>
          <div className="h-3 bg-[#FFBB00]/20 rounded w-8"></div>
        </div>
      </div>
      
      {/* User info skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
        <div className="flex-1 space-y-1">
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          <div className="h-2 bg-gray-700 rounded w-2/3"></div>
        </div>
        <div className="h-6 bg-gray-700 rounded w-16"></div>
      </div>
    </div>
  );
};

// Video card component
const VideoCard = ({ 
  title, 
  views, 
  userName, 
  gamePlayed, 
  showFollow = false 
}: {
  title: string;
  views: string;
  userName: string;
  gamePlayed: string;
  showFollow?: boolean;
}) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-2 space-y-3 hover:bg-gray-800/70 transition-colors">
      {/* Video thumbnail */}
      <div className="w-full h-32 bg-gray-700 rounded-md relative overflow-hidden group cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Play className="w-6 h-6 text-white ml-1" />
          </div>
        </div>
      </div>
      
      {/* Title and views */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-white text-sm font-medium line-clamp-1 flex-1">{title}</h3>
        <div className="flex items-center gap-1 text-[#FFBB00] text-xs whitespace-nowrap">
          <User className="w-3 h-3" />
          <span>{views}</span>
        </div>
      </div>
      
      {/* User info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate">{userName}</p>
          <p className="text-gray-400 text-xs truncate">Playing {gamePlayed}</p>
        </div>
        {showFollow && (
          <button className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1 rounded transition-colors">
            Follow
          </button>
        )}
      </div>
    </div>
  );
};

type Props = {
  playerName?: string;
  videos?: Array<{
    id: any;
    title: any;
    thumbnail_url?: any;
    views?: string;
    userName?: string;
    gamePlayed?: string;
    showFollow?: boolean;
  }> | null;
};

export default function VideoGridModal({ playerName = "Player", videos = [] }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("POPULAR");

  // Simulate loading for demonstration
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Mock data for demonstration
  const mockVideos = [
    {
      id: "1",
      title: "GTA 5 Every Day!!",
      views: "1.642",
      userName: "Charlie Schleifer",
      gamePlayed: "Grand The Auto 5"
    },
    {
      id: "2", 
      title: "Party 5 With Public",
      views: "942",
      userName: "Lindsey Rhiel Madsen",
      gamePlayed: "Counter Strike"
    },
    {
      id: "3",
      title: "Forza Horizon Agaaaiinnn!!!",
      views: "734",
      userName: "Leo Dorwart",
      gamePlayed: "Forza Horizon"
    },
    {
      id: "4",
      title: "Big Match Again..",
      views: "1.2K",
      userName: "Player Name",
      gamePlayed: "Game Name",
      showFollow: true
    },
    {
      id: "5",
      title: "Game Old 1998 with friend!!",
      views: "856",
      userName: "Another Player",
      gamePlayed: "Retro Game",
      showFollow: true
    },
    {
      id: "6",
      title: "Champioonnn...",
      views: "2.1K",
      userName: "Pro Player",
      gamePlayed: "Esports Game",
      showFollow: true
    }
  ];

  const displayVideos = videos && videos.length > 0 ? videos : mockVideos;

  return (
    <>
      <style jsx>{`
        select:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        select option {
          outline: none !important;
        }
        .close-button {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 40px !important;
          height: 40px !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          box-sizing: border-box !important;
          min-width: unset !important;
          min-height: unset !important;
          border-radius: 50% !important;
        }
        .close-button::before,
        .close-button::after {
          display: none !important;
        }
        .close-button svg {
          margin: 0 !important;
          padding: 0 !important;
          transform: none !important;
          width: 100% !important;
          height: 100% !important;
        }
        .close-button * {
          padding: 0 !important;
          margin: 0 !important;
          box-sizing: border-box !important;
        }
        .close-button [data-slot="closeButton"] {
          padding: 0 !important;
          margin: 0 !important;
        }
      `}</style>
      <Button
        color="default"
        variant="light"
        onPress={onOpen}
        className="text-[#FFBB00] hover:text-[#FFBB00]/80 text-sm underline px-2 py-1"
      >
        SEE ALL
      </Button>
      
      <Modal
        backdrop="opaque"
        size="4xl"
        isDismissable={true}
        hideCloseButton={false}
        classNames={{
          body: "pb-6",
          backdrop: "bg-[#292f46]/50 backdrop-opacity-40",
          base: "border-[#292f46] bg-[#19172c] dark:bg-[#0c0a1f] text-[#a8b0d3] max-w-6xl mx-auto px-6 rounded-md max-h-[85vh] overflow-hidden",
          header: "",
          footer: "",
          closeButton: "hidden",
        }}
        isOpen={isOpen}
        radius="md"
        onOpenChange={onOpenChange}
        placement="center"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-row items-center justify-between pt-6 pb-0 px-6 relative">
                <h2 className="text-white text-xl font-bebas tracking-widest">
                  {playerName?.toUpperCase() || "PLAYER"} VIDEOS
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Sort by:</span>
                    <div className="relative">
                      <select
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="appearance-none bg-gray-800 text-white text-sm px-3 py-1 pr-8 rounded border focus:outline-none focus:border-[#FFBB00] outline-none"
                        style={{ outline: 'none' }}
                      >
                        <option value="POPULAR">POPULAR</option>
                        <option value="RECENT">RECENT</option>
                        <option value="VIEWS">MOST VIEWED</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <Button
                    isIconOnly
                    variant="light"
                    onPress={onClose}
                    className="close-button hover:bg-white/5 active:bg-white/10 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ease-in-out relative overflow-hidden group"
                  >
                    <span className="relative z-10">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out rounded-full"></div>
                  </Button>
                </div>
              </ModalHeader>
              
              <ModalBody className="!bg-transparent">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <VideoCardSkeleton key={index} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayVideos.map((video) => (
                      <VideoCard
                        key={video.id}
                        title={video.title || "Untitled Video"}
                        views={video.views || "0"}
                        userName={video.userName || playerName || "Unknown Player"}
                        gamePlayed={video.gamePlayed || "Unknown Game"}
                        showFollow={video.showFollow || false}
                      />
                    ))}
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
