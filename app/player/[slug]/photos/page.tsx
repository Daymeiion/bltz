import { notFound } from "next/navigation";
import { MOCK_PLAYERS } from "@/lib/mock";
import { createClient } from "@/lib/supabase/server";
import PhotoRoomView, { type PhotoRoomData, type PhotoRoomImage } from "./PhotoRoomView";

type MediaCompetitionLevel = "hs" | "cfb" | "pro";
type MediaContentContext =
  | "game"
  | "practice"
  | "media_day"
  | "community"
  | "training"
  | "lifestyle"
  | "interview"
  | "off_field";

const useMock =
  process.env.NEXT_PUBLIC_USE_MOCK === "1" && process.env.NODE_ENV !== "production";

type PhotoLevel = PhotoRoomImage["level"];

type MediaPhotoRow = {
  id: string;
  url: string | null;
  title: string | null;
  credits: string | null;
  source_url: string | null;
  provenance: string | null;
  license_status: string | null;
  public_locker_approved: boolean | null;
  competition_level: MediaCompetitionLevel | null;
  content_context: MediaContentContext | null;
  width: number | null;
  height: number | null;
  created_at: string | null;
};

function canRenderPhoto(photo: MediaPhotoRow): boolean {
  if (!photo.url) return false;
  return photo.public_locker_approved === true && photo.license_status === "approved";
}

function licenseLabel(photo: Pick<MediaPhotoRow, "provenance" | "source_url">): string {
  if (photo.provenance === "athlete_uploaded") return "ATHLETE UPLOAD";
  if (photo.provenance === "cal_archive") return "TEAM ARCHIVE";
  if (photo.provenance === "founder_archive") return "BLTZ CLEARED";
  if (photo.provenance === "scraped_candidate") return "RIGHTS CLEARED";
  return photo.source_url ? "SOURCE VERIFIED" : "LICENSED";
}

function contentContextLevel(context: MediaContentContext | null): PhotoLevel | null {
  if (!context) return null;
  return ["community", "training", "lifestyle", "interview", "off_field"].includes(context)
    ? "off-field"
    : null;
}

function photoLevel(
  photo: Pick<
    MediaPhotoRow,
    "title" | "credits" | "source_url" | "provenance" | "competition_level" | "content_context"
  >,
): PhotoLevel {
  const contextLevel = contentContextLevel(photo.content_context);
  if (contextLevel) return contextLevel;
  if (photo.competition_level) return photo.competition_level;

  const value = `${photo.title ?? ""} ${photo.credits ?? ""} ${photo.source_url ?? ""} ${photo.provenance ?? ""}`.toLowerCase();
  if (/\b(hs|high[-_\s]?school)\b/.test(value)) return "hs";
  if (/\b(pro|nfl|professional)\b/.test(value)) return "pro";
  if (/\b(off[-_\s]?field|community|interview|training|lifestyle|behind[-_\s]?the[-_\s]?scenes|social)\b/.test(value)) {
    return "off-field";
  }
  return "cfb";
}

function toPhotoRoomImage(row: MediaPhotoRow, index: number): PhotoRoomImage {
  const year = row.created_at ? new Date(row.created_at).getFullYear() : null;
  return {
    id: row.id,
    url: row.url ?? "",
    title: row.title || `Photo ${index + 1}`,
    credits: row.credits,
    sourceUrl: row.source_url,
    level: photoLevel(row),
    season: year && Number.isFinite(year) ? String(year) : null,
    licenseLabel: licenseLabel(row),
    width: row.width,
    height: row.height,
  };
}

function mockPhotoRoom(slug: string): PhotoRoomData {
  const player = MOCK_PLAYERS.find((item) => item.slug === slug) ?? MOCK_PLAYERS[0];
  const athleteName = player?.full_name ?? "Demo Player";
  const sourceImages = [
    "/images/media-5.jpg",
    "/images/media-6.jpg",
    "/images/media-9.jpg",
    "/images/Media-4.avif",
    "/images/SilverHero1.png",
    "/images/Awards/CardImage.png",
  ];
  const base = [
    ["hs-2021-1", "High school Friday night", "hs", "2021", sourceImages[4]],
    ["hs-2020-1", "Senior season portrait", "hs", "2020", sourceImages[5]],
    ["cfb-2025-1", "2025 sideline arrival", "cfb", "2025", sourceImages[0]],
    ["cfb-2025-2", "Fourth quarter focus", "cfb", "2025", sourceImages[1]],
    ["cfb-2024-1", "Practice field work", "cfb", "2024", sourceImages[2]],
    ["cfb-2023-1", "Tunnel walk", "cfb", "2023", sourceImages[3]],
    ["pro-2028-1", "Pro media day", "pro", "2028", sourceImages[4]],
    ["pro-2027-1", "Sunday warmups", "pro", "2027", sourceImages[5]],
    ["pro-2026-1", "Rookie portrait", "pro", "2026", sourceImages[0]],
    ["off-field-2025-1", "Community visit", "off-field", "2025", sourceImages[1]],
    ["off-field-2024-1", "Interview room", "off-field", "2024", sourceImages[2]],
    ["off-field-2023-1", "Training day", "off-field", "2023", sourceImages[3]],
  ] as const;

  return {
    slug,
    athleteName,
    athleteHeadshotUrl: "/images/Headshot.png",
    accentColor: "#ffbb00",
    images: base.map(([id, title, level, season, url]) => ({
      id,
      title,
      url,
      credits: `${athleteName} / BLTZ`,
      sourceUrl: null,
      level,
      season,
      licenseLabel: "BLTZ CLEARED",
      width: null,
      height: null,
    })),
  };
}

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (
    useMock ||
    (slug === "test-null-user-id" && process.env.NODE_ENV !== "production")
  ) {
    return <PhotoRoomView data={mockPhotoRoom(slug)} />;
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
  const { data: photoRows } = await supabase
    .from("media")
    .select("id, url, title, credits, source_url, provenance, license_status, public_locker_approved, competition_level, content_context, width, height, created_at")
    .eq("player_id", player.id)
    .eq("kind", "photo")
    .order("display_order", { ascending: true })
    .limit(80);

  const images = ((photoRows ?? []) as MediaPhotoRow[])
    .filter(canRenderPhoto)
    .map(toPhotoRoomImage);

  const data: PhotoRoomData = {
    slug,
    athleteName,
    athleteHeadshotUrl:
      player.headshot_url || player.profile_image || "/images/black-headshot-fallback.svg",
    accentColor: "#ffbb00",
    images,
  };

  return <PhotoRoomView data={data} />;
}
