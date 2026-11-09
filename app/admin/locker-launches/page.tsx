import { redirect } from "next/navigation";
import { z } from "zod";
import { authorizeIntelligenceLab, IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { listAccessibleOrganizations } from "@/lib/organization/context";
import { listAllSchoolSignals } from "@/lib/enterprise-crm/pilot/school-signals";
import { listAllDismissals } from "@/lib/enterprise-crm/pilot/dismissals";
import { listAllBriefs } from "@/lib/enterprise-crm/pilot/briefs";
import { createServiceClient } from "@/lib/supabase/service";
import { LaunchQueue, type QueueBrief, type QueueDismissal, type QueueLaunch, type QueueMedia, type QueueSchool, type QueueSignal } from "./LaunchQueue";

export const dynamic = "force-dynamic";
export const metadata = { title: "School Locker launches", robots: { index: false, follow: false } };

const launchRow = z.object({
  id: z.string(), organization_id: z.string(), player_id: z.string().nullable(), player_name: z.string(), position: z.string().nullable(),
  years: z.string().nullable(), contact_email: z.string().nullable(), message: z.string().nullable(), status: z.string(), status_note: z.string().nullable(), created_at: z.string(),
});
const mediaRow = z.object({
  id: z.string(), organization_id: z.string(), player_id: z.string().nullable(), launch_id: z.string().nullable(), kind: z.string(), title: z.string(),
  url: z.string().nullable(), description: z.string().nullable(), occurred_on: z.string().nullable(), review_status: z.string(), created_at: z.string(),
});

/** Enrolled school workspaces, BLTZ's queue of school launches, and school-connected media awaiting review. */
export default async function LockerLaunchesPage() {
  try { await authorizeIntelligenceLab(); }
  catch (error) {
    if (error instanceof IntelligenceAccessError && error.status !== 503) redirect("/auth/admin?next=%2Fadmin%2Flocker-launches");
    throw error;
  }
  const db = createServiceClient();
  const [launches, media, enrolled, schoolSignals, dismissals, briefs] = await Promise.all([
    db.from("organization_locker_launches").select("id,organization_id,player_id,player_name,position,years,contact_email,message,status,status_note,created_at").order("created_at", { ascending: false }).limit(200),
    db.from("organization_athlete_media").select("id,organization_id,player_id,launch_id,kind,title,url,description,occurred_on,review_status,created_at").eq("review_status", "pending").order("created_at").limit(300),
    listAccessibleOrganizations().catch(() => null),
    listAllSchoolSignals(),
    listAllDismissals(),
    listAllBriefs(),
  ]);
  // Admins see every approved or restricted organization; each opens its own dashboard.
  const schools: QueueSchool[] | null = enrolled?.ok
    ? enrolled.organizations.map(({ organization }) => ({ id: organization.id, name: organization.name, status: organization.status }))
    : null;
  const launchRows = z.array(launchRow).safeParse(launches.data);
  const mediaRows = z.array(mediaRow).safeParse(media.data);
  const unavailable = Boolean(launches.error || media.error || !launchRows.success || !mediaRows.success);
  const orgIds = [...new Set([...(launchRows.success ? launchRows.data : []), ...(mediaRows.success ? mediaRows.data : [])].map((row) => row.organization_id).concat(schoolSignals.signals.map((row) => row.organizationId), dismissals.dismissals.map((row) => row.organizationId), briefs.briefs.map((row) => row.organizationId)))];
  const playerIds = [...new Set([...(mediaRows.success ? mediaRows.data : []).flatMap((row) => row.player_id ? [row.player_id] : []), ...schoolSignals.signals.flatMap((row) => row.playerId ? [row.playerId] : []), ...dismissals.dismissals.flatMap((row) => row.playerId ? [row.playerId] : []), ...briefs.briefs.map((row) => row.playerId)])];
  const [orgs, players] = await Promise.all([
    orgIds.length ? db.from("organizations").select("id,name").in("id", orgIds) : Promise.resolve({ data: [] }),
    playerIds.length ? db.from("players").select("id,name").in("id", playerIds) : Promise.resolve({ data: [] }),
  ]);
  const orgName = new Map(((orgs.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]));
  const playerName = new Map(((players.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]));

  const queueMedia: QueueMedia[] = (mediaRows.success ? mediaRows.data : []).map((row) => ({
    id: row.id, launchId: row.launch_id, school: orgName.get(row.organization_id) ?? "School", player: row.player_id ? playerName.get(row.player_id) ?? null : null,
    kind: row.kind, title: row.title, url: row.url, description: row.description, occurredOn: row.occurred_on,
  }));
  const queueLaunches: QueueLaunch[] = (launchRows.success ? launchRows.data : []).map((row) => ({
    id: row.id, organizationId: row.organization_id, school: orgName.get(row.organization_id) ?? "School", playerName: row.player_name, existingPlayer: Boolean(row.player_id),
    position: row.position, years: row.years, contactEmail: row.contact_email, message: row.message, status: row.status, statusNote: row.status_note, createdAt: row.created_at,
  }));
  const queueSignals: QueueSignal[] = schoolSignals.signals.map((row) => ({
    id: row.id, organizationId: row.organizationId, school: orgName.get(row.organizationId) ?? "School", player: row.playerId ? playerName.get(row.playerId) ?? null : null,
    title: row.title, kind: row.kind, targetDate: row.targetDate, recurrence: row.recurrence, origin: row.origin, status: row.status, request: row.request, sources: row.sources.length, createdAt: row.createdAt,
  }));
  const queueDismissals: QueueDismissal[] = dismissals.dismissals.map((row) => ({
    id: row.id, school: orgName.get(row.organizationId) ?? "School", player: row.playerId ? playerName.get(row.playerId) ?? null : null,
    targetType: row.targetType, label: row.label, scope: row.scope, reason: row.reason, createdAt: row.createdAt,
  }));
  const queueBriefs: QueueBrief[] = briefs.briefs.map((row) => ({
    id: row.id, organizationId: row.organizationId, school: orgName.get(row.organizationId) ?? "School", player: playerName.get(row.playerId) ?? "Former player",
    brandName: row.brandName, status: row.status, expiresAt: row.expiresAt, createdAt: row.createdAt, viewCount: row.viewCount, lastViewedAt: row.lastViewedAt,
  }));
  return <LaunchQueue schools={schools} launches={queueLaunches} media={queueMedia} signals={queueSignals} signalsUnavailable={schoolSignals.state === "unavailable"}
    briefs={queueBriefs} briefsUnavailable={briefs.state === "unavailable"} dismissals={queueDismissals} dismissalsUnavailable={dismissals.state === "unavailable"} unavailable={unavailable} />;
}
