import { z } from "zod";

// Display references only; the preview server never downloads these URLs.
export function isPreviewUrl(value: string): boolean {
  if (value.length > 2048 || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  // Check the original authority: URL normalizes scheme case and default ports.
  if (!/^https:\/\/[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}([/?#]|$)/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(url.hostname)
      && !/(^|\.)(localhost|local|internal|test|invalid)$/i.test(url.hostname);
  } catch { return false; }
}
const text = (max: number) => z.string().trim().max(max).refine(v => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v));
const nullableText = (max: number) => text(max).nullable().default(null);
export const previewUrl = z.string().refine(isPreviewUrl, "Use a public HTTPS URL without credentials or a port.");
const asset = previewUrl.nullable().default(null);
const id = text(80).min(1).regex(/^[a-zA-Z0-9_-]+$/);
export const previewSlug = z.string().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const previewIdentity = z.object({
  full_name: text(120).min(2), school: nullableText(160), position: nullableText(60),
  level: z.enum(["hs", "college", "pro", "former"]).nullable().default(null),
  cohort_year: z.number().int().min(1950).max(2100).nullable().default(null),
}).strict();
const team = z.object({ label: text(80).min(1), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), logo: asset }).strict();
const award = z.object({ year: text(20), label: text(200).min(1) }).strict();
export const previewVideo = z.object({ id, title: text(160).min(1), url: previewUrl, thumb: asset }).strict();
export const previewPhoto = z.object({
  id, url: previewUrl, title: text(160).min(1), credits: nullableText(300), sourceUrl: asset,
  level: z.enum(["hs", "cfb", "pro", "off-field"]), season: nullableText(20),
}).strict();
const uniqueIds = <T extends { id: string }>(items: T[]) => new Set(items.map(x => x.id)).size === items.length;
export const previewContent = z.object({
  slug: previewSlug, full_name: text(120).min(2), position: nullableText(60),
  level: z.enum(["hs", "college", "pro", "former"]).nullable().default(null),
  school: nullableText(160), hometown: nullableText(160), jersey: nullableText(10),
  height_in: z.number().int().min(40).max(96).nullable().default(null),
  weight_lbs: z.number().int().min(60).max(450).nullable().default(null),
  games_played: z.number().int().min(0).max(1000).nullable().default(null),
  headshot_url: asset, hero_video_url: asset,
  bio: text(4000).default(""), athlete_quote: nullableText(600), athlete_quote_author: nullableText(160),
  schools: z.array(team).max(12).default([]), pro_teams: z.array(team).max(12).default([]),
  awards: z.array(award).max(40).default([]),
  videos: z.array(previewVideo).max(24).refine(uniqueIds, "Video IDs must be unique.").default([]),
  photos: z.array(previewPhoto).max(40).refine(uniqueIds, "Photo IDs must be unique.").default([]),
}).strict();
export const createPreview = z.object({ id: z.uuid(), content: previewContent }).strict();
export const updatePreview = z.object({ revision: z.number().int().positive(), content: previewContent }).strict();
export const previewRecord = previewContent.extend({ id: z.uuid(), revision: z.number().int().positive(), created_at: z.string(), updated_at: z.string() });
export type PreviewContent = z.infer<typeof previewContent>;
export type PreviewRecord = z.infer<typeof previewRecord>;
export function equivalentPreview(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => equivalentPreview(v, b[i]));
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const left = a as Record<string, unknown>; const right = b as Record<string, unknown>;
  return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(k => Object.hasOwn(right, k) && equivalentPreview(left[k], right[k]));
}
export function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70).replace(/-$/, "");
}
export function youtubeEmbed(value: string): string | null {
  if (!isPreviewUrl(value)) return null;
  const url = new URL(value);
  const videoId = url.hostname === "youtu.be" ? url.pathname.slice(1)
    : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)
      ? (url.pathname === "/watch" ? url.searchParams.get("v") : /^\/(?:embed|shorts)\/([\w-]+)$/.exec(url.pathname)?.[1]) : null;
  return videoId && /^[\w-]{11}$/.test(videoId) ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
}
