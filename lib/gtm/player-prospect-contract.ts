export const GTM_PLAYER_PROSPECT_PAGE_SIZE = 50;

export const GTM_PLAYER_PROSPECT_SORTS = [
  "name",
  "college",
  "team",
  "position",
  "experience",
  "last_season",
] as const;

export type GtmPlayerProspectSort = (typeof GTM_PLAYER_PROSPECT_SORTS)[number];

export interface GtmPlayerProspectFilters {
  search: string;
  college: string;
  team: string;
  position: string;
  status: string;
  sort: GtmPlayerProspectSort;
  direction: "asc" | "desc";
  page: number;
}

export interface GtmPlayerProspectRow {
  gsisId: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  collegeName: string | null;
  collegeConference: string | null;
  latestTeam: string | null;
  position: string | null;
  status: string | null;
  rookieSeason: number | null;
  lastSeason: number | null;
  yearsOfExperience: number | null;
  headshotUrl: string | null;
  selectedAt: string | null;
}

export type GtmPlayerProspectsReadModel =
  | {
      state: "ready";
      rows: GtmPlayerProspectRow[];
      total: number;
      page: number;
      pageSize: number;
      pageCount: number;
      filters: GtmPlayerProspectFilters;
    }
  | { state: "not_configured"; rows: []; total: 0; filters: GtmPlayerProspectFilters }
  | { state: "restricted"; rows: []; total: 0; filters: GtmPlayerProspectFilters };

function cleanText(value: string | undefined, maximum = 80) {
  return (value ?? "").trim().replace(/[^\p{L}\p{N}\s-]/gu, "").slice(0, maximum);
}

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseGtmPlayerProspectFilters(input: Record<string, string | string[] | undefined>): GtmPlayerProspectFilters {
  const requestedSort = cleanText(typeof input.sort === "string" ? input.sort : undefined) as GtmPlayerProspectSort;
  return {
    search: cleanText(typeof input.search === "string" ? input.search : undefined),
    college: cleanText(typeof input.college === "string" ? input.college : undefined, 120),
    team: cleanText(typeof input.team === "string" ? input.team : undefined, 20).toUpperCase(),
    position: cleanText(typeof input.position === "string" ? input.position : undefined, 30).toUpperCase(),
    status: cleanText(typeof input.status === "string" ? input.status : undefined, 40),
    sort: GTM_PLAYER_PROSPECT_SORTS.includes(requestedSort) ? requestedSort : "name",
    direction: input.direction === "desc" ? "desc" : "asc",
    page: parsePage(typeof input.page === "string" ? input.page : undefined),
  };
}
