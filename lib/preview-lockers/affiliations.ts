import { nflLogo, nflTeamCode, nflTeamColor } from "@/lib/player/locker-format";
import { matchSchoolBrand, type SchoolBrandRow } from "./branding";
import type { PreviewRecord } from "./validation";

type Season = { team?: unknown };

// These are editor suggestions from reviewed sources, not new career relationships.
export function suggestPreviewAffiliations(
  record: PreviewRecord,
  source: { college?: string | null; latestTeam?: string | null; seasons?: Season[] },
  directory: SchoolBrandRow[],
): PreviewRecord {
  const school = record.school || source.college?.trim() || null;
  const schools = record.schools.map(item => {
    const matched = matchSchoolBrand(item.label, directory);
    return matched && ["#152238", "#1A3DCC"].includes(item.color.toUpperCase())
      ? { ...item, color: matched.primaryColor, logo: item.logo || matched.logoUrl } : item;
  });
  // A source may list several colleges in one field. Suggest each school once,
  // rather than inventing an extra combined school row every time the editor opens.
  for (const name of (school ?? "").split(";").map(value => value.trim()).filter(Boolean)) {
    const brand = matchSchoolBrand(name, directory);
    if (!schools.some(item => [name.toLowerCase(), brand?.abbr.toLowerCase()].includes(item.label.toLowerCase()))) {
      schools.push({ label: brand?.abbr || name, color: brand?.primaryColor || "#1A3DCC", logo: brand?.logoUrl || null });
    }
  }
  const pro_teams = record.pro_teams.map(item => {
    const code = nflTeamCode(item.label);
    return code && ["#152238", "#1A3DCC"].includes(item.color.toUpperCase())
      ? { ...item, color: nflTeamColor(code), logo: item.logo || nflLogo(code) } : item;
  });
  const seen = new Set(pro_teams.map(item => nflTeamCode(item.label) || item.label.toLowerCase()));
  const names = [...(source.seasons ?? []).map(item => item.team), source.latestTeam];
  for (const name of names) {
    if (typeof name !== "string" || !name.trim()) continue;
    const label = name.trim();
    const code = nflTeamCode(label);
    const key = code || label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pro_teams.push({ label, color: code ? nflTeamColor(code) : "#1A3DCC", logo: code ? nflLogo(code) : null });
    if (pro_teams.length >= 32) break;
  }
  return { ...record, school, schools: schools.slice(0, 32), pro_teams };
}
