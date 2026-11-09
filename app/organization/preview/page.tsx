import { requireTemplateAccess } from "@/lib/enterprise-crm/pilot/template-access";
import { OrganizationShell } from "@/components/organization/OrganizationShell";
import { ThisWeek } from "@/components/organization/pilot/ThisWeek";
import { previewActivations, previewContext, previewOptions, previewOrganizations, previewRoster, previewArt, previewTheme } from "@/components/organization/pilot/preview-data";

export const metadata = { title: "School template", robots: { index: false, follow: false } };

export default async function OrganizationPreviewPage() {
  await requireTemplateAccess("/organization/preview");

  return (
    <OrganizationShell context={previewContext} organizations={previewOrganizations} options={previewOptions} previewTheme={previewTheme} previewArt={previewArt}>
      <ThisWeek schoolName={previewContext.organization.name} roster={previewRoster} activity={{ state: "ready", activations: previewActivations }} intelligenceHref="/organization/preview/intelligence" preview />
    </OrganizationShell>
  );
}
