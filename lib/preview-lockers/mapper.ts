import type { LockerData } from "@/app/player/[slug]/LockerView";
import type { PhotoRoomData } from "@/app/player/[slug]/photos/PhotoRoomView";
import type { PreviewRecord } from "./validation";

export function previewLockerData(row: PreviewRecord): LockerData {
  return {
    privateDemo: true, athleteId: null, slug: row.slug, fullName: row.full_name,
    hometown: row.hometown || "", position: row.position || "", jersey: row.jersey || "",
    levelLabel: row.level || "Private demo", headshotUrl: row.headshot_url || "/images/black-headshot-fallback.svg",
    heroVideoUrl: row.hero_video_url, logoSrc: "/images/bltz-mark.svg", bio: row.bio,
    athleteQuote: row.athlete_quote, athleteQuoteAuthor: row.athlete_quote_author,
    heightDisplay: row.height_in ? `${Math.floor(row.height_in / 12)}′ ${row.height_in % 12}″` : "",
    weightLbs: row.weight_lbs, dobDisplay: "", gamesPlayed: row.games_played,
    highSchool: row.level === "hs" ? row.school || "" : "", classOf: "",
    school: row.school ? { name: row.school, abbr: row.school, primaryColor: "#152238", logoUrl: null } : null,
    nfl: null, schools: row.schools, proTeams: row.pro_teams, awards: row.awards, videos: row.videos,
    photos: row.photos.map(photo => ({ ...photo, provenance: "Private demo suggestion", licenseLabel: "PRIVATE DEMO · RIGHTS UNVERIFIED" })),
  };
}
export function previewPhotoData(row: PreviewRecord): PhotoRoomData {
  return { privateDemo: true, athleteId: null, slug: row.slug, athleteName: row.full_name,
    athleteHeadshotUrl: row.headshot_url || "/images/black-headshot-fallback.svg", accentColor: "#FFB940",
    images: row.photos.map(photo => ({ ...photo, licenseLabel: "PRIVATE DEMO · RIGHTS UNVERIFIED", width: null, height: null })),
  };
}
