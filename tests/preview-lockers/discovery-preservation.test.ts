// @vitest-environment node
import { expect, it } from "vitest";
import { previewContent } from "@/lib/preview-lockers/validation";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";

const photoPath = "00000000-0000-4000-8000-000000000001/photos/00000000-0000-4000-8000-000000000002.png";
const base = { slug: "fixture-player", full_name: "Fixture Player" };
const season = { year: 2008, team: "CIN", gamesPlayed: 7, gamesStarted: 7, statistics: { tackles: 37 } };
const current = previewContent.parse({ ...base, bio: "Reviewed biography", dob: "1986-05-05", hometown: "Riverside, California",
  schools: [{ label: "USC", color: "#152238", logo: "https://school.example.com/original.png", logoStoragePath: photoPath }],
  career_stats: [{ key: "tackles", value: 340 }],
  pfr_stats: [{ category: "defense", sourceUrl: "https://www.pro-football-reference.com/players/R/RiveKe99.htm", importedAt: "2026-10-18T00:00:00.000Z", seasons: [season] }],
  cfb_stats: [{ category: "defense", sourceUrl: "https://www.sports-reference.com/cfb/players/fixture-player-1.html", importedAt: "2026-10-18T00:00:00.000Z", seasons: [{ ...season, year: 2007, team: "USC" }] }],
  videos: [{ id: "video-0", title: "Reviewed video", url: "https://www.youtube.com/watch?v=abcdefghijk", thumb: null }],
  photos: [{ id: "photo-0", title: "Uploaded headshot", storagePath: photoPath, mimeType: "image/png", level: "cfb", isHeadshot: true }],
  article_edits: [{ id: "article-0", headline: "Reviewed news", publisher: "Press", articleUrl: "https://press.example.com/story", imageStoragePath: photoPath, visible: false }],
  merchandise: [{ id: "merch-0", title: "Reviewed card", category: "trading_card", productUrl: "https://www.ebay.com/itm/123456789", imageStoragePath: photoPath }],
  awards: [{ label: "All-American", year: "2007", imageMode: "none" }],
});

const suggestion = previewContent.parse({ ...base, bio: "Replacement biography", dob: "1986-01-01", hometown: "Elsewhere, California",
  schools: [{ label: "USC", color: "#990000", logo: "https://school.example.com/new.png" }],
  career_stats: [{ key: "tackles", value: 999 }, { key: "sacks", value: 3 }],
  videos: [{ id: "video-1", title: "Duplicate video", url: "https://youtu.be/abcdefghijk", thumb: null }, { id: "video-0", title: "New video", url: "https://youtu.be/lmnopqrstuv", thumb: null }],
  photos: [{ id: "photo-0", title: "New photo", url: "https://photo.example.com/new.png", level: "pro" }],
  article_edits: [{ id: "article-1", headline: "Scraped duplicate", publisher: "Press", articleUrl: "https://press.example.com/story?utm_source=search" }, { id: "article-0", headline: "New story", publisher: "Press", articleUrl: "https://press.example.com/new-story" }],
  merchandise: [{ id: "merch-1", title: "Scraped duplicate card", category: "trading_card", productUrl: "https://www.ebay.com/itm/card-title/123456789" }, { id: "merch-0", title: "New jersey", category: "jersey", productUrl: "https://shop.example.com/jersey" }],
  awards: [{ label: "All-American", year: "2007", imageMode: "auto" }, { label: "All-Pac-10", year: "2007" }],
});

it("appends unique discoveries while retaining stats, uploads, editorial decisions and every existing item", () => {
  const snapshot = structuredClone(current);
  const merged = mergeSuggestions(current, suggestion);
  for (const key of ["bio", "dob", "hometown", "pfr_stats", "cfb_stats", "schools"] as const) expect(merged[key]).toEqual(current[key]);
  for (const key of ["videos", "photos", "article_edits", "merchandise", "awards", "career_stats"] as const) {
    expect(merged[key]).toHaveLength(current[key].length + 1);
    expect(merged[key].slice(0, current[key].length)).toEqual(current[key]);
  }
  expect(previewContent.safeParse(merged).success).toBe(true);
  expect(mergeSuggestions(merged, suggestion)).toEqual(merged);
  expect(current).toEqual(snapshot);
});

it("retains all saved content when discovery falls back or returns no results", () => {
  expect(mergeSuggestions(current, previewContent.parse(base))).toEqual(current);
});

it("keeps full media collections and their selections without evicting old entries", () => {
  const full = { ...current, videos: Array.from({ length: 24 }, (_, i) => ({ id: `full-${i}`, title: `Video ${i}`, url: `https://film.example.com/${i}.mp4`, thumb: null })) };
  const merged = mergeSuggestions(full, suggestion);
  expect(merged.videos).toEqual(full.videos);
  expect(previewContent.safeParse(merged).success).toBe(true);
});
it("adds discoveries to a new unsaved editor before its slug has been filled", () => {
  const blank = { ...previewContent.parse(base), slug: "", full_name: "" };
  const merged = mergeSuggestions(blank, suggestion);
  expect(merged.slug).toBe(suggestion.slug);
  expect(merged.full_name).toBe(suggestion.full_name);
  expect(merged.videos).toEqual(suggestion.videos);
  expect(merged.photos).toEqual(suggestion.photos);
  expect(previewContent.safeParse(merged).success).toBe(true);
});

