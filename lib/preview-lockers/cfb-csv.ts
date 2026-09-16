import { z } from "zod";
import { DISPLAY_STAT_FIELDS as STAT_FIELDS } from "@/lib/sportradar/types";
import type { StoredStats } from "@/lib/player/structured-stats-types";

export const CSV_LIMIT = 100_000;
export const cfbCategories = ["passing", "rushing", "receiving", "defense", "returns", "kicking", "punting"] as const;
export type CfbCategory = typeof cfbCategories[number];
export const sourcePage = z.string().max(2048).url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.port
    && ["sports-reference.com", "www.sports-reference.com"].includes(url.hostname)
    && /^\/cfb\/players\/[^/]+\.html$/.test(url.pathname);
}, "Use the athlete's HTTPS Sports Reference college football player page.");
const count = z.number().int().min(0).max(1000).nullable();
export const cfbSeason = z.object({
  year: z.number().int().min(1869).max(2100), team: z.string().trim().min(1).max(160),
  gamesPlayed: count, gamesStarted: count,
  sourceNote: z.literal("Includes bowl statistics").optional(),
  statistics: z.record(z.string(), z.number().finite().min(-1_000_000).max(1_000_000))
    .refine(stats => Object.keys(stats).length > 0 && Object.keys(stats).every(key => Object.hasOwn(STAT_FIELDS, key)), "Choose supported statistics."),
}).strict().superRefine((row, ctx) => {
  for (const [key, value] of Object.entries(row.statistics)) {
    if (!key.toLowerCase().includes("yards") && value < 0) ctx.addIssue({ code: "custom", message: `${STAT_FIELDS[key]?.label ?? key} cannot be negative.` });
    if (!["passerRating", "sacks", "tacklesForLoss"].includes(key) && !Number.isInteger(value)) ctx.addIssue({ code: "custom", message: `${STAT_FIELDS[key]?.label ?? key} must be a season total, not a per-game average.` });
    if (["sacks", "tacklesForLoss"].includes(key) && !Number.isInteger(value * 2)) ctx.addIssue({ code: "custom", message: "Sacks and tackles for loss must use whole or half units." });
  }
  if (row.gamesPlayed !== null && row.gamesStarted !== null && row.gamesStarted > row.gamesPlayed) ctx.addIssue({ code: "custom", message: "Games started cannot exceed games played." });
});
export const cfbImport = z.object({
  category: z.enum(cfbCategories), sourceUrl: sourcePage, importedAt: z.string().datetime(),
  seasons: z.array(cfbSeason).min(1).max(40).refine(rows => new Set(rows.map(row => `${row.year}/${row.team.toLowerCase()}`)).size === rows.length, "Duplicate season/team rows."),
}).strict();
export const cfbImports = z.array(cfbImport).max(7).refine(items => new Set(items.map(item => item.category)).size === items.length, "Only one import per table category.");
export type CfbImport = z.infer<typeof cfbImport>;
export const columnOptions = { year: "Season", team: "School / team", gamesPlayed: "Games played", gamesStarted: "Games started", ...Object.fromEntries(Object.entries(STAT_FIELDS).map(([key, field]) => [key, field.label])) };

// Small bounded RFC-style reader. No formulas, HTML, or remote URLs are executed.
export function csvRows(input: string): string[][] {
  if (new TextEncoder().encode(input).length > CSV_LIMIT) throw new Error("CSV must be 100 KB or smaller.");
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false; let closed = false;
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const pushCell = () => { row.push(cell.trim()); cell = ""; closed = false; if (row.length > 100) throw new Error("Too many CSV columns."); };
  const pushRow = () => { pushCell(); if (row.some(Boolean)) rows.push(row); row = []; if (rows.length > 1000) throw new Error("Too many CSV rows."); };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === ",") pushCell();
    else if (char === "\n") pushRow();
    else if (char === '"' && !cell && !closed) quoted = true;
    else if (closed && char.trim()) throw new Error("Unexpected text after a quoted CSV value.");
    else cell += char;
  }
  if (quoted) throw new Error("CSV contains an unfinished quoted value.");
  if (cell || row.length) pushRow();
  return rows;
}
const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const aliases: Record<string, Record<string, string>> = {
  passing: { cmp: "completions", completions: "completions", att: "passingAttempts", yds: "passingYards", td: "passingTouchdowns", int: "passingInterceptions", rate: "passerRating", rating: "passerRating" },
  rushing: { att: "rushingAttempts", yds: "rushingYards", td: "rushingTouchdowns" },
  receiving: { rec: "receptions", yds: "receivingYards", td: "receivingTouchdowns" },
  defense: { solo: "soloTackles", ast: "assists", tot: "tackles", tkl: "tackles", tfl: "tacklesForLoss", loss: "tacklesForLoss", sk: "sacks", sacks: "sacks", int: "interceptions", pd: "passesDefended", ff: "forcedFumbles", fr: "fumbleRecoveries" },
  returns: { kr: "kickReturns", pr: "puntReturns" },
  kickreturns: { ret: "kickReturns", no: "kickReturns", yds: "kickReturnYards", td: "kickReturnTouchdowns" },
  puntreturns: { ret: "puntReturns", no: "puntReturns", yds: "puntReturnYards", td: "puntReturnTouchdowns" },
  kicking: { fgm: "fieldGoalsMade", fga: "fieldGoalsAttempted", xpm: "extraPointsMade", xpa: "extraPointsAttempted" },
  punting: { punts: "punts", no: "punts", yds: "puntYards" },
};
export type CsvTable = { headers: string[]; rows: string[][]; mapping: string[] };
export function inspectCsv(input: string, category: CfbCategory): CsvTable {
  const rows = csvRows(input);
  const index = rows.findIndex(row => row.some(value => ["year", "season"].includes(clean(value))));
  if (index < 0) throw new Error("CSV must include a Year or Season column and a School or Team column.");
  const header = rows[index]; const groups = rows[index - 1] ?? [];
  let group = "";
  const headers = header.map((label, i) => {
    if (groups.length === header.length && groups[i]) group = groups[i];
    return group && !["year", "season", "school", "team", "conf", "class", "pos", "g", "gs"].includes(clean(label)) ? `${group}: ${label}` : label;
  });
  const mapping = header.map((label, i) => {
    const key = clean(label);
    const base: Record<string, string> = { year: "year", season: "year", school: "team", team: "team", g: "gamesPlayed", gp: "gamesPlayed", gs: "gamesStarted" };
    if (base[key]) return base[key];
    const parts = headers[i].split(":"); const context = parts.length > 1 ? clean(parts[0]) : category;
    const groupAliases: Record<string, Record<string, string>> = {
      tackles: { ...aliases.defense, comb: "tackles" },
      definterceptions: { int: "interceptions", pd: "passesDefended" },
      fumbles: { fr: "fumbleRecoveries", ff: "forcedFumbles" },
    };
    return Object.keys(STAT_FIELDS).find(field => clean(field) === key) ?? groupAliases[context]?.[key] ?? aliases[context]?.[key] ?? (key === "comb" && category === "defense" ? "tackles" : "");
  });
  // Ambiguous duplicate abbreviations require explicit operator mapping.
  return { headers, rows: rows.slice(index + 1), mapping: mapping.map(key => key && mapping.filter(other => other === key).length > 1 ? "" : key) };
}
export function reviewCsv(table: CsvTable, mapping: string[], category: CfbCategory, sourceUrl: string): { imported: CfbImport; warnings: string[] } {
  const selected = mapping.filter(Boolean);
  if (!selected.includes("year") || !selected.includes("team")) throw new Error("Map Season and School / team before reviewing.");
  if (new Set(selected).size !== selected.length) throw new Error("Each statistic may only be mapped once.");
  if (selected.some(key => !Object.hasOwn(columnOptions, key))) throw new Error("Unknown statistic mapping.");
  const warnings = table.headers.flatMap((header, i) => mapping[i] ? [] : [`Skipped column: ${header || i + 1}`]);
  const seasons: z.infer<typeof cfbSeason>[] = [];
  for (const cells of table.rows) {
    const sourceYear = cells[mapping.indexOf("year")] ?? "";
    const year = sourceYear.replace(/\*$/, "");
    if (/^(career|total|totals|year|season)$/i.test(year.trim()) || !cells.some(Boolean)) { warnings.push(`Skipped summary/header row: ${year}`); continue; }
    if (!/^\d{4}$/.test(year)) { if (cells.filter(Boolean).length <= 1) { warnings.push("Skipped a source note."); continue; } throw new Error(`Unrecognized season '${year}'. Only season totals are supported; game logs are separate.`); }
    if (cells.length !== table.headers.length) throw new Error(`Season ${year} has a different number of columns than the header.`);
    const values: Record<string, number> = {};
    mapping.forEach((key, index) => {
      if (!key || key === "year" || key === "team") return;
      const value = cells[index].trim();
      if (["", "—", "-", "--", "NA", "N/A"].includes(value)) return;
      if (!/^-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(value)) throw new Error(`Invalid ${columnOptions[key as keyof typeof columnOptions] ?? key} in ${year}: ${value}`);
      values[key] = Number(value.replace(/,/g, ""));
    });
    const { gamesPlayed = null, gamesStarted = null, ...statistics } = values;
    seasons.push(cfbSeason.parse({ year: Number(year), team: cells[mapping.indexOf("team")], gamesPlayed, gamesStarted, statistics, ...(sourceYear.endsWith("*") ? { sourceNote: "Includes bowl statistics" } : {}) }));
  }
  return { imported: cfbImport.parse({ category, sourceUrl, importedAt: new Date().toISOString(), seasons }), warnings };
}

export function combineCfbImports(imports: CfbImport[]): StoredStats[] {
  if (!imports.length) return [];
  const rows = new Map<string, StoredStats["seasons"][number]>();
  for (const batch of imports) for (const season of batch.seasons) {
    const key = `${season.year}/${season.team.toLowerCase()}`;
    const previous = rows.get(key);
    if (previous) {
      for (const [stat, value] of Object.entries(season.statistics)) if (previous.statistics[stat] !== undefined && previous.statistics[stat] !== value) throw new Error(`Conflicting ${STAT_FIELDS[stat].label} for ${season.year} ${season.team}. Remove or replace the conflicting table.`);
      for (const field of ["gamesPlayed", "gamesStarted"] as const) if (previous[field] !== null && season[field] !== null && previous[field] !== season[field]) throw new Error(`Conflicting ${field} for ${season.year} ${season.team}.`);
    }
    rows.set(key, { ...season, seasonType: "REG", providerTeamId: key, position: null,
      gamesPlayed: season.gamesPlayed ?? previous?.gamesPlayed ?? null, gamesStarted: season.gamesStarted ?? previous?.gamesStarted ?? null,
      statistics: { ...previous?.statistics, ...season.statistics } });
  }
  return [{ league: "ncaafb", source: "Sports Reference · manually imported for private preview", syncedAt: imports.map(item => item.importedAt).sort().at(-1)!, seasons: [...rows.values()] }];
}
