export type PublicVideoLevel = "hs" | "cfb" | "pro" | "off-field";

export type PublicVideo = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  playbackUrl: string | null;
  embedUrl?: string | null;
  durationSeconds: number | null;
  level: PublicVideoLevel;
  season: string | null;
  attribution: string;
  sourceLabel: string;
  tags: string[];
  publishedAt: string | null;
};

type VideoMeta = Record<string, unknown>;

export type PublicVideoRow = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  playback_url: string | null;
  duration_seconds: number | null;
  tags: string[] | null;
  created_at: string | null;
  meta: unknown;
};

function asMeta(value: unknown): VideoMeta {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as VideoMeta)
    : {};
}

function metaString(meta: VideoMeta, keys: string[]): string | null {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

export function publicVideoLevel(tags: string[] | null, metaValue: unknown): PublicVideoLevel {
  const meta = asMeta(metaValue);
  const value = `${metaString(meta, ["level", "league", "career_level"]) ?? ""} ${(tags ?? []).join(" ")}`.toLowerCase();

  if (/\b(off[-_\s]?field|community|interview|training|lifestyle|behind[-_\s]?the[-_\s]?scenes)\b/.test(value)) {
    return "off-field";
  }
  if (/\b(hs|high[-_\s]?school|prep)\b/.test(value)) return "hs";
  if (/\b(pro|nfl|professional)\b/.test(value)) return "pro";
  return "cfb";
}

export function toPublicVideo(row: PublicVideoRow, athleteName: string): PublicVideo {
  const meta = asMeta(row.meta);
  const createdYear = row.created_at ? new Date(row.created_at).getFullYear() : null;
  const parsedCreatedYear = createdYear && Number.isFinite(createdYear) ? String(createdYear) : null;

  return {
    id: row.id,
    title: row.title || "Untitled film",
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    playbackUrl: row.playback_url,
    durationSeconds: row.duration_seconds,
    level: publicVideoLevel(row.tags, row.meta),
    season: metaString(meta, ["season", "year"]) ?? parsedCreatedYear,
    attribution:
      metaString(meta, ["attribution", "credit", "source_name", "publisher"]) ?? athleteName,
    sourceLabel: metaString(meta, ["source_label", "source", "platform"]) ?? "BLTZ FILM",
    tags: row.tags ?? [],
    publishedAt: row.created_at,
  };
}

export function createMockPublicVideos(athleteName: string): PublicVideo[] {
  return MOCK_VIDEOS.map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    thumbnailUrl: video.thumbnail,
    playbackUrl: video.src,
    durationSeconds: video.durationSeconds,
    level: video.level,
    season: video.season,
    attribution: athleteName,
    sourceLabel: "PRIVATE FILM",
    tags: video.tags,
    publishedAt: null,
  }));
}
import { MOCK_VIDEOS } from "@/lib/mock";
