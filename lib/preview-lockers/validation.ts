import { normalizeYouTubeUrl } from "@/lib/player/youtube";
import { z } from "zod";
import { socialPlatforms, socialPlatformMatches } from "./social";
import { cfbImports, combineCfbImports } from "./cfb-csv";
import { pfrImports, combinePfrImports } from "./pfr-csv";
import { isNewsArticleUrl } from "@/lib/enrichment/news-classification";
import { evaluateSource } from "@/lib/source-policy/policy";
import { birthdateSchema, highSchoolSchema } from "@/lib/player/bio-fields";
import { combineMetricKeys, combineMetricInfo } from "@/lib/player/combine";

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
const team = z.object({ label: text(80).min(1), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), logo: asset,
  jerseyNumbers: z.array(z.string().regex(/^(?:\d|[1-9]\d|00)$/)).max(10).refine(values => new Set(values).size === values.length, "Keep each number once per team.").optional(),
  jerseySourceUrl: previewUrl.nullable().optional(),
  jerseySources: z.array(previewUrl).max(16).optional(),
  jerseyStatus: z.enum(["single_source", "corroborated", "conflict", "reviewed"]).optional(),
  jerseyColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  jerseyBorderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
}).strict();
const award = z.object({ catalogAwardId:z.uuid().nullable().optional(),imageAssetId:z.uuid().nullable().optional(),imageMode:z.enum(["auto","custom","none"]).optional(),imageUrl: previewUrl.nullable().optional(), photoId: id.nullable().optional(), year: text(20), label: text(200).min(1), description: text(160).nullable().optional(), sourceUrl: previewUrl.nullable().optional() }).strict();
const storagePath = z.string().min(1).max(240).regex(/^[0-9a-f-]{36}\/(photos|videos)\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm|mov)$/);
export const previewMediaMimeTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"] as const;
export type PreviewMediaMime = (typeof previewMediaMimeTypes)[number];
const storedAsset = z.object({ storagePath, mimeType: z.enum(previewMediaMimeTypes) });
const heroDevice = z.enum(["mobile", "desktop"]).optional();
const videoLevel = z.enum(["pro", "cfb", "hs", "off-field"]).optional();
const externalVideo = z.object({ id, title: text(160).min(1), url: previewUrl, thumb: asset, level: videoLevel, heroDevice }).strict()
  .refine(video => !video.heroDevice || /\.(mp4|webm|mov|m4v|ogg)(?:[?#]|$)/i.test(video.url), "Hero videos must be direct video files, not provider pages.");
const storedVideo = z.object({ id, title: text(160).min(1), thumb: asset, level: videoLevel, heroDevice, ...storedAsset.shape }).strict()
  .refine(value => value.storagePath.includes("/videos/") && value.mimeType.startsWith("video/"), "Video storage metadata does not match.");
export const previewVideo = z.union([externalVideo, storedVideo]);
const externalPhoto = z.object({
  id, url: previewUrl, title: text(160).min(1), credits: nullableText(300), sourceUrl: asset,
  level: z.enum(["hs", "cfb", "pro", "off-field"]), season: nullableText(20), isHeadshot: z.boolean().optional(), inHeroSlideshow: z.boolean().optional(),
}).strict();
const storedPhoto = z.object({
  id, title: text(160).min(1), credits: nullableText(300), sourceUrl: asset,
  level: z.enum(["hs", "cfb", "pro", "off-field"]), season: nullableText(20), isHeadshot: z.boolean().optional(), inHeroSlideshow: z.boolean().optional(), ...storedAsset.shape,
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
const boundedMetadata = (items: unknown[]) => new TextEncoder().encode(JSON.stringify(items)).length <= 96000;
const articleUrl = previewUrl.refine(isNewsArticleUrl, "Use an article link, not a homepage, profile or social post.")
  .refine(url => evaluateSource(url).allowed_actions.includes("PERSIST_METADATA"), "This source does not allow saved metadata.");
export const previewArticleEdit = z.object({
  id, sourceUrl: articleUrl.nullable().default(null), visible: z.boolean().default(true),
  headline: text(500).min(1), publisher: text(200).min(1), articleUrl, imageUrl: asset,
  imageStoragePath: storagePath.refine(path => path.includes("/photos/"), "Use an uploaded image.").nullable().optional(),
  summary: text(600).default(""), publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Use a valid calendar date.").nullable().default(null),
}).strict();
export const merchandiseCategories = ["trading_card", "jersey", "apparel", "memorabilia", "other"] as const;
export const previewMerchandise = z.object({
  id, title: text(160).min(1), category: z.enum(merchandiseCategories), productUrl: previewUrl,
  imageUrl: asset, retailer: nullableText(160), priceLabel: nullableText(80), visible: z.boolean().default(true),
  imageStoragePath: storagePath.refine(path => path.includes("/photos/"), "Use an uploaded image.").nullable().optional(),
}).strict();
export const previewSocial = z.object({
  id, title: text(160).min(1), platform: z.enum(socialPlatforms), kind: z.enum(["short", "post"]),
  format: z.enum(["portrait", "square"]), sourceUrl: previewUrl, caption: text(2000).default(""), handle: text(120).default(""),
  photoId: id.nullable().optional(), videoId: id.nullable().optional(),
}).strict().refine(item => socialPlatformMatches(item.platform, item.sourceUrl), "Use a link from the selected social platform.");
export const previewCombineResult = z.object({
  id, eventType: z.enum(["combine", "pro_day"]), year: z.number().int().min(1950).max(2100).nullable().default(null),
  sourceUrl: asset, timing: z.enum(["not_recorded", "official", "unofficial"]).default("not_recorded"),
  measurements: z.array(z.object({ metric: z.enum(combineMetricKeys), value: z.number().finite(), sourceUrl: asset }).strict()
    .superRefine((item, context) => {
      const field = combineMetricInfo[item.metric];
      if (item.value < field.min || item.value > field.max || item.metric === "bench" && !Number.isInteger(item.value)) {
        context.addIssue({ code: "custom", path: ["value"], message: `${field.label} must be ${field.min}–${field.max} ${field.unit.toLowerCase()}${item.metric === "bench" ? " in whole repetitions" : ""}.` });
      }
    })).max(combineMetricKeys.length).refine(items => new Set(items.map(item => item.metric)).size === items.length, "Keep one value per measurement in each event."),
}).strict().superRefine((event, context) => {
  event.measurements.forEach((item, index) => {
    if (!item.sourceUrl && !event.sourceUrl) context.addIssue({ code: "custom", path: ["measurements", index, "sourceUrl"], message: "Add an event source or an individual source for this measurement." });
  });
});
export const previewContent = z.object({
  slug: previewSlug, full_name: text(120).min(2), position: nullableText(60),
  level: z.enum(["hs", "college", "pro", "former"]).nullable().default(null),
  school: nullableText(160), hometown: nullableText(160), jersey: nullableText(10),
  dob: birthdateSchema.nullable().default(null), high_school: highSchoolSchema.nullable().default(null),
  height_in: z.number().int().min(40).max(96).nullable().default(null),
  weight_lbs: z.number().int().min(60).max(450).nullable().default(null),
  games_played: z.number().int().min(0).max(1000).nullable().default(null),
  headshot_url: asset, hero_video_url: asset,
  photo_room_banner_url: asset, photo_room_banner_link: asset,
  photo_room_banner_storage_path: storagePath.nullable().default(null),
  bio: text(4000).default(""), story: text(20000).default(""), athlete_quote: nullableText(600), athlete_quote_author: nullableText(160),
  schools: z.array(team.extend({ desktopName: text(80).nullable().optional(), mobileName: text(40).nullable().optional(), logoStoragePath: storagePath.refine(path => /\/photos\/.*\.(jpg|png|webp)$/.test(path), "Use an uploaded image.").nullable().optional() })).max(32).default([]), pro_teams: z.array(team).max(32).default([]),
  awards: z.array(award).max(40).default([]),
  social: z.array(previewSocial).max(40).refine(uniqueIds, "Social IDs must be unique.").default([]),
  article_edits: z.array(previewArticleEdit).max(40).refine(uniqueIds, "Article IDs must be unique.")
    .refine(items => { const sources = items.flatMap(item => item.sourceUrl ? [item.sourceUrl] : []); return new Set(sources).size === sources.length; }, "Keep only one edit per scraped article.")
    .refine(boundedMetadata, "Article metadata is too large.").default([]),
  merchandise: z.array(previewMerchandise).max(40).refine(uniqueIds, "Merchandise IDs must be unique.")
    .refine(boundedMetadata, "Merchandise metadata is too large.").default([]),
  cfb_stats: cfbImports.refine(items => { try { combineCfbImports(items); return true; } catch { return false; } }, "College tables contain conflicting season values.").default([]),
  pfr_stats: pfrImports.refine(items => { try { combinePfrImports(items); return true; } catch { return false; } }, "NFL tables contain conflicting season values.").default([]),
  career_stats: z.array(careerStat).max(previewStatKeys.length).refine(items => new Set(items.map(item => item.key)).size === items.length, "Statistic keys must be unique.").default([]),
  combine_results: z.array(previewCombineResult).max(10).refine(uniqueIds, "Combine event IDs must be unique.")
    .refine(items => new TextEncoder().encode(JSON.stringify(items)).length <= 32000, "Combine metadata is too large.").default([]),
  videos: z.array(previewVideo).max(24).refine(uniqueIds, "Video IDs must be unique.").refine(items => ["mobile", "desktop"].every(device => items.filter(item => item.heroDevice === device).length <= 1), "Choose only one hero video for each device.").default([]),
  photos: z.array(previewPhoto).max(40).refine(uniqueIds, "Photo IDs must be unique.").refine(items => items.filter(photo => photo.isHeadshot).length <= 1, "Choose only one headshot.").default([]),
}).strict();
export const createPreview = z.object({ id: z.uuid(), content: previewContent }).strict();
export const updatePreview = z.object({ revision: z.number().int().positive(), content: previewContent }).strict();
export const previewViewerAssignment = z.object({ email: z.string().trim().toLowerCase().max(254).email() }).strict();
export const previewRecord = previewContent.extend({ id: z.uuid(), revision: z.number().int().positive(), created_at: z.string(), updated_at: z.string() });
export type PreviewContent = z.infer<typeof previewContent>;
export type PreviewRecord = z.infer<typeof previewRecord>;
export type ResolvedPreviewRecord = Omit<PreviewRecord, "videos" | "photos"> & {
  photo_room_banner_resolved_url?: string | null;
  enrichment_identity_key?: string;
  enrichment?: {
    awards: import("./types").PreviewAward[];
    articles: import("@/lib/enrichment/news").PlayerArticle[];
  };
  videos: Array<z.infer<typeof previewVideo> & { url: string }>;
  photos: Array<z.infer<typeof previewPhoto> & { url: string }>;
};
export function previewMediaBelongsTo(recordId: string, content: PreviewContent): boolean {
  return (!content.photo_room_banner_storage_path || content.photo_room_banner_storage_path.startsWith(`${recordId}/photos/`))
    && content.schools.every(team => !team.logoStoragePath || team.logoStoragePath.startsWith(`${recordId}/photos/`))
    && [...content.merchandise,...content.article_edits].every(item => !item.imageStoragePath || item.imageStoragePath.startsWith(`${recordId}/photos/`))
    && [...content.photos, ...content.videos].every(item => !("storagePath" in item) || item.storagePath.startsWith(`${recordId}/`));
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
  return normalizeYouTubeUrl(value)?.embedUrl ?? null;
}
