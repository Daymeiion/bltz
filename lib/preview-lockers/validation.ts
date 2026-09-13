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
const storagePath = z.string().min(1).max(240).regex(/^[0-9a-f-]{36}\/(photos|videos)\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm|mov)$/);
export const previewMediaMimeTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"] as const;
export type PreviewMediaMime = (typeof previewMediaMimeTypes)[number];
const storedAsset = z.object({ storagePath, mimeType: z.enum(previewMediaMimeTypes) });
const externalVideo = z.object({ id, title: text(160).min(1), url: previewUrl, thumb: asset }).strict();
const storedVideo = z.object({ id, title: text(160).min(1), thumb: asset, ...storedAsset.shape }).strict()
  .refine(value => value.storagePath.includes("/videos/") && value.mimeType.startsWith("video/"), "Video storage metadata does not match.");
export const previewVideo = z.union([externalVideo, storedVideo]);
const externalPhoto = z.object({
  id, url: previewUrl, title: text(160).min(1), credits: nullableText(300), sourceUrl: asset,
  level: z.enum(["hs", "cfb", "pro", "off-field"]), season: nullableText(20),
}).strict();
const storedPhoto = z.object({
  id, title: text(160).min(1), credits: nullableText(300), sourceUrl: asset,
  level: z.enum(["hs", "cfb", "pro", "off-field"]), season: nullableText(20), ...storedAsset.shape,
}).strict().refine(value => value.storagePath.includes("/photos/") && value.mimeType.startsWith("image/"), "Photo storage metadata does not match.");
export const previewPhoto = z.union([externalPhoto, storedPhoto]);
export const previewStatKeys = ["games_started", "tackles", "solo_tackles", "tackles_for_loss", "sacks", "interceptions", "pass_breakups", "forced_fumbles", "receptions", "receiving_yards", "receiving_touchdowns", "rushing_yards", "rushing_touchdowns", "passing_yards", "passing_touchdowns", "total_touchdowns"] as const;
export const previewStatLabels: Record<(typeof previewStatKeys)[number], string> = {
  games_started: "GAMES STARTED", tackles: "TACKLES", solo_tackles: "SOLO TACKLES", tackles_for_loss: "TACKLES FOR LOSS",
  sacks: "SACKS", interceptions: "INTERCEPTIONS", pass_breakups: "PASS BREAKUPS", forced_fumbles: "FORCED FUMBLES",
  receptions: "RECEPTIONS", receiving_yards: "RECEIVING YARDS", receiving_touchdowns: "RECEIVING TDS", rushing_yards: "RUSHING YARDS",
  rushing_touchdowns: "RUSHING TDS", passing_yards: "PASSING YARDS", passing_touchdowns: "PASSING TDS", total_touchdowns: "TOTAL TDS",
};
const careerStat = z.object({ key: z.enum(previewStatKeys), value: z.number().finite().min(0).max(1_000_000) }).strict()
  .refine(stat => stat.key === "sacks" || Number.isInteger(stat.value), "Only sacks may use a fractional value.");
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
  career_stats: z.array(careerStat).max(previewStatKeys.length).refine(items => new Set(items.map(item => item.key)).size === items.length, "Statistic keys must be unique.").default([]),
  videos: z.array(previewVideo).max(24).refine(uniqueIds, "Video IDs must be unique.").default([]),
  photos: z.array(previewPhoto).max(40).refine(uniqueIds, "Photo IDs must be unique.").default([]),
}).strict();
export const createPreview = z.object({ id: z.uuid(), content: previewContent }).strict();
export const updatePreview = z.object({ revision: z.number().int().positive(), content: previewContent }).strict();
export const previewViewerAssignment = z.object({ email: z.string().trim().toLowerCase().max(254).email() }).strict();
export const previewRecord = previewContent.extend({ id: z.uuid(), revision: z.number().int().positive(), created_at: z.string(), updated_at: z.string() });
export type PreviewContent = z.infer<typeof previewContent>;
export type PreviewRecord = z.infer<typeof previewRecord>;
export type ResolvedPreviewRecord = Omit<PreviewRecord, "videos" | "photos"> & {
  videos: Array<z.infer<typeof previewVideo> & { url: string }>;
  photos: Array<z.infer<typeof previewPhoto> & { url: string }>;
};
export function previewMediaBelongsTo(recordId: string, content: PreviewContent): boolean {
  return [...content.photos, ...content.videos].every(item => !("storagePath" in item) || item.storagePath.startsWith(`${recordId}/`));
}
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
