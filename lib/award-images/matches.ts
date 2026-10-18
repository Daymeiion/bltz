import { z } from "zod";
import type { AwardImage, AwardImageLibrary } from "./model";

const exportWords = new Set(["bltz", "img", "image", "images", "icon", "graphic", "art", "artwork", "transparent", "background", "logo", "final", "copy", "download", "vector", "render", "small", "large", "hd"]);
const containers = new Set(["award", "awards", "trophy", "trophies", "winner"]);
/** Preserve meaningful award qualifiers; remove only image-export noise. */
export function filenameWords(value: string): string[] {
  return value.replace(/\.(png|jpe?g|webp)$/i, "")
    .replace(/\b1st(?=team|\b)/gi, "first ").replace(/\b2nd(?=team|\b)/gi, "second ").replace(/\b3rd(?=team|\b)/gi, "third ")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2").replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2").replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b\d{2,5}\s*[x×]\s*\d{2,5}\b/g, " ").replace(/\b(?:19|20)\d{2}\b/g, " ")
    .replace(/\(\d+\)\s*$/g, " ").replace(/\ballamerican\b/g, "all american").replace(/\ballpro\b/g, "all pro")
    .replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(word => word && !exportWords.has(word));
}
const compact = (words: string[]) => words.join("");
const core = (words: string[]) => words.filter(word => !containers.has(word));
const qualifierGroups = [["first", "second", "third"], ["consensus", "unanimous"], ["offensive", "defensive"]];
function incompatible(file: string[], name: string[], level: string | null) {
  if (file.includes("nfl") && level === "college" || file.some(word => ["ncaa", "cfb", "college"].includes(word)) && level === "pro") return true;
  if (file.includes("rookie") !== name.includes("rookie")) return true;
  return qualifierGroups.some(group => {
    const selected = group.filter(word => file.includes(word)), expected = group.filter(word => name.includes(word));
    return selected.length > 0 && (expected.length === 0 || selected.some(word => !expected.includes(word)));
  });
}
export type AwardImageMatch = {
  key: string; image: AwardImage; award: AwardImageLibrary["catalog"][number];
  sourceName: string; sourceKind: "filename" | "legacy_title"; confidence: "clear" | "review"; reason: string;
};
export function suggestAwardImageMatches(library: Pick<AwardImageLibrary, "images" | "catalog">): AwardImageMatch[] {
  const suggestions: AwardImageMatch[] = [];
  const definitions = library.catalog.filter(row => row.active).map(award => ({award, names: [award.name, award.slug, ...award.aliases].map(alias => {const name = filenameWords(alias); return {alias, name, target: core(name)};})}));
  for (const image of library.images.filter(row => row.active)) {
    const sourceName = image.original_filename || image.title, words = filenameWords(sourceName), content = core(words);
    if (!content.length) continue;
    for (const {award, names} of definitions) {
      if (award.image_asset_id === image.id) continue;
      let match: Pick<AwardImageMatch, "confidence" | "reason"> | null = null;
      for (const {alias, name, target} of names) {
        if (!target.length || incompatible(words, name, award.level)) continue;
        // Generic All-American artwork can illustrate different definitions,
        // but never implies which specific honor the athlete received.
        if (compact(content) === "allamerican" && name.includes("all") && name.includes("american")) {
          match = { confidence: "review", reason: "Generic All-American artwork; confirm this award variant." };
          continue;
        }
        if (compact(words) === compact(name) || compact(content) === compact(target) || [...content].sort().join(" ") === [...target].sort().join(" ")) {
          match = { confidence: "clear", reason: `Name matches “${alias}”.` }; break;
        }
      }
      if (match) suggestions.push({key: `${award.id}:${image.id}`, image, award, sourceName, sourceKind: image.original_filename ? "filename" : "legacy_title", ...match});
    }
  }
  for (const image of library.images) {
    const competing = suggestions.filter(row => row.image.id === image.id && row.confidence === "clear");
    if (competing.length > 1) for (const row of competing) { row.confidence = "review"; row.reason = "Name matches more than one award definition; confirm the intended definition."; }
  }
  return suggestions.sort((a, b) => (a.confidence === b.confidence ? 0 : a.confidence === "clear" ? -1 : 1) || a.award.name.localeCompare(b.award.name) || a.sourceName.localeCompare(b.sourceName));
}
export const approveImageMatches = z.object({ matches: z.array(z.object({
  award_id: z.uuid(), image_asset_id: z.uuid(), award_updated_at: z.string().datetime({offset: true}), image_revision: z.number().int().positive().max(2147483647),
}).strict()).min(1).max(100) }).strict().refine(value => new Set(value.matches.map(row => row.award_id.toLowerCase())).size === value.matches.length, "Choose one image per award.");
