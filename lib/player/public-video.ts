export type PublicVideoLevel = "hs" | "cfb" | "pro" | "off-field";

export type PublicVideo = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  playbackUrl: string | null;
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
  const base = [
    ["hs-2021", "HIGH SCHOOL SENIOR FILM", "hs", "2021", 126],
    ["hs-2020", "BREAKOUT JUNIOR SEASON", "hs", "2020", 98],
    ["cfb-2025", "2025 SEASON HIGHLIGHTS", "cfb", "2025", 167],
    ["cfb-2024", "2024 SEASON HIGHLIGHTS", "cfb", "2024", 132],
    ["cfb-2023", "TOP PLAYS: SOPHOMORE SEASON", "cfb", "2023", 104],
    ["cfb-2022", "FRESHMAN ARRIVAL", "cfb", "2022", 89],
    ["pro-2028", "PRO SEASON FILM", "pro", "2028", 143],
    ["pro-2027", "SUNDAYS: THE FULL CUT", "pro", "2027", 118],
    ["pro-2026", "ROOKIE YEAR HIGHLIGHTS", "pro", "2026", 96],
    ["off-field-2025", "COMMUNITY DAY FEATURE", "off-field", "2025", 74],
    ["off-field-2024", "LOCKER ROOM INTERVIEW", "off-field", "2024", 92],
    ["off-field-2023", "TRAINING CAMP PROFILE", "off-field", "2023", 81],
  ] as const;

  return base.map(([id, title, level, season, durationSeconds], index) => ({
    id,
    title,
    description: `${athleteName}'s ${season} film collection, preserved in the BLTZ Player Locker.`,
    thumbnailUrl: null,
    playbackUrl: "/videos/demo-reel.mp4",
    durationSeconds,
    level,
    season,
    attribution: `${athleteName} / BLTZ`,
    sourceLabel: "BLTZ FILM",
    tags: [level, season, "highlights"],
    publishedAt: new Date(Date.UTC(2026, 6, Math.max(1, 28 - index))).toISOString(),
  }));
}
