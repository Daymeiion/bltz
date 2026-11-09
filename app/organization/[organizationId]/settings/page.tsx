import { notFound } from "next/navigation";
import { PilotRestricted } from "@/components/organization/OrganizationShell";
import { SchoolSettings } from "@/components/organization/pilot/SchoolSettings";
import { listIntegrations } from "@/lib/enterprise-crm/pilot/integrations";
import { resolveWorkspaceAccess } from "@/lib/enterprise-crm/workspace-access";
import { resolveOrganizationContext } from "@/lib/organization/context";

export const dynamic = "force-dynamic";

export default async function OrganizationSettingsPage({
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

  const connections = await listIntegrations(context.organization.id);
  return (
    <SchoolSettings
      organizationId={context.organization.id}
      schoolName={context.organization.name}
      initial={connections.integrations}
      unavailable={connections.state === "unavailable"}
    />
  );
}
