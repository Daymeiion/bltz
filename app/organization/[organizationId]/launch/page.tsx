import { notFound } from "next/navigation";
import { PilotRestricted } from "@/components/organization/OrganizationShell";
import { LaunchLocker } from "@/components/organization/pilot/LaunchLocker";
import { loadSchoolRoster } from "@/lib/enterprise-crm/pilot/former-players";
import { listLaunches } from "@/lib/enterprise-crm/pilot/launches";
import { listRosterAthletes } from "@/lib/enterprise-crm/pilot/roster-athletes";
import { resolveWorkspaceAccess } from "@/lib/enterprise-crm/workspace-access";
import { resolveOrganizationContext } from "@/lib/organization/context";

export const dynamic = "force-dynamic";

export default async function OrganizationLaunchPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const contextResult = await resolveOrganizationContext(organizationId);
  if (!contextResult.ok) notFound();

  const { context } = contextResult;
  const access = await resolveWorkspaceAccess(context);
  if (!access.canManageActivations) return <PilotRestricted />;

  const [roster, launches, athletes] = await Promise.all([loadSchoolRoster(context), listLaunches(context.organization.id), listRosterAthletes(context.organization.id)]);
  return (
    <LaunchLocker
      organizationId={context.organization.id}
      schoolName={context.organization.name}
      players={roster.players}
      initialLaunches={launches.launches}
      roster={athletes}
      intelligenceHref={`/organization/${context.organization.id}/intelligence`}
      canManage
    />
  );
}
