import { nflTeamCode, nflTeamColor, nflLogo } from "@/lib/player/locker-format";
import { schoolHistoryName } from "@/lib/player/team-history-name";
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

export function shortTeamLabel(value: string): string {
  const clean = value.trim();
  // Only campus-specific known aliases change the existing presentation fallback.
  if (["CAL", "UCLA", "LSU", "UCF"].some(abbr => schoolsMatch(clean, abbr))) return schoolShortLabel(clean);
  if (clean.length <= 5) return clean.toUpperCase();
  return clean.split(/\s+/).filter(word => !/^(of|the|at|university)$/i.test(word)).map(word => word[0]).join("").slice(0, 5).toUpperCase() || clean.slice(0, 3).toUpperCase();
}

export function previewTeamBranding(row: PreviewBrandingSource) {
  const info = row.school_info;
  const schools = (row.schools?.length ? row.schools : info?.name ? [{ label: info.abbr || info.name, color: info.primaryColor, logo: info.logoUrl }] : row.school ? [{ label: row.school, color: "#1A3DCC", logo: null }] : []).map(team => {
    const isPrimary = info?.name && [info.name, info.abbr, row.school].some(name => name && schoolsMatch(name, team.label));
    return { label: shortTeamLabel(isPrimary ? info.abbr || team.label : team.label), name: schoolHistoryName(team.name || (isPrimary ? info.name : team.label)), color: brandColor(isPrimary ? info.primaryColor : team.color), logo: isPrimary ? info.logoUrl || team.logo : team.logo };
  });
  const proTeams = (row.pro_teams ?? []).map(team => {
    const code = nflTeamCode(team.label);
    return { label: code ?? shortTeamLabel(team.label), color: code ? nflTeamColor(code) : brandColor(team.color), logo: code ? nflLogo(code) : team.logo };
  });
  const unique = (teams: PreviewTeamPill[]) => Array.from(new Map(teams.map(team => [team.label, team])).values());
  return { schools: unique(schools), proTeams: unique(proTeams) };
}

export type SchoolBrandRow = { display_name: string | null; location?: string | null; abbreviation: string | null; mascot?: string | null; primary_color: string | null; logo_url: string | null; logo_dark_url: string | null };

export function matchSchoolRow(name: string, directory: SchoolBrandRow[]): SchoolBrandRow | null {
  if (!schoolNameKey(name)) return null;
  const matches = directory.filter(team => [team.display_name, team.location, team.abbreviation,
    team.display_name ? schoolHistoryName(team.display_name, team.mascot) : null,
  ].some(value => value && schoolsMatch(name, value)));
  return matches.length === 1 ? matches[0] : null;
}

export function matchSchoolBrand(name: string, directory: SchoolBrandRow[]): PreviewSchoolInfo {
  const team = matchSchoolRow(name, directory);
  if (!team) return null;
  return { name: team.location || team.display_name || name, abbr: team.abbreviation || shortTeamLabel(team.location || name), primaryColor: brandColor(team.primary_color), logoUrl: team.logo_url || team.logo_dark_url };
}

// Expand existing discovery context only from one directory reference. A short
// code shared by multiple campuses never creates another affiliation or ID.
export function directorySchoolAliases(names: string[], directory: SchoolBrandRow[]): string[] {
  return [...new Set(names.flatMap(name => {
    const team = matchSchoolRow(name, directory);
    if (!team) return [name];
    return [name, team.location, team.display_name, team.abbreviation,
      team.display_name ? schoolHistoryName(team.display_name, team.mascot) : null,
    ].flatMap(value => value && matchSchoolRow(value, directory) === team ? schoolAliases(value) : []);
  }))];
}
