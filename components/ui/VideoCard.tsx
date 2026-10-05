"use client";
import Image from "next/image";
import { Card } from "@/components/ui/card";

export function VideoCard({ id, title, thumbnail_url }: { id: string; title: string; thumbnail_url?: string }) {
  return (
    <a href={`/watch/${id}`}>
      <Card className="overflow-hidden rounded-2xl border-white/10 bg-white/5 transition hover:scale-[1.01] hover:bg-white/10">
        <div className="relative aspect-video">
          {thumbnail_url ? (
            <Image src={thumbnail_url} alt={title} fill className="object-cover" />
          ) : (
            <div className="h-full w-full bg-white/10" />
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold">{title}</h3>
          <div className="mt-1 text-xs opacity-70">Highlight • 2:13</div>
        </div>
      </Card>
    </a>
  );
}
