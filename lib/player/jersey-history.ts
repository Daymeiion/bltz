import { nflTeamCode, nflTeamColor, nflTeamName } from "./locker-format";

export type JerseyHistory = { team: string; number: string; sourceUrl?: string | null; sourceUrls?: string[]; status?: "single_source" | "corroborated" | "conflict"; color?: string; borderColor?: string; textColor?: string };
export type JerseyBadge = JerseyHistory & { color: string; borderColor: string; textColor: string };
export function jerseyNumber(value: unknown): string | null {
  const number = String(value ?? "").replace(/^#\s*/, "").trim();
  return /^(?:\d|[1-9]\d|00)$/.test(number) ? number : null;
}
export function jerseyTeamKey(team: string): string {
  const code = nflTeamCode(team);
  return code === "LA" ? "LAR" : code ?? team.trim().toLocaleLowerCase("en-US");
}
export function uniqueJerseys(items: JerseyHistory[]): JerseyHistory[] {
  const seen = new Map<string, JerseyHistory>();
  for (const item of items) {
    const number = jerseyNumber(item.number);
    const key = `${jerseyTeamKey(item.team)}:${number}`;
    if (!number || !item.team.trim()) continue;
    const previous = seen.get(key);
    const rank = { single_source: 1, corroborated: 2, conflict: 3 };
    seen.set(key, { ...item, ...previous, team: item.team.trim(), number,
      ...(item.status || previous?.status ? { status: (rank[item.status ?? "single_source"] > rank[previous?.status ?? "single_source"] ? item.status : previous?.status) ?? "single_source" } : {}),
      sourceUrls: [...new Set([...(previous?.sourceUrls ?? []), ...(item.sourceUrls ?? []), previous?.sourceUrl, item.sourceUrl].filter((url): url is string => !!url))].slice(0, 16),
    });
  }
  return [...seen.values()];
}

/** Earliest recorded season first; source row order breaks same-season ties. */
export function chronologicalJerseys<T extends { team: string }>(items: T[], seasons: Array<{ year: number | string; team: string | null }>): T[] {
  // PFR uses historical abbreviations that differ from the Locker's team codes.
  const aliases: Record<string, string> = { SDG: "SD", CRD: "ARI", RAV: "BAL", GNB: "GB", KAN: "KC", NWE: "NE", NOR: "NO", SFO: "SF", TAM: "TB", CLT: "IND", HTX: "HOU", OTI: "TEN", RAI: "OAK", RAM: "LAR" };
  const key = (team: string) => jerseyTeamKey(aliases[team.trim().toUpperCase()] ?? team);
  const first = new Map<string, number>();
  const ordered = seasons.filter(row => row.team && /^\d{4}$/.test(String(row.year)))
    .toSorted((a, b) => Number(a.year) - Number(b.year));
  for (const [index, row] of ordered.entries()) if (!first.has(key(row.team!))) first.set(key(row.team!), index);
  // Missing history remains stable, after teams with recorded seasons.
  return items.toSorted((a, b) => (first.get(key(a.team)) ?? Infinity) - (first.get(key(b.team)) ?? Infinity));
}

export function corroborateJerseys(reference: JerseyHistory[], rosters: JerseyHistory[]): JerseyHistory[] {
  const side = (items: JerseyHistory[], team: string) => items.filter(item => jerseyTeamKey(item.team) === jerseyTeamKey(team));
  return uniqueJerseys([...reference, ...rosters]).map(item => {
    const pfr = side(reference, item.team), roster = side(rosters, item.team);
    const matched = pfr.some(p => p.number === item.number) && roster.some(p => p.number === item.number);
    // A one-sided extra number may be a real number change. A disjoint team
    // history is a conflict for operator review, never an automatic correction.
    const conflict = pfr.length > 0 && roster.length > 0 && !pfr.some(p => roster.some(r => r.number === p.number));
    return { ...item, status: matched ? "corroborated" : conflict ? "conflict" : "single_source" };
  });
}
const borders: Record<string, string> = { SD: "#FFC20E", LAC: "#FFC20E", ARI: "#000000", CAR: "#101820", BAL: "#9E7C0C", GB: "#FFB612", PIT: "#101820", NO: "#101820", LV: "#A5ACAF", OAK: "#A5ACAF", MIN: "#FFC62F", SF: "#B3995D" };
const historicalNames: Record<string, string> = { SD: "San Diego Chargers", OAK: "Oakland Raiders", STL: "St. Louis Rams" };
export function jerseyBadge(item: JerseyHistory, fallbackColor = "#152238"): JerseyBadge {
  const code = nflTeamCode(item.team);
  const validHex = (value?: string) => /^#[\da-f]{6}$/i.test(value ?? "");
  const color = validHex(item.color) ? item.color! : code === "SD" ? "#002A5E" : code ? nflTeamColor(code) : validHex(fallbackColor) ? fallbackColor : "#152238";
  const rgb = color.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const luminance = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  const textColor = luminance > .3 ? "#000000" : "#FFFFFF";
  return { ...item, team: code ? historicalNames[code] ?? nflTeamName(code)! : item.team, color, borderColor: validHex(item.borderColor) ? item.borderColor! : code ? borders[code] ?? "#FFFFFF" : "#FFFFFF", textColor };
}
