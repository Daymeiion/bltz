import type { PreviewContent } from "./validation";
import { corroborateJerseys, jerseyTeamKey, type JerseyHistory } from "@/lib/player/jersey-history";
import { evaluateSource } from "@/lib/source-policy/policy";
import { mergeSuggestions } from "./merge-suggestions";

export function reviewPfrJerseys(current: PreviewContent, reference: JerseyHistory[]): PreviewContent {
  const rosters = current.pro_teams.flatMap(team => {
    const sources = [...(team.jerseySources ?? []), ...(team.jerseySourceUrl ? [team.jerseySourceUrl] : [])].filter(url => evaluateSource(url).allowed_actions.includes("EXTRACT_FACTS"));
    return sources.length ? (team.jerseyNumbers ?? []).map(number => ({ team: team.label, number, sourceUrl: sources[0], sourceUrls: sources })) : [];
  });
  const compared = corroborateJerseys(reference, rosters);
  const suggestion = { ...current, pro_teams: current.pro_teams.map(team => {
    const items = compared.filter(item => jerseyTeamKey(item.team) === jerseyTeamKey(team.label));
    if (!items.length) return team;
    return { ...team, jerseyNumbers: items.map(item => item.number).slice(0, 10),
      jerseySourceUrl: items.find(item => item.sourceUrl)?.sourceUrl,
      jerseySources: [...new Set(items.flatMap(item => item.sourceUrls ?? []))].slice(0, 16),
      jerseyStatus: items.some(item => item.status === "conflict") ? "conflict" as const : items.every(item => item.status === "corroborated") ? "corroborated" as const : "single_source" as const,
      jerseyColor: items.find(item => item.color)?.color ?? team.jerseyColor,
      jerseyBorderColor: items.find(item => item.borderColor)?.borderColor ?? team.jerseyBorderColor,
    };
  }) };
  const merged = mergeSuggestions(current, suggestion);
  // Conflicts must be visible even when existing number edits are preserved.
  return { ...merged, pro_teams: merged.pro_teams.map(team => {
    const proposed = suggestion.pro_teams.find(item => jerseyTeamKey(item.label) === jerseyTeamKey(team.label));
    return proposed?.jerseyStatus === "conflict" ? { ...team, jerseyStatus: "conflict", jerseySources: proposed.jerseySources } : team;
  }) };
}
