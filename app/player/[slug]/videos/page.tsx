import { notFound } from "next/navigation";
import { MOCK_PLAYERS } from "@/lib/mock";
import { createClient } from "@/lib/supabase/server";
import FilmRoomView, { type FilmRoomData, type FilmRoomVideo } from "./FilmRoomView";

const useMock =
  process.env.NEXT_PUBLIC_USE_MOCK === "1" && process.env.NODE_ENV !== "production";

type VideoMeta = Record<string, unknown>;

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

function videoLevel(tags: string[] | null, meta: VideoMeta): FilmRoomVideo["level"] {
  const value = `${metaString(meta, ["level", "league", "career_level"]) ?? ""} ${(tags ?? []).join(" ")}`.toLowerCase();
  if (/\b(off[-_\s]?field|community|interview|training|lifestyle|behind[-_\s]?the[-_\s]?scenes)\b/.test(value)) {
    return "off-field";
  }
  return /\b(pro|nfl|professional)\b/.test(value) ? "pro" : "cfb";
}

function toFilmRoomVideo(
  row: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    playback_url: string | null;
    duration_seconds: number | null;
    tags: string[] | null;
    created_at: string | null;
    meta: unknown;
  },
  athleteName: string,
): FilmRoomVideo {
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
    level: videoLevel(row.tags, meta),
    season: metaString(meta, ["season", "year"]) ?? parsedCreatedYear,
    attribution:
      metaString(meta, ["attribution", "credit", "source_name", "publisher"]) ?? athleteName,
    sourceLabel: metaString(meta, ["source_label", "source", "platform"]) ?? "BLTZ FILM",
  };
}

function mockFilmRoom(slug: string): FilmRoomData {
  const player = MOCK_PLAYERS.find((item) => item.slug === slug) ?? MOCK_PLAYERS[0];
  const athleteName = player?.full_name ?? "Demo Player";
  const base = [
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

  return {
    slug,
    athleteName,
    athleteHeadshotUrl: "/images/Headshot.png",
    accentColor: "#ffbb00",
    videos: base.map(([id, title, level, season, durationSeconds]) => ({
      id,
      title,
      description: `${athleteName}'s ${season} film collection.`,
      thumbnailUrl: null,
      playbackUrl: "/videos/demo-reel.mp4",
      durationSeconds,
      level,
      season,
      attribution: `${athleteName} / BLTZ`,
      sourceLabel: "BLTZ FILM",
    })),
  };
}

export default async function FilmRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (
    useMock ||
    (slug === "test-null-user-id" && process.env.NODE_ENV !== "production")
  ) {
    return <FilmRoomView data={mockFilmRoom(slug)} />;
  }

  const supabase = await createClient();
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, full_name, name, slug, profile_image, headshot_url")
    .eq("slug", slug)
    .eq("visibility", true)
    .maybeSingle();

  if (playerError || !player) return notFound();

  const athleteName = player.full_name || player.name || "Unknown Player";
  const { data: videos } = await supabase
    .from("videos")
    .select(
      "id, title, description, thumbnail_url, playback_url, duration_seconds, tags, created_at, meta",
    )
    .eq("player_id", player.id)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(48);

  const data: FilmRoomData = {
    slug,
    athleteName,
    athleteHeadshotUrl:
      player.headshot_url || player.profile_image || "/images/black-headshot-fallback.svg",
    accentColor: "#ffbb00",
    videos: (videos ?? []).map((video) => toFilmRoomVideo(video, athleteName)),
  };

  return <FilmRoomView data={data} />;
}
