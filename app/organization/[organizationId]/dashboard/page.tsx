import { notFound } from "next/navigation";
import { PilotRestricted } from "@/components/organization/OrganizationShell";
import { ThisWeek } from "@/components/organization/pilot/ThisWeek";
import { listActivations } from "@/lib/enterprise-crm/pilot/activations";
import { loadSchoolRoster } from "@/lib/enterprise-crm/pilot/former-players";
import { listAthleteMedia, mergeMediaSignals } from "@/lib/enterprise-crm/pilot/launches";
import { resolveWorkspaceAccess } from "@/lib/enterprise-crm/workspace-access";
import { resolveOrganizationContext } from "@/lib/organization/context";

export default async function OrganizationDashboardPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const contextResult = await resolveOrganizationContext(organizationId);
  if (!contextResult.ok) notFound();

  const { context } = contextResult;
  const access = await resolveWorkspaceAccess(context);
  if (!access.capabilities["navigation.home"]) return <PilotRestricted />;

  const [baseRoster, media] = await Promise.all([loadSchoolRoster(context), listAthleteMedia(context.organization.id)]);
  const roster = mergeMediaSignals(baseRoster, media);
  const players = new Map(roster.players.map((player) => [player.id, { name: player.name, portraitUrl: player.portraitUrl }]));
  const activity = access.capabilities["navigation.activations"]
    ? await listActivations(context.organization.id, { limit: 50, players })
    : { state: "ready" as const, activations: [] };
  return (
    <ThisWeek
      schoolName={context.organization.name}
      roster={roster}
      activity={activity}
      intelligenceHref={`/organization/${context.organization.id}/intelligence`}
    />
  );
}
