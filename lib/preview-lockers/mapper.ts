import type { LockerData } from "@/app/player/[slug]/LockerView";
import type { PhotoRoomData } from "@/app/player/[slug]/photos/PhotoRoomView";
import type { FilmRoomData } from "@/app/player/[slug]/videos/FilmRoomView";
import { publicVideoLevel } from "@/lib/player/public-video";
import { LEVEL_LABEL, calcAge, formatDob, heightDisplay } from "@/lib/player/locker-format";
import type { PreviewLockerRow } from "./types";
import { previewVideoSource } from "./video";
import { previewTeamBranding } from "./branding";
import { combineCfbImports } from "./cfb-csv";
import { previewStatLabels, type PreviewRecord, type ResolvedPreviewRecord } from "./validation";

function previewHeroVideo(row: PreviewRecord | ResolvedPreviewRecord, device: "mobile" | "desktop") {
  const video = row.videos.find(item => item.heroDevice === device);
  return video && "url" in video ? previewVideoSource(video.url).playbackUrl : null;
}

export function previewLockerData(row: PreviewRecord | ResolvedPreviewRecord): LockerData {
  const branding = previewTeamBranding(row);
  const primarySchool = branding.schools[0] ?? null;
  const school = row.school ? {
    name: row.school,
    abbr: primarySchool?.label ?? row.school,
    primaryColor: primarySchool?.color ?? "#1A3DCC",
    logoUrl: primarySchool?.logo ?? null,
  } : null;
  return {
    athleteId: null, slug: row.slug, lockerHref: `/preview-lockers/${encodeURIComponent(row.slug)}`, fullName: row.full_name,
    structuredStats: combineCfbImports(row.cfb_stats ?? []),
    hometown: row.hometown || "", position: row.position || "", jersey: row.jersey || "",
    levelLabel: row.level || "Athlete", headshotUrl: row.headshot_url || "/images/black-headshot-fallback.svg",
    // Only direct playback sources enter the hero; provider pages stay in the Film Room.
    heroVideoUrl: null,
    heroVideos: {
      mobile: previewHeroVideo(row, "mobile"),
      desktop: previewHeroVideo(row, "desktop") ?? previewVideoSource(row.hero_video_url).playbackUrl,
    }, logoSrc: "/images/preview-nav-logo.png", bio: row.bio,
    athleteQuote: row.athlete_quote, athleteQuoteAuthor: row.athlete_quote_author,
    heightDisplay: row.height_in ? `${Math.floor(row.height_in / 12)}′ ${row.height_in % 12}″` : "",
    weightLbs: row.weight_lbs, dobDisplay: "", gamesPlayed: row.games_played,
    highSchool: row.level === "hs" ? row.school || "" : "", classOf: "",
    school,
    careerStats: [...row.career_stats].sort((a, b) => Object.keys(previewStatLabels).indexOf(a.key) - Object.keys(previewStatLabels).indexOf(b.key)).map(stat => ({ key: stat.key, label: previewStatLabels[stat.key], value: Number.isInteger(stat.value) ? stat.value : stat.value.toLocaleString("en-US", { maximumFractionDigits: 2 }) })),
    nfl: null, schools: branding.schools, proTeams: branding.proTeams, awards: row.awards, videos: row.videos.filter((video): video is typeof video & { url: string } => "url" in video).map(video => ({ ...video, ...previewVideoSource("url" in video ? video.url : null) })),
    photos: row.photos.flatMap(photo => "url" in photo ? [{ ...photo, provenance: "Private demo suggestion", licenseLabel: "PRIVATE DEMO · RIGHTS UNVERIFIED" }] : []),
  };
}
export function previewPhotoData(row: PreviewRecord | ResolvedPreviewRecord): PhotoRoomData {
  return { athleteId: null, slug: row.slug, lockerHref: `/preview-lockers/${encodeURIComponent(row.slug)}`, athleteName: row.full_name,
    athleteHeadshotUrl: row.headshot_url || "/images/black-headshot-fallback.svg", accentColor: "#FFB940",
    images: row.photos.flatMap(photo => "url" in photo ? [{ ...photo, licenseLabel: "PRIVATE DEMO · RIGHTS UNVERIFIED", width: null, height: null }] : []),
  };
}

export function toLockerData(row: PreviewLockerRow): LockerData {
  const dob = row.dob ?? null;
  return {
    athleteId: null,
    slug: row.slug,
    lockerHref: `/preview-lockers/${encodeURIComponent(row.slug)}`,
    fullName: row.full_name,
    hometown: (row.hometown || "").toUpperCase() || "—",
    position: row.position || "",
    jersey: row.jersey || "",
    jerseyNumbers: row.jersey ? [row.jersey] : [],
    levelLabel: row.level ? (LEVEL_LABEL[row.level] ?? "—") : "—",
    headshotUrl: row.headshot_url || "/images/black-headshot-fallback.svg",
    headshotYear: null,
    heroVideoUrl: row.hero_video_url,
    logoSrc: "/bltz-white-logo.svg",
    bio: row.bio || `${row.full_name} hasn't written their story yet. Check back soon.`,
    athleteQuote: row.athlete_quote,
    athleteQuoteAuthor: row.athlete_quote_author,
    heightDisplay: heightDisplay(row.height_in),
    weightLbs: row.weight_lbs,
    dobDisplay: formatDob(dob),
    age: calcAge(dob),
    gamesPlayed: row.games_played,
    careerStats: row.career_stats ?? [],
    careerSeasons: row.career_seasons ?? [],
    gameLogs: [],
    highSchool: row.school || "—",
    classOf: row.nfl_info?.draftYear ? String(row.nfl_info.draftYear) : "—",
    school: row.school_info?.name && row.school_info?.abbr ? row.school_info : null,
    nfl: row.nfl_info,
    ...previewTeamBranding(row),
    awards: row.awards ?? [],
    videos: (row.videos ?? []).map((video) => ({ id: video.id, title: video.title, thumb: video.thumb, ...previewVideoSource(video.url) })),
    photos: (row.photos ?? []).map((photo) => ({
      id: photo.id,
      url: photo.url || "",
      title: (photo.title || "").toUpperCase(),
      credits: photo.credits,
      sourceUrl: photo.sourceUrl,
      provenance: "preview_scraped",
      licenseLabel: "PREVIEW ONLY — NOT FOR PUBLICATION",
    })),
    photoCount: row.photo_count,
  };
}

export function toPhotoRoomData(row: PreviewLockerRow): PhotoRoomData {
  return {
    athleteId: null,
    slug: row.slug,
    lockerHref: `/preview-lockers/${encodeURIComponent(row.slug)}`,
    athleteName: row.full_name,
    athleteHeadshotUrl: row.headshot_url || "/images/black-headshot-fallback.svg",
    accentColor: "#ffbb00",
    images: (row.photos ?? []).map((photo) => ({
      id: photo.id,
      url: photo.url || "",
      title: photo.title || "Photo",
      credits: photo.credits,
      sourceUrl: photo.sourceUrl,
      level: photo.level,
      season: photo.season,
      licenseLabel: "PREVIEW ONLY — NOT FOR PUBLICATION",
      width: null,
      height: null,
    })),
    totalImages: row.photo_count ?? row.photos?.length ?? 0,
    loadMoreUrl: `/api/preview-lockers/${encodeURIComponent(row.slug)}/photos`,
  };
}

export function toFilmRoomData<T extends Pick<PreviewLockerRow, "slug" | "full_name" | "headshot_url" | "videos">>(row: T): FilmRoomData {
  return {
    athleteId: null,
    slug: row.slug,
    lockerHref: `/preview-lockers/${encodeURIComponent(row.slug)}`,
    athleteName: row.full_name,
    athleteHeadshotUrl: row.headshot_url || "/images/black-headshot-fallback.svg",
    accentColor: "#ffbb00",
    videos: (row.videos ?? []).map((video) => ({
      id: video.id,
      title: video.title,
      thumbnailUrl: video.thumb,
      ...previewVideoSource(video.url),
      description: "Preview only — not cleared for publication.",
      durationSeconds: null,
      level: publicVideoLevel([video.title], null),
      season: null,
      attribution: "Attribution pending review",
      sourceLabel: "PREVIEW ONLY",
      tags: [],
      publishedAt: null,
    })),
  };
}
