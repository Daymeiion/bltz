import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import VideoPlayer from "@/components/video/VideoPlayer";
import VideoSidebar from "@/components/video/VideoSidebar";
import VideoComments from "@/components/video/VideoComments";
import MobileVideoLayout from "@/components/video/MobileVideoLayout";
import VideoMetadata from "@/components/video/VideoMetadata";
import TheaterModeLayout from "@/components/video/TheaterModeLayout";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video } = await supabase.from('videos').select('*').eq('id', id).single();
  
  // Fallback to mock data if no video found
  const mockVideo = {
    id: id,
    title: "Thunder Stunt (2018)",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    playback_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    thumbnail: "/images/Awards/video-thumb.png",
    duration: "167min",
    views: "567k",
    likes: "45,648",
    dislikes: "326",
    published_date: "June 4, 2020",
    channel: {
      name: "Thunder Productions",
      avatar: "/images/Headshot.png"
    }
  };

  const videoData = video || mockVideo;

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden">
        <MobileVideoLayout videoData={videoData} />
      </div>

      {/* Desktop/Tablet Layout */}
      <div className="hidden md:block">
        <TheaterModeLayout videoData={videoData} />
      </div>
    </>
  );
}
