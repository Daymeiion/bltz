import type { PipelineDraft, PlayerIdentityInput } from "@/lib/pipeline/types";
import { previewContent, previewPhoto, previewVideo, slugify, youtubeEmbed, type PreviewContent } from "./validation";

// A discovery result is a suggestion, not verification, rights clearance or a Career ID.
// Explicit projection discards DOB, source blobs, IDs and auto-confirmed flags.
export function discoveryDraft(identity: PlayerIdentityInput, draft?: PipelineDraft): PreviewContent {
  const boundedInteger = (value: number | null | undefined, min: number, max: number) => Number.isInteger(value) && value! >= min && value! <= max ? value : null;
  const name = (draft?.full_name || identity.full_name).slice(0, 120);
  const candidate = {
    slug: slugify(name) || "private-preview", full_name: name,
    school: (draft?.school || identity.school || "").slice(0, 160) || null,
    position: (draft?.position || identity.position || "").slice(0, 60) || null,
    level: identity.level || null, bio: (draft?.bio || "").slice(0, 4000),
    hometown: (draft?.hometown || "").slice(0, 160) || null,
    height_in: boundedInteger(draft?.height_in, 40, 96),
    weight_lbs: boundedInteger(draft?.weight_lbs, 60, 450),
    games_played: boundedInteger(draft?.games_played, 0, 1000),
    pro_teams: (draft?.pro_teams || []).slice(0, 12).filter(team => typeof team === "string" && team.trim()).map(team => ({ label: team.trim().slice(0, 80), color: "#152238", logo: null })),
    videos: (draft?.youtube_urls || []).slice(0, 24).flatMap((url, i) => {
      if (!youtubeEmbed(url)) return [];
      const video = previewVideo.safeParse({ id: `video-${i}`, title: `Discovered video ${i + 1}`, url, thumb: null });
      return video.success ? [video.data] : [];
    }),
    photos: (draft?.photos || []).slice(0, 40).flatMap((photo, i) => {
      const item = previewPhoto.safeParse({ id: `photo-${i}`, url: photo.url, title: `Discovered photo ${i + 1}`, credits: photo.credits?.slice(0, 300) || null, sourceUrl: null, level: identity.level === "college" ? "cfb" : identity.level === "hs" ? "hs" : "pro", season: null });
      return item.success ? [item.data] : [];
    }),
    awards: (draft?.awards || []).slice(0, 40).filter(a => a.name?.trim()).map(a => ({ year: (a.year || "").slice(0, 20), label: a.name.slice(0, 200) })),
  };
  const parsed = previewContent.safeParse(candidate);
  return parsed.success ? parsed.data : previewContent.parse({ slug: slugify(identity.full_name) || "private-preview", full_name: identity.full_name });
}
