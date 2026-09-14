"use client";

import { useEffect, useRef, useState } from "react";

type Props = { title: string; thumbnailUrl?: string | null; playbackUrl?: string | null; embedUrl?: string | null };

// The surrounding card owns clicks; previews are silent, decorative media.
export function VideoPreview({ title, thumbnailUrl, playbackUrl, embedUrl }: Props) {
  const host = useRef<HTMLSpanElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const poster = imageFailed ? null : thumbnailUrl;
  const youtubeId = embedUrl?.match(/^https:\/\/www\.youtube-nocookie\.com\/embed\/([\w-]{11})$/)?.[1];
  const image = poster || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : null);

  useEffect(() => {
    const parent = host.current?.parentElement;
    if (!parent) return;
    const desktop = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => {
      setHovering(false);
      if (video.current) {
        video.current.pause();
        if (video.current.readyState >= 1) video.current.currentTime = 0.001;
      }
    };
    const start = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !desktop.matches || reducedMotion.matches) return;
      setHovering(true);
      void video.current?.play().catch(() => {});
    };
    const visibility = () => { if (document.hidden) stop(); };
    parent.addEventListener("pointerenter", start);
    parent.addEventListener("pointerleave", stop);
    desktop.addEventListener("change", stop);
    reducedMotion.addEventListener("change", stop);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      parent.removeEventListener("pointerenter", start);
      parent.removeEventListener("pointerleave", stop);
      desktop.removeEventListener("change", stop);
      reducedMotion.removeEventListener("change", stop);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [playbackUrl, embedUrl]);

  const mediaStyle = { position: "absolute" as const, inset: 0, width: "100%", height: "100%", objectFit: "cover" as const };
  return <span ref={host} aria-hidden="true" style={{ ...mediaStyle, display: "block", pointerEvents: "none" }}>
    {playbackUrl ? <video key={playbackUrl} ref={video} src={playbackUrl} muted playsInline loop preload={poster ? "metadata" : "auto"} onLoadedMetadata={event => { if (!hovering) event.currentTarget.currentTime = 0.001; }} style={mediaStyle} /> : null}
    {image && !(hovering && (playbackUrl || embedUrl)) ? <img src={image} alt="" onError={() => setImageFailed(true)} style={mediaStyle} /> : null}
    {hovering && youtubeId ? <iframe src={`${embedUrl}?autoplay=1&mute=1&controls=0&playsinline=1&loop=1&playlist=${youtubeId}`} title={`${title} preview`} tabIndex={-1} allow="autoplay; encrypted-media" style={{ ...mediaStyle, border: 0 }} /> : null}
  </span>;
}
