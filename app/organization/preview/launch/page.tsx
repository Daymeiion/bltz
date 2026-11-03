import { notFound } from "next/navigation";
import { OrganizationShell } from "@/components/organization/OrganizationShell";
import { LaunchLocker } from "@/components/organization/pilot/LaunchLocker";
import { previewContext, previewLaunches, previewOptions, previewOrganizations, previewRoster, previewTheme } from "@/components/organization/pilot/preview-data";

export default function OrganizationLaunchPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <OrganizationShell context={previewContext} organizations={previewOrganizations} options={previewOptions} previewTheme={previewTheme}>
      <LaunchLocker organizationId={previewContext.organization.id} schoolName={previewContext.organization.name} players={previewRoster.players} initialLaunches={previewLaunches} canManage preview />
    </OrganizationShell>
  );
}
