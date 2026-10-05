"use client";

import { useState } from "react";
import VideoPlayer from "./VideoPlayer";
import VideoSidebar from "./VideoSidebar";
import VideoComments from "./VideoComments";
import VideoMetadata from "./VideoMetadata";

interface TheaterModeLayoutProps {
  videoData: any;
}

export default function TheaterModeLayout({ videoData }: TheaterModeLayoutProps) {
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const handleTheaterModeToggle = (theaterMode: boolean) => {
    setIsTheaterMode(theaterMode);
  };

  if (isTheaterMode) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-6 pl-12">
          {/* Full Width Video Player - Smaller */}
          <div className="mb-6 max-w-4xl mx-auto">
            <VideoPlayer 
              src={videoData.playback_url}
              title={videoData.title}
              poster={videoData.thumbnail}
              onTheaterModeToggle={handleTheaterModeToggle}
              isTheaterMode={isTheaterMode}
            />
          </div>

          {/* Content Below Video */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Video Info */}
              <VideoMetadata
                title={videoData.title}
                duration={videoData.duration || "167min"}
                publishedDate={videoData.published_date || "June 4, 2020"}
                views={videoData.views || "567k"}
                likes={videoData.likes || "45,648"}
                dislikes={videoData.dislikes || "326"}
                description={videoData.description}
                isFollowing={true}
              />

              {/* Comments Section */}
              <VideoComments />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <VideoSidebar />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal layout
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-6 pl-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <VideoPlayer 
              src={videoData.playback_url}
              title={videoData.title}
              poster={videoData.thumbnail}
              onTheaterModeToggle={handleTheaterModeToggle}
              isTheaterMode={isTheaterMode}
            />

            {/* Video Info */}
            <VideoMetadata
              title={videoData.title}
              duration={videoData.duration || "167min"}
              publishedDate={videoData.published_date || "June 4, 2020"}
              views={videoData.views || "567k"}
              likes={videoData.likes || "45,648"}
              dislikes={videoData.dislikes || "326"}
              description={videoData.description}
              isFollowing={true}
            />

            {/* Comments Section */}
            <VideoComments />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <VideoSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
