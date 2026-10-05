export type YouTubeSource = {
  provider: "youtube";
  providerVideoId: string | null;
  originalUrl: string;
  embedUrl: string | null;
  playbackUrl: null;
};

// Recognize the provider even when the ID is invalid, so page URLs never
// fall through to native video playback. Keep the supplied URL for fallback.
export function normalizeYouTubeUrl(value: string | null | undefined): YouTubeSource | null {
  try {
    const url = new URL(value?.trim() ?? "");
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.replace(/^www\./, "");
    if (!["youtube.com", "m.youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) return null;
    const candidate = host === "youtu.be"
      ? /^\/([^/]+)\/?$/.exec(url.pathname)?.[1]
      : url.pathname === "/watch" ? url.searchParams.get("v")
        : /^\/(?:shorts|embed)\/([^/]+)\/?$/.exec(url.pathname)?.[1];
    const providerVideoId = candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
    return {
      provider: "youtube", providerVideoId, originalUrl: value!.trim(), playbackUrl: null,
      embedUrl: providerVideoId ? `https://www.youtube.com/embed/${providerVideoId}` : null,
    };
  } catch { return null; }
}
