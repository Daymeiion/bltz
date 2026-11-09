import { requireTemplateAccess } from "@/lib/enterprise-crm/pilot/template-access";
import { OrganizationShell } from "@/components/organization/OrganizationShell";
import { SchoolSettings } from "@/components/organization/pilot/SchoolSettings";
import { previewArt, previewContext, previewIntegrations, previewOptions, previewOrganizations, previewTheme } from "@/components/organization/pilot/preview-data";

export const metadata = { title: "School template", robots: { index: false, follow: false } };

export default async function OrganizationSettingsPreviewPage() {
  await requireTemplateAccess("/organization/preview/settings");

  return (
    <OrganizationShell context={previewContext} organizations={previewOrganizations} options={previewOptions} previewTheme={previewTheme} previewArt={previewArt}>
      <SchoolSettings organizationId={previewContext.organization.id} schoolName={previewContext.organization.name} initial={previewIntegrations} preview />
    </OrganizationShell>
  );
}
