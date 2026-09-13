import type { LockerData } from "@/app/player/[slug]/LockerView";
import type { PhotoRoomData } from "@/app/player/[slug]/photos/PhotoRoomView";
import { LEVEL_LABEL, calcAge, formatDob, heightDisplay } from "@/lib/player/locker-format";
import type { PreviewLockerRow } from "./types";
import type { FilmRoomData } from "@/app/player/[slug]/videos/FilmRoomView";
import { previewVideoSource } from "./video";
import { publicVideoLevel } from "@/lib/player/public-video";
import { previewTeamBranding } from "./branding";

const FALLBACK_HEADSHOT = "/images/black-headshot-fallback.svg";

export function toFilmRoomData(row: PreviewLockerRow): FilmRoomData {
  return {
    athleteId: null,
    slug: row.slug,
    lockerHref: `/preview-lockers/${encodeURIComponent(row.slug)}`,
    athleteName: row.full_name,
    athleteHeadshotUrl: row.headshot_url || FALLBACK_HEADSHOT,
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
    headshotUrl: row.headshot_url || FALLBACK_HEADSHOT,
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
    // Older/default preview records use {} rather than null for missing school
    // metadata. Do not pass a partial object to the shared Locker renderer.
    school: row.school_info?.name && row.school_info?.abbr ? row.school_info : null,
    nfl: row.nfl_info,
    ...previewTeamBranding(row),
    awards: row.awards ?? [],
    videos: (row.videos ?? []).map((v) => ({ id: v.id, title: v.title, thumb: v.thumb, ...previewVideoSource(v.url) })),
    photos: (row.photos ?? []).map((p) => ({
      id: p.id,
      url: p.url || "",
      title: (p.title || "").toUpperCase(),
      credits: p.credits,
      sourceUrl: p.sourceUrl,
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
    athleteHeadshotUrl: row.headshot_url || FALLBACK_HEADSHOT,
    accentColor: "#ffbb00",
    images: (row.photos ?? []).map((p) => ({
      id: p.id,
      url: p.url || "",
      title: p.title || "Photo",
      credits: p.credits,
      sourceUrl: p.sourceUrl,
      level: p.level,
      season: p.season,
      licenseLabel: "PREVIEW ONLY — NOT FOR PUBLICATION",
      width: null,
      height: null,
    })),
    totalImages: row.photo_count ?? row.photos?.length ?? 0,
    loadMoreUrl: `/api/preview-lockers/${encodeURIComponent(row.slug)}/photos`,
  };
}
