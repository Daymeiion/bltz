import { normalizeYouTubeUrl } from "@/lib/player/youtube";

// Preview imports commonly contain YouTube page URLs rather than video files.
export function previewVideoSource(value: string | null) {
  try {
    const url = new URL(value ?? "");
    if (url.protocol !== "https:" && url.protocol !== "http:") return { playbackUrl: null, embedUrl: null };
    const youtube = normalizeYouTubeUrl(value);
    if (youtube) return youtube;
    return { playbackUrl: /\.(mp4|webm|ogg|m4v|mov)$/i.test(url.pathname) ? url.href : null, embedUrl: null };
  } catch {
    return { playbackUrl: null, embedUrl: null };
  }
}
