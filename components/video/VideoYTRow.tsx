"use client";

import { useRef, useState } from "react";
import VideoYTCard from "./VideoYTCard";

type V = {
  id: string; title: string; thumbnail: string; src: string; duration?: string;
  channel: { name: string; avatar?: string };
  meta?: { views?: string; age?: string };
};

export default function VideoYTRow({ videos }: { videos: V[] }) {
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());
  const [activeId, setActiveId] = useState<string | null>(null);

  const registerRef = (id: string, el: HTMLVideoElement | null) => {
    if (el) videoRefs.current.set(id, el);
    else videoRefs.current.delete(id);
  };

  const handleHover = (id: string) => {
    setActiveId(id);
    for (const [vid, el] of videoRefs.current.entries()) {
      if (vid !== id) {
        try { el.pause(); el.currentTime = 0; } catch {}
      }
    }
  };

  // Only show first 3 videos
  const displayVideos = videos.slice(0, 3);

  return (
    <div
      className="flex gap-4 pb-2 !mt-0"
      onMouseLeave={() => {
        if (!activeId) return;
        const el = videoRefs.current.get(activeId);
        try { el?.pause(); } catch {}
        setActiveId(null);
      }}
    >
      {displayVideos.map((v) => (
        <VideoYTCard
          key={v.id}
          {...v}
          onHover={handleHover}
          registerRef={registerRef}
        />
      ))}
    </div>
  );
}
