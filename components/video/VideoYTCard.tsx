"use client";

import { useRef } from "react";
import Image from "next/image";
import { MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";

type Props = {
  id: string;
  title: string;
  thumbnail: string;                // poster
  src: string;                      // mp4 for local demo (or HLS later)
  duration?: string;                // "3:13:16"
  channel: { name: string; avatar?: string };
  meta?: { views?: string; age?: string }; // "597K", "4 weeks ago"
  onHover?: (id: string) => void;   // provided by row
  registerRef?: (id: string, el: HTMLVideoElement | null) => void;
  className?: string;
};

export default function VideoYTCard({
  id, title, thumbnail, src, duration = "0:00",
  channel, meta, onHover, registerRef, className,
}: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);

  const play = async () => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; v.playsInline = true;
    try { await v.play(); } catch {}
  };
  const pause = () => {
    const v = ref.current;
    if (!v) return;
    v.pause(); v.currentTime = 0;
  };

  return (
    <a
      href={`/watch/${id}`}
      className={`group block min-w-[200px] snap-start ${className ?? ""}`}
      onMouseEnter={() => { onHover?.(id); play(); }}
      onMouseLeave={pause}
      onFocus={() => { onHover?.(id); play(); }}
      onBlur={pause}
    >
      <Card className="border-none bg-transparent shadow-none py-0">
        {/* Thumbnail / preview */}
        <div className="relative overflow-hidden rounded-sm">
          {/* static image for instant paint */}
          <Image src={thumbnail} alt={title} width={1280} height={720} className="aspect-video w-full object-cover" />
          {/* hover video preview */}
          <video
            ref={(el) => { ref.current = el; registerRef?.(id, el); }}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            preload="metadata"
            muted
            src={src}
          />
          {/* duration badge (bottom-right) */}
          <span className="absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-xs font-semibold text-white
                           bg-black/80 backdrop-blur">
            {duration}
          </span>
        </div>

        {/* info row */}
        <div className="mt-2 mx-1 flex items-start gap-3">
          {/* channel avatar */}
          <div className="h-9 w-9 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10 shrink-0">
            {channel.avatar ? (
              <Image src={channel.avatar} alt={channel.name} width={30} height={30} className="h-9 w-9 object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center text-xs">{channel.name?.[0]}</div>
            )}
          </div>

          {/* title + meta */}
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-xs font-semibold leading-tight">
              {title}
            </h3>
            <div className="mt-1 flex justify-between items-center text-xs">
              <span className="opacity-70">{channel.name}</span>
              <span className="opacity-60">
                {meta?.views ? `${meta.views} views` : ""}
              </span>
            </div>
          </div>

          {/* kebab */}
          <button
            type="button"
            className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition text-[13px]"
            aria-label="More options"
            onClick={(e) => e.preventDefault()}
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </Card>
    </a>
  );
}
