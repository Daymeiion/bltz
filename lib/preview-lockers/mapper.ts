import type { LockerData } from "@/app/player/[slug]/LockerView";
import type { PhotoRoomData } from "@/app/player/[slug]/photos/PhotoRoomView";
import { previewStatLabels, type PreviewRecord, type ResolvedPreviewRecord } from "./validation";

export function previewLockerData(row: PreviewRecord | ResolvedPreviewRecord): LockerData {
  const school = row.school ? { name: row.school, abbr: row.school, primaryColor: "#152238", logoUrl: null } : null;
  const schools = row.schools.length ? row.schools : school ? [{ label: school.name, color: school.primaryColor, logo: school.logoUrl }] : [];
  return {
    privateDemo: true, athleteId: null, slug: row.slug, fullName: row.full_name,
    hometown: row.hometown || "", position: row.position || "", jersey: row.jersey || "",
    levelLabel: row.level || "Private demo", headshotUrl: row.headshot_url || "/images/black-headshot-fallback.svg",
    // External preview videos render only in the guarded Film Room. LockerView's
    // hero uses a raw <video> element and must not load arbitrary provider URLs.
    heroVideoUrl: null, logoSrc: "/images/bltz-mark.svg", bio: row.bio,
    athleteQuote: row.athlete_quote, athleteQuoteAuthor: row.athlete_quote_author,
    heightDisplay: row.height_in ? `${Math.floor(row.height_in / 12)}′ ${row.height_in % 12}″` : "",
    weightLbs: row.weight_lbs, dobDisplay: "", gamesPlayed: row.games_played,
    highSchool: row.level === "hs" ? row.school || "" : "", classOf: "",
    school,
    careerStats: [...row.career_stats].sort((a, b) => Object.keys(previewStatLabels).indexOf(a.key) - Object.keys(previewStatLabels).indexOf(b.key)).map(stat => ({ key: stat.key, label: previewStatLabels[stat.key], value: Number.isInteger(stat.value) ? stat.value : stat.value.toLocaleString("en-US", { maximumFractionDigits: 2 }) })),
    nfl: null, schools, proTeams: row.pro_teams, awards: row.awards, videos: row.videos.filter((video): video is typeof video & { url: string } => "url" in video),
    photos: row.photos.flatMap(photo => "url" in photo ? [{ ...photo, provenance: "Private demo suggestion", licenseLabel: "PRIVATE DEMO · RIGHTS UNVERIFIED" }] : []),
  };
}
export function previewPhotoData(row: PreviewRecord | ResolvedPreviewRecord): PhotoRoomData {
  return { privateDemo: true, athleteId: null, slug: row.slug, athleteName: row.full_name,
    athleteHeadshotUrl: row.headshot_url || "/images/black-headshot-fallback.svg", accentColor: "#FFB940",
    images: row.photos.flatMap(photo => "url" in photo ? [{ ...photo, licenseLabel: "PRIVATE DEMO · RIGHTS UNVERIFIED", width: null, height: null }] : []),
  };
}
