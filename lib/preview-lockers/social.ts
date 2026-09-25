export const socialPlatforms = ["Instagram", "Facebook", "LinkedIn", "X"] as const;
export type SocialPlatform = typeof socialPlatforms[number];
export type PreviewSocial = {
  id: string; title: string; platform: SocialPlatform; kind: "short" | "post";
  format: "portrait" | "square"; sourceUrl: string; caption: string; handle: string;
  photoId?: string | null; videoId?: string | null;
};
export type LockerSocial = PreviewSocial & { imageUrl: string | null; videoUrl: string | null };
export function socialPlatformMatches(platform: string, value: string) {
  try {
    const url = new URL(value);
    const hosts: Record<string, string[]> = { Instagram: ["instagram.com", "www.instagram.com"], Facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"], LinkedIn: ["linkedin.com", "www.linkedin.com"], X: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"] };
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !!hosts[platform]?.includes(url.hostname) && url.pathname !== "/";
  } catch { return false; }
}
// Fixed provider endpoints only, never administrator-supplied iframe markup.
export function socialEmbedUrl(platform: string, sourceUrl: string, kind: string): string | null {
  if (!socialPlatformMatches(platform, sourceUrl)) return null;
  const url = new URL(sourceUrl);
  if (platform === "Instagram") {
    const match = url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/);
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/` : null;
  }
  if (platform === "Facebook" && url.hostname !== "fb.watch") return `https://www.facebook.com/plugins/${kind === "short" ? "video" : "post"}.php?href=${encodeURIComponent(sourceUrl)}&show_text=false&width=400`;
  return null;
}
