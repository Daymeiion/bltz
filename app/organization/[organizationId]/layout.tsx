import { notFound, redirect } from "next/navigation";
import { OrganizationShell } from "@/components/organization/OrganizationShell";
import {
  listAccessibleOrganizations,
  listOrganizationWorkspaceOptions,
  resolveOrganizationContext,
} from "@/lib/organization/context";

export default async function OrganizationLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}>) {
  const { organizationId } = await params;
  const result = await resolveOrganizationContext(organizationId);

  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      const nextPath = `/organization/${encodeURIComponent(organizationId)}/dashboard`;
      redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
    }

    notFound();
  }

  const [directory, options] = await Promise.all([
    listAccessibleOrganizations(),
    listOrganizationWorkspaceOptions(result.context.organization.id),
  ]);

  if (!directory.ok) {
    redirect(`/auth/login?next=${encodeURIComponent(`/organization/${organizationId}/dashboard`)}`);
  }

  const organizations = directory.organizations.some(
    (entry) => entry.organization.id === result.context.organization.id,
  )
    ? directory.organizations
    : [{ organization: result.context.organization, access: result.context.access }, ...directory.organizations];

  return (
    <OrganizationShell
      context={result.context}
      organizations={organizations}
      options={options}
    >
      {children}
    </OrganizationShell>
  );
}
