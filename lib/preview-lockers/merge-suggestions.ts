import type { PreviewContent } from "./validation";
import { nflTeamCode } from "@/lib/player/locker-format";
import { schoolsMatch } from "@/lib/player/school-identity";

type Team = PreviewContent["schools"][number];
const PLACEHOLDER_COLORS = new Set(["#152238", "#1A3DCC"]);

function mergeTeams(current: Team[], suggestions: Team[], kind: "school" | "pro"): Team[] {
  const merged = current.map(team => ({ ...team }));
  for (const suggestion of suggestions) {
    const match = merged.findIndex(team => kind === "pro"
      ? (nflTeamCode(team.label) || team.label.trim().toLocaleLowerCase("en-US")) === (nflTeamCode(suggestion.label) || suggestion.label.trim().toLocaleLowerCase("en-US"))
      : schoolsMatch(team.label, suggestion.label));
    if (match < 0) {
      if (merged.length < 32) merged.push({ ...suggestion });
      continue;
    }
    const existing = merged[match];
    merged[match] = {
      ...existing,
      color: PLACEHOLDER_COLORS.has(existing.color.toUpperCase()) && !PLACEHOLDER_COLORS.has(suggestion.color.toUpperCase()) ? suggestion.color : existing.color,
      logo: existing.logo || suggestion.logo,
    };
  }
  return merged;
}

// Discovery never overwrites work an operator has entered. Suggestions fill
// blank fields and append missing career affiliations; all results still
// require explicit review. Existing labels and non-placeholder colors win.
export function mergeSuggestions(current: PreviewContent, suggestion: PreviewContent): PreviewContent {
  const merged = {
    ...current,
    schools: mergeTeams(current.schools, suggestion.schools, "school"),
    pro_teams: mergeTeams(current.pro_teams, suggestion.pro_teams, "pro"),
  };
  for (const key of Object.keys(current) as (keyof PreviewContent)[]) {
    if (key === "schools" || key === "pro_teams") continue;
    const value = current[key];
    if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      Object.assign(merged, { [key]: suggestion[key] });
    }
  }
  return merged;
}
