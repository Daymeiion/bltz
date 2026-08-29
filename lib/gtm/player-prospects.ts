import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  GTM_PLAYER_PROSPECT_PAGE_SIZE,
  type GtmPlayerProspectFilters,
  type GtmPlayerProspectsReadModel,
  type GtmPlayerProspectSort,
} from "@/lib/gtm/player-prospect-contract";
import { requireInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

const orderColumns: Record<GtmPlayerProspectSort, string> = {
  name: "display_name",
  college: "college_name",
  team: "latest_team",
  position: "position",
  experience: "years_of_experience",
  last_season: "last_season",
};

function isMissingRelation(error: { code?: string | null; message?: string | null }) {
  return error.code === "42P01" || error.code === "PGRST205" || error.message?.includes("schema cache") === true;
}

function isPermissionDenied(error: { code?: string | null }) {
  return error.code === "42501" || error.code === "PGRST301";
}

export async function getGtmPlayerProspects(
  filters: GtmPlayerProspectFilters,
): Promise<GtmPlayerProspectsReadModel> {
  await requireInternalAdmin();
  const supabase = await createClient();
  const gtm = supabase as unknown as SupabaseClient;
  const start = (filters.page - 1) * GTM_PLAYER_PROSPECT_PAGE_SIZE;
  const end = start + GTM_PLAYER_PROSPECT_PAGE_SIZE - 1;

  const relationshipProjection = filters.view === "selected"
    ? ",gtm_player_prospects!inner(selected_at,archived)"
    : filters.view === "contacts"
      ? ",gtm_contacts!inner(id,archived)"
      : "";

  let query = gtm
    .from("nfl_players")
    .select(
      `gsis_id,display_name,first_name,last_name,college_name,college_conference,latest_team,position,status,rookie_season,last_season,years_of_experience,headshot_url${relationshipProjection}`,
      { count: "exact" },
    );

  if (filters.view === "selected") query = query.eq("gtm_player_prospects.archived", false);
  if (filters.view === "contacts") query = query.eq("gtm_contacts.archived", false);

  if (filters.search) {
    query = query.or(`display_name.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
  }
  if (filters.college) query = query.ilike("college_name", `%${filters.college}%`);
  if (filters.team) query = query.eq("latest_team", filters.team);
  if (filters.position) query = query.eq("position", filters.position);
  if (filters.status) query = query.ilike("status", filters.status);

  const { data, error, count } = await query
    .order(orderColumns[filters.sort], {
      ascending: filters.direction === "asc",
      nullsFirst: false,
    })
    .order("gsis_id", { ascending: true })
    .range(start, end);

  if (error) {
    if (isMissingRelation(error)) return { state: "not_configured", rows: [], total: 0, filters };
    if (isPermissionDenied(error)) return { state: "restricted", rows: [], total: 0, filters };
    throw new Error(`gtm_player_prospects_query_failed:${error.code ?? "unknown"}`);
  }

  const sourceRows = (data ?? []) as unknown as Record<string, unknown>[];
  const gsisIds = sourceRows.map((row) => String(row.gsis_id));
  const selectionsByGsis = new Map<string, string>();
  const contactsByGsis = new Map<string, string>();
  if (gsisIds.length > 0) {
    const [{ data: selections, error: selectionsError }, { data: contacts, error: contactsError }] = await Promise.all([
      gtm.from("gtm_player_prospects").select("gsis_id,selected_at").eq("archived", false).in("gsis_id", gsisIds),
      gtm.from("gtm_contacts").select("id,player_master_gsis_id").eq("archived", false).in("player_master_gsis_id", gsisIds),
    ]);
    if (selectionsError && !isMissingRelation(selectionsError)) {
      if (isPermissionDenied(selectionsError)) return { state: "restricted", rows: [], total: 0, filters };
      throw new Error(`gtm_player_prospect_selections_query_failed:${selectionsError.code ?? "unknown"}`);
    }
    if (contactsError && !isMissingRelation(contactsError)) {
      if (isPermissionDenied(contactsError)) return { state: "restricted", rows: [], total: 0, filters };
      throw new Error(`gtm_player_prospect_contacts_query_failed:${contactsError.code ?? "unknown"}`);
    }
    for (const selection of selections ?? []) {
      selectionsByGsis.set(String(selection.gsis_id), String(selection.selected_at));
    }
    for (const contact of contacts ?? []) {
      contactsByGsis.set(String(contact.player_master_gsis_id), String(contact.id));
    }
  }

  const total = count ?? sourceRows.length;
  const pageCount = Math.max(1, Math.ceil(total / GTM_PLAYER_PROSPECT_PAGE_SIZE));
  return {
    state: "ready",
    rows: sourceRows.map((row) => ({
      gsisId: String(row.gsis_id),
      displayName: String(row.display_name),
      firstName: row.first_name == null ? null : String(row.first_name),
      lastName: row.last_name == null ? null : String(row.last_name),
      collegeName: row.college_name == null ? null : String(row.college_name),
      collegeConference: row.college_conference == null ? null : String(row.college_conference),
      latestTeam: row.latest_team == null ? null : String(row.latest_team),
      position: row.position == null ? null : String(row.position),
      status: row.status == null ? null : String(row.status),
      rookieSeason: row.rookie_season == null ? null : Number(row.rookie_season),
      lastSeason: row.last_season == null ? null : Number(row.last_season),
      yearsOfExperience: row.years_of_experience == null ? null : Number(row.years_of_experience),
      headshotUrl: row.headshot_url == null ? null : String(row.headshot_url),
      selectedAt: selectionsByGsis.get(String(row.gsis_id)) ?? null,
      contactId: contactsByGsis.get(String(row.gsis_id)) ?? null,
    })),
    total,
    page: Math.min(filters.page, pageCount),
    pageSize: GTM_PLAYER_PROSPECT_PAGE_SIZE,
    pageCount,
    filters,
  };
}
