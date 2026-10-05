"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { normalizeYouTubeUrl } from "@/lib/player/youtube";

type Player = { destroy(): void };
type YouTubeAPI = { Player: new (element: HTMLIFrameElement, options: { events: { onError: (event: { data: number }) => void } }) => Player };
type YouTubeWindow = Window & { YT?: YouTubeAPI; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<YouTubeAPI> | undefined;

function loadAPI(): Promise<YouTubeAPI> {
  const win = window as YouTubeWindow;
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const previous = win.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => finish(new Error("YouTube API timed out")), 15000);
    const ready = () => { try { previous?.(); } finally { finish(); } };
    function finish(error?: Error) {
      window.clearTimeout(timeout);
      if (win.onYouTubeIframeAPIReady === ready) win.onYouTubeIframeAPIReady = previous;
      if (error) { script.remove(); apiPromise = undefined; reject(error); }
      else if (win.YT) resolve(win.YT);
    }
    win.onYouTubeIframeAPIReady = ready;
    script.src = "https://www.youtube.com/iframe_api";
    script.referrerPolicy = "strict-origin-when-cross-origin";
    script.onerror = () => finish(new Error("YouTube API unavailable"));
    document.head.append(script);
  });
  return apiPromise;
}

export function YouTubePlayer({ url, title, style, className, autoPlay = false, muted = false }: { url: string; title: string; autoPlay?: boolean; muted?: boolean; style?: CSSProperties; className?: string }) {
  const source = normalizeYouTubeUrl(url);
  const host = useRef<HTMLDivElement>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = !source?.providerVideoId || failedUrl === url;
  const embedUrl = source?.embedUrl;

  useEffect(() => {
    const container = host.current;
    if (!container || !embedUrl) return;
    let cancelled = false;
    let stopped = false;
    let player: Player | undefined;
    const fail = () => {
      if (cancelled) return;
      stopped = true;
      player?.destroy();
      player = undefined;
      container.replaceChildren();
      setFailedUrl(url);
    };
    const iframe = document.createElement("iframe");
    iframe.src = `${embedUrl}?enablejsapi=1&playsinline=1&autoplay=${autoPlay ? 1 : 0}&mute=${muted ? 1 : 0}&origin=${encodeURIComponent(window.location.origin)}`;
    iframe.title = title;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.style.cssText = "width:100%;height:100%;border:0";
    iframe.onerror = fail;
    container.replaceChildren(iframe);
    void loadAPI().then(api => {
      if (!cancelled && !stopped) player = new api.Player(iframe, { events: { onError: fail } });
    }).catch(fail);
    return () => { cancelled = true; player?.destroy(); container.replaceChildren(); };
  }, [embedUrl, title, url, autoPlay, muted]);

  return <div className={className} style={{ background: "#000", color: "#fff", display: "flex", flexDirection: "column", ...style }}>
    <div ref={host} style={{ flex: 1, minHeight: 0, display: failed ? "none" : "block" }} />
    {failed ? <p role="status" style={{ margin: "auto", padding: 16 }}>This video can&apos;t be played inside BLTZ.</p> : null}
  </div>;
}
