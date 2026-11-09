import { requireTemplateAccess } from "@/lib/enterprise-crm/pilot/template-access";
import { OrganizationShell } from "@/components/organization/OrganizationShell";
import { LaunchLocker } from "@/components/organization/pilot/LaunchLocker";
import { previewContext, previewLaunches, previewOptions, previewOrganizations, previewRoster, previewArt, previewTheme } from "@/components/organization/pilot/preview-data";

export const metadata = { title: "School template", robots: { index: false, follow: false } };

export default async function OrganizationLaunchPreviewPage() {
  await requireTemplateAccess("/organization/preview/launch");

  return (
    <OrganizationShell context={previewContext} organizations={previewOrganizations} options={previewOptions} previewTheme={previewTheme} previewArt={previewArt}>
      <LaunchLocker organizationId={previewContext.organization.id} schoolName={previewContext.organization.name} players={previewRoster.players} initialLaunches={previewLaunches} canManage preview />
    </OrganizationShell>
  );
}
