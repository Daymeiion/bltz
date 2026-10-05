import { normalizeYouTubeUrl } from "@/lib/player/youtube";
import type { PreviewContent } from "./validation";

export function parseYouTubeBatch(input: string, existing: PreviewContent["videos"]) {
  const urls = input.split(/[\s,]+/).map(value => value.trim()).filter(Boolean);
  const seen = new Set(existing.flatMap(video => {
    const id = "url" in video ? normalizeYouTubeUrl(video.url)?.providerVideoId : null;
    return id ? [id] : [];
  }));
  const videos: PreviewContent["videos"] = [];
  let invalid = 0; let duplicate = 0;
  for (const url of urls) {
    const source = normalizeYouTubeUrl(url);
    if (!source?.providerVideoId || !url.startsWith("https://")) { invalid++; continue; }
    if (seen.has(source.providerVideoId)) { duplicate++; continue; }
    seen.add(source.providerVideoId);
    videos.push({ id: crypto.randomUUID(), title: `YouTube video ${existing.length + videos.length + 1}`,
      url: `https://www.youtube.com/watch?v=${source.providerVideoId}`,
      thumb: `https://img.youtube.com/vi/${source.providerVideoId}/hqdefault.jpg` });
  }
  return { videos, invalid, duplicate, overflow: Math.max(0, existing.length + videos.length - 24) };
}
