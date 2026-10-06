import { resolveMediaPermissions } from "./permissions";
import { SUPER_BOWL_REFERENCE } from "./award-reference-images";

export interface CatalogAward {
  id: string; slug: string; name: string; sport: string; league: string | null;
  level: string | null; award_type: string; organization: string | null;
  description: string; aliases: string[]; canonical_image_url: string | null;
  image_source_url: string | null; image_license: string | null; attribution: string | null;
  asset_status: "placeholder" | "approved"; active: boolean;
}
export interface AwardEvidence {
  label: string; year: string; sourceUrl?: string | null; description?: string | null;
}
export interface NormalizedAward {
  award_id: string | null; raw_label: string; year: string; edition: string;
  source_url: string | null; source_type: string; confidence: number;
  verified: boolean; metadata: { description: string | null; mapping: "alias" | "unmapped" };
}

export function awardKey(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[–—-]/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Normalization identifies the award, never proves that the athlete won it. */
export function normalizeAward(evidence: AwardEvidence, catalog: CatalogAward[]): NormalizedAward {
  const raw = evidence.label.trim();
  const edition = /\b(?:super\s*bowl|sb)\s+([IVXLCDM]+|\d{1,3})\b/i.exec(raw)?.[1]?.toUpperCase()
    ?? (/\b(?:super\s*bowl|sb)\b/i.test(raw) ? /\(([IVXLCDM]+(?:\s*,\s*[IVXLCDM]+)*)\)/i.exec(raw)?.[1]?.toUpperCase() : "") ?? "";
  const years = raw.match(/\b(?:19|20)\d{2}\b/g) ?? [];
  const year = evidence.year.trim() || [...new Set(years)].join(", ");
  const key = awardKey(raw.replace(/\b(?:super\s*bowl|sb)\s+(?:[IVXLCDM]+|\d{1,3})\b/gi, "Super Bowl")
    .replace(/\(([IVXLCDM]+(?:\s*,\s*[IVXLCDM]+)*)\)/gi, "")
    .replace(/\b(?:19|20)\d{2}\b/g, "").replace(/^\s*\d+\s*[×x]\s*/i, ""));
  const matches = catalog.filter(a => a.active && [a.name, a.slug, ...a.aliases].some(alias => awardKey(alias) === key));
  const award = matches.length === 1 ? matches[0] : null;
  return { award_id: award?.id ?? null, raw_label: raw, year, edition,
    source_url: evidence.sourceUrl ?? null, source_type: evidence.sourceUrl ? "source_reference" : "admin_input",
    confidence: award ? 1 : 0, verified: false,
    metadata: { description: evidence.description ?? null, mapping: award ? "alias" : "unmapped" } };
}

export function normalizeAwards(evidence: AwardEvidence[], catalog: CatalogAward[]) {
  const seen = new Set<string>();
  return evidence.flatMap(input => {
    const result = normalizeAward(input, catalog);
    const key = JSON.stringify([result.award_id ?? awardKey(result.raw_label), result.year, result.edition]);
    if (seen.has(key)) return [];
    seen.add(key); return [result];
  });
}

export function catalogImage(award: CatalogAward): string | null {
  const approved = resolveMediaPermissions(award, "preview_award").imageUrl;
  return approved || (award.slug === "super-bowl-champion" && award.asset_status === "placeholder" && !award.canonical_image_url
    ? resolveMediaPermissions({ ...award, ...SUPER_BOWL_REFERENCE }, "preview_award").imageUrl : null);
}
