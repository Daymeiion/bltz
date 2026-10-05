"use client";

import { useRef } from "react";
import { Play } from "lucide-react";
import Image from "next/image";
import { Card } from "@/components/ui/card";

type VideoHoverCardProps = {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;           // poster frame
  src: string;                 // mp4 (good for local demo)
  duration?: string;           // e.g., "2:13"
  author?: { name: string; avatar?: string };
  // NEW: row-controlled behavior
  onHover?: (id: string) => void;
  registerRef?: (id: string, el: HTMLVideoElement | null) => void;
};

export default function VideoHoverCard({
  id, title, description, thumbnail, src, duration, author, onHover, registerRef,
}: VideoHoverCardProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  const play = async () => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    try { await v.play(); } catch {}
  };

  const pause = () => {
    const v = ref.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  return (
    <a
      href={`/watch/${id}`}
      className="group block min-w-[260px] snap-start"
      onMouseEnter={(e) => { onHover?.(id); play(); }}
      onMouseLeave={pause}
      onFocus={() => { onHover?.(id); play(); }}
      onBlur={pause}
    >
      <Card className="overflow-hidden rounded-md border-white/10 bg-white/5 transition will-change-transform group-hover:scale-[1.01]">
        {/* media */}
        <div className="relative aspect-video">
          {/* poster image under video for instant paint */}
          {thumbnail && <Image src={thumbnail} alt={title} fill className="object-cover" />}
          {/* video (hover to play) */}
          <video
            ref={(el) => { ref.current = el; registerRef?.(id, el); }}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity group-hover:opacity-100"
            playsInline
            preload="metadata"
            muted
            src={src}
          />
          {/* small play button (accent) */}
          <div className="absolute bottom-3 left-3 rounded-full p-2 transition-opacity bg-[--accent] text-black shadow-md opacity-100 group-hover:opacity-0">
            <Play size={16} />
          </div>
          {/* duration */}
          {duration && (
            <div className="absolute bottom-3 right-3 rounded bg-black/80 px-2 py-1 text-xs font-medium text-white">
              {duration}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* text */}
        <div className="space-y-2 p-3">
          <h3 className="line-clamp-1 font-semibold">{title}</h3>
          {description && (
            <p className="line-clamp-2 text-sm/5 opacity-70">{description}</p>
          )}
          {author && (
            <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
              <div className="h-6 w-6 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                {author.avatar ? (
                  <Image src={author.avatar} alt={author.name} width={24} height={24} className="h-6 w-6 object-cover" />
                ) : (
                  <div className="flex h-6 w-6 p-1 items-center justify-center">{author.name?.[0]}</div>
                )}
              </div>
              <span className="truncate">{author.name}</span>
            </div>
          )}
        </div>
      </Card>
    </a>
  );
}
