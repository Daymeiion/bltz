import "server-only";

import { cache } from "react";
import { loadSignalDirectory } from "@/lib/intelligence/workspace-server";
import type { WorkspaceAthleteSummary } from "@/lib/intelligence/workspace-types";
import type { LabSection } from "@/lib/intelligence/lab-types";
import type { OrganizationContext } from "@/lib/organization/types";
import { createServiceClient } from "@/lib/supabase/service";
import type { PilotPlayer, PilotRoster } from "./types";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NOISE = /\b(the|university|of|college|athletics|athletic|department)\b/g;

/** "University of Westlake Athletics" and "Westlake" compare equal. */
export function schoolKey(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ").replace(NOISE, " ").replace(/\s+/g, " ").trim();
}

export function toPilotPlayer(row: WorkspaceAthleteSummary): PilotPlayer | null {
  // Unlinked preview athletes have no public Locker yet.
  if (row.link || !SLUG.test(row.slug)) return null;
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    team: row.teamLabel,
    portraitUrl: row.portraitUrl,
    lockerHref: `/player/${row.slug}`,
    next: row.next ? { headline: row.next.headline, targetDate: row.next.targetDate, daysUntil: row.next.daysUntil, verdict: row.next.verdict } : null,
    signalCount: row.signalCount,
  };
}

/**
 * Former players whose recorded school matches one of the organization's
 * names. Pilot matching is by normalized name; the exact directory link
 * replaces it once player records carry a school ID.
 */
export function filterSchoolRoster(directory: LabSection<WorkspaceAthleteSummary>, names: readonly string[]): PilotRoster {
  if (directory.state !== "ready") return { state: "unavailable", players: [] };
  const keys = new Set(names.map(schoolKey).filter(Boolean));
  const players = directory.rows
    .filter((row) => keys.has(schoolKey(row.school)))
    .flatMap((row) => toPilotPlayer(row) ?? []);
  return { state: "ready", players };
}

async function schoolNames(context: OrganizationContext): Promise<string[]> {
  const names = [context.organization.name];
  const application = await createServiceClient().from("organization_applications").select("master_list_college").eq("organization_id", context.organization.id).maybeSingle();
  const college = (application.data as { master_list_college?: unknown } | null)?.master_list_college;
  if (typeof college === "string" && college.trim()) names.push(college);
  if (!context.organization.schoolId) return names;
  const { data } = await createServiceClient()
    .from("schools")
    .select("name")
    .eq("id", context.organization.schoolId)
    .maybeSingle();
  if (data && typeof (data as { name?: unknown }).name === "string") names.push((data as { name: string }).name);
  return names;
}

/** Caller must have authorized the organization context and the Home capability. */
export const loadSchoolRoster = cache(async (context: OrganizationContext): Promise<PilotRoster> => {
  const [directory, names] = await Promise.all([loadSignalDirectory(), schoolNames(context)]);
  return filterSchoolRoster(directory, names);
});
