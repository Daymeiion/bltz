import { nflTeamCode, nflTeamColor, nflLogo } from "@/lib/player/locker-format";
import type { PreviewTeamPill, PreviewSchoolInfo } from "./types";
import { schoolAliases, schoolNameKey, schoolShortLabel, schoolsMatch } from "@/lib/player/school-identity";

export type PreviewBrandingSource = {
  school?: string | null;
  school_info?: PreviewSchoolInfo;
  schools?: PreviewTeamPill[];
  pro_teams?: PreviewTeamPill[];
};

export function brandColor(value: string | null | undefined): string {
  const hex = value?.trim().replace(/^#/, "");
  return hex && /^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex) ? `#${hex}` : "#1A3DCC";
}

export const shortTeamLabel = schoolShortLabel;

export function previewTeamBranding(row: PreviewBrandingSource) {
  const info = row.school_info;
  const schools = (row.schools?.length ? row.schools : info?.name ? [{ label: info.abbr || info.name, color: info.primaryColor, logo: info.logoUrl }] : row.school ? [{ label: row.school, color: "#1A3DCC", logo: null }] : []).map(team => {
    const isPrimary = info?.name && [info.name, info.abbr, row.school].some(name => name && schoolsMatch(name, team.label));
    return { ...(team.fullLabel ? { fullLabel: team.fullLabel } : {}), label: shortTeamLabel(team.label, isPrimary ? info.abbr : team.fullLabel ? team.label : undefined), color: brandColor(isPrimary ? info.primaryColor : team.color), logo: isPrimary ? info.logoUrl || team.logo : team.logo };
  });
  const proTeams = (row.pro_teams ?? []).map(team => {
    const code = nflTeamCode(team.label);
    return { label: code ?? shortTeamLabel(team.label), color: code ? nflTeamColor(code) : brandColor(team.color), logo: code ? nflLogo(code) : team.logo };
  });
  const unique = (teams: PreviewTeamPill[]) => Array.from(new Map(teams.map(team => [team.fullLabel || team.label, team])).values());
  return { schools: unique(schools), proTeams: unique(proTeams) };
}

export type SchoolBrandRow = { location?: string | null; mascot?: string | null; display_name: string | null; abbreviation: string | null; primary_color: string | null; logo_url: string | null; logo_dark_url: string | null };

export function matchSchoolRow(name: string, directory: SchoolBrandRow[]): SchoolBrandRow | null {
  if (!schoolNameKey(name)) return null;
  const matches = directory.filter(team => [team.display_name, team.location, team.abbreviation].some(value => value && schoolsMatch(name, value)));
  return matches.length === 1 ? matches[0] : null;
}
export function matchSchoolBrand(name: string, directory: SchoolBrandRow[]): PreviewSchoolInfo {
  const team = matchSchoolRow(name, directory);
  if (!team) return null;
  return { name: team.location || team.display_name || name, abbr: team.abbreviation || shortTeamLabel(team.location || name), primaryColor: brandColor(team.primary_color), logoUrl: team.logo_url || team.logo_dark_url };
}
// Only directory-backed, unique reference matches may expand a stored affiliation.
// Ambiguous short codes never become new identity evidence.
export function directorySchoolAliases(names: string[], directory: SchoolBrandRow[]): string[] {
  return [...new Set(names.flatMap(name => {
    const team = matchSchoolRow(name, directory);
    if (!team) return [name];
    return [name, team.location, team.display_name, team.abbreviation].flatMap(value =>
      value && matchSchoolRow(value, directory) === team ? schoolAliases(value) : []);
  }))];
}
