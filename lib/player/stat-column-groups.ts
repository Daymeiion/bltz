import { DISPLAY_STAT_FIELDS } from "@/lib/sportradar/types";

// One ordered catalog drives grouped headers for every supported import category.
// Newly registered metrics still render under Other statistics until grouped.
const groups = [
  { label: "Passing", abbreviation: "PASS", keys: ["passingYards", "passingAttempts", "completions", "passingTouchdowns", "passingInterceptions", "passerRating"] },
  { label: "Rushing", abbreviation: "RUSH", keys: ["rushingAttempts", "rushingYards", "rushingTouchdowns"] },
  { label: "Receiving", abbreviation: "REC", keys: ["receptions", "receivingYards", "receivingTouchdowns"] },
  { label: "Interceptions", abbreviation: "INT / PD", keys: ["interceptions", "interceptionReturnYards", "interceptionReturnTouchdowns", "longestInterceptionReturn", "passesDefended"] },
  { label: "Fumbles", abbreviation: "FUM", keys: ["forcedFumbles", "fumbles", "fumbleRecoveries", "fumbleReturnYards", "fumbleReturnTouchdowns"] },
  { label: "Tackles & pressure", abbreviation: "TKL / SK", keys: ["sacks", "tackles", "soloTackles", "assists", "tacklesForLoss", "quarterbackHits", "safeties"] },
  { label: "Kick returns", abbreviation: "KR", keys: ["kickReturns", "kickReturnYards", "kickReturnTouchdowns"] },
  { label: "Punt returns", abbreviation: "PR", keys: ["puntReturns", "puntReturnYards", "puntReturnTouchdowns"] },
  { label: "Kicking", abbreviation: "KICK", keys: ["fieldGoalsMade", "fieldGoalsAttempted", "extraPointsMade", "extraPointsAttempted"] },
  { label: "Punting", abbreviation: "PUNT", keys: ["punts", "puntYards"] },
  { label: "PFR metric", abbreviation: "AV", keys: ["approximateValue"] },
];

export const STAT_COLUMN_ABBREVIATIONS: Record<string, string> = {
  passingYards: "Yds", passingAttempts: "Att", completions: "Cmp", passingTouchdowns: "TD", passingInterceptions: "INT", passerRating: "Rate",
  rushingAttempts: "Att", rushingYards: "Yds", rushingTouchdowns: "TD",
  receptions: "Rec", receivingYards: "Yds", receivingTouchdowns: "TD",
  interceptions: "INT", interceptionReturnYards: "Yds", interceptionReturnTouchdowns: "TD", longestInterceptionReturn: "Lng", passesDefended: "PD",
  forcedFumbles: "FF", fumbles: "Fmb", fumbleRecoveries: "FR", fumbleReturnYards: "Yds", fumbleReturnTouchdowns: "TD",
  sacks: "Sk", tackles: "Comb", soloTackles: "Solo", assists: "Ast", tacklesForLoss: "TFL", quarterbackHits: "QBH", safeties: "Sfty",
  kickReturns: "Ret", kickReturnYards: "Yds", kickReturnTouchdowns: "TD",
  puntReturns: "Ret", puntReturnYards: "Yds", puntReturnTouchdowns: "TD",
  fieldGoalsMade: "FGM", fieldGoalsAttempted: "FGA", extraPointsMade: "XPM", extraPointsAttempted: "XPA",
  punts: "Pnt", puntYards: "Yds", approximateValue: "AV",
};

export function statColumnGroups(statistics: Record<string, number>[]) {
  const available = new Set(Object.keys(DISPLAY_STAT_FIELDS).filter(key => statistics.some(stats => stats[key] !== undefined)));
  const result = groups.map(group => ({ ...group, keys: group.keys.filter(key => available.has(key)) })).filter(group => group.keys.length);
  const grouped = new Set(result.flatMap(group => group.keys));
  const remaining = [...available].filter(key => !grouped.has(key));
  if (remaining.length) result.push({ label: "Other statistics", abbreviation: "OTHER", keys: remaining });
  return result;
}
