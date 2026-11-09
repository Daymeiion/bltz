import { notFound } from "next/navigation";
import { PilotRestricted } from "@/components/organization/OrganizationShell";
import { AthleteIntelligence } from "@/components/organization/pilot/AthleteIntelligence";
import { listActivations, listSocialReach } from "@/lib/enterprise-crm/pilot/activations";
import { loadSchoolAthlete, toAthleteFile } from "@/lib/enterprise-crm/pilot/athlete";
import { loadSchoolRoster } from "@/lib/enterprise-crm/pilot/former-players";
import { listAthleteMedia, listLaunches, mergeMediaSignals } from "@/lib/enterprise-crm/pilot/launches";
import { reachHistory } from "@/lib/enterprise-crm/pilot/suggestions";
import { listIntegrations } from "@/lib/enterprise-crm/pilot/integrations";
import { listSchoolSignals, mergeSchoolSignals } from "@/lib/enterprise-crm/pilot/school-signals";
import { resolveWorkspaceAccess } from "@/lib/enterprise-crm/workspace-access";
import { resolveOrganizationContext } from "@/lib/organization/context";

export const dynamic = "force-dynamic";

export default async function OrganizationAthletePage({
  params,
}: {
  params: Promise<{ organizationId: string; playerId: string }>;
}) {
  const { organizationId, playerId } = await params;
  const contextResult = await resolveOrganizationContext(organizationId);
  if (!contextResult.ok) notFound();

  const { context } = contextResult;
  const access = await resolveWorkspaceAccess(context);
  if (!access.capabilities["navigation.intelligence"]) return <PilotRestricted />;

  // Only the school's own former players resolve; anything else is not found.
  const athlete = await loadSchoolAthlete(context, playerId);
  if (!athlete) notFound();

  const canReadActivity = access.capabilities["navigation.activations"];
  const [activity, reach, media, roster, orgMedia, launches, schoolActivity, connections, schoolSignals] = await Promise.all([
    canReadActivity ? loadSchoolRoster(context).then((list) => listActivations(context.organization.id, { playerId, players: new Map(list.players.map((row) => [row.id, { name: row.name, portraitUrl: row.portraitUrl }])) })) : { state: "ready" as const, activations: [] },
    canReadActivity ? listSocialReach(context.organization.id, playerId) : [],
    listAthleteMedia(context.organization.id, playerId),
    loadSchoolRoster(context),
    listAthleteMedia(context.organization.id),
    access.canManageActivations ? listLaunches(context.organization.id) : { state: "ready" as const, launches: [] },
    // Every activation the school has run sets the reach estimates on suggestions.
    canReadActivity ? listActivations(context.organization.id, { limit: 200 }) : { state: "ready" as const, activations: [] },
    access.canManageActivations ? listIntegrations(context.organization.id) : { state: "ready" as const, integrations: [] },
    listSchoolSignals(context.organization.id),
  ]);
  // The most recent launch for this player carries the email the school gave BLTZ.
  const contactEmail = launches.launches.find((launch) => launch.playerId === playerId && launch.contactEmail)?.contactEmail ?? null;

  return (
    <AthleteIntelligence
      organizationId={context.organization.id}
      schoolName={context.organization.name}
      file={toAthleteFile(athlete)}
      initialActivations={activity.activations}
      initialReach={reach}
      initialMedia={media}
      connections={connections.integrations}
      schoolHistory={schoolActivity.state === "ready" ? reachHistory(schoolActivity.activations) : undefined}
      roster={mergeSchoolSignals(mergeMediaSignals(roster, orgMedia), schoolSignals.signals).players}
      initialSchoolSignals={schoolSignals.signals.filter((signal) => signal.playerId === playerId)}
      contactEmail={contactEmail}
      canManage={access.canManageActivations}
      profileBaseHref={`/organization/${context.organization.id}/intelligence`}
    />
  );
}
