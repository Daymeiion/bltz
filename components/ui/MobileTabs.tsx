"use client";

import { Tabs as HeroUITabs, Tab } from "@heroui/react";
import VideoYTRow from "@/components/video/VideoYTRow";
import { WobbleCard } from "@/components/ui/wobble-card";
import Image from "next/image";
import { MOCK_VIDEOS_YT } from "@/lib/mockVideosYT";

type Props = {
  playerName?: string;
};

export default function MobileTabs({ playerName = "DEMO PLAYER" }: Props) {
  return (
    <div className="space-y-3">
        <HeroUITabs 
          defaultSelectedKey="media" 
          className="w-full"
          classNames={{
            tabList: "grid w-full grid-cols-3 rounded-lg border border-white/10 bg-white/5 py-1 px-2",
            tab: "font-bold uppercase tracking-wider [&_[data-slot=cursor]]:bg-white/5 [&_[data-slot=cursor]]:dark:bg-white/5 [&_[data-slot=cursor]]:border [&_[data-slot=cursor]]:border-white/20 [&_[data-slot=cursor]]:shadow-md [&_[data-slot=cursor]]:rounded-md",
            panel: "mt-6"
          }}
        >
      <Tab key="media" title="MEDIA">
        <div className="space-y-4">
          {/* Quote Box - Mobile Only */}
          <div className="rounded-lg border border-white/10 bg-white/5 py-2 px-2">
            <blockquote className="text-center">
              <p className="text-md italic mb-4 leading-relaxed" style={{ fontFamily: 'Oswald, sans-serif' }}>
                "Hard work beats talent when talent doesn't work hard. Every game is an opportunity to prove yourself."
              </p>
              <footer className="text-sm opacity-70" style={{ fontFamily: 'Oswald, sans-serif' }}>
                — {playerName}
              </footer>
            </blockquote>
          </div>
          
          {/* Media Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* First row: 2/3 and 1/3 */}
            <WobbleCard containerClassName="h-40 bg-gradient-to-br from-blue-800 to-cyan-800 col-span-2 rounded-md" className="p-0">
              <div className="relative rounded-md overflow-hidden h-full">
                <Image
                  src="/images/media-5.jpg"
                  alt="Media 1"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/images/media-1.png";
                  }}
                />
                <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                  <div className="text-white">
                    <h3 className="text-sm font-bold">Media Item 1</h3>
                    <p className="text-xs opacity-80">Tap to view</p>
                  </div>
                </div>
              </div>
            </WobbleCard>
            <WobbleCard containerClassName="h-40 bg-gradient-to-br from-blue-800 to-cyan-800 col-span-1 rounded-md" className="p-0">
              <div className="relative rounded-md overflow-hidden h-full">
                <Image
                  src="/images/media-5.jpg"
                  alt="Media 2"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/images/media-2.png";
                  }}
                />
                <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                  <div className="text-white">
                    <h3 className="text-sm font-bold">Media Item 2</h3>
                    <p className="text-xs opacity-80">Interactive</p>
                  </div>
                </div>
              </div>
            </WobbleCard>
            {/* Second row: 1/3 and 2/3 */}
            <WobbleCard containerClassName="h-40 bg-gradient-to-br from-blue-800 to-cyan-800 col-span-1 rounded-md" className="p-0">
              <div className="relative rounded-md overflow-hidden h-full">
                <Image
                  src="/images/media-5.jpg"
                  alt="Media 3"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/images/media-3.png";
                  }}
                />
                <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                  <div className="text-white">
                    <h3 className="text-sm font-bold">Media Item 3</h3>
                    <p className="text-xs opacity-80">Gallery</p>
                  </div>
                </div>
              </div>
            </WobbleCard>
            <WobbleCard containerClassName="h-40 bg-gradient-to-br from-blue-800 to-cyan-800 col-span-2 rounded-md" className="p-0">
              <div className="relative rounded-md overflow-hidden h-full">
                <Image
                  src="/images/media-5.jpg"
                  alt="Card Image"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/images/SilverHero1.png";
                  }}
                />
                <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                  <div className="text-white">
                    <h3 className="text-sm font-bold">Card Image</h3>
                    <p className="text-xs opacity-80">Special</p>
                  </div>
                </div>
              </div>
            </WobbleCard>
          </div>
        </div>
      </Tab>
      
      <Tab key="film" title="FILM">
        <div className="space-y-3">
          {/* Mobile grid: 2 videos per row, 3 rows total (6 videos) */}
          <div className="grid grid-cols-2 gap-3">
            {MOCK_VIDEOS_YT.slice(0, 6).map((video) => (
              <div key={video.id} className="bg-white/5 rounded-lg p-2">
                {/* Video thumbnail */}
                <div className="relative aspect-video rounded-md overflow-hidden mb-2">
                  <Image 
                    src={video.thumbnail} 
                    alt={video.title} 
                    fill 
                    className="object-cover" 
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5"></div>
                    </div>
                  </div>
                </div>
                
                {/* Video info */}
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold line-clamp-2 leading-tight">
                    {video.title}
                  </h3>
                  <div className="flex justify-between items-center text-xs opacity-70">
                    <span>{video.channel.name}</span>
                    <span>{video.meta?.views ? `${video.meta.views} views` : ""}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Tab>
      
      <Tab key="shop" title="SHOP">
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 leading-relaxed opacity-90">
            This is a short bio section. Replace with player locker bio from Supabase later.
          </div>
        </div>
      </Tab>
        </HeroUITabs>
    </div>
  );
}
