import { previewContent, youtubeEmbed, type PreviewContent } from "./validation";
import { nflTeamCode } from "@/lib/player/locker-format";
import { schoolsMatch } from "@/lib/player/school-identity";
import { normalizeArticleUrl } from "@/lib/enrichment/news";
import { merchandiseListingKeys } from "./merchandise-review";

type Team = PreviewContent["schools"][number];

function mergeTeams(current: Team[], suggestions: Team[], kind: "school" | "pro"): Team[] {
  const merged = current.map(team => ({ ...team }));
  for (const suggestion of suggestions) {
    const match = merged.findIndex(team => kind === "pro"
      ? (nflTeamCode(team.label) || team.label.trim().toLocaleLowerCase("en-US")) === (nflTeamCode(suggestion.label) || suggestion.label.trim().toLocaleLowerCase("en-US"))
      : schoolsMatch(team.label, suggestion.label));
    if (match < 0) {
      if (merged.length < 32) merged.push({ ...suggestion });
      continue;
    }
    const existing = merged[match];
    const sameNumbers = existing.jerseyNumbers?.length && suggestion.jerseyNumbers?.length
      && existing.jerseyNumbers.length === suggestion.jerseyNumbers.length
      && existing.jerseyNumbers.every(number => suggestion.jerseyNumbers!.includes(number));
    const enrichJerseys = suggestion.jerseyNumbers !== undefined && (existing.jerseyNumbers === undefined || sameNumbers && existing.jerseyStatus !== "reviewed");
    merged[match] = {
      ...existing,
      logo: existing.logo || suggestion.logo,
      jerseyNumbers: existing.jerseyNumbers ?? suggestion.jerseyNumbers,
      jerseySourceUrl: enrichJerseys ? suggestion.jerseySourceUrl ?? existing.jerseySourceUrl : existing.jerseySourceUrl,
      jerseySources: enrichJerseys ? [...new Set([...(existing.jerseySources ?? []), ...(suggestion.jerseySources ?? [])])].slice(0, 16) : existing.jerseySources,
      jerseyStatus: enrichJerseys ? suggestion.jerseyStatus ?? existing.jerseyStatus : existing.jerseyStatus,
      jerseyColor: existing.jerseyColor ?? suggestion.jerseyColor,
      jerseyBorderColor: existing.jerseyBorderColor ?? suggestion.jerseyBorderColor,
    };
  }
  return merged;
}

const urlKey = (url: string) => normalizeArticleUrl(url) ?? url;
const textKey = (text: string) => text.trim().toLocaleLowerCase("en-US");

function appendUnique<T extends object>(current: T[], suggestions: T[], keys: (item: T) => string[], valid: (items: T[]) => boolean): T[] {
  const result = [...current];
  const seen = new Set(current.flatMap(keys));
  const ids = new Set(current.flatMap(item => "id" in item ? [String(item.id)] : []));
  for (const suggestion of suggestions) {
    const identity = keys(suggestion);
    if (identity.some(key => seen.has(key))) continue;
    let item = suggestion;
    // Discovery IDs restart at zero on each run. Keep saved IDs/references and
    // assign a fresh ID only to a genuinely new suggestion that collides.
    if ("id" in item && ids.has(String(item.id))) {
      const prefix = String(item.id).slice(0, 55);
      let number = 1;
      while (ids.has(`${prefix}-discovered-${number}`)) number++;
      item = { ...item, id: `${prefix}-discovered-${number}` };
    }
    if (!valid([...result, item])) continue;
    result.push(item);
    identity.forEach(key => seen.add(key));
    if ("id" in item) ids.add(String(item.id));
  }
  return result;
}

// Discovery fills blanks and appends unique suggestions. Saved items, uploads,
// edits, visibility choices, ordering and imported tables always win.
export function mergeSuggestions(current: PreviewContent, suggestion: PreviewContent): PreviewContent {
  const merged = {
    ...current,
    // Manual event results are authoritative. Discovery cannot add, replace or
    // clear them; a future suggestions workflow must require explicit review.
    combine_results: current.combine_results,
    // Life Story is authored manually, independently of the scraped short bio.
    story: current.story,
    schools: mergeTeams(current.schools, suggestion.schools, "school"),
    pro_teams: mergeTeams(current.pro_teams, suggestion.pro_teams, "pro"),
  };
  const append = <K extends "videos" | "photos" | "article_edits" | "merchandise" | "social" | "awards" | "career_stats" | "cfb_stats" | "pfr_stats">(key: K, keys: (item: PreviewContent[K][number]) => string[]) => {
    const items = appendUnique<PreviewContent[K][number]>(current[key], suggestion[key], keys, values => previewContent.shape[key].safeParse(values).success);
    Object.assign(merged, { [key]: items });
  };
  append("videos", item => ["storagePath" in item ? item.storagePath : youtubeEmbed(item.url) ?? urlKey(item.url)]);
  append("photos", item => ["storagePath" in item ? item.storagePath : urlKey(item.url)]);
  append("article_edits", item => [item.articleUrl, item.sourceUrl].filter((url): url is string => !!url).map(urlKey));
  append("merchandise", merchandiseListingKeys);
  append("social", item => [urlKey(item.sourceUrl)]);
  append("awards", item => [JSON.stringify([textKey(item.label), textKey(item.year)])]);
  append("career_stats", item => [item.key]);
  append("cfb_stats", item => [item.category]);
  append("pfr_stats", item => [item.category]);
  for (const key of Object.keys(current) as (keyof PreviewContent)[]) {
    if (key === "headshot_storage_path" || key === "bio_headshot_url" || key === "bio_headshot_storage_path" || key === "story" || key === "schools" || key === "pro_teams" || Array.isArray(current[key])) continue;
    const value = current[key];
    if (value === null || value === "") {
      Object.assign(merged, { [key]: suggestion[key] });
    }
  }
  return merged;
}
