import { z } from "zod";
import { cfbCategories, cfbImport, cfbSeason, combineSeasonImports, inspectCsv, readCsvSeasons, type CfbCategory, type CsvTable } from "./cfb-csv";
import { DISPLAY_STAT_FIELDS } from "@/lib/sportradar/types";

export const pfrSourcePage = z.string().max(2048).url().refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && ["pro-football-reference.com", "www.pro-football-reference.com"].includes(url.hostname)
      && /^\/players\/[A-Z]\/[A-Za-z0-9]+\.htm$/.test(url.pathname);
  } catch { return false; }
}, "Use the athlete's HTTPS Pro Football Reference player page.");

export const pfrImport = cfbImport.extend({
  sourceUrl: pfrSourcePage,
  seasons: z.array(cfbSeason.refine(row => !row.sourceNote, "College bowl notes do not apply to NFL statistics."))
    .min(1).max(120).refine(rows => new Set(rows.map(row => `${row.year}/${row.team.toLowerCase()}`)).size === rows.length, "Duplicate season/team rows.")
    .superRefine((rows, ctx) => {
      for (const row of rows) {
        const sameYear = rows.filter(other => other.year === row.year);
        if (/^(?:\d+TM|TOT)$/i.test(row.team) && sameYear.length > 1) ctx.addIssue({ code: "custom", message: "A multi-team total cannot be saved alongside team stints for the same season." });
      }
    }),
});
export const pfrImports = z.array(pfrImport).max(cfbCategories.length)
  .refine(items => new Set(items.map(item => item.category)).size === items.length, "Only one NFL import per table category.")
  .refine(items => {
    try { return new Set(items.map(item => new URL(item.sourceUrl).pathname)).size <= 1; }
    catch { return false; }
  }, "All NFL tables must reference the same player page.");
export type PfrImport = z.infer<typeof pfrImport>;
export function inspectPfrCsv(input: string, category: CfbCategory): CsvTable {
  const table = inspectCsv(input, category);
  // Repeated Yds/Lng columns need their source group. Keep this NFL-specific
  // vocabulary separate from the college reader and provider normalization.
  const defense: Record<string, string> = {
    inttd: "interceptionReturnTouchdowns", fmb: "fumbles", frtd: "fumbleReturnTouchdowns",
    qbhits: "quarterbackHits", sfty: "safeties", av: "approximateValue",
  };
  const groups: Record<string, Record<string, string>> = {
    definterceptions: { yds: "interceptionReturnYards", lng: "longestInterceptionReturn" },
    fumbles: { yds: "fumbleReturnYards" },
  };
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const mapping = table.headers.map((header, index) => {
    const parts = header.split(":");
    const key = clean(parts.at(-1)!);
    return table.mapping[index] || groups[clean(parts[0])]?.[key] || (category === "defense" ? defense[key] : "") || "";
  });
  return { ...table, mapping: mapping.map(key => key && mapping.filter(other => other === key).length > 1 ? "" : key) };
}

// PFR adds career, per-game, team summary, and multi-team total rows to exports.
// Keep team stints when available, verifying their totals against the aggregate.
export function reviewPfrCsv(table: CsvTable, mapping: string[], category: CfbCategory, sourceUrl: string) {
  pfrSourcePage.parse(sourceUrl);
  const yearIndex = mapping.indexOf("year");
  const teamIndex = mapping.indexOf("team");
  if (yearIndex < 0 || teamIndex < 0) throw new Error("Map Season and School / team before reviewing.");
  const warnings: string[] = [];
  let previousYear = "";
  const rows: string[][] = [];
  for (const cells of table.rows) {
    let year = cells[yearIndex]?.trim() ?? "";
    const team = cells[teamIndex]?.trim() ?? "";
    if (/^(?:career|total|totals|year|season|\d+\s+yrs?|\d+\s+game\s+avg|.+\(\d+\s+yrs?\))$/i.test(year) || (!year && !team)) {
      warnings.push(`Skipped summary/header row: ${year || "blank"}`); previousYear = ""; continue;
    }
    if (!year && team && previousYear) year = previousYear;
    if (/^\d{4}[*+]?$/.test(year)) previousYear = year.replace(/[*+]$/, "");
    else if (cells.filter(Boolean).length <= 1) { warnings.push(`Skipped source note: ${year}`); previousYear = ""; continue; }
    if (cells.length !== table.headers.length) throw new Error(`Season ${year} has a different number of columns than the header.`);
    rows.push(cells.map((cell, index) => index === yearIndex ? year.replace(/[*+]$/, "") : cell));
  }
  const parsed = readCsvSeasons({ ...table, rows }, mapping, false);
  warnings.push(...parsed.warnings);
  const seasons = parsed.seasons.filter(row => {
    if (!/^(?:\d+TM|TOT)$/i.test(row.team)) return true;
    const stints = parsed.seasons.filter(other => other.year === row.year && !/^(?:\d+TM|TOT)$/i.test(other.team));
    if (!stints.length) return true;
    for (const [key, value] of Object.entries(row.statistics)) {
      if (DISPLAY_STAT_FIELDS[key].maximum && stints.every(stint => stint.statistics[key] !== undefined) && Math.max(...stints.map(stint => stint.statistics[key])) !== value) throw new Error(`Team stints do not match the ${key} maximum in ${row.year}. Include all team rows.`);
      if (!DISPLAY_STAT_FIELDS[key].sum || stints.some(stint => stint.statistics[key] === undefined)) continue;
      if (Math.abs(stints.reduce((total, stint) => total + stint.statistics[key], 0) - value) > 0.001) throw new Error(`Team stints do not match the ${key} total in ${row.year}. Include all team rows.`);
    }
    for (const key of ["gamesPlayed", "gamesStarted"] as const) {
      if (row[key] !== null && stints.every(stint => stint[key] !== null) && stints.reduce((total, stint) => total + (stint[key] ?? 0), 0) !== row[key]) throw new Error(`Team stints do not match ${key} in ${row.year}. Include all team rows.`);
    }
    warnings.push(`Skipped ${row.year} ${row.team} total; retained individual team stints to avoid double counting.`);
    return false;
  });
  return { imported: pfrImport.parse({ category, sourceUrl, importedAt: new Date().toISOString(), seasons }), warnings };
}

export function combinePfrImports(imports: PfrImport[]) {
  const validated = pfrImports.parse(imports);
  const records = combineSeasonImports(validated, "nfl", "Pro Football Reference · manually imported for preview");
  for (const record of records) for (const row of record.seasons) {
    if (/^(?:\d+TM|TOT)$/i.test(row.team) && record.seasons.some(other => other.year === row.year && other.team !== row.team)) throw new Error(`NFL tables mix a multi-team total and team stints in ${row.year}. Use the same team rows in each table.`);
  }
  return records.map(record => ({ ...record, sourceUrls: [...new Set(validated.map(item => item.sourceUrl))] }));
}
