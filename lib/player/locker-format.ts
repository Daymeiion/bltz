// Shared pure formatting/lookup helpers for building a LockerView `data` prop.
// Extracted from app/player/[slug]/page.tsx so the preview-locker generator
// (lib/preview-lockers/mapper.ts) can produce pixel-identical output without
// duplicating the NFL team tables or date math.

export const LEVEL_LABEL: Record<string, string> = {
  hs: "High school",
  college: "College",
  pro: "Pro",
  former: "Former pro",
};

// 3-letter team codes used by nflverse / NFL.com.
export const NFL_TEAM_NAMES: Record<string, string> = {
  ARI: "Arizona Cardinals", ATL: "Atlanta Falcons", BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills", CAR: "Carolina Panthers", CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals", CLE: "Cleveland Browns", DAL: "Dallas Cowboys",
  DEN: "Denver Broncos", DET: "Detroit Lions", GB: "Green Bay Packers",
  HOU: "Houston Texans", IND: "Indianapolis Colts", JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs", LA: "Los Angeles Rams", LAC: "Los Angeles Chargers",
  LAR: "Los Angeles Rams", LV: "Las Vegas Raiders", MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings", NE: "New England Patriots", NO: "New Orleans Saints",
  NYG: "New York Giants", NYJ: "New York Jets", PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers", SEA: "Seattle Seahawks", SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers", TEN: "Tennessee Titans", WAS: "Washington Commanders",
};

export function nflTeamName(code: string | null | undefined): string | null {
  if (!code) return null;
  return NFL_TEAM_NAMES[code] ?? code;
}

// Keep historical labels while resolving their branding to the franchise CDN.
const HISTORICAL_TEAMS: Record<string, string> = {
  SD: "San Diego Chargers", OAK: "Oakland Raiders", STL: "St. Louis Rams",
};

export function nflTeamCode(value: string | null | undefined): string | null {
  const input = value?.trim().toUpperCase();
  if (!input) return null;
  const teams = { ...NFL_TEAM_NAMES, ...HISTORICAL_TEAMS };
  if (teams[input]) return input;
  return Object.entries(teams).find(([, name]) => name.toUpperCase() === input)?.[0] ?? null;
}

// Primary team colors for the rotating pro-teams pill (nflverse 2/3-letter codes).
export const NFL_TEAM_COLORS: Record<string, string> = {
  ARI: "#97233F", ATL: "#A71930", BAL: "#241773", BUF: "#00338D", CAR: "#0085CA",
  CHI: "#0B162A", CIN: "#FB4F14", CLE: "#311D00", DAL: "#003594", DEN: "#FB4F14",
  DET: "#0076B6", GB: "#203731", HOU: "#03202F", IND: "#002C5F", JAX: "#006778",
  KC: "#E31837", LA: "#003594", LAC: "#0080C6", LAR: "#003594", LV: "#000000",
  MIA: "#008E97", MIN: "#4F2683", NE: "#002244", NO: "#D3BC8D", NYG: "#0B2265",
  NYJ: "#125740", PHI: "#004C54", PIT: "#FFB612", SEA: "#002244", SF: "#AA0000",
  TB: "#D50A0A", TEN: "#4B92DB", WAS: "#5A1414",
};

export function nflTeamColor(code: string | null | undefined): string {
  const resolved = nflTeamCode(code);
  if (!resolved) return "#1A3DCC";
  return NFL_TEAM_COLORS[({ SD: "LAC", OAK: "LV", STL: "LAR" } as Record<string, string>)[resolved] ?? resolved] ?? "#1A3DCC";
}

// ESPN's logo CDN keys mostly match nflverse codes once lowercased; these are
// the few that differ. a.espncdn.com is whitelisted in next.config.ts.
const NFL_ESPN_ABBR: Record<string, string> = { WAS: "wsh", LA: "lar" };

export function nflLogo(code: string | null | undefined): string | null {
  const resolved = nflTeamCode(code);
  if (!resolved) return null;
  const franchise = ({ SD: "LAC", OAK: "LV", STL: "LAR" } as Record<string, string>)[resolved] ?? resolved;
  const abbr = (NFL_ESPN_ABBR[franchise] ?? franchise).toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`;
}

export function formatDob(dob?: string | null) {
  if (!dob) return "—";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  const d = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(dob);
  if (isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}-${d.getFullYear()}`;
}

export function calcAge(dob?: string | null) {
  if (!dob) return undefined;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  const d = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(dob);
  if (isNaN(d.getTime())) return undefined;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

export function heightDisplay(heightIn?: number | null) {
  if (!heightIn) return "";
  const feet = Math.floor(heightIn / 12);
  const inches = heightIn % 12;
  return `${feet}'${inches}"`;
}
