import { decodeHTML } from "entities";
import { combineMetricInfo, type CombineMetric, type CombineResult } from "@/lib/player/combine";
import { previewCombineResult } from "@/lib/preview-lockers/validation";
import { requireSourceAction } from "@/lib/source-policy/policy";
import { articleRelevance, type NewsIdentity } from "./news";
import { attrs } from "./article-metadata";
import { mentionsSchool } from "@/lib/player/school-identity";

const text = (html: string) => decodeHTML(html.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "").replace(/<[^>]*>/g, " "))
  .replace(/[\u00a0\u2009\u202f]/g, " ").replace(/\s+/g, " ").trim();
const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
function metric(label: string): CombineMetric | null {
  const normalized = key(label);
  const aliases: Record<string, CombineMetric> = {
    ht: "height", height: "height", wt: "weight", weight: "weight", forty: "forty", fortyyd: "forty", "40yd": "forty", "40yarddash": "forty", "40ydash": "forty",
    "10yardsplit": "ten_split", "10ydsplit": "ten_split", shuttle: "shuttle", "20yardshuttle": "shuttle", "20ydshuttle": "shuttle",
    "3cone": "cone", "3conedrill": "cone", threeconedrill: "cone", vertical: "vertical", verticaljump: "vertical",
    broadjump: "broad_jump", bench: "bench", benchpress: "bench", armlength: "arm", arms: "arm", handsize: "hand", hands: "hand",
  };
  return aliases[normalized.replace(/(?:seconds|secs|sec|inches|inch|lbs|pounds|reps|in)$/, "")] ?? aliases[normalized] ?? null;
}
export function parseCombineNumber(metric: CombineMetric, raw: string): number | null {
  let value = text(raw).replace(/[‐‑–—]/g, "-").replace(/\[[^\]]*\]/g, "");
  if (!value || /\b(?:DNP|N\/A|not|did not|estimated|approx|low|high)\b/i.test(value) || /^-+$/.test(value)) return null;
  for (const [glyph, fraction] of Object.entries({ "¼": "+1/4", "½": "+1/2", "¾": "+3/4", "⅛": "+1/8", "⅜": "+3/8", "⅝": "+5/8", "⅞": "+7/8" })) value = value.replaceAll(glyph, fraction);
  value = value.replace(/(\d+)\s*(?:\+|\s)\s*(\d+)\s*[⁄/]\s*(\d+)/g, (_, whole, numerator, denominator) => String(Number(whole) + Number(numerator) / Number(denominator)));
  let amount: number;
  const feet = /^(\d{1,2})\s*(?:ft\.?|[′'])\s*(\d+(?:\.\d+)?)?\s*(?:in\b|[″"])?/i.exec(value);
  const hyphen = /^(\d{1,2})-(\d{1,2})(?:\b|$)/.exec(value);
  if (metric === "height" || metric === "broad_jump") {
    if (feet) amount = Number(feet[1]) * 12 + Number(feet[2] ?? 0);
    else if (hyphen && Number(hyphen[2]) < 12) amount = Number(hyphen[1]) * 12 + Number(hyphen[2]);
    else {
      if (!/^\d+(?:\.\d+)?\s*(?:in\b|inches\b|[″"]|$)/i.test(value)) return null;
      amount = Number.parseFloat(value);
    }
  } else {
    // Reject ranges and incompatible units instead of guessing conversions.
    if (!/^\d+(?:\.\d+)?\s*(?:s\b|sec(?:onds)?\b|in\b|inches\b|lbs?\b|pounds\b|reps?\b|[″"]|$)/i.test(value)) return null;
    if (/\b(?:kg|cm|meters)\b/i.test(value.split("(")[0])) return null;
    const unit = /^\d+(?:\.\d+)?\s*([a-z″"]+)?/i.exec(value)?.[1]?.toLowerCase();
    const allowedUnits = metric === "bench" ? ["rep", "reps"] : metric === "weight" ? ["lb", "lbs", "pounds"]
      : ["forty", "ten_split", "shuttle", "cone"].includes(metric) ? ["s", "sec", "seconds"] : ["in", "inches", "″", '"'];
    if (unit && !allowedUnits.includes(unit)) return null;
    amount = Number.parseFloat(value);
  }
  const field = combineMetricInfo[metric];
  return Number.isFinite(amount) && amount >= field.min && amount <= field.max && (metric !== "bench" || Number.isInteger(amount)) ? amount : null;
}
function eventYear(value: string, url: string): number | null {
  const years = [...value.matchAll(/\b((?:19|20)\d{2})\s+(?:NFL\s+|scouting\s+)?(?:draft|combine|pro[ -]day)\b/gi)].map(match => Number(match[1]));
  const pathYear = /\/(\d{4})-combine\.htm/.exec(url)?.[1] ?? new URL(url).searchParams.get("DraftYear");
  return pathYear ? Number(pathYear) : years.at(-1) ?? null;
}
function eventContext(value: string, url: string): { eventType: CombineResult["eventType"]; year: number | null; timing: CombineResult["timing"] } | null {
  const combine = /\b(?:NFL\s+|scouting\s+)?combine\b/i.test(value), pro = /\bpro[ -]day\b/i.test(value);
  if (combine === pro) return null; // Mixed/unspecified events require manual entry.
  return { eventType: pro ? "pro_day" : "combine", year: eventYear(value, url),
    timing: /\bunofficial\b/i.test(value) ? "unofficial" : /\bofficial(?:ly)?\b/i.test(value) ? "official" : "not_recorded" };
}
/** Deterministic, single-athlete projection. Never returns raw HTML, source
 * prose, unrelated player rows, search snippets or fabricated missing values. */
export function extractCombineResults(html: string, url: string, identity: NewsIdentity): CombineResult[] {
  requireSourceAction(url, "EXTRACT_COMBINE"); requireSourceAction(url, "PERSIST_COMBINE");
  const document = html.slice(0, 1_500_000).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  const visible = document.replace(/<!--[\s\S]*?-->/g, "");
  const pageText = text(visible);
  const heading = text(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(visible)?.[1] ?? /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(visible)?.[1] ?? "");
  const namedProfile = key(heading).startsWith(key(identity.fullName));
  const playerPage = namedProfile && articleRelevance({ headline: "", summary: pageText.slice(0, 45000) }, identity) >= 0.8;
  const results: CombineResult[] = [];
  // Draft Scout labels Combine and Pro Day in adjacent pairs of cells, rather
  // than a header-per-metric table. Never read the site's low/high projections.
  if (new URL(url).hostname.replace(/^www\./, "") === "draftscout.com" && playerPage) {
    const section = /<tr\b[^>]*>[\s\S]*?Combine Results[\s\S]*?Pro Day Results[\s\S]*?<\/tr>\s*<tr\b[^>]*>([\s\S]*?)<\/tr>/i.exec(visible);
    // The legacy page omits its last closing </td>; cell starts remain stable.
    const cells = section ? [...section[1].matchAll(/<td\b[^>]*>([\s\S]*?)(?=<td\b|$)/gi)].map(cell => cell[1]) : [];
    if (cells.length === 4) for (const [index, eventType] of (["combine", "pro_day"] as const).entries()) {
      const lines = cells.slice(index * 2, index * 2 + 2).flatMap(cell => cell.split(/<br\s*\/?\s*>/i).map(text));
      const measurements: CombineResult["measurements"] = [];
      for (const line of lines) {
        const pair = /(?:^|\s)(Height|Weight|40 Yard Dash \(ET\)|40 Yrd Dash|10 Yard \(ET\)|10 Yrd Dash|225 Lb\. Bench Reps|Vertical Jump|Broad Jump|20 Yrd Shuttle|3-Cone Drill|Arm|Hand):\s*(.*)$/i.exec(line);
        if (!pair || !pair[2]) continue;
        const field: CombineMetric | null = /^40 /i.test(pair[1]) ? "forty" : /^10 /i.test(pair[1]) ? "ten_split" : /^225 /i.test(pair[1]) ? "bench" : /^20 /i.test(pair[1]) ? "shuttle" : /^Arm$/i.test(pair[1]) ? "arm" : /^Hand$/i.test(pair[1]) ? "hand" : metric(pair[1]);
        if (!field) continue;
        const code = field === "height" ? /^([4-7])(\d{2})([0-7])$/.exec(pair[2]) : null;
        const raw = code && Number(code[2]) < 12 ? String(Number(code[1]) * 12 + Number(code[2]) + Number(code[3]) / 8) : pair[2];
        const amount = parseCombineNumber(field, raw);
        if (amount !== null && !measurements.some(item => item.metric === field)) measurements.push({ metric: field, value: amount, sourceUrl: url });
      }
      const date = /\bDates:\s*\d{2}\/\d{2}\/(\d{2}|\d{4})\b/.exec(lines.join(" "))?.[1];
      const year = date ? Number(date.length === 2 ? (Number(date) < 50 ? "20" : "19") + date : date) : eventYear("", url);
      const parsed = previewCombineResult.safeParse({ id: `scout-${index}`, eventType, year, timing: "not_recorded", sourceUrl: url, measurements });
      if (parsed.success && measurements.length) results.push(parsed.data);
    }
  }
  // PFR wraps some tables in HTML comments; inspect only individual table rows.
  const tables = document.replace(/<!--|-->/g, "");
  for (const match of tables.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)) {
    const table = match[0];
    const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => [...row[1].matchAll(/<(th|td)\b([^>]*)>([\s\S]*?)<\/(?:th|td)>/gi)].map(cell => ({ header: cell[1].toLowerCase() === "th", label: text(cell[3]), stat: attrs(cell[2])["data-stat"] })));
    const headings = rows.find(row => row.filter(cell => metric(cell.label)).length >= 3);
    if (!headings) continue;
    const multiPlayer = headings.some(cell => /^(?:player|name)$/i.test(cell.label));
    for (const row of rows) {
      if (row === headings || row.length !== headings.length || row.every(cell => cell.header)) continue;
      if (multiPlayer) {
        const scope = `${text(table.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1] ?? "NFL Combine")} ${row.map(cell => cell.label).join(" ")}`;
        const nameIndex = headings.findIndex(cell => /^(player|name)$/i.test(cell.label));
        if (key(row[nameIndex]?.label ?? "") !== key(identity.fullName) || articleRelevance({ headline: "", summary: scope }, identity) < 0.8) continue;
      } else if (!playerPage) continue;
      const prefix = text(tables.slice(Math.max(0, match.index! - 3000), match.index));
      const local = text(table);
      const context = eventContext(row[0]?.label ?? "", url) ?? eventContext(local, url) ?? (!/\bcombine\b/i.test(local) && !/\bpro[ -]day\b/i.test(local) ? eventContext(prefix, url) : null);
      if (!context) continue;
      if (context.year === null) context.year = eventYear(prefix, url);
      const measurements = row.flatMap((cell, index) => {
        const field = metric(headings[index].label); if (!field) return [];
        const value = parseCombineNumber(field, cell.label);
        return value === null ? [] : [{ metric: field, value, sourceUrl: url }];
      });
      const parsed = previewCombineResult.safeParse({ id: `source-${results.length}`, ...context, sourceUrl: url, measurements });
      if (parsed.success && measurements.length) results.push(parsed.data);
    }
  }
  // NFL/school reports: require name, affiliation and event in the same
  // paragraph; do not borrow another athlete's values from a whole article.
  for (const match of visible.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const paragraph = text(match[1]);
    if (paragraph.length > 1800) continue;
    const heading = [...visible.slice(0, match.index).matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)].at(-1)?.[1] ?? "";
    const report = /(^|\.)nfl\.com$/.test(new URL(url).hostname) && /\/news\/pro-day/.test(new URL(url).pathname)
      && identity.schools.some(school => mentionsSchool(text(heading), school)) && paragraph.includes(identity.fullName);
    if (articleRelevance({ headline: "", summary: report ? `${paragraph} ${text(heading)} football` : paragraph }, identity) < 0.8) continue;
    const published = /"datePublished"\s*:\s*"((?:19|20)\d{2})-/.exec(html)?.[1];
    const context = report ? { eventType: "pro_day" as const, year: published ? Number(published) : null, timing: "not_recorded" as const } : eventContext(paragraph, url);
    if (!context) continue;
    const knownNames = [identity.fullName, ...identity.schools, ...identity.teams, "Pro Day", "Scouting Combine"];
    const namedSubjects = [...paragraph.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g)].map(found => found[0]);
    if (namedSubjects.some(name => !knownNames.some(known => key(known).includes(key(name)) || key(name).includes(key(known))))) continue;
    const patterns: Partial<Record<CombineMetric, RegExp>> = {
      forty: /\b(?:40[ -]yard dash|40[ -]yard|forty)(?:\s+(?:time|in|of|was|at|:))*\s+(\d\.\d+)\s*(?:s\b|seconds?\b)/i,
      vertical: /\b(?:vertical (?:jump|leap))(?:\s+(?:of|was|at|:))*\s+(\d+(?:\.\d+)?)\s*(?:inches|in\b)|\b(\d+(?:\.\d+)?)[ -]inch vertical (?:jump|leap)/i,
      cone: /\b(?:3[ -]cone|three[ -]cone)(?:\s+(?:drill|in|of|was|at|:))*\s+(\d\.\d+)\s*(?:s\b|seconds?\b)|\b(\d\.\d+)\s+cone drill/i,
      bench: /\bbench(?:\s+(?:press|pressed|of|was|at|:))*\s+(\d+)\s*reps?\b/i,
    };
    // Multiple named athlete subjects in a paragraph cannot be safely resolved.
    if (/\b(?:while|whereas|teammate|respectively)\b|\band\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(paragraph)) continue;
    const measurements = Object.entries(patterns).flatMap(([field, pattern]) => {
      const found = pattern.exec(paragraph); if (!found) return [];
      const value = parseCombineNumber(field as CombineMetric, found[1] ?? found[2]);
      return value === null ? [] : [{ metric: field as CombineMetric, value, sourceUrl: url }];
    });
    const parsed = previewCombineResult.safeParse({ id: `source-${results.length}`, ...context, sourceUrl: url, measurements });
    if (parsed.success && measurements.length) results.push(parsed.data);
  }
  const seen = new Set<string>();
  return results.filter(event => { const id = JSON.stringify([event.eventType, event.year, event.timing, event.measurements]); if (seen.has(id)) return false; seen.add(id); return true; }).slice(0, 4);
}
