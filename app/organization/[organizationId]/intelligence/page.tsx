import { notFound, redirect } from "next/navigation";
import { PilotRestricted } from "@/components/organization/OrganizationShell";
import { AthleteDirectory } from "@/components/organization/pilot/AthleteDirectory";
import { loadSchoolRoster } from "@/lib/enterprise-crm/pilot/former-players";
import { listAthleteMedia, mergeMediaSignals } from "@/lib/enterprise-crm/pilot/launches";
import { resolveWorkspaceAccess } from "@/lib/enterprise-crm/workspace-access";
import { resolveOrganizationContext } from "@/lib/organization/context";

export default async function OrganizationIntelligencePage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const contextResult = await resolveOrganizationContext(organizationId);
  if (!contextResult.ok) notFound();

  const { context } = contextResult;
  const access = await resolveWorkspaceAccess(context);
  if (!access.capabilities["navigation.intelligence"]) return <PilotRestricted />;

  const [baseRoster, media] = await Promise.all([loadSchoolRoster(context), listAthleteMedia(context.organization.id)]);
  const roster = mergeMediaSignals(baseRoster, media);
  // Open the workspace on the player with the soonest moment.
  const first = [...roster.players].sort((a, b) => (a.next?.daysUntil ?? Infinity) - (b.next?.daysUntil ?? Infinity))[0];
  if (first) redirect(`/organization/${context.organization.id}/intelligence/${first.id}`);
  return <AthleteDirectory schoolName={context.organization.name} roster={roster} profileBaseHref={`/organization/${context.organization.id}/intelligence`} />;
}
