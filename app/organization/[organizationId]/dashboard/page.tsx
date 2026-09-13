import { notFound } from "next/navigation";
import { OrganizationDashboardOverview } from "@/components/organization/OrganizationDashboardOverview";
import {
  listOrganizationWorkspaceOptions,
  resolveOrganizationContext,
} from "@/lib/organization/context";

export default async function OrganizationDashboardPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const contextResult = await resolveOrganizationContext(organizationId);
  if (!contextResult.ok) notFound();

  const options = await listOrganizationWorkspaceOptions(
    contextResult.context.organization.id,
  );

  return (
    <OrganizationDashboardOverview
      organizationName={contextResult.context.organization.name}
      organizationId={contextResult.context.organization.id}
      teamCount={options.teams.length}
      seasonCount={options.seasons.length}
    />
  );
}
