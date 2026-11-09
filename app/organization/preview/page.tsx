import { notFound } from "next/navigation";
import { OrganizationShell } from "@/components/organization/OrganizationShell";
import { ThisWeek } from "@/components/organization/pilot/ThisWeek";
import { previewActivations, previewContext, previewOptions, previewOrganizations, previewRoster, previewArt, previewTheme } from "@/components/organization/pilot/preview-data";

export default function OrganizationPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <OrganizationShell context={previewContext} organizations={previewOrganizations} options={previewOptions} previewTheme={previewTheme} previewArt={previewArt}>
      <ThisWeek schoolName={previewContext.organization.name} roster={previewRoster} activity={{ state: "ready", activations: previewActivations }} intelligenceHref="/organization/preview/intelligence" preview />
    </OrganizationShell>
  );
}
