import { awardDescription } from "./award-descriptions";
import type { PipelineDraft, PlayerIdentityInput } from "@/lib/pipeline/types";
import { nflLogo, nflTeamCode, nflTeamColor } from "@/lib/player/locker-format";
import { previewContent, previewUrl, previewPhoto, previewVideo, slugify, youtubeEmbed, type PreviewContent } from "./validation";

const OTHER_PRO_TEAM_COLORS: Record<string, string> = {
  "bc lions": "#F15A22",
  "calgary stampeders": "#C8102E",
  "edmonton elks": "#2B5134",
  "hamilton tiger-cats": "#FFB81C",
  "montreal alouettes": "#003E7E",
  "ottawa redblacks": "#C8102E",
  "saskatchewan roughriders": "#006341",
  "toronto argonauts": "#00529B",
  "winnipeg blue bombers": "#003DA5",
};

// A discovery result is a suggestion, not verification, rights clearance or a Career ID.
// Explicit projection discards DOB, source blobs, IDs and auto-confirmed flags.
export function discoveryDraft(identity: PlayerIdentityInput, draft?: PipelineDraft): PreviewContent {
  const boundedInteger = (value: number | null | undefined, min: number, max: number) => Number.isInteger(value) && value! >= min && value! <= max ? value : null;
  const name = (draft?.full_name || identity.full_name).slice(0, 120);
  const school = (draft?.school || identity.school || "").slice(0, 160) || null;
  const validColor = (value: string | undefined) => /^#[\da-f]{6}$/i.test(value ?? "") ? value! : "#1A3DCC";
  const schools = (draft?.schools?.length ? draft.schools : school ? [{ label: school }] : [])
    .slice(0, 32)
    .filter(item => typeof item.label === "string" && item.label.trim())
    .map(item => ({ label: (item.name || item.label).trim().slice(0, 80), color: validColor(item.color), logo: item.logo || null }));
  const candidate = {
    slug: slugify(name) || "private-preview", full_name: name,
    school,
    position: (draft?.position || identity.position || "").slice(0, 60) || null,
    level: identity.level || null, bio: (draft?.bio || "").slice(0, 4000),
    hometown: (draft?.hometown || "").slice(0, 160) || null,
    height_in: boundedInteger(draft?.height_in, 40, 96),
    weight_lbs: boundedInteger(draft?.weight_lbs, 60, 450),
    games_played: boundedInteger(draft?.games_played, 0, 1000),
    schools,
    pro_teams: (draft?.pro_teams || []).slice(0, 32).filter(team => typeof team === "string" && team.trim()).map(team => {
      const label = team.trim().slice(0, 80);
      const code = nflTeamCode(label);
      return { label, color: code ? nflTeamColor(code) : OTHER_PRO_TEAM_COLORS[label.toLocaleLowerCase("en-US")] || "#1A3DCC", logo: code ? nflLogo(code) : null };
    }),
    videos: (draft?.youtube_urls || []).slice(0, 24).flatMap((url, i) => {
      if (!youtubeEmbed(url)) return [];
      const video = previewVideo.safeParse({ id: `video-${i}`, title: `Discovered video ${i + 1}`, url, thumb: null });
      return video.success ? [video.data] : [];
    }),
    photos: (draft?.photos || []).slice(0, 40).flatMap((photo, i) => {
      const item = previewPhoto.safeParse({ id: `photo-${i}`, url: photo.url, title: `Discovered photo ${i + 1}`, credits: photo.credits?.slice(0, 300) || null, sourceUrl: null, level: identity.level === "college" ? "cfb" : identity.level === "hs" ? "hs" : "pro", season: null });
      return item.success ? [item.data] : [];
    }),
    awards: (draft?.awards || []).slice(0, 40).filter(a => a.name?.trim()).map(a => ({ year: (a.year || "").slice(0, 20), label: a.name.slice(0, 200), description: awardDescription(a.name, a.description).slice(0, 160), sourceUrl: previewUrl.safeParse(a.source_url).success ? a.source_url : null })),
  };
  const parsed = previewContent.safeParse(candidate);
  return parsed.success ? parsed.data : previewContent.parse({ slug: slugify(identity.full_name) || "private-preview", full_name: identity.full_name });
}
