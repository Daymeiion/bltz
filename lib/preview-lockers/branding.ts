import { nflTeamCode, nflTeamColor, nflLogo } from "@/lib/player/locker-format";
import type { PreviewLockerRow, PreviewTeamPill, PreviewSchoolInfo } from "./types";

export function brandColor(value: string | null | undefined): string {
  const hex = value?.trim().replace(/^#/, "");
  return hex && /^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex) ? `#${hex}` : "#1A3DCC";
}

export function shortTeamLabel(value: string): string {
  const clean = value.trim();
  if (clean.length <= 5) return clean.toUpperCase();
  return clean.split(/\s+/).filter(word => !/^(of|the|at|university)$/i.test(word)).map(word => word[0]).join("").slice(0, 5).toUpperCase() || clean.slice(0, 3).toUpperCase();
}

export function previewTeamBranding(row: PreviewLockerRow) {
  const info = row.school_info;
  const schools = (row.schools?.length ? row.schools : info?.name ? [{ label: info.abbr || info.name, color: info.primaryColor, logo: info.logoUrl }] : row.school ? [{ label: row.school, color: "#1A3DCC", logo: null }] : []).map(team => {
    const isPrimary = info?.name && [info.name, info.abbr, row.school].some(name => name?.trim().toLowerCase() === team.label.trim().toLowerCase());
    return { label: shortTeamLabel(isPrimary ? info.abbr || team.label : team.label), color: brandColor(isPrimary ? info.primaryColor : team.color), logo: isPrimary ? info.logoUrl || team.logo : team.logo };
  });
  const proTeams = (row.pro_teams ?? []).map(team => {
    const code = nflTeamCode(team.label);
    return { label: code ?? shortTeamLabel(team.label), color: code ? nflTeamColor(code) : brandColor(team.color), logo: code ? nflLogo(code) : team.logo };
  });
  const unique = (teams: PreviewTeamPill[]) => Array.from(new Map(teams.map(team => [team.label, team])).values());
  return { schools: unique(schools), proTeams: unique(proTeams) };
}

export type SchoolBrandRow = { display_name: string | null; abbreviation: string | null; primary_color: string | null; logo_url: string | null; logo_dark_url: string | null };
const schoolKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function matchSchoolBrand(name: string, directory: SchoolBrandRow[]): PreviewSchoolInfo {
  const key = schoolKey(name);
  if (!key) return null;
  const alias = ["universityofcaliforniaberkeley", "ucberkeley", "california", "cal"].includes(key) ? "cal" : key;
  const matches = directory.filter(team => [team.display_name, team.abbreviation].some(value => value && [key, alias].includes(schoolKey(value))));
  if (matches.length !== 1) return null;
  const team = matches[0];
  return { name: team.display_name || name, abbr: team.abbreviation || shortTeamLabel(name), primaryColor: brandColor(team.primary_color), logoUrl: team.logo_url || team.logo_dark_url };
}
